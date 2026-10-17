create table public.cache_irradiacao (
  tipo       text primary key check (tipo in ('diaria', 'climatologia')),
  data       date,
  valor      numeric(7, 4) check (valor between 0 and 15),
  buscado_em timestamptz not null default now(),
  check (tipo = 'climatologia' or (data is null) = (valor is null))
);

alter table public.cache_irradiacao enable row level security;
revoke all on public.cache_irradiacao from anon, authenticated;

comment on table public.cache_irradiacao is
  'Cache da irradiação da NASA POWER (ALLSKY_SFC_SW_DWN, kWh/m²/dia) em São Luís. buscado_em guarda a última tentativa, com ou sem sucesso. Só o servidor lê e grava.';
