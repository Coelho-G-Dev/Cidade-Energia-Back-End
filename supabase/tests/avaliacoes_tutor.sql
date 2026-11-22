begin;
do $$
declare v_p uuid:=gen_random_uuid(); v_outro uuid:=gen_random_uuid(); v_id bigint; v_antigo bigint; v_r record; v_colunas text[];
begin
  insert into auth.users(id) values(v_p),(v_outro);
  select array_agg(column_name::text order by ordinal_position) into v_colunas from information_schema.columns where table_schema='public' and table_name='tutor_avaliacoes';
  if v_colunas is distinct from array['tutor_uso_id','util','motivo','criado_em'] then raise exception 'Colunas inesperadas: risco de texto livre'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='tutor_avaliacoes' and data_type in ('text','character varying','json','jsonb')) then raise exception 'Coluna livre de texto'; end if;
  select * into v_r from public.registrar_uso_tutor(v_p,20,'1 hour'); v_id:=v_r.id::bigint;
  if not v_r.permitido or v_id is null then raise exception 'Uso sem id'; end if;
  begin perform public.avaliar_resposta_tutor(v_outro,v_id,true); raise exception 'Outro perfil votou'; exception when sqlstate 'CT001' then null; end;
  begin perform public.avaliar_resposta_tutor(v_p,v_id,true,'errada'); raise exception 'Motivo com util aceito'; exception when sqlstate 'CT003' then null; end;
  perform public.avaliar_resposta_tutor(v_p,v_id,false,'confusa');
  begin perform public.avaliar_resposta_tutor(v_p,v_id,true); raise exception 'Repetição aceita'; exception when sqlstate 'CT002' then null; end;
  update public.tutor_uso set criado_em=now()-interval '2 hours' where id=v_id; v_antigo:=v_id;
  select * into v_r from public.registrar_uso_tutor(v_p,1,'1 hour');
  if not v_r.permitido then raise exception 'Uso antigo contou no limite'; end if;
  if not exists(select 1 from public.tutor_avaliacoes where tutor_uso_id=v_antigo) then raise exception 'Voto antigo apagado'; end if;
  select * into v_r from public.registrar_uso_tutor(v_p,1,'1 hour');
  if v_r.permitido or v_r.id is not null then raise exception 'Limite inválido'; end if;
  perform set_config('teste.outro',v_outro::text,true);
  if has_table_privilege('authenticated','public.tutor_avaliacoes','INSERT') then raise exception 'Escrita direta permitida'; end if;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('teste.outro'),true) is not null as identidade_ficticia;
do $$ begin if exists(select 1 from public.tutor_avaliacoes) then raise exception 'RLS expôs votos de outro perfil'; end if; end; $$;
reset role;
rollback;
