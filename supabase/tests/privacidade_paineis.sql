begin;
do $$
declare
  v_hoje date := (statement_timestamp() at time zone 'America/Fortaleza')::date;
  v_corte timestamptz := v_hoje::timestamp at time zone 'America/Fortaleza';
  v_ontem timestamptz := v_corte - interval '1 second';
  v_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  v_id uuid; v_bairro uuid; v_escola uuid := gen_random_uuid(); v_codigo text; v_turma text;
  v_trilha uuid := gen_random_uuid(); v_l1 uuid := gen_random_uuid(); v_l2 uuid := gen_random_uuid();
  v_q1 uuid := gen_random_uuid(); v_q2 uuid := gen_random_uuid(); v_q3 uuid := gen_random_uuid(); v_missao uuid := gen_random_uuid();
  v_p jsonb; v_i jsonb; v_antes jsonb;
begin
  if public.minimo_respondentes_percentual() <> 5 or public.minimo_participantes_ranking() <> 3 then raise exception 'Limiares incorretos'; end if;
  select id into v_bairro from public.bairros limit 1;
  insert into public.escolas(id,nome,bairro_id) values(v_escola,'Escola privacidade SQL',v_bairro)
    returning codigo_professor,codigo_turma into v_codigo,v_turma;
  foreach v_id in array v_ids loop insert into auth.users(id) values(v_id); end loop;
  update public.perfis set primeiro_nome='Teste', escola_id=v_escola, criado_em=v_corte-interval '2 days' where id=any(v_ids);
  update public.perfis set escola_verificada=true where id=any(v_ids[1:5]);
  -- Somente a fixture local escreve a data histórica, sob rollback. Não há
  -- parâmetro nem permissão no produto para retroagir a verificação.
  alter table public.perfis disable trigger registrar_data_verificacao_escola;
  update public.perfis set escola_verificada_em=v_ontem where id=any(v_ids[1:5]);
  alter table public.perfis enable trigger registrar_data_verificacao_escola;

  insert into public.trilhas(id,slug,titulo,descricao,tema,minutos,ordem) values(v_trilha,'privacidade-teste','Trilha teste','Descrição teste','Energia',3,99);
  insert into public.licoes(id,trilha_id,ordem,titulo,conteudo) values(v_l1,v_trilha,1,'Lição um','Texto'),(v_l2,v_trilha,2,'Lição dois','Texto');
  insert into public.perguntas(id,licao_id,ordem,enunciado,opcoes,indice_correto,explicacao) values
    (v_q1,v_l1,1,'Pergunta um','["Sim","Não"]',0,'Teste'),
    (v_q2,v_l1,2,'Pergunta dois','["Sim","Não"]',0,'Teste'),
    (v_q3,v_l2,1,'Pergunta três','["Sim","Não"]',0,'Teste');
  insert into public.missoes(id,slug,titulo,descricao,pontos,dias_necessarios,ordem) values(v_missao,'privacidade-teste','Missão teste','Descrição teste',10,3,99);
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) select unnest(v_ids[1:3]),v_l1,v_ontem;
  insert into public.missoes_registros(perfil_id,missao_id,dia,criado_em) select unnest(v_ids[1:3]),v_missao,v_hoje-1,v_ontem;
  insert into public.simulacoes(perfil_id,modo,consumo_kwh,resultado,criado_em)
    select unnest(v_ids[1:3]),'conta',100,'{"economiaHabitosMensal":10,"tarifaRkwh":1}'::jsonb,v_ontem;

  -- M1: três estudantes, todos erram; os 0% não podem ser exibidos.
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em)
    select unnest(v_ids[1:3]),v_q1,1,false,v_ontem,v_ontem;
  v_p := public.painel_professor(v_codigo); v_i := public.painel_impacto(v_hoje-1,v_hoje-1);
  if v_p#>'{quiz,respostas}' is distinct from '3'::jsonb or v_i#>'{aprendizado,respostasDoQuiz}' is distinct from '3'::jsonb
    or v_p#>'{quiz,percentualAcertos}' is distinct from 'null'::jsonb or v_i#>'{aprendizado,percentualAcertos}' is distinct from 'null'::jsonb
    or v_p#>'{quiz,perguntasMaisErradas}' is distinct from '[]'::jsonb then raise exception '3 respondentes expõem 0%% ou contagens foram ocultadas'; end if;
  -- Também protege o extremo homogêneo de 100% com três respondentes.
  update public.respostas set correta=true where pergunta_id=v_q1;
  if public.painel_professor(v_codigo)#>'{quiz,percentualAcertos}' is distinct from 'null'::jsonb
    or public.painel_impacto(v_hoje-1,v_hoje-1)#>'{aprendizado,percentualAcertos}' is distinct from 'null'::jsonb then raise exception '3 respondentes expõem 100%%'; end if;
  update public.respostas set correta=false where pergunta_id=v_q1;
  -- Seis respostas dos mesmos três estudantes não equivalem a 5 respondentes.
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em)
    select unnest(v_ids[1:3]),v_q2,1,false,v_ontem,v_ontem;
  v_p := public.painel_professor(v_codigo); v_i := public.painel_impacto(v_hoje-1,v_hoje-1);
  if v_p#>'{quiz,respostas}' is distinct from '6'::jsonb or v_p#>'{quiz,percentualAcertos}' is distinct from 'null'::jsonb
    or v_i#>'{aprendizado,percentualAcertos}' is distinct from 'null'::jsonb then raise exception 'Limiar contou respostas, não estudantes'; end if;

  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em) values(v_ids[4],v_q1,1,false,v_ontem,v_ontem);
  v_p := public.painel_professor(v_codigo); v_i := public.painel_impacto(v_hoje-1,v_hoje-1);
  if v_p#>'{quiz,percentualAcertos}' is distinct from 'null'::jsonb or v_i#>'{aprendizado,percentualAcertos}' is distinct from 'null'::jsonb
    or v_p#>'{quiz,perguntasMaisErradas}' is distinct from '[]'::jsonb then raise exception '4 respondentes expuseram percentual'; end if;
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em) values(v_ids[5],v_q1,1,false,v_ontem,v_ontem);
  v_p := public.painel_professor(v_codigo); v_i := public.painel_impacto(v_hoje-1,v_hoje-1);
  if v_p#>'{quiz,percentualAcertos}' is distinct from '0'::jsonb or v_i#>'{aprendizado,percentualAcertos}' is distinct from '0'::jsonb
    or jsonb_array_length(v_p#>'{quiz,perguntasMaisErradas}') <> 1
    or v_p#>>'{quiz,perguntasMaisErradas,0,perguntaId}' <> v_q1::text
    or v_p#>'{quiz,perguntasMaisErradas,0,percentualAcertos}' is distinct from '0'::jsonb then raise exception '5 respondentes não expõem o percentual autorizado, ou pergunta pequena exposta'; end if;
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em)
    select unnest(v_ids[4:5]),v_q2,1,false,v_ontem,v_ontem;
  v_antes := public.painel_professor(v_codigo);
  if v_antes->>'dadosAte' <> (v_hoje-1)::text or v_antes->>'atualizadoEm' <> to_char(v_corte at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') then raise exception 'Fechamento diário incorreto'; end if;

  -- M2: ações exatamente à meia-noite local já pertencem ao próximo lote.
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) select unnest(v_ids[1:5]),v_l2,v_corte;
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em)
    select unnest(v_ids[1:5]),v_q3,0,true,v_corte,v_corte;
  insert into public.simulacoes(perfil_id,modo,consumo_kwh,resultado,criado_em)
    select unnest(v_ids[1:5]),'conta',100,'{"economiaHabitosMensal":20,"tarifaRkwh":1}'::jsonb,v_corte;
  -- Retroativo enviado hoje e dia de hoje com criado_em antigo são excluídos.
  insert into public.missoes_registros(perfil_id,missao_id,dia,criado_em) select unnest(v_ids[1:5]),v_missao,v_hoje-2,v_corte;
  insert into public.missoes_registros(perfil_id,missao_id,dia,criado_em) select unnest(v_ids[1:5]),v_missao,v_hoje,v_ontem;
  if public.painel_professor(v_codigo) is distinct from v_antes then raise exception 'Ação de hoje mudou o painel de hoje'; end if;
  -- Perfil antigo que só entrou pelo código hoje não pode trazer seu histórico.
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) values(v_ids[6],v_l1,v_ontem);
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em) values(v_ids[6],v_q1,0,true,v_ontem,v_ontem);
  perform set_config('request.jwt.claim.sub',v_ids[6]::text,true);
  if not public.confirmar_turma(v_turma) then raise exception 'Verificação de teste falhou'; end if;
  if (select escola_verificada_em < v_corte from public.perfis where id=v_ids[6]) then raise exception 'Entrada de hoje foi retroagida'; end if;
  if public.painel_professor(v_codigo) is distinct from v_antes then raise exception 'Entrada de hoje alterou o painel'; end if;
  -- Reconfirmar um vínculo antigo não muda seu carimbo nem a inclusão no lote.
  perform set_config('request.jwt.claim.sub',v_ids[1]::text,true);
  perform public.confirmar_turma(v_turma);
  if (select escola_verificada_em from public.perfis where id=v_ids[1]) is distinct from v_ontem then raise exception 'Reconfirmação reiniciou a espera'; end if;
  if public.painel_professor(v_codigo) is distinct from v_antes then raise exception 'Reconfirmação alterou painel'; end if;
  -- Impacto continua incluindo as ações de hoje no seu período.
  v_i := public.painel_impacto(v_hoje,v_hoje);
  if v_i#>'{aprendizado,licoesConcluidas}' is distinct from '5'::jsonb or v_i#>'{aprendizado,percentualAcertos}' is distinct from '100'::jsonb
    or v_i#>'{simulacoes,salvas}' is distinct from '5'::jsonb then raise exception 'Corte diário afetou indevidamente o impacto'; end if;
  if has_column_privilege('authenticated','public.perfis','escola_verificada_em','UPDATE')
    or has_column_privilege('authenticated','public.perfis','escola_verificada_em','INSERT')
    or has_function_privilege('anon','public.painel_professor(text)','EXECUTE')
    or has_function_privilege('authenticated','public.painel_impacto(date,date)','EXECUTE') then raise exception 'Permissões indevidas'; end if;
end;
$$;
rollback;
