create or replace view public.ranking_bairros as
with totais as (
  select p.bairro_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.bairro_id is not null
  group by p.bairro_id
)
select
  b.id as bairro_id,
  b.nome,
  t.pontos,
  t.participantes,
  rank() over (order by t.pontos desc)::integer as posicao
from totais t
join public.bairros b on b.id = t.bairro_id
where t.pontos > 0;

create or replace view public.ranking_escolas as
with totais as (
  select p.escola_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.escola_id is not null
  group by p.escola_id
)
select
  es.id as escola_id,
  es.nome,
  es.bairro_id,
  t.pontos,
  t.participantes,
  rank() over (order by t.pontos desc)::integer as posicao
from totais t
join public.escolas es on es.id = t.escola_id
where t.pontos > 0;

revoke all on public.ranking_bairros, public.ranking_escolas from anon, authenticated;
grant select on public.ranking_bairros, public.ranking_escolas to anon, authenticated;

create or replace view public.perfil_resumo with (security_invoker = true) as
select
  p.id as perfil_id,
  coalesce((select sum(e.pontos) from public.pontos_eventos e where e.perfil_id = p.id), 0)::bigint as pontos,
  (select count(*) from public.progresso_licoes pl where pl.perfil_id = p.id)::integer as licoes_concluidas,
  (
    select count(*)
    from public.trilhas t
    where exists (select 1 from public.licoes l where l.trilha_id = t.id)
      and not exists (
        select 1 from public.licoes l
        where l.trilha_id = t.id
          and not exists (
            select 1 from public.progresso_licoes pl
            where pl.licao_id = l.id and pl.perfil_id = p.id
          )
      )
  )::integer as trilhas_concluidas,
  (
    select count(*) from public.pontos_eventos e
    where e.perfil_id = p.id and e.origem = 'missao_concluida'
  )::integer as missoes_concluidas,
  (select count(*) from public.conquistas_usuario cu where cu.perfil_id = p.id)::integer as conquistas,
  re.posicao as posicao_escola,
  (case when p.escola_id is null then null else coalesce(re.pontos, 0) end)::bigint as pontos_escola,
  rb.posicao as posicao_bairro,
  (case when p.bairro_id is null then null else coalesce(rb.pontos, 0) end)::bigint as pontos_bairro
from public.perfis p
left join public.ranking_escolas re on re.escola_id = p.escola_id
left join public.ranking_bairros rb on rb.bairro_id = p.bairro_id;

revoke all on public.perfil_resumo from anon, authenticated;
grant select on public.perfil_resumo to authenticated;

create table public.trocas_local (
  id              bigint generated always as identity primary key,
  perfil_id       uuid not null references public.perfis (id) on delete cascade,
  bairro_anterior uuid,
  bairro_novo     uuid,
  escola_anterior uuid,
  escola_nova     uuid,
  trocado_em      timestamptz not null default now()
);
create index trocas_local_perfil_trocado_idx on public.trocas_local (perfil_id, trocado_em desc);

alter table public.trocas_local enable row level security;
revoke insert, update, delete, truncate on public.trocas_local from anon, authenticated;

create policy "trocas_local: dono le" on public.trocas_local
  for select to authenticated using (perfil_id = (select auth.uid()));

create function public.limitar_trocas_de_local()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite constant integer := 3;
  v_janela constant interval := interval '30 days';
  v_trocas integer;
  v_mais_antiga timestamptz;
begin
  if not (
    (old.bairro_id is not null and new.bairro_id is distinct from old.bairro_id)
    or (old.escola_id is not null and new.escola_id is distinct from old.escola_id)
  ) then
    return new;
  end if;

  select count(*), min(t.trocado_em) into v_trocas, v_mais_antiga
  from public.trocas_local t
  where t.perfil_id = new.id and t.trocado_em > now() - v_janela;

  if v_trocas >= v_limite then
    raise exception 'limite de trocas de bairro ou escola atingido'
      using errcode = 'CE001',
            hint = to_char((v_mais_antiga + v_janela) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  insert into public.trocas_local (perfil_id, bairro_anterior, bairro_novo, escola_anterior, escola_nova)
  values (new.id, old.bairro_id, new.bairro_id, old.escola_id, new.escola_id);

  return new;
end;
$$;
revoke execute on function public.limitar_trocas_de_local() from public, anon, authenticated;

create trigger antes_de_trocar_local
  before update of bairro_id, escola_id on public.perfis
  for each row execute function public.limitar_trocas_de_local();

comment on table public.trocas_local is 'Histórico de trocas de bairro ou escola. Limite: 3 trocas a cada 30 dias, aplicado pelo trigger antes_de_trocar_local.';
