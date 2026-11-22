begin;
do $$
begin
  if (select count(*) from public.perguntas_diagnostico)<>20 then raise exception 'Esperadas 20 perguntas'; end if;
  if (select count(distinct trilha_id) from public.perguntas_diagnostico)<>5
    or exists(select 1 from public.perguntas_diagnostico group by trilha_id having count(*)<>4 or array_agg(ordem order by ordem)<>array[1,2,3,4]) then raise exception 'Esperadas 4 perguntas por trilha'; end if;
  if (select count(distinct indice_correto) from public.perguntas_diagnostico)<>4
    or exists(select 1 from public.perguntas_diagnostico group by indice_correto having count(*)<>5) then raise exception 'Gabaritos devem ser 5/5/5/5'; end if;
  if exists(select 1 from public.perguntas_diagnostico d join public.perguntas q on lower(trim(d.enunciado))=lower(trim(q.enunciado))) then raise exception 'Enunciado repete quiz'; end if;
  if exists(select 1 from public.perguntas_diagnostico where jsonb_array_length(opcoes)<>4 or enunciado like '%[FICTÍCIO]%') then raise exception 'Conteúdo fictício ou opções incorretas'; end if;
end;
$$;
rollback;
