import { describe, expect, it, vi } from "vitest";
import { JANELA_LIMITE_PREVIA_POR_PERFIL, LIMITE_PREVIA_POR_PERFIL, LIMITE_SIMULACAO_PUBLICA_POR_MINUTO } from "@/lib/config";
import { chaveDoLimite, consumirLimitePublico, ipDaRequisicao, regraDaSimulacao } from "@/lib/dados/limites";
import { supabaseFalso } from "./apoio/supabase-falso";

const comCabecalhos = (cabecalhos: Record<string, string>) =>
  new Request("http://localhost:3000/api/simulacoes/previa", { method: "POST", headers: cabecalhos });

describe("ipDaRequisicao", () => {
  it("usa o x-real-ip da Vercel", () => {
    expect(ipDaRequisicao(comCabecalhos({ "x-real-ip": "200.1.2.3", "x-forwarded-for": "9.9.9.9" }))).toBe("200.1.2.3");
  });

  it("sem x-real-ip, usa o primeiro endereço do x-forwarded-for", () => {
    expect(ipDaRequisicao(comCabecalhos({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }))).toBe("200.1.2.3");
  });

  it("sem cabeçalhos, agrupa como desconhecido", () => {
    expect(ipDaRequisicao(comCabecalhos({}))).toBe("desconhecido");
  });
});

describe("chaveDoLimite", () => {
  it("é estável, separa por escopo e nunca guarda o IP", () => {
    const chave = chaveDoLimite("simulacao", "200.1.2.3", "segredo");
    expect(chave).toBe(chaveDoLimite("simulacao", "200.1.2.3", "segredo"));
    expect(chave).toMatch(/^simulacao:[0-9a-f]{64}$/);
    expect(chave).not.toContain("200.1.2.3");
    expect(chaveDoLimite("simulacao", "200.1.2.4", "segredo")).not.toBe(chave);
    expect(chaveDoLimite("simulacao", "200.1.2.3", "outro")).not.toBe(chave);
  });
});

describe("regraDaSimulacao", () => {
  it("com login, conta por perfil", () => {
    expect(regraDaSimulacao("11111111-1111-4111-8111-111111111111", "200.1.2.3", "segredo")).toEqual({
      chave: "previa:perfil:11111111-1111-4111-8111-111111111111",
      limite: LIMITE_PREVIA_POR_PERFIL,
      janela: JANELA_LIMITE_PREVIA_POR_PERFIL,
    });
  });

  it("sem login, conta pelo hash do IP", () => {
    expect(regraDaSimulacao(null, "200.1.2.3", "segredo")).toEqual({
      chave: chaveDoLimite("simulacao", "200.1.2.3", "segredo"),
      limite: LIMITE_SIMULACAO_PUBLICA_POR_MINUTO,
      janela: "1 minute",
    });
  });
});

describe("consumirLimitePublico", () => {
  it("dentro do limite, segue sem erro e chama a função do banco com a janela", async () => {
    const { cliente, operacoes } = supabaseFalso(() => ({ data: { permitido: true, liberado_em: null } }));
    await expect(consumirLimitePublico(cliente, { chave: "simulacao:abc", limite: 600, janela: "1 minute" })).resolves.toBeUndefined();
    expect(operacoes[0]!.tabela).toBe("rpc:consumir_limite_publico");
    expect(operacoes[0]!.chamadas).toContainEqual({
      metodo: "rpc",
      args: [{ p_chave: "simulacao:abc", p_limite: 600, p_janela: "1 minute" }],
    });
  });

  it("acima do limite, responde 429 LIMITE_DE_REQUISICOES", async () => {
    const { cliente } = supabaseFalso(() => ({ data: { permitido: false, liberado_em: "2026-10-17T12:01:00Z" } }));
    await expect(consumirLimitePublico(cliente, { chave: "simulacao:abc", limite: 600, janela: "1 minute" })).rejects.toMatchObject({
      status: 429,
      codigo: "LIMITE_DE_REQUISICOES",
    });
  });

  it("se o banco falhar, não derruba a rota pública", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = supabaseFalso(() => ({ error: { message: "function does not exist" } }));
    await expect(consumirLimitePublico(cliente, { chave: "simulacao:abc", limite: 600, janela: "1 minute" })).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });
});
