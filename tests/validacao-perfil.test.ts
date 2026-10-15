import { describe, expect, it } from "vitest";
import { atualizarPerfilSchema, filtroEscolasSchema } from "@/lib/validacao/perfil";

const bairro = "7d7c2f7e-3b4a-4c1d-9e2f-1a2b3c4d5e6f";
const escola = "0f1e2d3c-4b5a-4968-8776-655443322110";

describe("atualizarPerfilSchema", () => {
  it("aceita nome, bairro e escola", () => {
    const r = atualizarPerfilSchema.parse({ primeiro_nome: " Ana ", bairro_id: bairro, escola_id: escola });
    expect(r.primeiro_nome).toBe("Ana");
  });

  it("normaliza o código de turma para maiúsculas", () => {
    const r = atualizarPerfilSchema.parse({ primeiro_nome: "João", bairro_id: bairro, codigo_turma: " sol2026 " });
    expect(r.codigo_turma).toBe("SOL2026");
  });

  it("aceita nomes com acento, hífen e apóstrofo", () => {
    for (const nome of ["Ângela", "Ana-Clara", "D'Ávila"]) {
      expect(atualizarPerfilSchema.safeParse({ primeiro_nome: nome, bairro_id: bairro }).success).toBe(true);
    }
  });

  it("recusa nome completo, números e nomes curtos ou longos demais", () => {
    for (const nome of ["Ana Souza", "Ana1", "A", "a".repeat(31)]) {
      expect(atualizarPerfilSchema.safeParse({ primeiro_nome: nome, bairro_id: bairro }).success).toBe(false);
    }
  });

  it("recusa escola_id e codigo_turma juntos", () => {
    const r = atualizarPerfilSchema.safeParse({
      primeiro_nome: "Ana",
      bairro_id: bairro,
      escola_id: escola,
      codigo_turma: "SOL2026",
    });
    expect(r.success).toBe(false);
  });

  it("recusa campos extras como e-mail ou telefone", () => {
    const r = atualizarPerfilSchema.safeParse({ primeiro_nome: "Ana", bairro_id: bairro, email: "a@b.com" });
    expect(r.success).toBe(false);
  });

  it("exige bairro em formato UUID", () => {
    expect(atualizarPerfilSchema.safeParse({ primeiro_nome: "Ana", bairro_id: "anil" }).success).toBe(false);
  });
});

describe("filtroEscolasSchema", () => {
  it("permite filtro ausente e recusa bairro inválido", () => {
    expect(filtroEscolasSchema.parse({})).toEqual({});
    expect(filtroEscolasSchema.safeParse({ bairro: "x" }).success).toBe(false);
  });
});
