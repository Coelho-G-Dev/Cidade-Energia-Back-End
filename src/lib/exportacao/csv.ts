import type { Impacto } from "@/lib/validacao/painel";

export function escaparCelula(valor: string): string {
  // Protege também fórmulas precedidas de espaços/controles e tab/quebra inicial.
  const segura = /^(?:[\s\u0000-\u001f]*[=+\-@]|[\t\r\n])/u.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(segura) ? `"${segura.replace(/"/g, '""')}"` : segura;
}

type Celula = string | number | null;
export function gerarCsv(linhas: readonly (readonly Celula[])[]): string {
  return "\uFEFF" + linhas.map((linha) => linha.map((valor) => escaparCelula(
    valor === null ? "" : typeof valor === "number" ? String(valor).replace(".", ",") : valor,
  )).join(";")).join("\r\n") + "\r\n";
}

type Indicador = { indicador: string; valor: number | null; unidade: string; observacao?: string; avisoOculto?: string };
export function exportarImpactoCsv(impacto: Impacto): string {
  const i = impacto;
  const p = i.economiaEstimada.potencialHabitos;
  const calculo = i.economiaEstimada.comoCalculamos.potencialHabitos;
  const indicadores: Indicador[] = [
    { indicador: "Estudantes com perfil", valor: i.estudantes.comPerfil, unidade: "estudantes" },
    { indicador: "Estudantes ativos no período", valor: i.estudantes.ativosNoPeriodo, unidade: "estudantes" },
    { indicador: "Estudantes verificados por turma", valor: i.estudantes.verificadosPorTurma, unidade: "estudantes" },
    { indicador: "Escolas com estudantes", valor: i.escolas.comEstudantes, unidade: "escolas" },
    { indicador: "Escolas com turma", valor: i.escolas.comTurma, unidade: "escolas" },
    { indicador: "Bairros com estudantes", valor: i.bairros.comEstudantes, unidade: "bairros" },
    { indicador: "Lições concluídas", valor: i.aprendizado.licoesConcluidas, unidade: "lições" },
    { indicador: "Trilhas concluídas", valor: i.aprendizado.trilhasConcluidas, unidade: "trilhas" },
    { indicador: "Respostas do quiz", valor: i.aprendizado.respostasDoQuiz, unidade: "respostas" },
    { indicador: "Acertos do quiz", valor: i.aprendizado.percentualAcertos, unidade: "%", avisoOculto: "menos de 5 respondentes" },
    { indicador: "Noites de missão registradas", valor: i.missoes.registros, unidade: "noites", observacao: "Autodeclaradas; contagem, sem estimativa de economia." },
    { indicador: "Missões concluídas", valor: i.missoes.concluidas, unidade: "missões" },
    { indicador: "Simulações salvas", valor: i.simulacoes.salvas, unidade: "simulações" },
    { indicador: "Estudantes que simularam", valor: i.simulacoes.estudantesQueSimularam, unidade: "estudantes" },
    { indicador: "Potencial de hábitos em kWh por mês", valor: p.kwhMes, unidade: "kWh/mês", observacao: calculo },
    { indicador: "Potencial de hábitos em reais por mês", valor: p.reaisMes, unidade: "R$/mês", observacao: calculo },
    { indicador: "Estudantes no potencial de hábitos", valor: p.estudantes, unidade: "estudantes", observacao: calculo },
  ];
  return gerarCsv([
    ["indicador", "valor", "unidade", "periodo_de", "periodo_ate", "observacao"],
    ...indicadores.map((linha) => [linha.indicador, linha.valor, linha.unidade, i.periodo.de, i.periodo.ate,
      linha.valor === null ? (linha.avisoOculto ?? "menos de 3 estudantes") + (linha.observacao ? `; ${linha.observacao}` : "") : linha.observacao ?? ""]),
  ]);
}
