insert into public.bairros (nome) values
  ('Anil'),
  ('Bequimão'),
  ('Calhau'),
  ('Centro'),
  ('Cidade Operária'),
  ('Cohab Anil'),
  ('Cohama'),
  ('Ponta d''Areia'),
  ('Renascença'),
  ('São Francisco'),
  ('Turu'),
  ('Vinhais')
on conflict (nome) do nothing;

insert into public.escolas (nome, bairro_id, codigo_turma)
select e.nome, b.id, e.codigo_turma
from (values
  ('Escola Estadual Sol Nascente (fictícia)',  'Anil',            'SOL2026'),
  ('Centro de Ensino Vento Norte (fictícia)',  'Centro',          'VENTO26'),
  ('Escola Municipal Raio de Luz (fictícia)',  'Cidade Operária', 'LUZ2026')
) as e (nome, bairro, codigo_turma)
join public.bairros b on b.nome = e.bairro
on conflict (nome, bairro_id) do update set codigo_turma = excluded.codigo_turma;

insert into public.aparelhos (codigo, nome, potencia_w, horas_padrao, icone) values
  ('ar_condicionado', 'Ar-condicionado',    1000, 8,   'ar-condicionado'),
  ('chuveiro',        'Chuveiro elétrico',  5500, 0.5, 'chuveiro'),
  ('geladeira',       'Geladeira',          60,   24,  'geladeira'),
  ('tv',              'TV',                 100,  5,   'tv'),
  ('lampada_led',     'Lâmpada LED',        9,    6,   'lampada'),
  ('ventilador',      'Ventilador',         60,   8,   'ventilador')
on conflict (codigo) do update set
  nome         = excluded.nome,
  potencia_w   = excluded.potencia_w,
  horas_padrao = excluded.horas_padrao,
  icone        = excluded.icone;

comment on table public.escolas is 'Escolas e códigos de turma fictícios, apenas ilustrativos.';
comment on column public.aparelhos.potencia_w is 'Valor aproximado e ilustrativo. A geladeira usa 60 W médios em 24 h porque o compressor liga e desliga.';
comment on column public.aparelhos.horas_padrao is 'Valor aproximado e ilustrativo de horas de uso por dia.';
