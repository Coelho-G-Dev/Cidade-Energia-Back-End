create table public.limites_publicos (
  chave         text not null check (char_length(chave) between 1 and 200),
  janela_inicio timestamptz not null,
  contagem      integer not null default 0,
  primary key (chave, janela_inicio)
);
create index limites_publicos_janela_idx on public.limites_publicos (janela_inicio);

comment on table public.limites_publicos is
  'Contagem de requisições por janela de tempo nas rotas públicas. A chave é um hash HMAC do IP, nunca o IP.';

alter table public.limites_publicos enable row level security;
revoke all on public.limites_publicos from anon, authenticated;

create function public.consumir_limite_publico(p_chave text, p_limite integer, p_janela interval)
returns table (permitido boolean, liberado_em timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_segundos double precision := extract(epoch from p_janela);
  v_inicio timestamptz := to_timestamp(floor(extract(epoch from now()) / v_segundos) * v_segundos);
  v_contagem integer;
begin
  insert into public.limites_publicos as l (chave, janela_inicio, contagem)
  values (p_chave, v_inicio, 1)
  on conflict (chave, janela_inicio) do update set contagem = l.contagem + 1
  returning l.contagem into v_contagem;

  if random() < 0.01 then
    delete from public.limites_publicos l where l.janela_inicio < now() - p_janela * 2;
  end if;

  if v_contagem > p_limite then
    return query select false, v_inicio + p_janela;
    return;
  end if;
  return query select true, null::timestamptz;
end;
$$;
revoke execute on function public.consumir_limite_publico(text, integer, interval) from public, anon, authenticated;
grant execute on function public.consumir_limite_publico(text, integer, interval) to service_role;
