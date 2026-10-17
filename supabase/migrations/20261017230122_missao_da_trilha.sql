alter table public.missoes add column trilha_id uuid references public.trilhas (id) on delete set null;

create index missoes_trilha_id_idx on public.missoes (trilha_id);

update public.missoes m
set trilha_id = t.id
from public.trilhas t
where (m.slug, t.slug) in (
  ('ar-desligado-antes-de-dormir', 'ar-condicionado-sem-susto'),
  ('descarte-de-lixo-eletronico', 'lixo-eletronico-onde-descartar')
);
