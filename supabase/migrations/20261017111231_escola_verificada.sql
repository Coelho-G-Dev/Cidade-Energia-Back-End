alter table public.perfis add column escola_verificada boolean not null default false;

revoke insert, update on public.perfis from anon, authenticated;
grant insert (id, primeiro_nome, bairro_id, escola_id) on public.perfis to authenticated;
grant update (id, primeiro_nome, bairro_id, escola_id) on public.perfis to authenticated;

create function public.desverificar_escola_ao_trocar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.escola_id is distinct from old.escola_id then
    new.escola_verificada := false;
  end if;
  return new;
end;
$$;
revoke execute on function public.desverificar_escola_ao_trocar() from public, anon, authenticated;

create trigger antes_de_trocar_escola
  before update on public.perfis
  for each row execute function public.desverificar_escola_ao_trocar();

create function public.confirmar_turma(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escola uuid;
begin
  select e.id into v_escola from public.escolas e where e.codigo_turma = upper(trim(p_codigo));
  if v_escola is null then
    return false;
  end if;

  update public.perfis
  set escola_verificada = true
  where id = (select auth.uid()) and escola_id = v_escola;

  return found;
end;
$$;
revoke execute on function public.confirmar_turma(text) from public, anon;
grant execute on function public.confirmar_turma(text) to authenticated;

create or replace view public.ranking_escolas as
with totais as (
  select p.escola_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.escola_id is not null and p.escola_verificada
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

revoke all on public.ranking_escolas from anon, authenticated;
grant select on public.ranking_escolas to anon, authenticated;

comment on column public.perfis.escola_verificada is 'true quando o estudante entrou na escola pelo código de turma. Só esses perfis contam no ranking_escolas. Só a função confirmar_turma liga o valor; trocar de escola desliga.';
