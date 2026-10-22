alter table public.cache_irradiacao add column atualizado_em timestamptz;

update public.cache_irradiacao set atualizado_em = buscado_em where valor is not null;

comment on column public.cache_irradiacao.atualizado_em is
  'Última busca na NASA POWER que trouxe um valor válido. buscado_em continua guardando a última tentativa, com ou sem sucesso.';
