create function public.painel_professor(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
with escola as (
  select e.id, e.nome, b.nome as bairro, e.codigo_turma
  from public.escolas e join public.bairros b on b.id = e.bairro_id
  where e.codigo_professor = upper(trim(p_codigo)) and e.ativa
), elegiveis as materialized (
  select p.id from public.perfis p join escola e on e.id = p.escola_id
  where p.escola_verificada and not p.eh_teste and nullif(trim(p.primeiro_nome), '') is not null
), base as (
  select count(*) as n, public.minimo_participantes_ranking() as k from elegiveis
), progresso as materialized (
  select pl.* from public.progresso_licoes pl join elegiveis p on p.id = pl.perfil_id
), quiz as materialized (
  -- respostas guarda apenas a primeira tentativa (chave perfil_id, pergunta_id).
  select r.* from public.respostas r join elegiveis p on p.id = r.perfil_id
), registros as materialized (
  select r.* from public.missoes_registros r join elegiveis p on p.id = r.perfil_id
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
  group by q.id, l.titulo having count(distinct r.perfil_id) >= public.minimo_participantes_ranking()
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
    'percentualAcertos', (select case when count(distinct perfil_id) >= b.k then round(100.0 * count(*) filter (where correta) / nullif(count(*), 0), 1) end from quiz),
    'perguntasMaisErradas', (select coalesce(jsonb_agg(jsonb_build_object('perguntaId', p.id, 'enunciado', p.enunciado,
      'licaoTitulo', p.titulo, 'respostas', p.respostas, 'percentualAcertos', p.percentual) order by p.percentual, p.id), '[]') from perguntas p)) end,
  'missoes', case when b.n >= b.k then (select coalesce(jsonb_agg(jsonb_build_object('slug', m.slug, 'titulo', m.titulo,
    'estudantesQueComecaram', case when m.comecaram >= b.k then m.comecaram end,
    'estudantesQueConcluiram', case when m.concluiram >= b.k then m.concluiram end,
    'diasRegistrados', case when m.comecaram >= b.k then m.dias end) order by m.ordem, m.slug), '[]') from missoes m) end,
  'simulacoes', case when b.n >= b.k then jsonb_build_object('estudantesQueSimularam',
    (select case when count(distinct s.perfil_id) >= b.k then count(distinct s.perfil_id) end
      from public.simulacoes s join elegiveis p on p.id = s.perfil_id)) end,
  'atualizadoEm', to_char(statement_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
) from escola e cross join base b;
$$;
revoke execute on function public.painel_professor(text) from public, anon, authenticated;
grant execute on function public.painel_professor(text) to service_role;
