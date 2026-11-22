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

Desde a construção da **Barragem do Bacanga**, concluída em 1973, e em estudos da Eletrobras nos anos 1980, cogitou-se instalar ali uma usina de marés, mas **as turbinas nunca chegaram a ser instaladas**: o crescimento de bairros ao redor do reservatório limitou quanto o nível da água podia variar sem causar alagamentos, e outras fontes de energia custavam menos na época. Hoje, pesquisadores da UFMA ainda estudam o local para projetos experimentais.

Hoje a energia das marés ainda é pouco usada no mundo, mas é uma fonte renovável e previsível: sabemos com antecedência a hora de cada maré.$md$),

  ('a-energia-do-maranhao', 4, 'Juntando tudo: a energia do Brasil', 'texto', $md$A energia que chega à sua casa vem do **Sistema Interligado Nacional**: uma grande rede de linhas de transmissão que liga usinas de quase todo o país. A energia gerada pelo vento no Maranhão pode abastecer outra região, e vice-versa.

Boa parte da eletricidade do Brasil vem de fontes renováveis, como água (hidrelétricas), vento e sol. Por isso cada kWh gerado aqui solta pouco gás carbônico (CO₂): em 2025, cerca de 46,1 kg de CO₂ por MWh.

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

**Quanto economiza?** Por exemplo, usar um ar de 1.000 W **1 hora a menos por dia**:

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


-- Diagnóstico T-031: conteúdo aprovado em 2026-11-21
-- Cópia literal de docs/qa/fase3-perguntas-diagnostico.md; opções sem o marcador editorial (certa).
insert into public.perguntas_diagnostico (trilha_id,ordem,enunciado,opcoes,indice_correto,explicacao,fonte)
select t.id,d.ordem,d.enunciado,d.opcoes,d.indice_correto,d.explicacao,d.fonte
from jsonb_to_recordset($diagnostico_aprovado$
[
  {
    "slug": "energia-solar-em-sao-luis",
    "ordem": 1,
    "enunciado": "O que acontece com a energia do sol que chega em São Luís durante o período chuvoso, mais ou menos de janeiro a junho?",
    "opcoes": [
      "A geração cai quase a zero até o fim do período de chuvas",
      "As nuvens diminuem um pouco essa energia, mas ela continua alta",
      "Os raios passam a gerar o dobro por causa do brilho da água",
      "Os dias ficam muito mais curtos e com poucas horas de claridade"
    ],
    "indice_correto": 1,
    "explicacao": "Mesmo com mais nuvens entre janeiro e junho, São Luís fica perto do Equador e continua recebendo bastante sol. Por isso a energia cai um pouco, sem deixar de ser alta.",
    "fonte": "Trilha `energia-solar-em-sao-luis`, Lição 1 (*O sol de São Luís*) — *\"No período chuvoso, mais ou menos de janeiro a junho, as nuvens diminuem um pouco essa energia, mas ela continua alta.\"*"
  },
  {
    "slug": "energia-solar-em-sao-luis",
    "ordem": 2,
    "enunciado": "Em uma casa com placas solares ligadas à rede elétrica, o que acontece com a energia gerada que sobra durante o dia?",
    "opcoes": [
      "Fica armazenada dentro do inversor para uso durante a noite",
      "Se perde nos cabos do telhado em forma de calor desperdiçado",
      "Segue para a rede da rua sem gerar benefício na conta da casa",
      "Vai para a rede da distribuidora e vira créditos na conta"
    ],
    "indice_correto": 3,
    "explicacao": "Nos sistemas ligados à rede, a energia excedente segue para a distribuidora e gera créditos. Esses créditos ajudam a abater parte da conta de luz da casa.",
    "fonte": "Trilha `energia-solar-em-sao-luis`, Lição 2 (*Como a placa solar funciona*) — *\"Nos sistemas ligados à rede, a energia que sobra durante o dia vai para a rede da distribuidora e vira **créditos** para abater na conta.\"*"
  },
  {
    "slug": "energia-solar-em-sao-luis",
    "ordem": 3,
    "enunciado": "Comparando a geração humana com aparelhos da casa, quantas pessoas pedalando ao mesmo tempo seriam necessárias para manter um chuveiro elétrico de 5.500 W funcionando?",
    "opcoes": [
      "Dezenas de pessoas pedalando ao mesmo tempo",
      "Cerca de oito pessoas pedalando sem parar",
      "Duas ou três pessoas em ritmo moderado",
      "Apenas uma pessoa pedalando com força"
    ],
    "indice_correto": 0,
    "explicacao": "Uma pessoa pedalando com esforço moderado gera entre 50 e 150 W por alguns minutos. Para chegar perto de 5.500 W de um chuveiro, seriam dezenas de pessoas pedalando juntas.",
    "fonte": "Trilha `energia-solar-em-sao-luis`, Lição 3 (*Pedale e veja*) — *\"Uma pessoa pedalando com esforço moderado gera algo entre 50 e 150 W por alguns minutos. Agora compare: um chuveiro elétrico usa cerca de **5.500 W**. Seriam dezenas de pessoas pedalando ao mesmo tempo só para um banho!\"*"
  },
  {
    "slug": "energia-solar-em-sao-luis",
    "ordem": 4,
    "enunciado": "Ao estimar quantas placas solares uma casa precisa, por que a lição arredonda para cima o resultado da divisão do consumo pela geração de uma placa?",
    "opcoes": [
      "Para compensar o consumo que as placas têm durante a noite",
      "Porque os inversores só funcionam com números pares de placas",
      "Porque não existe meia placa e precisa atender ao consumo",
      "Para garantir que todas as placas trabalhem com metade da força"
    ],
    "indice_correto": 2,
    "explicacao": "Como não dá para instalar uma fração de placa no telhado, o resultado da divisão é arredondado para o próximo número inteiro. Assim a estimativa cobre todo o consumo considerado.",
    "fonte": "Trilha `energia-solar-em-sao-luis`, Lição 4 (*Quantas placas para a minha casa?*) — *\"Se a sua casa consome **150 kWh por mês**, divida: 150 ÷ 69 ≈ 2,2. Como não existe meia placa, arredondamos para cima: **3 placas**.\"*"
  },
  {
    "slug": "a-energia-do-maranhao",
    "ordem": 1,
    "enunciado": "Qual é a diferença entre usar placas fotovoltaicas e usar aquecedores solares?",
    "opcoes": [
      "Placas fotovoltaicas geram eletricidade; aquecedores esquentam água",
      "Placas fotovoltaicas esquentam água; aquecedores geram eletricidade",
      "Os dois equipamentos transformam a luz solar apenas em calor",
      "Aquecedores solares produzem créditos de luz na rede elétrica"
    ],
    "indice_correto": 0,
    "explicacao": "A energia do sol pode ser aproveitada de duas formas diferentes. A placa fotovoltaica gera eletricidade a partir da luz, enquanto o aquecedor solar usa o calor para aquecer água.",
    "fonte": "Trilha `a-energia-do-maranhao`, Lição 1 (*Sol: a energia que chega todo dia*) — *\"A energia solar pode ser aproveitada de dois jeitos: **placas fotovoltaicas**, que transformam luz em eletricidade; **aquecedores solares**, que usam o calor para esquentar água.\"*"
  },
  {
    "slug": "a-energia-do-maranhao",
    "ordem": 2,
    "enunciado": "Em que época do ano os ventos costumam ser mais fortes no Nordeste, ajudando a completar a energia das hidrelétricas?",
    "opcoes": [
      "No primeiro semestre, junto com os meses mais chuvosos",
      "O ano inteiro com a mesma força, sem variação por estação",
      "No segundo semestre, justamente na época em que chove menos",
      "Apenas durante a madrugada, quando o mar está mais agitado"
    ],
    "indice_correto": 2,
    "explicacao": "No segundo semestre chove menos no Nordeste, mas os ventos ficam mais fortes. Assim os parques eólicos ajudam a complementar outras fontes, como as hidrelétricas.",
    "fonte": "Trilha `a-energia-do-maranhao`, Lição 2 (*Vento: os parques eólicos do litoral*) — *\"No Nordeste, os ventos costumam ser mais fortes no segundo semestre, justamente quando chove menos. Por isso o vento ajuda a completar outras fontes, como as hidrelétricas.\"*"
  },
  {
    "slug": "a-energia-do-maranhao",
    "ordem": 3,
    "enunciado": "Por que a usina de marés cogitada para a Barragem do Bacanga, em São Luís, nunca chegou a ter suas turbinas instaladas?",
    "opcoes": [
      "Diferença pequena entre a maré alta e a maré baixa no local",
      "Falta de tecnologia para construir barragens em água salgada",
      "Proibição de usar turbinas próximas a áreas de manguezal",
      "Risco de alagar bairros ao redor e menor custo de outras fontes"
    ],
    "indice_correto": 3,
    "explicacao": "A ocupação urbana em volta do reservatório impediu grandes variações do nível da água sem causar alagamentos. Além disso, na época dos estudos, outras fontes de energia eram mais baratas.",
    "fonte": "Trilha `a-energia-do-maranhao`, Lição 3 (*Marés: a força do mar de São Luís*) — *\"...**as turbinas nunca chegaram a ser instaladas**: o crescimento de bairros ao redor do reservatório limitou quanto o nível da água podia variar sem causar alagamentos, e outras fontes de energia custavam menos na época.\"*"
  },
  {
    "slug": "a-energia-do-maranhao",
    "ordem": 4,
    "enunciado": "Por que cada kWh de eletricidade gerado no Brasil solta relativamente pouco gás carbônico (cerca de 46,1 kg de CO₂ por MWh em 2025)?",
    "opcoes": [
      "Porque quase toda a energia do país vem de usinas nucleares",
      "Porque boa parte vem de fontes renováveis, como água, vento e sol",
      "Porque os filtros das linhas de transmissão retêm todo o CO₂",
      "Porque as usinas termelétricas no Brasil não liberam gases"
    ],
    "indice_correto": 1,
    "explicacao": "Hidrelétricas, parques eólicos e usinas solares compõem grande parte do sistema elétrico brasileiro. Como são fontes renováveis, a emissão média de CO₂ por energia gerada é baixa.",
    "fonte": "Trilha `a-energia-do-maranhao`, Lição 4 (*Juntando tudo: a energia do Brasil*) e `CONSTANTES.md` (`FATOR_EMISSAO_KG_CO2_KWH = 0.0461`, D-010) — *\"Boa parte da eletricidade do Brasil vem de fontes renováveis, como água (hidrelétricas), vento e sol. Por isso cada kWh gerado aqui solta pouco gás carbônico (CO₂): em 2025, cerca de 46,1 kg de CO₂ por MWh.\"*"
  },
  {
    "slug": "ar-condicionado-sem-susto",
    "ordem": 1,
    "enunciado": "De acordo com o cálculo apresentado na trilha, de quais dois fatores depende principalmente o consumo mensal em kWh de um aparelho?",
    "opcoes": [
      "Apenas da potência em watts escrita na etiqueta",
      "Do tamanho do cômodo e da voltagem da tomada",
      "Da potência do aparelho e do preço da tarifa",
      "Da potência em watts e do tempo diário de uso"
    ],
    "indice_correto": 3,
    "explicacao": "Para estimar o consumo mensal em kWh, multiplica-se a potência pelo tempo de uso por dia e por 30 dias, dividindo por 1.000. Assim, potência e horas de uso caminham juntas no resultado.",
    "fonte": "Trilha `ar-condicionado-sem-susto`, Lição 1 (*Por que o ar pesa na conta*) — *\"O consumo de um aparelho depende de **potência** e **tempo de uso**: consumo (kWh/mês) = potência (W) × horas por dia × 30 ÷ 1000\"*."
  },
  {
    "slug": "ar-condicionado-sem-susto",
    "ordem": 2,
    "enunciado": "Ao ajustar o controle do ar-condicionado para a temperatura mínima (como 16 °C) em vez de perto de 23 °C, o que acontece com o consumo de energia?",
    "opcoes": [
      "Aumenta, pois cada grau a menos exige mais do aparelho",
      "Fica igual, porque o aparelho tem potência fixa na placa",
      "Diminui, porque o quarto esfria rápido e ele desliga antes",
      "Muda apenas se a porta ou a janela estiverem abertas"
    ],
    "indice_correto": 0,
    "explicacao": "Quanto mais fria a temperatura escolhida, mais esforço e energia o aparelho gasta para manter o ambiente. Uma temperatura perto de 23 °C costuma equilibrar conforto e economia.",
    "fonte": "Trilha `ar-condicionado-sem-susto`, Lição 2 (*Temperatura certa e portas fechadas*) — *\"Temperatura: cada grau a menos aumenta o consumo. Uma temperatura perto de 23 °C costuma ser confortável.\"*"
  },
  {
    "slug": "ar-condicionado-sem-susto",
    "ordem": 3,
    "enunciado": "Além do selo Procel com classificação A, qual característica citada nas lições costuma fazer um ar-condicionado novo gastar menos energia?",
    "opcoes": [
      "Funcionar em tomada de 220 V em vez de 127 V",
      "Contar com a tecnologia inverter no aparelho",
      "Vir com função turbo para resfriar em minutos",
      "Ter saída de ar direcionada para a parede fria"
    ],
    "indice_correto": 1,
    "explicacao": "Na hora da compra, além do selo Procel classificação A, a tecnologia inverter ajuda o aparelho a trabalhar de forma mais econômica.",
    "fonte": "Trilha `ar-condicionado-sem-susto`, Lição 2 (*Temperatura certa e portas fechadas*) — *\"procure o **selo Procel** com classificação A e, se possível, a tecnologia **inverter**, que costuma gastar menos.\"*"
  },
  {
    "slug": "ar-condicionado-sem-susto",
    "ordem": 4,
    "enunciado": "Por que desligar o ar-condicionado 30 minutos antes de dormir ou usar o timer ajuda a economizar sem perder o conforto?",
    "opcoes": [
      "Porque a tarifa de energia fica menor durante a madrugada",
      "Porque o motor consome o dobro de watts depois da meia-noite",
      "Porque o quarto continua fresco por um tempo após desligar",
      "Porque desligar antes evita que o filtro acumule poeira no ar"
    ],
    "indice_correto": 2,
    "explicacao": "Mesmo após desligar o aparelho, o ambiente mantém a temperatura fresca por algum tempo. Se precisar de ventilação no fim da noite, um ventilador gasta muito menos energia.",
    "fonte": "Trilha `ar-condicionado-sem-susto`, Lição 3 (*Desligar antes de dormir*) — *\"O quarto continua fresco por um tempo depois que o ar é desligado. Por isso vale: desligar o ar **30 minutos antes de dormir** ou usar o **timer** (função 'sleep'); deixar o ventilador ligado no lugar do ar no fim da noite.\"*"
  },
  {
    "slug": "entendendo-a-sua-conta-de-luz",
    "ordem": 1,
    "enunciado": "Qual é a diferença entre watt (W) e quilowatt-hora (kWh) na leitura de aparelhos e da conta de luz?",
    "opcoes": [
      "Watt é a energia do mês inteiro; kWh é a potência de cada hora",
      "Watt mede o valor em reais; kWh mede apenas a tensão elétrica",
      "Watt é a potência no instante; kWh é a energia ao longo do tempo",
      "Os dois medem exatamente a mesma grandeza em escalas diferentes"
    ],
    "indice_correto": 2,
    "explicacao": "A potência em watts indica quanta energia o aparelho pede naquele momento. Já o kWh mostra a energia total usada quando essa potência fica ligada por um tempo.",
    "fonte": "Trilha `entendendo-a-sua-conta-de-luz`, Lição 1 (*O que é kWh*) — *\"**Watt (W)** é a potência: quanta energia o aparelho usa a cada instante. **kWh** é energia: potência ao longo do tempo.\"*"
  },
  {
    "slug": "entendendo-a-sua-conta-de-luz",
    "ordem": 2,
    "enunciado": "Para que serve o gráfico de histórico de consumo que aparece na conta de luz?",
    "opcoes": [
      "Para mostrar a previsão de gasto da casa nos meses seguintes",
      "Para acompanhar se a casa gastou mais ou menos nos últimos meses",
      "Para listar a potência em watts de cada aparelho da residência",
      "Para informar os horários do dia em que a tarifa fica mais cara"
    ],
    "indice_correto": 1,
    "explicacao": "O histórico reúne o consumo em kWh dos meses anteriores em um gráfico. Olhar essa comparação ajuda a perceber mudanças nos gastos da família.",
    "fonte": "Trilha `entendendo-a-sua-conta-de-luz`, Lição 2 (*Lendo a conta*) — *\"**Histórico:** gráfico com o consumo dos últimos meses. Ótimo para ver se a casa está gastando mais ou menos.\"*"
  },
  {
    "slug": "entendendo-a-sua-conta-de-luz",
    "ordem": 3,
    "enunciado": "Na conta de luz, quem define os valores extras cobrados em cada bandeira tarifária (verde, amarela e vermelha)?",
    "opcoes": [
      "A prefeitura do município, junto à taxa da rua",
      "A distribuidora local, conforme o bairro",
      "O governo estadual, na mesma regra do ICMS",
      "A ANEEL, para as bandeiras em todo o país"
    ],
    "indice_correto": 3,
    "explicacao": "Os valores de cada bandeira tarifária são definidos pela ANEEL, e não pela prefeitura ou pela distribuidora local. As bandeiras avisam quando o custo de gerar energia no país sobe.",
    "fonte": "Trilha `entendendo-a-sua-conta-de-luz`, Lição 3 (*Bandeiras tarifárias*) — *\"Os valores de cada bandeira são definidos pela **ANEEL**.\"*"
  },
  {
    "slug": "entendendo-a-sua-conta-de-luz",
    "ordem": 4,
    "enunciado": "Para que serve a Contribuição de Iluminação Pública que aparece discriminada na conta de luz?",
    "opcoes": [
      "É cobrada pelo município para manter a iluminação das ruas",
      "É cobrada pela distribuidora pelas lâmpadas de dentro da casa",
      "É um tributo federal para construir novas usinas no país",
      "É uma taxa extra aplicada quando o consumo passa do limite"
    ],
    "indice_correto": 0,
    "explicacao": "A Contribuição de Iluminação Pública é municipal e financia as luminárias de ruas e espaços públicos. Ela entra na fatura junto com tributos estaduais e federais, além da tarifa da energia.",
    "fonte": "Trilha `entendendo-a-sua-conta-de-luz`, Lição 4 (*Impostos e taxas*) — *\"Além da energia, a conta tem tributos: ... **Contribuição de Iluminação Pública:** cobrada pelo município para manter a iluminação das ruas.\"*"
  },
  {
    "slug": "lixo-eletronico-onde-descartar",
    "ordem": 1,
    "enunciado": "Além de evitar a contaminação por metais pesados, qual é a outra vantagem de enviar equipamentos eletrônicos usados para reciclagem?",
    "opcoes": [
      "Reaproveitar materiais como cobre, alumínio e ouro",
      "Extrair eletricidade que sobrou em peças velhas",
      "Recuperar a carga original de baterias já gastas",
      "Abater parte dos impostos cobrados na conta de luz"
    ],
    "indice_correto": 0,
    "explicacao": "Os eletrônicos têm metais valiosos que podem ser recuperados pela reciclagem. Jogar tudo no lixo comum desperdiça esses recursos e coloca a saúde de quem trabalha com o lixo em risco.",
    "fonte": "Trilha `lixo-eletronico-onde-descartar`, Lição 1 (*O que é lixo eletrônico*) — *\"Ao mesmo tempo, eles têm materiais valiosos, como cobre, alumínio e até um pouco de ouro, que podem ser **reciclados**.\"*"
  },
  {
    "slug": "lixo-eletronico-onde-descartar",
    "ordem": 2,
    "enunciado": "Ao procurar um ecoponto ou ponto de coleta para descartar pilhas e baterias em São Luís, o que vale conferir antes de ir?",
    "opcoes": [
      "Se a coleta seletiva comum da rua aceita todo tipo de pilha",
      "Se o ponto paga em dinheiro pelo peso de cada bateria levada",
      "Se é preciso desmontar e separar os fios internos antes de sair",
      "Se o ponto recebe pilhas e baterias e seu horário de abertura"
    ],
    "indice_correto": 3,
    "explicacao": "Nem todo ponto de coleta recebe todos os tipos de resíduos eletrônicos, e cada local tem horário próprio. Conferir a descrição e o horário evita viagem perdida.",
    "fonte": "Trilha `lixo-eletronico-onde-descartar`, Lição 2 (*Onde descartar*) — *\"Alguns também recebem pilhas e baterias: a descrição de cada ponto avisa. Antes de ir, confira o horário de funcionamento.\"*"
  },
  {
    "slug": "lixo-eletronico-onde-descartar",
    "ordem": 3,
    "enunciado": "Antes de levar um celular ou outro aparelho antigo para um ponto de coleta, o que vale verificar primeiro?",
    "opcoes": [
      "Se as peças plásticas podem ir para o lixo comum",
      "Se é obrigatório entregar na loja onde foi comprado",
      "Se ainda dá para consertar o defeito ou doar a alguém",
      "Se o aparelho precisa ser aberto e desmontado em casa"
    ],
    "indice_correto": 2,
    "explicacao": "Muitas vezes o defeito é simples de consertar ou o aparelho ainda serve para outra pessoa. Só quando não tem mais uso é que ele segue para o ponto de coleta, sempre após apagar os dados pessoais.",
    "fonte": "Trilha `lixo-eletronico-onde-descartar`, Lição 3 (*Antes de descartar*) — *\"1. **Dá para consertar?** Muitas vezes o problema é simples. 2. **Dá para doar?** Um celular antigo pode servir para outra pessoa.\"*"
  },
  {
    "slug": "lixo-eletronico-onde-descartar",
    "ordem": 4,
    "enunciado": "Qual cuidado de segurança é recomendado ao guardar lâmpadas fluorescentes e baterias inchadas até o momento de levar ao ponto de coleta?",
    "opcoes": [
      "Quebrar as lâmpadas para caberem melhor em garrafas",
      "Manter lâmpadas inteiras e baterias longe do calor",
      "Furar a bateria inchada para aliviar o gás interno",
      "Guardar as baterias perto de aparelhos que esquentam"
    ],
    "indice_correto": 1,
    "explicacao": "Lâmpadas fluorescentes podem conter mercúrio, por isso não devem ser quebradas. Já baterias inchadas oferecem risco e precisam ficar longe de fontes de calor até o descarte seguro.",
    "fonte": "Trilha `lixo-eletronico-onde-descartar`, Lição 3 (*Antes de descartar*) — *\"4. **Cuidado com lâmpadas e baterias:** não quebre lâmpadas fluorescentes, que podem ter mercúrio, e guarde baterias inchadas longe do calor.\"*"
  }
]
$diagnostico_aprovado$::jsonb) as d(slug text,ordem integer,enunciado text,opcoes jsonb,indice_correto smallint,explicacao text,fonte text)
join public.trilhas t on t.slug=d.slug
on conflict (trilha_id,ordem) do update set
  enunciado=excluded.enunciado,opcoes=excluded.opcoes,indice_correto=excluded.indice_correto,explicacao=excluded.explicacao,fonte=excluded.fonte;
