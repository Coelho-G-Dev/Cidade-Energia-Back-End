insert into public.trilhas (slug, titulo, descricao, tema, minutos, ordem) values
  ('energia-solar-em-sao-luis', 'Energia solar em São Luís',
   'Por que o sol daqui é tão forte, como a placa solar transforma luz em energia e quantas placas uma casa precisa.',
   'solar', 15, 1),
  ('a-energia-do-maranhao', 'A energia do Maranhão: sol, vento e marés',
   'O Maranhão tem sol forte, ventos no litoral e marés gigantes. Conheça cada uma dessas fontes de energia.',
   'renovaveis', 15, 2),
  ('ar-condicionado-sem-susto', 'Ar-condicionado sem susto',
   'O ar-condicionado é um dos aparelhos que mais pesam na conta. Aprenda a usar sem levar susto no fim do mês.',
   'eficiencia', 10, 3),
  ('entendendo-a-sua-conta-de-luz', 'Entendendo a sua conta de luz',
   'O que é kWh, como ler a conta, o que são as bandeiras tarifárias e por que aparecem impostos.',
   'conta', 12, 4),
  ('lixo-eletronico-onde-descartar', 'Lixo eletrônico: onde descartar',
   'Pilhas, carregadores e celulares velhos não vão para o lixo comum. Saiba por que e onde levar.',
   'descarte', 10, 5)
on conflict (slug) do update set
  titulo    = excluded.titulo,
  descricao = excluded.descricao,
  tema      = excluded.tema,
  minutos   = excluded.minutos,
  ordem     = excluded.ordem;

