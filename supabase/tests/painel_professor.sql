begin;
do $$
declare
  v_escola uuid := gen_random_uuid(); v_bairro uuid; v_codigo text;
  v_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  v_id uuid; v_licao uuid; v_pergunta uuid; v_resultado jsonb;
  v_ontem timestamptz := ((statement_timestamp() at time zone 'America/Fortaleza')::date::timestamp at time zone 'America/Fortaleza') - interval '1 second';
begin
  select id into v_bairro from public.bairros limit 1;
  insert into public.escolas(id,nome,bairro_id) values(v_escola,'Escola SQL de teste',v_bairro) returning codigo_professor into v_codigo;
  foreach v_id in array v_ids loop
    insert into auth.users(id) values(v_id);
  end loop;
  update public.perfis set primeiro_nome = 'Teste', escola_id = v_escola where id = any(v_ids[1:4]);
  update public.perfis set escola_id = v_escola where id = v_ids[5];
  update public.perfis set escola_verificada = true where id = any(v_ids);
  update public.perfis set escola_verificada = false where id = v_ids[3];
  update public.perfis set eh_teste = true where id = v_ids[4];
  alter table public.perfis disable trigger registrar_data_verificacao_escola;
  update public.perfis set criado_em = v_ontem, escola_verificada_em = case when escola_verificada then v_ontem end where id = any(v_ids);
  alter table public.perfis enable trigger registrar_data_verificacao_escola;
  v_resultado := public.painel_professor(v_codigo);
  if v_resultado->'estudantes' <> 'null'::jsonb or v_resultado->'oculto' <> 'true'::jsonb
     or v_resultado->'progresso' <> 'null'::jsonb or v_resultado->'quiz' <> 'null'::jsonb
     or v_resultado->'missoes' <> 'null'::jsonb or v_resultado->'simulacoes' <> 'null'::jsonb then
    raise exception 'Escola pequena exposta';
  end if;
  update public.perfis set escola_verificada = true where id = v_ids[3];
  alter table public.perfis disable trigger registrar_data_verificacao_escola;
  update public.perfis set escola_verificada_em = v_ontem where id = v_ids[3];
  alter table public.perfis enable trigger registrar_data_verificacao_escola;
  select id into v_licao from public.licoes limit 1;
  select id into v_pergunta from public.perguntas where licao_id = v_licao limit 1;
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) select unnest(v_ids[1:2]),v_licao,v_ontem;
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em) select unnest(v_ids[1:2]),v_pergunta,0,false,v_ontem,v_ontem;
  v_resultado := public.painel_professor(v_codigo);
  if v_resultado->'estudantes' <> '3'::jsonb or v_resultado#>'{progresso,licoesConcluidas}' <> 'null'::jsonb
     or v_resultado#>'{quiz,perguntasMaisErradas}' <> '[]'::jsonb then raise exception 'Recorte pequeno exposto'; end if;
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) values(v_ids[3],v_licao,v_ontem);
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em) values(v_ids[3],v_pergunta,0,true,v_ontem,v_ontem);
  v_resultado := public.painel_professor(v_codigo);
  if v_resultado#>'{progresso,licoesConcluidas}' <> '3'::jsonb
     or v_resultado#>'{quiz,percentualAcertos}' <> 'null'::jsonb
     or jsonb_array_length(v_resultado#>'{quiz,perguntasMaisErradas}') <> 0 then raise exception 'Agregados incorretos'; end if;
  if public.painel_professor('INVALIDO') is not null then raise exception 'Código errado aceito'; end if;
  if public.painel_professor((select codigo_turma from public.escolas where id = v_escola)) is not null then raise exception 'Código estudante aceito'; end if;
  update public.escolas set ativa = false where id = v_escola;
  if public.painel_professor(v_codigo) is not null then raise exception 'Escola inativa aceita'; end if;
  if has_function_privilege('anon', 'public.painel_professor(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.painel_professor(text)', 'EXECUTE') then raise exception 'RPC pública'; end if;
end;
$$;
rollback;
