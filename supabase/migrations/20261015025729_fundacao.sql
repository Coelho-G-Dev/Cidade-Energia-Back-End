create table public.bairros (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 2 and 80)
);

create table public.escolas (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(nome) between 2 and 120),
  bairro_id    uuid not null references public.bairros (id) on delete restrict,
  codigo_turma text unique check (codigo_turma ~ '^[A-Z0-9]{4,12}$'),
  unique (nome, bairro_id)
);
create index escolas_bairro_id_idx on public.escolas (bairro_id);

create table public.aparelhos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique check (codigo ~ '^[a-z_]{2,40}$'),
  nome         text not null check (char_length(nome) between 2 and 60),
  potencia_w   numeric(8, 1) not null check (potencia_w > 0),
  horas_padrao numeric(4, 2) not null check (horas_padrao > 0 and horas_padrao <= 24),
  icone        text
);

create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  primeiro_nome text check (char_length(primeiro_nome) between 2 and 30 and primeiro_nome !~ '\s'),
  bairro_id     uuid references public.bairros (id) on delete set null,
  escola_id     uuid references public.escolas (id) on delete set null,
  criado_em     timestamptz not null default now()
);
create index perfis_bairro_id_idx on public.perfis (bairro_id);
create index perfis_escola_id_idx on public.perfis (escola_id);

create function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.criar_perfil_do_usuario() from public, anon, authenticated;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();

create table public.simulacoes (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  modo        text not null check (modo in ('conta', 'aparelhos')),
  consumo_kwh numeric(10, 2) not null check (consumo_kwh > 0),
  valor_conta numeric(10, 2) check (valor_conta > 0),
  resultado   jsonb not null,
  criado_em   timestamptz not null default now(),
  check (modo = 'conta' or valor_conta is null)
);
create index simulacoes_perfil_criado_idx on public.simulacoes (perfil_id, criado_em desc);

create table public.simulacao_itens (
  simulacao_id uuid not null references public.simulacoes (id) on delete cascade,
  aparelho_id  uuid not null references public.aparelhos (id) on delete restrict,
  quantidade   integer not null check (quantidade between 1 and 50),
  horas_dia    numeric(4, 2) not null check (horas_dia > 0 and horas_dia <= 24),
  primary key (simulacao_id, aparelho_id)
);
create index simulacao_itens_aparelho_id_idx on public.simulacao_itens (aparelho_id);

alter table public.bairros         enable row level security;
alter table public.escolas         enable row level security;
alter table public.aparelhos       enable row level security;
alter table public.perfis          enable row level security;
alter table public.simulacoes      enable row level security;
alter table public.simulacao_itens enable row level security;

create policy "bairros: leitura publica" on public.bairros
  for select to anon, authenticated using (true);

create policy "escolas: leitura publica" on public.escolas
  for select to anon, authenticated using (true);

create policy "aparelhos: leitura publica" on public.aparelhos
  for select to anon, authenticated using (true);

revoke select on public.escolas from anon, authenticated;
grant select (id, nome, bairro_id) on public.escolas to anon, authenticated;

create policy "perfis: dono le" on public.perfis
  for select to authenticated using (id = (select auth.uid()));

create policy "perfis: dono cria" on public.perfis
  for insert to authenticated with check (id = (select auth.uid()));

create policy "perfis: dono altera" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "simulacoes: dono le" on public.simulacoes
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "simulacoes: dono cria" on public.simulacoes
  for insert to authenticated with check (perfil_id = (select auth.uid()));

create policy "simulacoes: dono apaga" on public.simulacoes
  for delete to authenticated using (perfil_id = (select auth.uid()));

create policy "simulacao_itens: dono le" on public.simulacao_itens
  for select to authenticated using (
    exists (
      select 1 from public.simulacoes s
      where s.id = simulacao_id and s.perfil_id = (select auth.uid())
    )
  );

create policy "simulacao_itens: dono cria" on public.simulacao_itens
  for insert to authenticated with check (
    exists (
      select 1 from public.simulacoes s
      where s.id = simulacao_id and s.perfil_id = (select auth.uid())
    )
  );

create function public.resolver_codigo_turma(p_codigo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.escolas e where e.codigo_turma = upper(trim(p_codigo));
$$;
revoke execute on function public.resolver_codigo_turma(text) from public, anon;
grant execute on function public.resolver_codigo_turma(text) to authenticated;

create function public.salvar_simulacao(
  p_modo        text,
  p_consumo_kwh numeric,
  p_valor_conta numeric,
  p_resultado   jsonb,
  p_itens       jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'usuario nao autenticado' using errcode = '42501';
  end if;

  insert into public.simulacoes (perfil_id, modo, consumo_kwh, valor_conta, resultado)
  values (auth.uid(), p_modo, p_consumo_kwh, p_valor_conta, p_resultado)
  returning id into v_id;

  insert into public.simulacao_itens (simulacao_id, aparelho_id, quantidade, horas_dia)
  select v_id, (i ->> 'aparelho_id')::uuid, (i ->> 'quantidade')::integer, (i ->> 'horas_dia')::numeric
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as i;

  return v_id;
end;
$$;
revoke execute on function public.salvar_simulacao(text, numeric, numeric, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_simulacao(text, numeric, numeric, jsonb, jsonb) to authenticated;
