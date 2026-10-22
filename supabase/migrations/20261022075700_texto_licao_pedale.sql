update public.licoes
set conteudo = replace(conteudo, 'toque em **Concluir** para registrar a atividade', 'toque em **Ir para a próxima lição** para registrar a atividade')
where tipo = 'pedale' and conteudo like '%toque em **Concluir** para registrar a atividade%';
