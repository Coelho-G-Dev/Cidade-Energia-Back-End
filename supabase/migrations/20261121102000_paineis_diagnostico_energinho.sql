-- View interna: nunca concedida aos papéis de API, nem ao service_role.
-- Somente as funções agregadoras security definer a consultam.
create view public.pares_diagnostico_internos as
select a.perfil_id,q.trilha_id,max(d.respondida_em) as depois_em,
  max(greatest(a.respondida_em,d.respondida_em)) as ultima_resposta_em,
  100.0*avg(a.correta::integer) as acerto_antes,100.0*avg(d.correta::integer) as acerto_depois
from public.respostas_diagnostico a
join public.respostas_diagnostico d on d.perfil_id=a.perfil_id and d.pergunta_id=a.pergunta_id and d.momento='depois'
join public.perguntas_diagnostico q on q.id=a.pergunta_id
where a.momento='antes'
group by a.perfil_id,q.trilha_id
having count(*)=4 and (select count(*) from public.perguntas_diagnostico q2 where q2.trilha_id=q.trilha_id)=4;
revoke all on public.pares_diagnostico_internos from public,anon,authenticated,service_role;

create function public.agregar_diagnostico(p_escola uuid,p_de timestamptz,p_ate timestamptz)
returns jsonb language sql stable security definer set search_path='' as $$
with pares as materialized (
  select d.* from public.pares_diagnostico_internos d join public.perfis p on p.id=d.perfil_id
  where p.escola_verificada and p.escola_id is not null and not p.eh_teste and nullif(trim(p.primeiro_nome),'') is not null
    and p.criado_em<p_ate and d.depois_em>=p_de and d.ultima_resposta_em<p_ate
    and (p_escola is null or (p.escola_id=p_escola and p.escola_verificada_em<p_ate))
), por_trilha as (
  select t.slug,t.titulo,t.ordem,count(distinct p.perfil_id) as estudantes,
    case when count(distinct p.perfil_id)>=public.minimo_respondentes_percentual() then round(avg(p.acerto_antes),1) end as antes,
    case when count(distinct p.perfil_id)>=public.minimo_respondentes_percentual() then round(avg(p.acerto_depois),1) end as depois
  from public.trilhas t left join pares p on p.trilha_id=t.id group by t.id
)
select jsonb_build_object(
  'estudantes',public.valor_agregado(count(distinct perfil_id),count(distinct perfil_id)),
  'acertoMedioAntes',case when count(distinct perfil_id)>=public.minimo_respondentes_percentual() then round(avg(acerto_antes),1) end,
  'acertoMedioDepois',case when count(distinct perfil_id)>=public.minimo_respondentes_percentual() then round(avg(acerto_depois),1) end,
  'porTrilha',(select coalesce(jsonb_agg(jsonb_build_object('slug',t.slug,'titulo',t.titulo,
    'estudantes',public.valor_agregado(t.estudantes,t.estudantes),'acertoMedioAntes',t.antes,'acertoMedioDepois',t.depois) order by t.ordem,t.slug),'[]') from por_trilha t)
) from pares;
$$;
revoke execute on function public.agregar_diagnostico(uuid,timestamptz,timestamptz) from public,anon,authenticated,service_role;

-- Mantém integralmente a implementação e os filtros D-012 da Fase 2.
alter function public.painel_professor(text) rename to painel_professor_base_fase2;
revoke execute on function public.painel_professor_base_fase2(text) from public,anon,authenticated,service_role;
create function public.painel_professor(p_codigo text)
returns jsonb language sql stable security definer set search_path='' as $$
with base as materialized (select public.painel_professor_base_fase2(p_codigo) as dados),
corte as (select (statement_timestamp() at time zone 'America/Fortaleza')::date::timestamp at time zone 'America/Fortaleza' as fim),
escola as (select id from public.escolas where ativa and codigo_professor=upper(trim(p_codigo)))
select b.dados||jsonb_build_object('diagnostico',case when not (b.dados->>'oculto')::boolean then
  public.agregar_diagnostico(e.id,'-infinity'::timestamptz,c.fim)->'porTrilha' else null end)
from base b cross join corte c left join escola e on true;
$$;
revoke execute on function public.painel_professor(text) from public,anon,authenticated;
grant execute on function public.painel_professor(text) to service_role;

alter function public.painel_impacto(date,date) rename to painel_impacto_base_fase2;
revoke execute on function public.painel_impacto_base_fase2(date,date) from public,anon,authenticated,service_role;
create function public.painel_impacto(p_de date,p_ate date)
returns jsonb language sql stable security definer set search_path='' as $$
with base as materialized (select public.painel_impacto_base_fase2(p_de,p_ate) as dados),
periodo as (select p_de::timestamp at time zone 'America/Fortaleza' as inicio,(p_ate+1)::timestamp at time zone 'America/Fortaleza' as fim),
votos as (
  select a.util,u.perfil_id from public.tutor_avaliacoes a join public.tutor_uso u on u.id=a.tutor_uso_id
  join public.perfis p on p.id=u.perfil_id cross join periodo d
  where not p.eh_teste and nullif(trim(p.primeiro_nome),'') is not null and p.criado_em<d.fim
    and a.criado_em>=d.inicio and a.criado_em<d.fim
), energinho as (
  select jsonb_build_object('respostasAvaliadas',public.valor_agregado(count(*),count(distinct perfil_id)),
    'percentualUtil',case when count(distinct perfil_id)>=public.minimo_respondentes_percentual()
      then round(100.0*count(*) filter(where util)/nullif(count(*),0),1) end) as dados from votos
)
select jsonb_set(b.dados,'{aprendizado}',(b.dados->'aprendizado')||jsonb_build_object('diagnostico',
  public.agregar_diagnostico(null,d.inicio,d.fim)))||jsonb_build_object('energinho',e.dados)
from base b cross join periodo d cross join energinho e;
$$;
revoke execute on function public.painel_impacto(date,date) from public,anon,authenticated;
grant execute on function public.painel_impacto(date,date) to service_role;
