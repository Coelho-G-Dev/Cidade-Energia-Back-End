create table public.trilhas (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  titulo    text not null check (char_length(titulo) between 2 and 120),
  descricao text not null check (char_length(descricao) between 2 and 500),
  tema      text not null check (char_length(tema) between 2 and 40),
  minutos   integer not null check (minutos between 1 and 240),
  ordem     integer not null check (ordem > 0)
);

create table public.licoes (
  id        uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references public.trilhas (id) on delete cascade,
  ordem     integer not null check (ordem > 0),
  titulo    text not null check (char_length(titulo) between 2 and 120),
  conteudo  text not null check (char_length(conteudo) between 1 and 20000),
  tipo      text not null default 'texto' check (tipo in ('texto', 'pedale')),
  unique (trilha_id, ordem)
);

create table public.perguntas (
  id             uuid primary key default gen_random_uuid(),
  licao_id       uuid not null references public.licoes (id) on delete cascade,
  ordem          integer not null check (ordem > 0),
  enunciado      text not null check (char_length(enunciado) between 2 and 500),
  opcoes         jsonb not null check (
    jsonb_typeof(opcoes) = 'array'
    and jsonb_array_length(opcoes) between 2 and 5
    and not jsonb_path_exists(opcoes, '$[*] ? (@.type() != "string")')
  ),
  indice_correto smallint not null check (indice_correto >= 0),
  explicacao     text not null check (char_length(explicacao) between 2 and 1000),
  unique (licao_id, ordem),
  check (indice_correto < jsonb_array_length(opcoes))
);

create table public.respostas (
  perfil_id    uuid not null references public.perfis (id) on delete cascade,
  pergunta_id  uuid not null references public.perguntas (id) on delete cascade,
  opcao        smallint not null check (opcao >= 0),
  correta      boolean not null,
  tentativa_em timestamptz not null default now(),
  criado_em    timestamptz not null default now(),
  primary key (perfil_id, pergunta_id)
);
create index respostas_pergunta_id_idx on public.respostas (pergunta_id);

create table public.progresso_licoes (
  perfil_id    uuid not null references public.perfis (id) on delete cascade,
  licao_id     uuid not null references public.licoes (id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (perfil_id, licao_id)
);
create index progresso_licoes_licao_id_idx on public.progresso_licoes (licao_id);

create table public.missoes (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  titulo           text not null check (char_length(titulo) between 2 and 120),
  descricao        text not null check (char_length(descricao) between 2 and 500),
  pontos           integer not null check (pontos between 1 and 1000),
  dias_necessarios integer not null check (dias_necessarios between 1 and 31),
  ordem            integer not null check (ordem > 0)
);

create table public.missoes_registros (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  missao_id uuid not null references public.missoes (id) on delete cascade,
  dia       date not null,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, missao_id, dia)
);
create index missoes_registros_missao_id_idx on public.missoes_registros (missao_id);

create table public.pontos_eventos (
  id            bigint generated always as identity primary key,
  perfil_id     uuid not null references public.perfis (id) on delete cascade,
  origem        text not null check (
    origem in ('primeira_simulacao', 'licao_concluida', 'resposta_correta', 'pedale_concluido', 'missao_concluida')
  ),
  referencia_id uuid not null,
  pontos        integer not null check (pontos between 1 and 1000),
  criado_em     timestamptz not null default now(),
  unique (perfil_id, origem, referencia_id)
);

create table public.conquistas (
  slug     text primary key check (slug ~ '^[a-z_]{2,40}$'),
  nome     text not null check (char_length(nome) between 2 and 60),
  criterio text not null check (char_length(criterio) between 2 and 300),
  ordem    integer not null check (ordem > 0)
);

create table public.conquistas_usuario (
  perfil_id      uuid not null references public.perfis (id) on delete cascade,
  conquista_slug text not null references public.conquistas (slug) on update cascade on delete cascade,
  obtida_em      timestamptz not null default now(),
  primary key (perfil_id, conquista_slug)
);
create index conquistas_usuario_slug_idx on public.conquistas_usuario (conquista_slug);

create table public.pontos_mapa (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique check (char_length(nome) between 2 and 120),
  tipo      text not null check (tipo in ('solar', 'coleta', 'acao')),
  latitude  numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  descricao text not null check (char_length(descricao) between 2 and 500)
);
create index pontos_mapa_tipo_idx on public.pontos_mapa (tipo);

