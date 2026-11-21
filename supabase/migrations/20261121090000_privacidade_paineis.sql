-- D-012: percentuais exigem 5 respondentes distintos; contagens seguem k = 3.
create function public.minimo_respondentes_percentual()
returns integer language sql immutable set search_path = '' as $$ select 5; $$;
revoke execute on function public.minimo_respondentes_percentual() from public, anon, authenticated;
grant execute on function public.minimo_respondentes_percentual() to service_role;

alter table public.perfis add column escola_verificada_em timestamptz;
-- Não havia data de verificação. Não presumimos que ela aconteceu na criação do
-- perfil: os vínculos legados só entram no painel a partir do dia seguinte.
update public.perfis set escola_verificada_em = statement_timestamp() where escola_verificada;

create function public.registrar_data_verificacao_escola()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.escola_verificada or new.escola_id is null then
    new.escola_verificada_em := null;
  elsif tg_op = 'INSERT' then
    new.escola_verificada_em := statement_timestamp();
  elsif not old.escola_verificada or new.escola_id is distinct from old.escola_id then
    new.escola_verificada_em := statement_timestamp();
  else
    -- Reconfirmar o mesmo código ou editar o nome não reinicia a espera.
    new.escola_verificada_em := old.escola_verificada_em;
  end if;
  return new;
end;
$$;
revoke execute on function public.registrar_data_verificacao_escola() from public, anon, authenticated;
-- Dispara depois de antes_de_trocar_escola, que pode desligar a verificação.
create trigger registrar_data_verificacao_escola before insert or update on public.perfis
  for each row execute function public.registrar_data_verificacao_escola();
revoke insert (escola_verificada_em), update (escola_verificada_em) on public.perfis from anon, authenticated;
comment on column public.perfis.escola_verificada_em is
  'D-012: data da entrada verificada na escola; somente o banco escreve. Legados sem data recebem a hora da migration como limite conservador, não como data histórica real.';

