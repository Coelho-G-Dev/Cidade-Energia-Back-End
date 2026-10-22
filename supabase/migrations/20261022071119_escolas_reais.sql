alter table public.escolas
  add column codigo_inep text unique check (codigo_inep ~ '^[0-9]{8}$'),
  add column ativa boolean not null default true;

grant select (ativa) on public.escolas to anon, authenticated;

create function public.gerar_codigo_turma()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_posicao integer;
  v_codigo text := '';
begin
  foreach v_posicao in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    v_codigo := v_codigo || substr(v_alfabeto, get_byte(v_bytes, v_posicao) % 32 + 1, 1);
  end loop;
  return v_codigo;
end;
$$;
revoke execute on function public.gerar_codigo_turma() from public, anon, authenticated;

alter table public.escolas alter column codigo_turma set default public.gerar_codigo_turma();

create or replace function public.resolver_codigo_turma(p_codigo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.escolas e where e.codigo_turma = upper(trim(p_codigo)) and e.ativa;
$$;

create or replace function public.confirmar_turma(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escola uuid;
begin
  select e.id into v_escola from public.escolas e where e.codigo_turma = upper(trim(p_codigo)) and e.ativa;
  if v_escola is null then
    return false;
  end if;

  update public.perfis
  set escola_verificada = true
  where id = (select auth.uid()) and escola_id = v_escola;

  return found;
end;
$$;

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
where t.pontos > 0 and es.ativa;

revoke all on public.ranking_escolas from anon, authenticated;
grant select on public.ranking_escolas to anon, authenticated;

comment on column public.escolas.codigo_inep is 'Código INEP da escola (Censo Escolar, 8 dígitos). Identifica a escola real e evita duplicar no seed.';
comment on column public.escolas.ativa is 'false esconde a escola da lista, do código de turma e do ranking, sem apagar o vínculo de quem já a escolheu.';
comment on column public.escolas.codigo_turma is 'Código de turma. Sem valor informado, recebe 8 caracteres aleatórios de gerar_codigo_turma(), sem 0, O, 1 e I.';
