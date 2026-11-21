create function public.gerar_codigo_professor()
returns text language plpgsql volatile set search_path = '' as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_codigo text := '';
  v_posicao integer;
begin
  foreach v_posicao in array array[0,1,2,3,4,5,6,7,8,9,10,11] loop
    v_codigo := v_codigo || substr(v_alfabeto, get_byte(v_bytes, v_posicao) % 32 + 1, 1);
  end loop;
  return v_codigo;
end;
$$;
revoke execute on function public.gerar_codigo_professor() from public, anon, authenticated;
grant execute on function public.gerar_codigo_professor() to service_role;

alter table public.escolas add column codigo_professor text unique
  default public.gerar_codigo_professor()
  check (codigo_professor ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$');
alter table public.escolas add constraint escola_ativa_codigo_professor
  check (not ativa or codigo_professor is not null);
revoke select (codigo_professor) on public.escolas from public, anon, authenticated;

-- O resolvedor de estudantes consulta exclusivamente codigo_turma e recusa
-- explicitamente qualquer código atual de professor, mesmo em caso de colisão.
create or replace function public.resolver_codigo_turma(p_codigo text)
returns uuid language sql stable security definer set search_path = '' as $$
  select e.id from public.escolas e
  where e.codigo_turma = upper(trim(p_codigo)) and e.ativa
    and not exists (select 1 from public.escolas p where p.codigo_professor = upper(trim(p_codigo)));
$$;

create or replace function public.confirmar_turma(p_codigo text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_escola uuid;
begin
  v_escola := public.resolver_codigo_turma(p_codigo);
  if v_escola is null then return false; end if;
  update public.perfis set escola_verificada = true
    where id = (select auth.uid()) and escola_id = v_escola;
  return found;
end;
$$;

create function public.trocar_codigo_professor(p_inep text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.escolas set codigo_professor = public.gerar_codigo_professor()
    where codigo_inep = p_inep and ativa;
  if not found then raise exception 'Escola não encontrada'; end if;
end;
$$;
revoke execute on function public.trocar_codigo_professor(text) from public, anon, authenticated;
grant execute on function public.trocar_codigo_professor(text) to service_role;
