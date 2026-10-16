create function public.regras_trocas_local(out limite integer, out janela interval)
language sql
immutable
set search_path = ''
as $$
  select 3, interval '30 days';
$$;
revoke execute on function public.regras_trocas_local() from public, anon;
grant execute on function public.regras_trocas_local() to authenticated, service_role;

create or replace function public.limitar_trocas_de_local()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite integer;
  v_janela interval;
  v_trocas integer;
  v_mais_antiga timestamptz;
begin
  if not (
    (old.bairro_id is not null and new.bairro_id is distinct from old.bairro_id)
    or (old.escola_id is not null and new.escola_id is distinct from old.escola_id)
  ) then
    return new;
  end if;

  select r.limite, r.janela into v_limite, v_janela from public.regras_trocas_local() r;

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

create view public.situacao_trocas with (security_invoker = true) as
select
  p.id as perfil_id,
  r.limite,
  greatest(r.limite - count(t.id), 0)::integer as trocas_restantes,
  case when count(t.id) >= r.limite then min(t.trocado_em) + r.janela end as proxima_troca_em
from public.perfis p
cross join public.regras_trocas_local() r
left join public.trocas_local t on t.perfil_id = p.id and t.trocado_em > now() - r.janela
group by p.id, r.limite, r.janela;

revoke all on public.situacao_trocas from anon, authenticated;
grant select on public.situacao_trocas to authenticated;

comment on table public.trocas_local is 'Histórico de trocas de bairro ou escola. O limite fica em regras_trocas_local() e é aplicado pelo trigger antes_de_trocar_local.';
