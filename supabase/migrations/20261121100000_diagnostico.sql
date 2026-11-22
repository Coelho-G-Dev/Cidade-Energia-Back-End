create table public.perguntas_diagnostico (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references public.trilhas(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  enunciado text not null check (char_length(enunciado) between 2 and 500),
  opcoes jsonb not null check (jsonb_typeof(opcoes)='array' and jsonb_array_length(opcoes) between 2 and 5
    and not jsonb_path_exists(opcoes, '$[*] ? (@.type() != "string")')),
  indice_correto smallint not null check (indice_correto >= 0 and indice_correto < jsonb_array_length(opcoes)),
  explicacao text not null check (char_length(explicacao) between 2 and 1000),
  fonte text not null check (char_length(fonte) between 2 and 2000),
  unique(trilha_id,ordem)
);
create table public.respostas_diagnostico (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  pergunta_id uuid not null references public.perguntas_diagnostico(id) on delete restrict,
  momento text not null check (momento in ('antes','depois')),
  opcao smallint not null check (opcao between 0 and 4),
  correta boolean not null,
  respondida_em timestamptz not null default now(),
  primary key(perfil_id,pergunta_id,momento)
);
create index respostas_diagnostico_pergunta_idx on public.respostas_diagnostico(pergunta_id);
alter table public.perguntas_diagnostico enable row level security;
alter table public.respostas_diagnostico enable row level security;
revoke all on public.perguntas_diagnostico,public.respostas_diagnostico from anon,authenticated;
grant select(id,trilha_id,ordem,enunciado,opcoes) on public.perguntas_diagnostico to anon,authenticated;
-- Nem o dono recebe correta antes de concluir o diagnóstico. A função de
-- gravação só devolve a correção depois da tentativa final autorizada.
grant select(perfil_id,pergunta_id,momento,opcao,respondida_em) on public.respostas_diagnostico to authenticated;
create policy "diagnostico: perguntas publicas" on public.perguntas_diagnostico for select to anon,authenticated using(true);
create policy "diagnostico: dono le" on public.respostas_diagnostico for select to authenticated using(perfil_id=(select auth.uid()));

create function public.consultar_diagnostico(p_perfil_id uuid,p_slug text,p_momento text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_trilha uuid; v_total integer; v_feitas integer; v_respondido boolean; v_antes boolean; v_disponivel boolean;
begin
  if p_momento not in ('antes','depois') or p_momento is null then raise exception 'Entrada inválida' using errcode='CD004'; end if;
  select id into v_trilha from public.trilhas where slug=p_slug;
  if v_trilha is null then raise exception 'Trilha não encontrada' using errcode='CD001'; end if;
  select count(*) into v_total from public.licoes where trilha_id=v_trilha;
  select count(*) into v_feitas from public.progresso_licoes pl join public.licoes l on l.id=pl.licao_id where pl.perfil_id=p_perfil_id and l.trilha_id=v_trilha;
  select exists(select 1 from public.respostas_diagnostico r join public.perguntas_diagnostico q on q.id=r.pergunta_id
    where r.perfil_id=p_perfil_id and q.trilha_id=v_trilha and r.momento=p_momento) into v_respondido;
  select count(*)=4 into v_antes from public.respostas_diagnostico r join public.perguntas_diagnostico q on q.id=r.pergunta_id
    where r.perfil_id=p_perfil_id and q.trilha_id=v_trilha and r.momento='antes';
  v_disponivel := not v_respondido and (select count(*)=4 from public.perguntas_diagnostico where trilha_id=v_trilha)
    and case when p_momento='antes' then v_feitas=0 else v_total>0 and v_feitas=v_total and v_antes end;
  return jsonb_build_object('momento',p_momento,'disponivel',v_disponivel,'respondido',v_respondido,'perguntas',
    case when v_disponivel then (select jsonb_agg(jsonb_build_object('id',id,'ordem',ordem,'enunciado',enunciado,'opcoes',opcoes) order by ordem)
      from public.perguntas_diagnostico where trilha_id=v_trilha) else '[]'::jsonb end);
end;
$$;
revoke execute on function public.consultar_diagnostico(uuid,text,text) from public,anon,authenticated;
grant execute on function public.consultar_diagnostico(uuid,text,text) to service_role;

create function public.gravar_diagnostico(p_perfil_id uuid,p_slug text,p_momento text,p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_estado jsonb; v_trilha uuid; v_resultado jsonb;
begin
  -- Serializa tentativas e bloqueia inserções de progresso que referenciem o
  -- perfil enquanto checamos a disponibilidade e gravamos o lote completo.
  perform 1 from public.perfis where id=p_perfil_id for update;
  if not found then raise exception 'Perfil não encontrado' using errcode='42501'; end if;
  v_estado:=public.consultar_diagnostico(p_perfil_id,p_slug,p_momento);
  if (v_estado->>'respondido')::boolean then raise exception 'Diagnóstico já respondido' using errcode='CD003'; end if;
  if not (v_estado->>'disponivel')::boolean then raise exception 'Diagnóstico indisponível' using errcode='CD002'; end if;
  select id into v_trilha from public.trilhas where slug=p_slug;
  if jsonb_typeof(p_respostas) is distinct from 'array' then raise exception 'Envie todas as perguntas' using errcode='CD004'; end if;
  if jsonb_array_length(p_respostas)<>4 then raise exception 'Envie todas as perguntas' using errcode='CD004'; end if;
  if exists(select 1 from jsonb_array_elements(p_respostas) r where jsonb_typeof(r)<>'object'
    or jsonb_typeof(r->'perguntaId') is distinct from 'string' or (r->>'perguntaId') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    or jsonb_typeof(r->'opcao') is distinct from 'number' or (r->>'opcao') !~ '^[0-4]$'
    or r - 'perguntaId' - 'opcao' <> '{}'::jsonb) then raise exception 'Respostas inválidas' using errcode='CD004'; end if;
  if (select count(distinct r->>'perguntaId') from jsonb_array_elements(p_respostas) r)<>4
    or (select count(*) from jsonb_array_elements(p_respostas) r join public.perguntas_diagnostico q on q.id=(r->>'perguntaId')::uuid
      where q.trilha_id=v_trilha and (r->>'opcao')::integer < jsonb_array_length(q.opcoes))<>4 then
    raise exception 'Perguntas ou opções inválidas' using errcode='CD004';
  end if;
  insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta)
    select p_perfil_id,q.id,p_momento,(r->>'opcao')::smallint,(r->>'opcao')::integer=q.indice_correto
    from jsonb_array_elements(p_respostas) r join public.perguntas_diagnostico q on q.id=(r->>'perguntaId')::uuid;
  if p_momento='antes' then return jsonb_build_object('momento','antes','registrado',true); end if;
  select jsonb_build_object('momento','depois','registrado',true,'total',count(*),
    'acertosAntes',count(*) filter(where a.correta),'acertosDepois',count(*) filter(where d.correta),
    'perguntas',jsonb_agg(jsonb_build_object('perguntaId',q.id,'indiceCorreto',q.indice_correto,
      'acertouAntes',a.correta,'acertouDepois',d.correta,'explicacao',q.explicacao) order by q.ordem)) into v_resultado
    from public.perguntas_diagnostico q
    join public.respostas_diagnostico a on a.pergunta_id=q.id and a.perfil_id=p_perfil_id and a.momento='antes'
    join public.respostas_diagnostico d on d.pergunta_id=q.id and d.perfil_id=p_perfil_id and d.momento='depois'
    where q.trilha_id=v_trilha;
  return v_resultado;
end;
$$;
revoke execute on function public.gravar_diagnostico(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.gravar_diagnostico(uuid,text,text,jsonb) to service_role;