create or replace function public.painel_professor(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
with corte as (
  select (statement_timestamp() at time zone 'America/Fortaleza')::date as hoje,
    (statement_timestamp() at time zone 'America/Fortaleza')::date::timestamp at time zone 'America/Fortaleza' as fim
), escola as (
  select e.id, e.nome, b.nome as bairro, e.codigo_turma
  from public.escolas e join public.bairros b on b.id = e.bairro_id
  where e.codigo_professor = upper(trim(p_codigo)) and e.ativa
), elegiveis as materialized (
  select p.id from public.perfis p join escola e on e.id = p.escola_id cross join corte c
  where p.escola_verificada and not p.eh_teste and nullif(trim(p.primeiro_nome), '') is not null
    and p.criado_em < c.fim and p.escola_verificada_em < c.fim
), base as (
  select count(*) as n, public.minimo_participantes_ranking() as k from elegiveis
), progresso as materialized (
  select pl.* from public.progresso_licoes pl join elegiveis p on p.id = pl.perfil_id cross join corte c
  where pl.concluida_em < c.fim
), quiz as materialized (
  -- respostas guarda apenas a primeira tentativa (chave perfil_id, pergunta_id).
  select r.* from public.respostas r join elegiveis p on p.id = r.perfil_id cross join corte c
  where r.criado_em < c.fim and r.tentativa_em < c.fim
), registros as materialized (
  select r.* from public.missoes_registros r join elegiveis p on p.id = r.perfil_id cross join corte c
  where r.criado_em < c.fim and r.dia < c.hoje
), trilha_por_estudante as (
  select l.trilha_id, p.perfil_id, count(*) as concluidas
  from progresso p join public.licoes l on l.id = p.licao_id group by l.trilha_id, p.perfil_id
), trilhas as (
  select t.ordem, t.slug, t.titulo, count(distinct l.id) as total,
    (select count(*) from trilha_por_estudante p where p.trilha_id = t.id) as comecaram,
    (select count(*) from trilha_por_estudante p where p.trilha_id = t.id
      and p.concluidas = (select count(*) from public.licoes li where li.trilha_id = t.id)) as concluiram
  from public.trilhas t left join public.licoes l on l.trilha_id = t.id group by t.id
), perguntas as (
  select q.id, q.enunciado, l.titulo, count(*) as respostas,
    round(100.0 * count(*) filter (where r.correta) / count(*), 1) as percentual
  from quiz r join public.perguntas q on q.id = r.pergunta_id join public.licoes l on l.id = q.licao_id
  group by q.id, l.titulo having count(distinct r.perfil_id) >= public.minimo_respondentes_percentual()
  order by percentual, q.id limit 5
), missoes_por_estudante as (
  select missao_id, perfil_id, count(*) as dias from registros group by missao_id, perfil_id
), missoes as (
  select m.ordem, m.slug, m.titulo, count(p.perfil_id) as comecaram,
    count(p.perfil_id) filter (where p.dias >= m.dias_necessarios) as concluiram, coalesce(sum(p.dias), 0) as dias
  from public.missoes m left join missoes_por_estudante p on p.missao_id = m.id group by m.id
)
select jsonb_build_object(
  'escola', jsonb_build_object('nome', e.nome, 'bairro', e.bairro, 'codigoEstudante', e.codigo_turma),
  'estudantes', case when b.n >= b.k then b.n end, 'oculto', b.n < b.k,
  'progresso', case when b.n >= b.k then jsonb_build_object(
    'licoesConcluidas', (select case when count(distinct perfil_id) >= b.k then count(*) end from progresso),
    'mediaLicoesPorEstudante', (select case when count(distinct perfil_id) >= b.k then round(count(*)::numeric / b.n, 1) end from progresso),
    'trilhas', (select coalesce(jsonb_agg(jsonb_build_object('slug', t.slug, 'titulo', t.titulo, 'totalLicoes', t.total,
      'estudantesQueComecaram', case when t.comecaram >= b.k then t.comecaram end,
      'estudantesQueConcluiram', case when t.concluiram >= b.k then t.concluiram end) order by t.ordem, t.slug), '[]') from trilhas t)) end,
  'quiz', case when b.n >= b.k then jsonb_build_object(
    'respostas', (select case when count(distinct perfil_id) >= b.k then count(*) end from quiz),
    'percentualAcertos', (select case when count(distinct perfil_id) >= public.minimo_respondentes_percentual()
      then round(100.0 * count(*) filter (where correta) / nullif(count(*), 0), 1) end from quiz),
    'perguntasMaisErradas', (select coalesce(jsonb_agg(jsonb_build_object('perguntaId', p.id, 'enunciado', p.enunciado,
      'licaoTitulo', p.titulo, 'respostas', p.respostas, 'percentualAcertos', p.percentual) order by p.percentual, p.id), '[]') from perguntas p)) end,
  'missoes', case when b.n >= b.k then (select coalesce(jsonb_agg(jsonb_build_object('slug', m.slug, 'titulo', m.titulo,
    'estudantesQueComecaram', case when m.comecaram >= b.k then m.comecaram end,
    'estudantesQueConcluiram', case when m.concluiram >= b.k then m.concluiram end,
    'diasRegistrados', case when m.comecaram >= b.k then m.dias end) order by m.ordem, m.slug), '[]') from missoes m) end,
  'simulacoes', case when b.n >= b.k then jsonb_build_object('estudantesQueSimularam',
    (select case when count(distinct s.perfil_id) >= b.k then count(distinct s.perfil_id) end
      from public.simulacoes s join elegiveis p on p.id = s.perfil_id cross join corte c where s.criado_em < c.fim)) end,
  'atualizadoEm', to_char(c.fim at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'dadosAte', c.hoje - 1
) from escola e cross join base b cross join corte c;
$$;
revoke execute on function public.painel_professor(text) from public, anon, authenticated;
grant execute on function public.painel_professor(text) to service_role;

create or replace function public.painel_impacto(p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := p_de::timestamp at time zone 'America/Fortaleza';
  v_fim timestamptz := (p_ate + 1)::timestamp at time zone 'America/Fortaleza';
begin
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de >= 366 then raise exception 'Período inválido'; end if;
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
      case when jsonb_typeof(resultado->'economiaHabitosMensal') = 'number' then (resultado->>'economiaHabitosMensal')::numeric end as reais,
      coalesce(
        case when jsonb_typeof(resultado->'tarifaRkwh') = 'number' then (resultado->>'tarifaRkwh')::numeric end,
        valor_conta / nullif(consumo_kwh, 0),
        case when jsonb_typeof(resultado->'gastoMensal') = 'number' and jsonb_typeof(resultado->'consumoKwh') = 'number'
          then (resultado->>'gastoMensal')::numeric / nullif((resultado->>'consumoKwh')::numeric, 0) end
      ) as tarifa from ultimas
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
    having count(*) = (select count(*) from public.licoes li where li.trilha_id = l.trilha_id) and max(p.concluida_em) >= v_inicio
  ), ativos as (
    select id from elegiveis where criado_em >= v_inicio
    union select perfil_id from pl union select perfil_id from quiz union select perfil_id from registros union select perfil_id from simulacoes
    union select e.perfil_id from public.pontos_eventos e join elegiveis p on p.id = e.perfil_id where e.criado_em >= v_inicio and e.criado_em < v_fim
  ), escolas as (
    select p.escola_id, count(*) as estudantes from elegiveis p join public.escolas e on e.id = p.escola_id and e.ativa
    group by p.escola_id having count(*) >= public.minimo_participantes_ranking()
  ), escolas_verificadas as (
    select p.escola_id, count(*) as estudantes from elegiveis p join public.escolas e on e.id = p.escola_id and e.ativa
    where p.escola_verificada group by p.escola_id having count(*) >= public.minimo_participantes_ranking()
  ), bairros as (
    select bairro_id, count(*) as estudantes from elegiveis where bairro_id is not null group by bairro_id having count(*) >= public.minimo_participantes_ranking()
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
      'percentualAcertos', (select case when count(distinct perfil_id) >= public.minimo_respondentes_percentual()
        then round(100.0 * count(*) filter (where correta) / nullif(count(*),0), 1) end from quiz)),
    'missoes', jsonb_build_object(
      'registros', (select public.valor_agregado(count(*), count(distinct perfil_id)) from registros),
      'concluidas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from missoes_concluidas)),
    'simulacoes', jsonb_build_object(
      'salvas', (select public.valor_agregado(count(*), count(distinct perfil_id)) from simulacoes),
      'estudantesQueSimularam', (select public.valor_agregado(count(distinct perfil_id), count(distinct perfil_id)) from simulacoes)),
    'economiaEstimada', jsonb_build_object('potencialHabitos', (select jsonb_build_object(
      'reaisMes', public.valor_agregado(reais, estudantes), 'kwhMes', public.valor_agregado(kwh, estudantes), 'estudantes', public.valor_agregado(estudantes, estudantes)) from potencial)),
    'estimativa', true, 'atualizadoEm', to_char(statement_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ));
end;
$$;
revoke execute on function public.painel_impacto(date, date) from public, anon, authenticated;
grant execute on function public.painel_impacto(date, date) to service_role;