insert into public.licoes (trilha_id, ordem, titulo, tipo, conteudo)
select t.id, l.ordem, l.titulo, l.tipo, l.conteudo
from (values
  ('energia-solar-em-sao-luis', 1, 'O sol de São Luís', 'texto', $md$São Luís fica a cerca de **2,5 graus ao sul da linha do Equador**. Isso faz muita diferença:

- o sol passa bem alto no céu o ano inteiro, então os raios chegam quase "de frente";
- os dias têm perto de 12 horas de claridade em qualquer época do ano.

Por isso a cidade recebe muita energia do sol. Em média, cada metro quadrado de chão recebe por volta de **5,2 kWh por dia**, segundo dados de satélite da NASA. É como se cada metro quadrado ganhasse, todo dia, a energia que uma lâmpada LED de 9 W gasta em cerca de 580 horas.

No período chuvoso, mais ou menos de janeiro a junho, as nuvens diminuem um pouco essa energia, mas ela continua alta.

**Pense nisso:** o sol que esquenta a sua rua também pode ajudar a pagar a conta de luz.$md$),

  ('energia-solar-em-sao-luis', 2, 'Como a placa solar funciona', 'texto', $md$A placa solar é feita de **células de silício**. Quando a luz do sol bate nelas, ela empurra pequenas partículas (os elétrons) e cria uma corrente elétrica. Esse fenômeno se chama **efeito fotovoltaico**.

Alguns pontos importantes:

1. A placa precisa de **luz**, não de calor. Calor demais até faz a placa render um pouco menos.
2. A placa gera **corrente contínua**. Em casa usamos **corrente alternada**, então um aparelho chamado **inversor** faz essa conversão.
3. Nos sistemas ligados à rede, a energia que sobra durante o dia vai para a rede da distribuidora e vira **créditos** para abater na conta.

À noite a placa não gera nada. É por isso que a casa continua ligada à rede elétrica.$md$),

  ('energia-solar-em-sao-luis', 3, 'Pedale e veja', 'pedale', $md$Hora de sentir na perna quanta energia é preciso para ligar um aparelho!

**Como funciona a atividade:**

1. Pedale na bicicleta geradora (ou no simulador do app).
2. Veja no painel quantos **watts** você está gerando.
3. Tente manter a lâmpada LED (9 W) acesa. Depois tente o ventilador (60 W).

Uma pessoa pedalando com esforço moderado gera algo entre 50 e 150 W por alguns minutos. Agora compare: um chuveiro elétrico usa cerca de **5.500 W**. Seriam dezenas de pessoas pedalando ao mesmo tempo só para um banho!

Uma placa solar de 550 W, no sol forte do meio-dia, entrega energia parecida com a de várias pessoas pedalando, sem cansar e sem fazer barulho.

Ao terminar, toque em **Ir para a próxima lição** para registrar a atividade.$md$),

  ('energia-solar-em-sao-luis', 4, 'Quantas placas para a minha casa?', 'texto', $md$Dá para fazer a conta com três números:

- **potência da placa**: 0,55 kWp (uma placa comum de 550 W);
- **sol de São Luís**: cerca de 5,2 kWh por metro quadrado por dia (média dos dados de satélite da NASA);
- **perdas**: o sistema aproveita perto de 80% (calor, fios, sujeira).

Uma placa gera por dia: 0,55 × 5,2 × 0,8 ≈ **2,3 kWh**. Em um mês de 30 dias: ≈ **69 kWh**.

Se a sua casa consome **150 kWh por mês**, divida: 150 ÷ 69 ≈ 2,2. Como não existe meia placa, arredondamos para cima: **3 placas**.

Esses números são **estimativas** para aprender. Um projeto de verdade é feito por um profissional, que olha o telhado, a sombra e a conta da casa.

**Experimente:** use o simulador do app com o consumo da sua conta.$md$),

  ('a-energia-do-maranhao', 1, 'Sol: a energia que chega todo dia', 'texto', $md$O Maranhão está entre os estados com bastante sol ao longo do ano. A energia solar pode ser aproveitada de dois jeitos:

- **placas fotovoltaicas**, que transformam luz em eletricidade;
- **aquecedores solares**, que usam o calor para esquentar água.

A grande vantagem é que o sol não acaba e não solta fumaça para gerar energia. A limitação é que à noite não há geração, e em dias muito nublados ela cai.

Nas próximas lições você vai conhecer duas outras forças da natureza que o Maranhão tem de sobra: o **vento** e as **marés**.$md$),

  ('a-energia-do-maranhao', 2, 'Vento: os parques eólicos do litoral', 'texto', $md$No litoral do Maranhão, perto da região dos Lençóis Maranhenses, existem **parques eólicos**. São aquelas torres altas com hélices gigantes.

**Como funciona:**

1. O vento empurra as **pás** e faz o rotor girar.
2. O rotor está ligado a um **gerador**, que transforma o giro em eletricidade.
3. A energia segue por cabos até as linhas de transmissão.

No Nordeste, os ventos costumam ser mais fortes no segundo semestre, justamente quando chove menos. Por isso o vento ajuda a completar outras fontes, como as hidrelétricas.

Assim como o sol, o vento é uma fonte **renovável**: ele não se esgota.$md$),

  ('a-energia-do-maranhao', 3, 'Marés: a força do mar de São Luís', 'texto', $md$Quem mora em São Luís conhece bem: a maré sobe e desce muito ao longo do dia. A diferença entre a maré alta e a maré baixa aqui está entre as **maiores do Brasil**, podendo passar de 6 metros.

Essa água que sobe e desce carrega muita energia. Uma **usina de marés com barragem** funciona assim:

1. Na maré alta, a água entra e fica guardada atrás de uma barragem.
2. Na maré baixa, a água sai passando por **turbinas**, que giram geradores.

Nas décadas de 1970 e 1980 houve estudos para uma usina de marés na **Barragem do Bacanga**, em São Luís, mas a usina não chegou a funcionar.

Hoje a energia das marés ainda é pouco usada no mundo, mas é uma fonte renovável e previsível: sabemos com antecedência a hora de cada maré.$md$),

  ('a-energia-do-maranhao', 4, 'Juntando tudo: a energia do Brasil', 'texto', $md$A energia que chega à sua casa vem do **Sistema Interligado Nacional**: uma grande rede de linhas de transmissão que liga usinas de quase todo o país. A energia gerada pelo vento no Maranhão pode abastecer outra região, e vice-versa.

Boa parte da eletricidade do Brasil vem de fontes renováveis, como água (hidrelétricas), vento e sol. Por isso cada kWh gerado aqui solta pouco gás carbônico (CO₂): em 2023, cerca de 38,5 kg de CO₂ por MWh.

Mesmo assim, economizar energia continua importante: menos consumo significa menos usinas e menos linhas para construir, e uma conta mais leve para a sua família.$md$),

  ('ar-condicionado-sem-susto', 1, 'Por que o ar pesa na conta', 'texto', $md$O consumo de um aparelho depende de **potência** e **tempo de uso**:

> consumo (kWh/mês) = potência (W) × horas por dia × 30 ÷ 1000

Compare dois aparelhos ligados **8 horas por dia**:

| Aparelho | Potência | Consumo no mês |
|---|---|---|
| Ar-condicionado | 1.000 W | 240 kWh |
| Ventilador | 60 W | 14,4 kWh |

Com a tarifa residencial do Maranhão sem impostos, perto de R$ 0,89 por kWh, o ar custaria cerca de **R$ 213 por mês** e o ventilador cerca de **R$ 13**.

Os valores são **estimativas**: a potência real muda de um aparelho para outro. Olhe a etiqueta do seu.$md$),

  ('ar-condicionado-sem-susto', 2, 'Temperatura certa e portas fechadas', 'texto', $md$Pequenos hábitos fazem o ar-condicionado trabalhar menos:

- **Temperatura:** cada grau a menos aumenta o consumo. Uma temperatura perto de 23 °C costuma ser confortável.
- **Portas e janelas fechadas:** se o ar frio escapa, o aparelho não para de trabalhar.
- **Cortinas:** bloquear o sol direto deixa o quarto menos quente.
- **Filtro limpo:** filtro sujo dificulta a passagem de ar. Limpe com a frequência indicada no manual.

**Na hora de comprar:** procure o **selo Procel** com classificação A e, se possível, a tecnologia **inverter**, que costuma gastar menos.$md$),

  ('ar-condicionado-sem-susto', 3, 'Desligar antes de dormir', 'texto', $md$O quarto continua fresco por um tempo depois que o ar é desligado. Por isso vale:

- desligar o ar **30 minutos antes de dormir** ou usar o **timer** (função "sleep");
- deixar o ventilador ligado no lugar do ar no fim da noite.

**Quanto economiza?** Um ar de 1.000 W usado **1 hora a menos por dia**:

> 1 kW × 1 h × 30 dias = **30 kWh por mês**

Isso dá algo perto de R$ 27 por mês sem impostos, mais de R$ 300 por ano.

**Missão:** que tal testar por 3 noites? Registre na aba Missões e ganhe pontos.$md$),

  ('entendendo-a-sua-conta-de-luz', 1, 'O que é kWh', 'texto', $md$A conta de luz cobra pela **energia** que a casa usou, medida em **quilowatt-hora (kWh)**.

- **Watt (W)** é a potência: quanta energia o aparelho usa a cada instante.
- **kWh** é energia: potência ao longo do tempo.

**1 kWh** é a energia de um aparelho de **1.000 W ligado por 1 hora**. Também é a energia de uma TV de 100 W ligada por 10 horas.

O **medidor** (o "relógio de luz") vai somando os kWh. A distribuidora anota o número todo mês: a diferença entre a leitura atual e a anterior é o consumo do mês.$md$),

  ('entendendo-a-sua-conta-de-luz', 2, 'Lendo a conta', 'texto', $md$Na conta de luz, procure estas informações:

- **Leitura anterior e leitura atual:** a diferença é o consumo do mês.
- **Consumo (kWh):** quanta energia a casa usou.
- **Histórico:** gráfico com o consumo dos últimos meses. Ótimo para ver se a casa está gastando mais ou menos.
- **Tarifa:** o preço de cada kWh. No Maranhão, a tarifa residencial está perto de **R$ 0,89 por kWh sem impostos**.
- **Valor total e vencimento.**

**Dica:** use o consumo em kWh no simulador do app para descobrir quais aparelhos pesam mais.$md$),

  ('entendendo-a-sua-conta-de-luz', 3, 'Bandeiras tarifárias', 'texto', $md$As **bandeiras tarifárias** avisam se gerar energia está mais caro naquele mês:

| Bandeira | O que significa |
|---|---|
| Verde | Condições boas. Sem acréscimo. |
| Amarela | Geração um pouco mais cara. Pequeno acréscimo por kWh. |
| Vermelha (patamar 1 e 2) | Geração bem mais cara. Acréscimo maior por kWh. |

Quando chove pouco, os reservatórios das hidrelétricas baixam e é preciso ligar usinas mais caras. Aí a bandeira muda.

Os valores de cada bandeira são definidos pela **ANEEL**. Em bandeira vermelha, economizar energia pesa ainda mais no bolso.$md$),

  ('entendendo-a-sua-conta-de-luz', 4, 'Impostos e taxas', 'texto', $md$Além da energia, a conta tem tributos:

- **ICMS:** imposto estadual.
- **PIS e COFINS:** tributos federais.
- **Contribuição de Iluminação Pública:** cobrada pelo município para manter a iluminação das ruas.

Por isso o valor final de cada kWh na conta fica **maior** do que a tarifa da distribuidora.

**Resumo da trilha:** consumo (kWh) × tarifa + bandeira + tributos = valor da conta. Agora você sabe ler a sua!$md$),

  ('lixo-eletronico-onde-descartar', 1, 'O que é lixo eletrônico', 'texto', $md$**Lixo eletrônico** é todo equipamento elétrico ou eletrônico que não serve mais: celulares, carregadores, fones, pilhas, baterias, lâmpadas, computadores e eletrodomésticos.

Por que ele precisa de cuidado?

- Alguns componentes têm **metais pesados**, como chumbo, mercúrio e cádmio, que podem contaminar o solo e a água.
- Ao mesmo tempo, eles têm materiais valiosos, como cobre, alumínio e até um pouco de ouro, que podem ser **reciclados**.

Jogar no lixo comum é desperdiçar recursos e arriscar a saúde de quem trabalha com o lixo.$md$),

  ('lixo-eletronico-onde-descartar', 2, 'Onde descartar', 'texto', $md$O lugar certo é um **ponto de coleta de eletrônicos**. Eles costumam ficar em lojas de eletrônicos, assistências técnicas, supermercados e ecopontos.

No Brasil existe a **logística reversa**: fabricantes e lojas precisam receber de volta alguns produtos depois do uso, como pilhas, baterias, lâmpadas e eletroeletrônicos. Isso está na **Política Nacional de Resíduos Sólidos** (Lei 12.305/2010).

**Use o mapa do app** para encontrar pontos de coleta em São Luís, como os ecopontos da Prefeitura. Alguns também recebem pilhas e baterias: a descrição de cada ponto avisa. Antes de ir, confira o horário de funcionamento.

**Missão:** leve um eletrônico velho a um ponto de coleta e registre na aba Missões.$md$),

  ('lixo-eletronico-onde-descartar', 3, 'Antes de descartar', 'texto', $md$Antes de levar ao ponto de coleta, pense:

1. **Dá para consertar?** Muitas vezes o problema é simples.
2. **Dá para doar?** Um celular antigo pode servir para outra pessoa.
3. **Apague seus dados:** antes de doar ou descartar um celular ou computador, faça backup e restaure as configurações de fábrica.
4. **Cuidado com lâmpadas e baterias:** não quebre lâmpadas fluorescentes, que podem ter mercúrio, e guarde baterias inchadas longe do calor.

Separe tudo em uma sacola e leve de uma vez só. Fica mais fácil e você ajuda o planeta.$md$)
) as l (trilha, ordem, titulo, tipo, conteudo)
join public.trilhas t on t.slug = l.trilha
on conflict (trilha_id, ordem) do update set
  titulo   = excluded.titulo,
  tipo     = excluded.tipo,
  conteudo = excluded.conteudo;

