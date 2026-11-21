begin;
do $$
declare v_codigo text; v_inep text; v_novo text;
begin
  if exists (select 1 from public.escolas where ativa and (codigo_professor is null or codigo_professor !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$')) then
    raise exception 'Escola ativa sem código válido';
  end if;
  if has_column_privilege('anon', 'public.escolas', 'codigo_professor', 'SELECT')
     or has_column_privilege('authenticated', 'public.escolas', 'codigo_professor', 'SELECT') then
    raise exception 'Código legível pelos estudantes';
  end if;
  if has_function_privilege('anon', 'public.trocar_codigo_professor(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.trocar_codigo_professor(text)', 'EXECUTE') then
    raise exception 'Troca liberada para estudante';
  end if;
  select codigo_professor, codigo_inep into v_codigo, v_inep from public.escolas where ativa and codigo_inep is not null limit 1;
  if v_codigo is null then raise exception 'Seed sem escola ativa'; end if;
  if public.resolver_codigo_turma(v_codigo) is not null or public.confirmar_turma(v_codigo) then
    raise exception 'Código do professor aceito para estudante';
  end if;
  perform public.trocar_codigo_professor(v_inep);
  select codigo_professor into v_novo from public.escolas where codigo_inep = v_inep;
  if v_codigo = v_novo then raise exception 'Código não trocado'; end if;
end;
$$;
rollback;
