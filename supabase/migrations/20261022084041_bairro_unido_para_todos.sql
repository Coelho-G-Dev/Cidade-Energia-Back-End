create function public.conceder_bairro_unido(p_bairro uuid, p_pontos_minimos integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pontos bigint;
  v_concedidas integer;
begin
  select r.pontos into v_pontos from public.ranking_bairros r where r.bairro_id = p_bairro;
  if coalesce(v_pontos, 0) < p_pontos_minimos then
    return 0;
  end if;

  insert into public.conquistas_usuario (perfil_id, conquista_slug)
  select p.id, 'bairro_unido'
  from public.perfis p
  where p.bairro_id = p_bairro
    and not p.eh_teste
    and exists (select 1 from public.pontos_eventos e where e.perfil_id = p.id)
  on conflict do nothing;

  get diagnostics v_concedidas = row_count;
  return v_concedidas;
end;
$$;
revoke execute on function public.conceder_bairro_unido(uuid, integer) from public, anon, authenticated;
grant execute on function public.conceder_bairro_unido(uuid, integer) to service_role;

comment on function public.conceder_bairro_unido(uuid, integer) is
  'Dá a conquista Bairro unido a todos os estudantes com pontos do bairro, quando o bairro atinge a meta no ranking. Só o servidor chama.';
