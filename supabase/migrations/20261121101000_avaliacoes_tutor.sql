create type public.motivo_avaliacao_tutor as enum ('errada','confusa','fora_do_tema');
create table public.tutor_avaliacoes (
  tutor_uso_id bigint primary key references public.tutor_uso(id) on delete cascade,
  util boolean not null,
  motivo public.motivo_avaliacao_tutor,
  criado_em timestamptz not null default now(),
  check (not util or motivo is null)
);
alter table public.tutor_avaliacoes enable row level security;
revoke all on public.tutor_avaliacoes from anon,authenticated;
grant select on public.tutor_avaliacoes to authenticated;
create policy "tutor_avaliacoes: dono le" on public.tutor_avaliacoes for select to authenticated
  using(exists(select 1 from public.tutor_uso u where u.id=tutor_uso_id and u.perfil_id=(select auth.uid())));

drop function public.registrar_uso_tutor(uuid,integer,interval);
create function public.registrar_uso_tutor(p_perfil_id uuid,p_limite integer,p_janela interval)
returns table(permitido boolean,liberado_em timestamptz,id text)
language plpgsql set search_path='' as $$
declare v_usos integer; v_mais_antigo timestamptz; v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('tutor_uso:'||p_perfil_id::text,0));
  -- Preserva usos antigos para a FK dos votos; o limite considera só a janela.
  select count(*),min(t.criado_em) into v_usos,v_mais_antigo from public.tutor_uso t
    where t.perfil_id=p_perfil_id and t.criado_em>now()-p_janela;
  if v_usos>=p_limite then return query select false,v_mais_antigo+p_janela,null::text; return; end if;
  insert into public.tutor_uso(perfil_id) values(p_perfil_id) returning tutor_uso.id into v_id;
  return query select true,null::timestamptz,v_id::text;
end;
$$;
revoke execute on function public.registrar_uso_tutor(uuid,integer,interval) from public,anon,authenticated;
grant execute on function public.registrar_uso_tutor(uuid,integer,interval) to service_role;

create function public.avaliar_resposta_tutor(p_perfil_id uuid,p_resposta_id bigint,p_util boolean,p_motivo public.motivo_avaliacao_tutor default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.tutor_uso where id=p_resposta_id and perfil_id=p_perfil_id for update;
  if not found then raise exception 'Resposta não encontrada' using errcode='CT001'; end if;
  if p_util is null or (p_util and p_motivo is not null) then raise exception 'Avaliação inválida' using errcode='CT003'; end if;
  if exists(select 1 from public.tutor_avaliacoes where tutor_uso_id=p_resposta_id) then
    raise exception 'Avaliação já registrada' using errcode='CT002';
  end if;
  insert into public.tutor_avaliacoes(tutor_uso_id,util,motivo) values(p_resposta_id,p_util,p_motivo);
end;
$$;
revoke execute on function public.avaliar_resposta_tutor(uuid,bigint,boolean,public.motivo_avaliacao_tutor) from public,anon,authenticated;
grant execute on function public.avaliar_resposta_tutor(uuid,bigint,boolean,public.motivo_avaliacao_tutor) to service_role;
