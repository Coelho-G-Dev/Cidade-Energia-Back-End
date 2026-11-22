export function agregadoImpacto() {
  return {
    periodo: { de: "2026-11-20", ate: "2026-11-20" },
    estudantes: { comPerfil: 3, ativosNoPeriodo: 3, verificadosPorTurma: 3 },
    escolas: { comEstudantes: 1, comTurma: 1 }, bairros: { comEstudantes: 1 },
    aprendizado: { licoesConcluidas: 9, trilhasConcluidas: null, respostasDoQuiz: 6, percentualAcertos: null,
      diagnostico: { estudantes: null, acertoMedioAntes: null, acertoMedioDepois: null, porTrilha: [] } },
    missoes: { registros: 6, concluidas: null }, simulacoes: { salvas: 4, estudantesQueSimularam: 3 },
    energinho: { respostasAvaliadas: null, percentualUtil: null },
    economiaEstimada: { potencialHabitos: { reaisMes: 41.2, kwhMes: 49, estudantes: 3 } },
    estimativa: true, atualizadoEm: "2026-11-21T03:00:00.000Z",
  };
}