insert into public.perguntas (licao_id, ordem, enunciado, opcoes, indice_correto, explicacao)
select l.id, p.ordem, p.enunciado, p.opcoes::jsonb, p.indice_correto, p.explicacao
from (values
  ('energia-solar-em-sao-luis', 1, 1,
   'Por que São Luís recebe sol forte o ano todo?',
   '["Porque fica perto da linha do Equador", "Porque fica no litoral", "Porque tem poucas árvores", "Porque é uma capital"]',
   0, 'Perto do Equador o sol passa alto no céu o ano inteiro e os dias quase não mudam de tamanho.'),
  ('energia-solar-em-sao-luis', 2, 1,
   'O que a placa solar precisa para gerar energia?',
   '["Calor", "Luz do sol", "Vento", "Chuva"]',
   1, 'O efeito fotovoltaico usa a luz. Calor demais até faz a placa render um pouco menos.'),
  ('energia-solar-em-sao-luis', 2, 2,
   'Para que serve o inversor em um sistema solar de casa?',
   '["Guardar a energia para a noite", "Limpar as placas", "Transformar a corrente contínua da placa na corrente alternada usada em casa", "Medir a temperatura do telhado"]',
   2, 'A placa gera corrente contínua; as tomadas da casa usam corrente alternada. O inversor faz a conversão.'),
  ('energia-solar-em-sao-luis', 4, 1,
   'Em São Luís, uma placa de 550 W gera, em média, cerca de quanto por mês?',
   '["7 kWh", "70 kWh", "700 kWh", "7.000 kWh"]',
   1, '0,55 × 5,2 × 0,8 × 30 dá cerca de 69 kWh por mês (estimativa).'),

  ('a-energia-do-maranhao', 2, 1,
   'Em um parque eólico, o que faz o gerador girar?',
   '["O calor do sol", "A água da chuva", "O movimento das marés", "O vento nas pás"]',
   3, 'O vento empurra as pás, o rotor gira e o gerador transforma o giro em eletricidade.'),
  ('a-energia-do-maranhao', 3, 1,
   'Por que São Luís é lembrada quando o assunto é energia das marés?',
   '["Porque o mar é mais quente", "Porque tem uma das maiores diferenças entre maré alta e maré baixa do Brasil", "Porque tem muitas praias", "Porque chove muito"]',
   1, 'A maré em São Luís sobe e desce vários metros, e essa água em movimento carrega muita energia.'),
  ('a-energia-do-maranhao', 3, 2,
   'Como funciona, de forma simples, uma usina de marés com barragem?',
   '["Guarda a água na maré alta e a solta pelas turbinas na maré baixa", "Usa placas solares no fundo do mar", "Queima algas para gerar vapor", "Esquenta a água do mar"]',
   0, 'A barragem segura a água da maré alta. Quando a maré baixa, a água sai pelas turbinas e gira os geradores.'),
  ('a-energia-do-maranhao', 4, 1,
   'O que significa dizer que o sistema elétrico brasileiro é interligado?',
   '["Cada cidade tem a sua própria usina", "Só funciona durante o dia", "A energia gerada em uma região pode abastecer outras", "Só usa energia do sol"]',
   2, 'Linhas de transmissão ligam usinas de quase todo o país, então a energia circula entre as regiões.'),

  ('ar-condicionado-sem-susto', 1, 1,
   'Um ar-condicionado de 1.000 W ligado 8 horas por dia consome cerca de quanto por mês?',
   '["24 kWh", "240 kWh", "2.400 kWh", "8 kWh"]',
   1, '1.000 W × 8 h × 30 dias ÷ 1000 = 240 kWh por mês.'),
  ('ar-condicionado-sem-susto', 2, 1,
   'O que ajuda o ar-condicionado a gastar menos?',
   '["Deixar a janela aberta", "Manter portas e janelas fechadas e o filtro limpo", "Colocar na temperatura mínima", "Ligar e desligar várias vezes"]',
   1, 'Com o ambiente fechado e o filtro limpo, o aparelho resfria mais rápido e trabalha menos.'),
  ('ar-condicionado-sem-susto', 2, 2,
   'Na hora de comprar, o que indica que um ar-condicionado é mais econômico?',
   '["A cor do aparelho", "O tamanho do controle remoto", "O selo Procel com classificação A", "O barulho que ele faz"]',
   2, 'O selo Procel compara o consumo dos aparelhos. Classificação A indica os mais eficientes.'),
  ('ar-condicionado-sem-susto', 3, 1,
   'Usar um ar de 1.000 W 1 hora a menos por dia economiza cerca de quanto por mês?',
   '["3 kWh", "300 kWh", "Nada", "30 kWh"]',
   3, '1 kW × 1 h × 30 dias = 30 kWh por mês.'),

  ('entendendo-a-sua-conta-de-luz', 1, 1,
   'Uma TV de 100 W ligada por 10 horas consome quanto?',
   '["1 kWh", "10 kWh", "100 kWh", "0,1 kWh"]',
   0, '100 W × 10 h = 1.000 Wh, que é 1 kWh.'),
  ('entendendo-a-sua-conta-de-luz', 2, 1,
   'Como descobrir quanto a casa consumiu no mês?',
   '["Somando os impostos da conta", "Olhando a cor da bandeira", "Dividindo a conta pelo número de moradores", "Fazendo a leitura atual menos a leitura anterior do medidor"]',
   3, 'O medidor soma os kWh. A diferença entre duas leituras é o consumo do período.'),
  ('entendendo-a-sua-conta-de-luz', 3, 1,
   'O que significa a bandeira vermelha na conta?',
   '["Que a conta está atrasada", "Que gerar energia está mais caro e há acréscimo por kWh", "Que a casa gastou demais", "Que a energia vai acabar"]',
   1, 'A bandeira mostra o custo de geração no mês. Na vermelha, cada kWh fica mais caro para todo mundo.'),
  ('entendendo-a-sua-conta-de-luz', 4, 1,
   'Qual destes tributos aparece na conta de luz?',
   '["IPVA", "IPTU", "ICMS", "ISS"]',
   2, 'O ICMS é um imposto estadual cobrado sobre a energia. PIS e COFINS também aparecem.'),

  ('lixo-eletronico-onde-descartar', 1, 1,
   'Por que pilhas e baterias não devem ir para o lixo comum?',
   '["Porque são muito leves", "Porque ocupam muito espaço", "Porque podem ter metais que contaminam o solo e a água", "Porque mudam de cor"]',
   2, 'Metais como chumbo, mercúrio e cádmio podem vazar e contaminar o ambiente.'),
  ('lixo-eletronico-onde-descartar', 2, 1,
   'Qual é o lugar certo para descartar um celular velho?',
   '["Lixo comum", "Ponto de coleta de eletrônicos", "Rio ou canal", "Terreno baldio"]',
   1, 'Nos pontos de coleta o aparelho segue para reciclagem ou descarte seguro.'),
  ('lixo-eletronico-onde-descartar', 2, 2,
   'O que é logística reversa?',
   '["O produto volta para o fabricante ou a loja para ser reciclado ou descartado corretamente", "Entregar compras em casa", "Vender produtos usados", "Jogar o lixo fora mais rápido"]',
   0, 'Na logística reversa, quem fabrica e quem vende ajuda a dar o destino certo ao produto depois do uso.'),
  ('lixo-eletronico-onde-descartar', 3, 1,
   'Antes de doar ou descartar um celular, o que é importante fazer?',
   '["Pintar o aparelho", "Apagar os dados pessoais", "Quebrar a tela", "Molhar a bateria"]',
   1, 'Faça backup e restaure as configurações de fábrica para proteger fotos, contas e senhas.')
) as p (trilha, licao_ordem, ordem, enunciado, opcoes, indice_correto, explicacao)
join public.trilhas t on t.slug = p.trilha
join public.licoes l on l.trilha_id = t.id and l.ordem = p.licao_ordem
on conflict (licao_id, ordem) do update set
  enunciado      = excluded.enunciado,
  opcoes         = excluded.opcoes,
  indice_correto = excluded.indice_correto,
  explicacao     = excluded.explicacao;

