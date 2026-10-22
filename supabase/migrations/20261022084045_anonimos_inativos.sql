create function public.anonimos_inativos(p_dias integer)
returns table (id uuid, criado_em timestamptz, ultima_atividade timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with atividade as (
    select
      u.id,
      u.created_at,
      greatest(
        u.created_at,
        u.last_sign_in_at,
        (select max(r.updated_at) from auth.refresh_tokens r where r.user_id = u.id::text),
        (select max(s.criado_em) from public.simulacoes s where s.perfil_id = u.id),
        (select max(x.tentativa_em) from public.respostas x where x.perfil_id = u.id),
        (select max(l.concluida_em) from public.progresso_licoes l where l.perfil_id = u.id),
        (select max(m.criado_em) from public.missoes_registros m where m.perfil_id = u.id),
        (select max(e.criado_em) from public.pontos_eventos e where e.perfil_id = u.id),
        (select max(t.criado_em) from public.tutor_uso t where t.perfil_id = u.id)
      ) as ultima
    from auth.users u
    left join public.perfis p on p.id = u.id
    where u.is_anonymous and p.primeiro_nome is null
  )
  select a.id, a.created_at, a.ultima
  from atividade a
  where a.ultima < now() - make_interval(days => p_dias)
  order by a.ultima;
$$;
revoke execute on function public.anonimos_inativos(integer) from public, anon, authenticated;
grant execute on function public.anonimos_inativos(integer) to service_role;

comment on function public.anonimos_inativos(integer) is
  'Usuários anônimos que nunca informaram o primeiro nome e não têm atividade (login, sessão, simulação, lição, quiz, missão, pontos ou tutor) há p_dias dias. Usada por scripts/limpar-anonimos.mjs.';