alter table public.trilhas            enable row level security;
alter table public.licoes             enable row level security;
alter table public.perguntas          enable row level security;
alter table public.respostas          enable row level security;
alter table public.progresso_licoes   enable row level security;
alter table public.missoes            enable row level security;
alter table public.missoes_registros  enable row level security;
alter table public.pontos_eventos     enable row level security;
alter table public.conquistas         enable row level security;
alter table public.conquistas_usuario enable row level security;
alter table public.pontos_mapa        enable row level security;

revoke insert, update, delete, truncate on
  public.trilhas, public.licoes, public.perguntas, public.respostas, public.progresso_licoes,
  public.missoes, public.missoes_registros, public.pontos_eventos, public.conquistas,
  public.conquistas_usuario, public.pontos_mapa
from anon, authenticated;

create policy "trilhas: leitura publica" on public.trilhas
  for select to anon, authenticated using (true);

create policy "licoes: leitura publica" on public.licoes
  for select to anon, authenticated using (true);

create policy "perguntas: leitura publica" on public.perguntas
  for select to anon, authenticated using (true);

create policy "missoes: leitura publica" on public.missoes
  for select to anon, authenticated using (true);

create policy "conquistas: leitura publica" on public.conquistas
  for select to anon, authenticated using (true);

create policy "pontos_mapa: leitura publica" on public.pontos_mapa
  for select to anon, authenticated using (true);

revoke select on public.perguntas from anon, authenticated;
grant select (id, licao_id, ordem, enunciado, opcoes) on public.perguntas to anon, authenticated;

create policy "respostas: dono le" on public.respostas
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "progresso_licoes: dono le" on public.progresso_licoes
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "missoes_registros: dono le" on public.missoes_registros
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "pontos_eventos: dono le" on public.pontos_eventos
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "conquistas_usuario: dono le" on public.conquistas_usuario
  for select to authenticated using (perfil_id = (select auth.uid()));

create view public.ranking_bairros as
with totais as (
  select p.bairro_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.bairro_id is not null
  group by p.bairro_id
)
select
  b.id as bairro_id,
  b.nome,
  coalesce(t.pontos, 0)::bigint as pontos,
  coalesce(t.participantes, 0)::integer as participantes,
  rank() over (order by coalesce(t.pontos, 0) desc)::integer as posicao
from public.bairros b
left join totais t on t.bairro_id = b.id;

create view public.ranking_escolas as
with totais as (
  select p.escola_id, sum(e.pontos)::bigint as pontos, count(distinct e.perfil_id)::integer as participantes
  from public.pontos_eventos e
  join public.perfis p on p.id = e.perfil_id
  where p.escola_id is not null
  group by p.escola_id
)
select
  es.id as escola_id,
  es.nome,
  es.bairro_id,
  coalesce(t.pontos, 0)::bigint as pontos,
  coalesce(t.participantes, 0)::integer as participantes,
  rank() over (order by coalesce(t.pontos, 0) desc)::integer as posicao
from public.escolas es
left join totais t on t.escola_id = es.id;

revoke all on public.ranking_bairros, public.ranking_escolas from anon, authenticated;
grant select on public.ranking_bairros, public.ranking_escolas to anon, authenticated;

create view public.perfil_resumo with (security_invoker = true) as
select
  p.id as perfil_id,
  coalesce((select sum(e.pontos) from public.pontos_eventos e where e.perfil_id = p.id), 0)::bigint as pontos,
  (select count(*) from public.progresso_licoes pl where pl.perfil_id = p.id)::integer as licoes_concluidas,
  (
    select count(*)
    from public.trilhas t
    where exists (select 1 from public.licoes l where l.trilha_id = t.id)
      and not exists (
        select 1 from public.licoes l
        where l.trilha_id = t.id
          and not exists (
            select 1 from public.progresso_licoes pl
            where pl.licao_id = l.id and pl.perfil_id = p.id
          )
      )
  )::integer as trilhas_concluidas,
  (
    select count(*) from public.pontos_eventos e
    where e.perfil_id = p.id and e.origem = 'missao_concluida'
  )::integer as missoes_concluidas,
  (select count(*) from public.conquistas_usuario cu where cu.perfil_id = p.id)::integer as conquistas,
  re.posicao as posicao_escola,
  re.pontos as pontos_escola,
  rb.posicao as posicao_bairro,
  rb.pontos as pontos_bairro
from public.perfis p
left join public.ranking_escolas re on re.escola_id = p.escola_id
left join public.ranking_bairros rb on rb.bairro_id = p.bairro_id;

revoke all on public.perfil_resumo from anon, authenticated;
grant select on public.perfil_resumo to authenticated;
