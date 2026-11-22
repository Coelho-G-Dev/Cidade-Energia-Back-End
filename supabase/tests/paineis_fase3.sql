begin;
do $$
declare
  v_hoje date := (statement_timestamp() at time zone 'America/Fortaleza')::date;
  v_corte timestamptz := v_hoje::timestamp at time zone 'America/Fortaleza';
  v_ontem timestamptz := v_corte-interval '1 second';
  v_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  v_t uuid:=gen_random_uuid(); v_t2 uuid:=gen_random_uuid(); v_e uuid:=gen_random_uuid(); v_b uuid; v_codigo text; v_id uuid; v_uso bigint;
  v_n integer; v_j integer; v_extra integer; v_p jsonb; v_i jsonb; v_d jsonb; v_antes jsonb;
begin
  select id into v_b from public.bairros limit 1;
  insert into public.escolas(id,nome,bairro_id) values(v_e,'Escola pares fictícios',v_b) returning codigo_professor into v_codigo;
  insert into public.trilhas(id,slug,titulo,descricao,tema,minutos,ordem) values
    (v_t,'pares-ficticios','[FICTÍCIO] Pares','Teste local','Energia',3,99),(v_t2,'outros-pares-ficticios','[FICTÍCIO] Outros','Teste local','Energia',3,100);
  insert into public.perguntas_diagnostico(trilha_id,ordem,enunciado,opcoes,indice_correto,explicacao,fonte)
    select t,n,'[FICTÍCIO] Pergunta de teste','["A","B"]'::jsonb,0,'[FICTÍCIO] Teste','[FICTÍCIO] Fixture local' from unnest(array[v_t,v_t2]) t cross join generate_series(1,4) n;
  foreach v_id in array v_ids loop insert into auth.users(id) values(v_id); end loop;
  update public.perfis set primeiro_nome='Teste',escola_id=v_e,escola_verificada=true,criado_em=v_corte-interval '3 days' where id=any(v_ids);
  -- Trocar de escola desverifica; a confirmação fica em atualização separada.
  update public.perfis set escola_verificada=true where id=any(v_ids);
  alter table public.perfis disable trigger registrar_data_verificacao_escola;
  update public.perfis set escola_verificada_em=v_ontem where id=any(v_ids);
  alter table public.perfis enable trigger registrar_data_verificacao_escola;
  update public.perfis set eh_teste=true where id=v_ids[7];
  update public.perfis set escola_verificada=false where id=v_ids[8];
  update public.perfis set primeiro_nome=null where id=v_ids[9];
  -- Um antes sem depois não é par; três perfis inelegíveis têm pares completos.
  insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta,respondida_em)
    select p,q.id,'antes',0,q.ordem<=2,v_corte-interval '2 days' from unnest(array[v_ids[6],v_ids[10],v_ids[11]]) p cross join public.perguntas_diagnostico q where q.trilha_id=v_t;
  insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta,respondida_em)
    select p,q.id,m,0,true,v_ontem from unnest(v_ids[7:9]) p cross join public.perguntas_diagnostico q cross join unnest(array['antes','depois']) m where q.trilha_id=v_t;
  for v_n in 1..5 loop
    insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta,respondida_em)
      select v_ids[v_n],q.id,m,0,case when m='antes' then q.ordem<=2 else true end,v_ontem
      from public.perguntas_diagnostico q cross join unnest(array['antes','depois']) m where q.trilha_id=v_t;
    insert into public.tutor_uso(perfil_id,criado_em) values(v_ids[v_n],v_ontem) returning id into v_uso;
    insert into public.tutor_avaliacoes(tutor_uso_id,util,criado_em) values(v_uso,v_n<>1,v_ontem);
    if v_n=2 then
      -- Dois pares adicionais dos mesmos estudantes não aumentam o total distinto.
      insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta,respondida_em)
        select p,q.id,m,0,case when m='antes' then q.ordem<=2 else true end,v_ontem
        from unnest(v_ids[1:2]) p cross join public.perguntas_diagnostico q cross join unnest(array['antes','depois']) m where q.trilha_id=v_t2;
      for v_extra in 1..2 loop
        insert into public.tutor_uso(perfil_id,criado_em) values(v_ids[1],v_ontem) returning id into v_uso;
        insert into public.tutor_avaliacoes(tutor_uso_id,util,criado_em) values(v_uso,true,v_ontem);
      end loop;
    end if;
    if v_n<2 then continue; end if;
    v_p:=public.painel_professor(v_codigo); v_i:=public.painel_impacto(v_hoje-1,v_hoje-1);
    select x into v_d from jsonb_array_elements(v_p->'diagnostico') x where x->>'slug'='pares-ficticios';
    if (select x from jsonb_array_elements(v_i#>'{aprendizado,diagnostico,porTrilha}') x where x->>'slug'='pares-ficticios') is distinct from v_d then raise exception 'Recorte por trilha diverge entre painéis'; end if;
    if v_d->'estudantes' is distinct from (case when v_n>=3 then to_jsonb(v_n) else 'null'::jsonb end)
      or v_i#>'{aprendizado,diagnostico,estudantes}' is distinct from (case when v_n>=3 then to_jsonb(v_n) else 'null'::jsonb end) then raise exception 'Contagem de pares falhou com % estudantes',v_n; end if;
    if v_d->'acertoMedioAntes' is distinct from (case when v_n>=5 then '50'::jsonb else 'null'::jsonb end)
      or v_d->'acertoMedioDepois' is distinct from (case when v_n>=5 then '100'::jsonb else 'null'::jsonb end)
      or v_i#>'{aprendizado,diagnostico,acertoMedioAntes}' is distinct from (case when v_n>=5 then '50'::jsonb else 'null'::jsonb end)
      or v_i#>'{aprendizado,diagnostico,acertoMedioDepois}' is distinct from (case when v_n>=5 then '100'::jsonb else 'null'::jsonb end) then raise exception 'Percentuais de pares falharam com % estudantes',v_n; end if;
    if v_i#>'{energinho,respostasAvaliadas}' is distinct from (case when v_n>=3 then to_jsonb(v_n+2) else 'null'::jsonb end)
      or v_i#>'{energinho,percentualUtil}' is distinct from (case when v_n>=5 then '85.7'::jsonb else 'null'::jsonb end) then raise exception 'Votos contaram respostas em vez de estudantes: %',v_n; end if;
  end loop;
  v_antes:=public.painel_professor(v_codigo);
  -- O depois de hoje não entra no professor; impacto filtra pela data do depois,
  -- mesmo com antes dois dias mais antigo.
  insert into public.respostas_diagnostico(perfil_id,pergunta_id,momento,opcao,correta,respondida_em)
    select p,q.id,'depois',0,true,v_corte from unnest(array[v_ids[6],v_ids[10],v_ids[11]]) p cross join public.perguntas_diagnostico q where q.trilha_id=v_t;
  if public.painel_professor(v_codigo) is distinct from v_antes then raise exception 'Diagnóstico de hoje alterou painel de ontem'; end if;
  v_i:=public.painel_impacto(v_hoje,v_hoje);
  if v_i#>'{aprendizado,diagnostico,estudantes}' is distinct from '3'::jsonb or v_i#>'{aprendizado,diagnostico,acertoMedioDepois}' is distinct from 'null'::jsonb then raise exception 'Filtro não usou data do depois'; end if;
  update public.perfis set eh_teste=true where id=any(v_ids);
  v_p:=public.painel_professor(v_codigo);
  if v_p->'diagnostico' is distinct from 'null'::jsonb then raise exception 'Escola oculta expôs diagnóstico'; end if;
  if has_table_privilege('service_role','public.pares_diagnostico_internos','SELECT')
    or has_function_privilege('anon','public.painel_professor(text)','EXECUTE')
    or has_function_privilege('authenticated','public.painel_impacto(date,date)','EXECUTE') then raise exception 'Permissões expõem dados internos'; end if;
end;
$$;
rollback;
