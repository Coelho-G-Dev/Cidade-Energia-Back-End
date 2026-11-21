begin;
do $$
declare
  v_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  v_id uuid; v_bairro uuid; v_escola uuid := gen_random_uuid(); v_trilha uuid := gen_random_uuid();
  v_licao uuid := gen_random_uuid(); v_licao2 uuid := gen_random_uuid(); v_pergunta uuid := gen_random_uuid(); v_missao uuid := gen_random_uuid();
  v_r jsonb;
begin
  select id into v_bairro from public.bairros limit 1;
  insert into public.escolas(id,nome,bairro_id) values(v_escola,'Escola de teste do impacto',v_bairro);
  foreach v_id in array v_ids loop insert into auth.users(id) values(v_id); end loop;
  update public.perfis set primeiro_nome='Teste', criado_em='2026-11-19T12:00:00Z', bairro_id=v_bairro, escola_id=v_escola where id=any(v_ids[1:4]);
  update public.perfis set escola_verificada=true where id=any(v_ids[1:4]);
  update public.perfis set eh_teste=true where id=v_ids[4];
  update public.perfis set criado_em='2026-11-19T12:00:00Z' where id=v_ids[5];

  insert into public.trilhas(id,slug,titulo,descricao,tema,minutos,ordem) values(v_trilha,'impacto-teste','Trilha teste','Descrição teste','Energia',3,99);
  insert into public.licoes(id,trilha_id,ordem,titulo,conteudo) values(v_licao,v_trilha,1,'Lição teste','Texto'),(v_licao2,v_trilha,2,'Lição dois','Texto');
  insert into public.perguntas(id,licao_id,ordem,enunciado,opcoes,indice_correto,explicacao) values(v_pergunta,v_licao,1,'Pergunta teste','["Sim","Não"]',0,'Explicação teste');
  insert into public.missoes(id,slug,titulo,descricao,pontos,dias_necessarios,ordem) values(v_missao,'impacto-teste','Missão teste','Descrição teste',10,2,99);

  -- Simulação anterior ao período e uma após o fechamento em São Luís não contam.
  insert into public.simulacoes(perfil_id,modo,consumo_kwh,resultado,criado_em) values
    (v_ids[1],'conta',100,'{"economiaHabitosMensal":1000,"tarifaRkwh":1}','2026-11-20T02:59:59Z'),
    (v_ids[1],'conta',100,'{"economiaHabitosMensal":1000,"tarifaRkwh":1}','2026-11-21T03:00:00Z'),
    (v_ids[1],'conta',100,'{"economiaHabitosMensal":1,"tarifaRkwh":1}','2026-11-20T03:00:00Z'),
    (v_ids[1],'conta',100,'{"economiaHabitosMensal":31.2,"tarifaRkwh":0.8}','2026-11-21T02:59:59Z'),
    (v_ids[3],'aparelhos',100,'{"economiaHabitosMensal":0,"gastoMensal":50,"consumoKwh":100}','2026-11-20T13:00:00Z'),
    (v_ids[4],'conta',100,'{"economiaHabitosMensal":10000,"tarifaRkwh":1}','2026-11-20T13:00:00Z'),
    (v_ids[5],'conta',100,'{"economiaHabitosMensal":10000,"tarifaRkwh":1}','2026-11-20T13:00:00Z');
  insert into public.simulacoes(perfil_id,modo,consumo_kwh,valor_conta,resultado,criado_em)
    values(v_ids[2],'conta',100,100,'{"economiaHabitosMensal":10}','2026-11-20T12:00:00Z');
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) select unnest(v_ids[1:2]),v_licao,'2026-11-20T12:00:00Z'::timestamptz;
  v_r := public.painel_impacto('2026-11-20','2026-11-20');
  if v_r#>'{estudantes,comPerfil}' <> '3'::jsonb or v_r#>'{aprendizado,licoesConcluidas}' <> 'null'::jsonb then
    raise exception 'Perfis excluídos ou recorte pequeno incorreto'; end if;
  if v_r#>'{simulacoes,salvas}' <> '4'::jsonb or v_r#>'{economiaEstimada,potencialHabitos,reaisMes}' <> '41.2'::jsonb
    or v_r#>'{economiaEstimada,potencialHabitos,kwhMes}' <> '49'::jsonb then raise exception 'Última simulação/tarifa/período incorretos'; end if;

  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) values(v_ids[3],v_licao,'2026-11-20T12:00:00Z');
  insert into public.progresso_licoes(perfil_id,licao_id,concluida_em) select unnest(v_ids[1:3]),v_licao2,'2026-11-19T12:00:00Z'::timestamptz;
  insert into public.respostas(perfil_id,pergunta_id,opcao,correta,criado_em,tentativa_em)
    select x,v_pergunta,0,x<>v_ids[2],'2026-11-20T12:00:00Z'::timestamptz,'2026-11-20T12:00:00Z'::timestamptz from unnest(v_ids[1:3]) x;
  insert into public.missoes_registros(perfil_id,missao_id,dia)
    select x,v_missao,d from unnest(v_ids[1:3]) x cross join (values('2026-11-19'::date),('2026-11-20'::date)) ds(d);
  v_r := public.painel_impacto('2026-11-20','2026-11-20');
  if v_r#>'{aprendizado,licoesConcluidas}' <> '3'::jsonb or v_r#>'{aprendizado,trilhasConcluidas}' <> '3'::jsonb
     or v_r#>'{aprendizado,percentualAcertos}' <> 'null'::jsonb or v_r#>'{missoes,registros}' <> '3'::jsonb
     or v_r#>'{missoes,concluidas}' <> '3'::jsonb or v_r#>'{escolas,comEstudantes}' <> '1'::jsonb
     or v_r#>'{escolas,comTurma}' <> '1'::jsonb or v_r#>'{bairros,comEstudantes}' <> '1'::jsonb then raise exception 'Totais incorretos'; end if;
  if position(v_ids[1]::text in v_r::text) > 0 or v_r ? 'perfis' then raise exception 'Perfil individual exposto'; end if;
  update public.perfis set eh_teste=true where id=v_ids[3];
  v_r := public.painel_impacto('2026-11-20','2026-11-20');
  if v_r#>'{estudantes,comPerfil}' <> 'null'::jsonb or v_r#>'{economiaEstimada,potencialHabitos,reaisMes}' <> 'null'::jsonb
    or v_r#>'{escolas,comEstudantes}' <> 'null'::jsonb then raise exception 'Grupo de 2 exposto'; end if;
  update public.perfis set eh_teste=false where id=v_ids[3];
  insert into public.simulacoes(perfil_id,modo,consumo_kwh,resultado,criado_em)
    values(v_ids[3],'aparelhos',100,'{}','2026-11-20T23:00:00Z');
  v_r := public.painel_impacto('2026-11-20','2026-11-20');
  if v_r#>'{economiaEstimada,potencialHabitos,estudantes}' <> 'null'::jsonb then raise exception 'Simulação inválida substituída por anterior'; end if;
  if public.valor_agregado(0,3) <> 0 or public.valor_agregado(0,2) is not null then raise exception 'Zero e ocultação confundidos'; end if;
  if has_function_privilege('anon','public.painel_impacto(date,date)','EXECUTE')
    or has_function_privilege('authenticated','public.painel_impacto(date,date)','EXECUTE') then raise exception 'RPC pública'; end if;
end;
$$;
rollback;
