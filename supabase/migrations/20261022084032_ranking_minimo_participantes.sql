create function public.minimo_participantes_ranking()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3
$$;
grant execute on function public.minimo_participantes_ranking() to anon, authenticated, service_role;

create or replace view public.ranking_bairros as
with totais as (
  select p.bairro_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.bairro_id is not null and not p.eh_teste
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
where t.pontos > 0 and t.participantes >= public.minimo_participantes_ranking();

create or replace view public.ranking_escolas as
with totais as (
  select p.escola_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.escola_id is not null and p.escola_verificada and not p.eh_teste
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
where t.pontos > 0 and es.ativa and t.participantes >= public.minimo_participantes_ranking();

revoke all on public.ranking_bairros, public.ranking_escolas from anon, authenticated;
grant select on public.ranking_bairros, public.ranking_escolas to anon, authenticated;

comment on function public.minimo_participantes_ranking() is
  'Mínimo de estudantes com pontos para um bairro ou escola aparecer nos rankings. Com menos, a soma revelaria os pontos de um estudante.';
