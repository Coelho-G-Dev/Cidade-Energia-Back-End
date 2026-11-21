-- A base da ocultação é o número de estudantes, não o valor do indicador.
create function public.valor_agregado(p_valor numeric, p_estudantes bigint)
returns numeric language sql stable set search_path = '' as $$
  select case when p_estudantes >= public.minimo_participantes_ranking() then p_valor end;
$$;
revoke execute on function public.valor_agregado(numeric, bigint) from public, anon, authenticated;
grant execute on function public.valor_agregado(numeric, bigint) to service_role;

create function public.painel_impacto(p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := p_de::timestamp at time zone 'America/Fortaleza';
  v_fim timestamptz := (p_ate + 1)::timestamp at time zone 'America/Fortaleza';
begin
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de >= 366 then
    raise exception 'Período inválido';
  end if;
  return (
  with elegiveis as materialized (
    select p.id, p.escola_id, p.bairro_id, p.escola_verificada, p.criado_em from public.perfis p
    where not p.eh_teste and nullif(trim(p.primeiro_nome), '') is not null and p.criado_em < v_fim
  ), pl_historico as materialized (
    select pl.* from public.progresso_licoes pl join elegiveis p on p.id = pl.perfil_id where pl.concluida_em < v_fim
  ), pl as materialized (
    select * from pl_historico where concluida_em >= v_inicio
  ), quiz as materialized (
    select r.* from public.respostas r join elegiveis p on p.id = r.perfil_id
    where r.criado_em >= v_inicio and r.criado_em < v_fim
  ), simulacoes as materialized (
    select s.* from public.simulacoes s join elegiveis p on p.id = s.perfil_id
    where s.criado_em >= v_inicio and s.criado_em < v_fim
  ), ultimas as (
    select distinct on (perfil_id) * from simulacoes order by perfil_id, criado_em desc, id desc
  ), valores_ultimas as (
    select perfil_id,
      case when jsonb_typeof(resultado->'economiaHabitosMensal') = 'number'
        then (resultado->>'economiaHabitosMensal')::numeric end as reais,
      coalesce(
        case when jsonb_typeof(resultado->'tarifaRkwh') = 'number' then (resultado->>'tarifaRkwh')::numeric end,
        valor_conta / nullif(consumo_kwh, 0),
        case when jsonb_typeof(resultado->'gastoMensal') = 'number' and jsonb_typeof(resultado->'consumoKwh') = 'number'
          then (resultado->>'gastoMensal')::numeric / nullif((resultado->>'consumoKwh')::numeric, 0) end
      ) as tarifa
    from ultimas
  ), potencial as (
    select count(*) as estudantes, sum(reais) as reais, sum(reais / tarifa) as kwh
    from valores_ultimas where reais >= 0 and tarifa > 0
  ), registros_historico as materialized (
    select r.*, row_number() over (partition by r.perfil_id, r.missao_id order by r.dia) as numero_dia
    from public.missoes_registros r join elegiveis p on p.id = r.perfil_id where r.dia <= p_ate
  ), registros as materialized (
    select * from registros_historico where dia >= p_de
  ), missoes_concluidas as (
    select r.perfil_id from registros r join public.missoes m on m.id = r.missao_id where r.numero_dia = m.dias_necessarios
  ), trilhas_concluidas as (
    select p.perfil_id, l.trilha_id from pl_historico p join public.licoes l on l.id = p.licao_id
    group by p.perfil_id, l.trilha_id
    having count(*) = (select count(*) from public.licoes li where li.trilha_id = l.trilha_id)
      and max(p.concluida_em) >= v_inicio
  ), ativos as (
    select id from elegiveis where criado_em >= v_inicio
    union select perfil_id from pl
    union select perfil_id from quiz
    union select perfil_id from registros
    union select perfil_id from simulacoes
    union select e.perfil_id from public.pontos_eventos e join elegiveis p on p.id = e.perfil_id
      where e.criado_em >= v_inicio and e.criado_em < v_fim
  ), escolas as (
    select p.escola_id, count(*) as estudantes from elegiveis p join public.escolas e on e.id = p.escola_id and e.ativa
    group by p.escola_id having count(*) >= public.minimo_participantes_ranking()
  ), escolas_verificadas as (
    select p.escola_id, count(*) as estudantes from elegiveis p join public.escolas e on e.id = p.escola_id and e.ativa
    where p.escola_verificada group by p.escola_id having count(*) >= public.minimo_participantes_ranking()
  ), bairros as (
    select bairro_id, count(*) as estudantes from elegiveis where bairro_id is not null
    group by bairro_id having count(*) >= public.minimo_participantes_ranking()
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('de', p_de, 'ate', p_ate),
    'estudantes', jsonb_build_object(
      'comPerfil', (select public.valor_agregado(count(*), count(*)) from elegiveis),
      'ativosNoPeriodo', (select public.valor_agregado(count(*), count(*)) from ativos),
      'verificadosPorTurma', (select public.valor_agregado(count(*), count(*)) from elegiveis where escola_id is not null and escola_verificada)),
    'escolas', jsonb_build_object(
      'comEstudantes', (select public.valor_agregado(count(*), coalesce(sum(estudantes), 0)::bigint) from escolas),
      'comTurma', (select public.valor_agregado(count(*), coalesce(sum(estudantes), 0)::bigint) from escolas_verificadas)),
    'bairros', jsonb_build_object('comEstudantes', (select public.valor_agregado(count(*), coalesce(sum(estudantes), 0)::bigint) from bairros)),
    'aprendizado', jsonb_build_object(
      'licoesConcluidas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from pl),
      'trilhasConcluidas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from trilhas_concluidas),
      'respostasDoQuiz', (select public.valor_agregado(count(*), count(distinct perfil_id)) from quiz),
      'percentualAcertos', (select public.valor_agregado(round(100.0 * count(*) filter (where correta) / nullif(count(*),0), 1), count(distinct perfil_id)) from quiz)),
    'missoes', jsonb_build_object(
      'registros', (select public.valor_agregado(count(*), count(distinct perfil_id)) from registros),
      'concluidas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from missoes_concluidas)),
    'simulacoes', jsonb_build_object(
      'salvas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from simulacoes),
      'estudantesQueSimularam', (select public.valor_agregado(count(distinct perfil_id), count(distinct perfil_id)) from simulacoes)),
    'economiaEstimada', jsonb_build_object('potencialHabitos', (select jsonb_build_object(
      'reaisMes', public.valor_agregado(reais, estudantes), 'kwhMes', public.valor_agregado(kwh, estudantes),
      'estudantes', public.valor_agregado(estudantes, estudantes)) from potencial)),
    'estimativa', true,
    'atualizadoEm', to_char(statement_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ));
end;
$$;
revoke execute on function public.painel_impacto(date, date) from public, anon, authenticated;
grant execute on function public.painel_impacto(date, date) to service_role;
