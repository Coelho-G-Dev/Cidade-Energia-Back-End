begin;
-- FICTÍCIO: todas as perguntas e usuários deste teste são descartados no rollback.
insert into public.perguntas_diagnostico(trilha_id,ordem,enunciado,opcoes,indice_correto,explicacao,fonte)
select t.id,n,'[FICTÍCIO] Pergunta de teste '||n,'["Correta fictícia","Errada fictícia"]'::jsonb,0,'[FICTÍCIO] Teste','[FICTÍCIO] Fixture SQL'
from public.trilhas t cross join generate_series(1,4) n on conflict(trilha_id,ordem) do nothing;
do $$
declare v_p uuid:=gen_random_uuid(); v_outro uuid:=gen_random_uuid(); v_t uuid; v_slug text; v_r jsonb; v_respostas jsonb; v_errado jsonb; v_pergunta uuid;
begin
  insert into auth.users(id) values(v_p),(v_outro);
  perform set_config('teste.perfil',v_p::text,true); perform set_config('teste.outro',v_outro::text,true);
  select id,slug into v_t,v_slug from public.trilhas order by ordem limit 1;
  select jsonb_agg(jsonb_build_object('perguntaId',id,'opcao',indice_correto) order by ordem) into v_respostas from public.perguntas_diagnostico where trilha_id=v_t;
  v_r:=public.consultar_diagnostico(v_p,v_slug,'antes');
  if v_r->'disponivel' is distinct from 'true'::jsonb or v_r::text ~ 'indiceCorreto|explicacao|acertos|correta' then raise exception 'GET antes vazou correção'; end if;
  begin perform public.gravar_diagnostico(v_p,v_slug,'depois',v_respostas); raise exception 'Depois sem antes aceito'; exception when sqlstate 'CD002' then null; end;
  begin perform public.gravar_diagnostico(v_p,v_slug,'antes',v_respostas-0); raise exception 'Parcial aceito'; exception when sqlstate 'CD004' then null; end;
  v_errado:=jsonb_build_array(v_respostas->0,v_respostas->0,v_respostas->2,v_respostas->3);
  begin perform public.gravar_diagnostico(v_p,v_slug,'antes',v_errado); raise exception 'Repetida aceita'; exception when sqlstate 'CD004' then null; end;
  v_errado:=jsonb_set(v_respostas,'{0,opcao}','4');
  begin perform public.gravar_diagnostico(v_p,v_slug,'antes',v_errado); raise exception 'Opção inexistente aceita'; exception when sqlstate 'CD004' then null; end;
  select id into v_pergunta from public.perguntas_diagnostico where trilha_id<>v_t limit 1;
  v_errado:=jsonb_set(v_respostas,'{0,perguntaId}',to_jsonb(v_pergunta::text));
  begin perform public.gravar_diagnostico(v_p,v_slug,'antes',v_errado); raise exception 'Pergunta de outra trilha aceita'; exception when sqlstate 'CD004' then null; end;
  v_r:=public.gravar_diagnostico(v_p,v_slug,'antes',v_respostas);
  if v_r<>jsonb_build_object('momento','antes','registrado',true) then raise exception 'POST antes vazou correção'; end if;
  begin perform public.gravar_diagnostico(v_p,v_slug,'antes',v_respostas); raise exception 'Repetição aceita'; exception when sqlstate 'CD003' then null; end;
  begin perform public.gravar_diagnostico(v_p,v_slug,'depois',v_respostas); raise exception 'Depois sem concluir aceito'; exception when sqlstate 'CD002' then null; end;
  insert into public.progresso_licoes(perfil_id,licao_id) select v_outro,id from public.licoes where trilha_id=v_t order by ordem limit 1;
  begin perform public.gravar_diagnostico(v_outro,v_slug,'antes',v_respostas); raise exception 'Antes após lição aceito'; exception when sqlstate 'CD002' then null; end;
  insert into public.progresso_licoes(perfil_id,licao_id) select v_p,id from public.licoes where trilha_id=v_t;
  v_r:=public.gravar_diagnostico(v_p,v_slug,'depois',v_respostas);
  if v_r->'acertosAntes'<>'4'::jsonb or v_r->'acertosDepois'<>'4'::jsonb or jsonb_array_length(v_r->'perguntas')<>4 then raise exception 'Resultado incorreto'; end if;
  if exists(select 1 from public.pontos_eventos where perfil_id=v_p) then raise exception 'Diagnóstico deu pontos'; end if;
  if has_column_privilege('anon','public.perguntas_diagnostico','indice_correto','SELECT') or has_column_privilege('authenticated','public.perguntas_diagnostico','indice_correto','SELECT')
    or has_column_privilege('authenticated','public.respostas_diagnostico','correta','SELECT') or has_table_privilege('authenticated','public.respostas_diagnostico','INSERT') then raise exception 'Permissões indevidas'; end if;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('teste.outro'),true) is not null as identidade_ficticia;
do $$ begin
  if exists(select 1 from public.respostas_diagnostico where perfil_id=current_setting('teste.perfil')::uuid) then raise exception 'RLS vazou outro perfil'; end if;
  begin perform indice_correto from public.perguntas_diagnostico; raise exception 'Gabarito legível'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role anon;
do $$ begin
  begin perform indice_correto from public.perguntas_diagnostico; raise exception 'Anon leu gabarito'; exception when insufficient_privilege then null; end;
  begin perform perfil_id from public.respostas_diagnostico; raise exception 'Anon leu respostas'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
