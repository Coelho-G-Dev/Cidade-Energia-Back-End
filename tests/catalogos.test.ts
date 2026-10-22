import { describe, expect, it } from "vitest";
import { listarEscolas } from "@/lib/dados/catalogos";
import { supabaseFalso } from "./apoio/supabase-falso";

const BAIRRO = "11111111-1111-4111-8111-111111111111";

describe("listarEscolas", () => {
  it("lista só as escolas ativas", async () => {
    const { cliente, operacoes } = supabaseFalso(() => ({ data: [] }));

    await listarEscolas(cliente);

    expect(operacoes[0]?.chamadas).toContainEqual({ metodo: "eq", args: ["ativa", true] });
  });

  it("filtra pelo bairro além de ativa", async () => {
    const { cliente, operacoes } = supabaseFalso(() => ({ data: [{ id: "e", nome: "Escola", bairro_id: BAIRRO }] }));

    expect(await listarEscolas(cliente, BAIRRO)).toEqual([{ id: "e", nome: "Escola", bairro_id: BAIRRO }]);
    expect(operacoes[0]?.chamadas).toContainEqual({ metodo: "eq", args: ["ativa", true] });
    expect(operacoes[0]?.chamadas).toContainEqual({ metodo: "eq", args: ["bairro_id", BAIRRO] });
  });
});
