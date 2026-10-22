create function public.recusar_escola_inativa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.escola_id is not null
     and not exists (select 1 from public.escolas e where e.id = new.escola_id and e.ativa)
     and new.escola_id is distinct from (
       case when tg_op = 'UPDATE' then old.escola_id
            else (select p.escola_id from public.perfis p where p.id = new.id) end
     ) then
    raise exception 'Escola inativa' using errcode = 'CE002';
  end if;
  return new;
end;
$$;
revoke execute on function public.recusar_escola_inativa() from public, anon, authenticated;

create trigger antes_de_escolher_escola
  before insert or update of escola_id on public.perfis
  for each row execute function public.recusar_escola_inativa();

alter table public.perfis disable trigger antes_de_trocar_local;
update public.perfis
set escola_id = null
where escola_id in (select id from public.escolas where not ativa);
alter table public.perfis enable trigger antes_de_trocar_local;

comment on function public.recusar_escola_inativa() is
  'Impede trocar para uma escola inativa (código CE002). Quem já está numa escola que ficou inativa pode continuar atualizando o perfil. Os perfis que estavam em escolas inativas quando esta migration rodou perderam o vínculo, sem contar como troca.';
