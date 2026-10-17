create extension if not exists vector with schema extensions;

create table public.documentos_rag (
  id        bigint generated always as identity primary key,
  licao_id  uuid not null references public.licoes (id) on delete cascade,
  trecho    text not null check (char_length(trecho) between 1 and 4000),
  embedding extensions.vector(768) not null
);
create index documentos_rag_licao_id_idx on public.documentos_rag (licao_id);
create index documentos_rag_embedding_idx on public.documentos_rag
  using hnsw (embedding extensions.vector_cosine_ops);

comment on table public.documentos_rag is
  'Trechos das lições com embeddings do gemini-embedding-2 (768 dimensões) para o tutor Energinho. Gerados por npm run indexar.';

create table public.tutor_uso (
  id        bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index tutor_uso_perfil_criado_idx on public.tutor_uso (perfil_id, criado_em desc);

comment on table public.tutor_uso is
  'Uma linha por mensagem enviada ao tutor, só para o limite por hora. Não guarda o texto das conversas.';

alter table public.documentos_rag enable row level security;
alter table public.tutor_uso      enable row level security;

revoke all on public.documentos_rag from anon, authenticated;
revoke all on public.tutor_uso from anon, authenticated;
grant select on public.tutor_uso to authenticated;

create policy "tutor_uso: dono le" on public.tutor_uso
  for select to authenticated using (perfil_id = (select auth.uid()));

create function public.match_documentos(p_embedding extensions.vector(768), p_k integer)
returns table (id bigint, licao_id uuid, trecho text, similaridade double precision)
language sql
stable
set search_path = ''
as $$
  select d.id, d.licao_id, d.trecho,
         1 - (d.embedding operator(extensions.<=>) p_embedding) as similaridade
  from public.documentos_rag d
  order by d.embedding operator(extensions.<=>) p_embedding
  limit least(greatest(p_k, 1), 20);
$$;
revoke execute on function public.match_documentos(extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_documentos(extensions.vector, integer) to service_role;

create function public.registrar_uso_tutor(p_perfil_id uuid, p_limite integer, p_janela interval)
returns table (permitido boolean, liberado_em timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_usos integer;
  v_mais_antigo timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('tutor_uso:' || p_perfil_id::text, 0));

  delete from public.tutor_uso t
  where t.perfil_id = p_perfil_id and t.criado_em <= now() - p_janela;

  select count(*), min(t.criado_em) into v_usos, v_mais_antigo
  from public.tutor_uso t
  where t.perfil_id = p_perfil_id;

  if v_usos >= p_limite then
    return query select false, v_mais_antigo + p_janela;
    return;
  end if;

  insert into public.tutor_uso (perfil_id) values (p_perfil_id);
  return query select true, null::timestamptz;
end;
$$;
revoke execute on function public.registrar_uso_tutor(uuid, integer, interval) from public, anon, authenticated;
grant execute on function public.registrar_uso_tutor(uuid, integer, interval) to service_role;