insert into public.missoes (slug, titulo, descricao, pontos, dias_necessarios, ordem, trilha_id)
select m.slug, m.titulo, m.descricao, m.pontos, m.dias_necessarios, m.ordem, t.id
from (values
  ('ar-desligado-antes-de-dormir', 'Ar desligado antes de dormir',
   'Desligue o ar-condicionado 30 minutos antes de dormir (ou use o timer) e registre aqui por 3 noites.',
   30, 3, 1, 'ar-condicionado-sem-susto'),
  ('descarte-de-lixo-eletronico', 'Eletrônico no lugar certo',
   'Leve um lixo eletrônico (pilha, carregador, fone ou celular velho) a um ponto de coleta e registre aqui.',
   30, 1, 2, 'lixo-eletronico-onde-descartar')
) as m (slug, titulo, descricao, pontos, dias_necessarios, ordem, trilha)
left join public.trilhas t on t.slug = m.trilha
on conflict (slug) do update set
  titulo           = excluded.titulo,
  descricao        = excluded.descricao,
  pontos           = excluded.pontos,
  dias_necessarios = excluded.dias_necessarios,
  ordem            = excluded.ordem,
  trilha_id        = excluded.trilha_id;

insert into public.conquistas (slug, nome, criterio, ordem) values
  ('primeira_simulacao', 'Primeira simulação', 'Salvar a primeira simulação da conta de luz.', 1),
  ('amigo_do_sol', 'Amigo do sol', 'Concluir todas as lições da trilha Energia solar em São Luís.', 2),
  ('conta_decifrada', 'Conta decifrada', 'Concluir todas as lições da trilha Entendendo a sua conta de luz.', 3),
  ('noites_frescas', 'Noites frescas', 'Completar a missão de desligar o ar-condicionado antes de dormir.', 4),
  ('descarte_certo', 'Descarte certo', 'Completar a missão de levar um lixo eletrônico a um ponto de coleta.', 5),
  ('bairro_unido', 'Bairro unido', 'Fazer parte de um bairro que somou 500 pontos ou mais.', 6)
