alter table public.perfis add column eh_teste boolean not null default false;

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
where t.pontos > 0;

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
where t.pontos > 0 and es.ativa;

revoke all on public.ranking_bairros, public.ranking_escolas from anon, authenticated;
grant select on public.ranking_bairros, public.ranking_escolas to anon, authenticated;

comment on column public.perfis.eh_teste is 'true para perfis de teste do time. Eles continuam usando o app normalmente, mas não entram nos rankings nem na soma do Bairro unido. Só o servidor liga o valor.';