on conflict (slug) do update set
  nome     = excluded.nome,
  criterio = excluded.criterio,
  ordem    = excluded.ordem;

insert into public.pontos_mapa (nome, tipo, latitude, longitude, descricao) values
  ('Telhado solar de escola - Anil (ilustrativo)', 'solar', -2.548000, -44.243000,
   'Ponto ilustrativo para testar o mapa: escola com placas solares no telhado. Não corresponde a um local real.'),
  ('Praça com iluminação solar - Centro (ilustrativo)', 'solar', -2.530700, -44.301600,
   'Ponto ilustrativo para testar o mapa: postes com placa solar. Não corresponde a um local real.'),
  ('Ecoponto Vila Isabel - Central de Logística Reversa', 'coleta', -2.562046, -44.317393,
   'Central de Logística Reversa de Eletroeletrônicos da COOPRESL, ao lado do Ecoponto Vila Isabel, em parceria com a Prefeitura de São Luís. Recebe eletrônicos. Av. dos Portugueses, Vila Isabel.'),
  ('Ecoponto Calhau (Av. dos Holandeses)', 'coleta', -2.489828, -44.269783,
   'Recebe notebooks, eletrodomésticos, teclados e outros eletrônicos. Av. dos Holandeses, s/nº, Calhau.'),
  ('Ecoponto Recanto do Vinhais', 'coleta', -2.520757, -44.260119,
   'Recebe eletrônicos. Ecoponto da Prefeitura de São Luís. Funciona de segunda a sábado, das 7h às 19h.'),
  ('Ecoponto Jardim Renascença', 'coleta', -2.494621, -44.288415,
   'Recebe eletrônicos, pilhas e baterias. Ecoponto da Prefeitura de São Luís. Rua Netuno, Jardim Renascença. Funciona de segunda a sábado, das 7h às 19h.'),
  ('Ecoponto Cidade Operária', 'coleta', -2.564431, -44.199903,
   'Recebe eletrônicos. Ecoponto da Prefeitura de São Luís. Funciona de segunda a sábado, das 7h às 19h.'),
  ('Ecoponto Bequimão', 'coleta', -2.528452, -44.248340,
   'Recebe eletrônicos. Ecoponto da Prefeitura de São Luís. Funciona de segunda a sábado, das 7h às 19h.'),
  ('Ecoponto Itapiracó', 'coleta', -2.532347, -44.202923,
   'Recebe eletrônicos, pilhas e baterias. Ecoponto da Prefeitura de São Luís. Av. Joaquim Mochel, Itapiracó. Funciona de segunda a sábado, das 7h às 19h.'),
  ('UFMA - coleta de eletrônicos (CCET)', 'coleta', -2.557943, -44.309531,
   'Ponto de coleta de resíduos eletrônicos na entrada do Centro de Ciências Exatas e Tecnologia (CCET), no campus da UFMA, Av. dos Portugueses.'),
  ('Ecoponto São Francisco', 'coleta', -2.511555, -44.309188,
   'Recebe pilhas e baterias. Ecoponto da Prefeitura de São Luís. Av. Ferreira Gullar, ao lado da Estação Elevatória da Caema, São Francisco.'),
  ('Ecoponto Cohaserma', 'coleta', -2.506966, -44.248180,
   'Recebe pilhas e baterias. Ecoponto da Prefeitura de São Luís. Rua Quatorze, s/nº, Parque Athenas, região do Cohaserma.'),
  ('Mutirão de troca de lâmpadas - Cidade Operária (ilustrativo)', 'acao', -2.579000, -44.202000,
   'Ação ilustrativa para testar o mapa: troca de lâmpadas antigas por LED. Não corresponde a um evento real.'),
  ('Feira de eficiência energética - Renascença (ilustrativo)', 'acao', -2.499000, -44.286000,
   'Ação ilustrativa para testar o mapa: oficinas sobre conta de luz e economia. Não corresponde a um evento real.')
on conflict (nome) do update set
  tipo      = excluded.tipo,
  latitude  = excluded.latitude,
  longitude = excluded.longitude,
  descricao = excluded.descricao;

comment on table public.trilhas is 'Conteúdo didático revisado em 2026-10-17. Os números são estimativas; as fontes das constantes estão em src/lib/config.ts.';
comment on table public.pontos_mapa is 'Pontos de coleta reais de São Luís, conferidos em 2026-10-17. Os pontos solares e as ações ainda são ilustrativos e não correspondem a locais ou eventos reais.';
