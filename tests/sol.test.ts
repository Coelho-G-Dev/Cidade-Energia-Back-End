import { beforeEach, describe, expect, it, vi } from "vitest";
import { calcularSolDeHoje } from "@/lib/calculos/sol";
import { ErroCalculo } from "@/lib/calculos/simulador";
import { ErroApi } from "@/lib/http/erros";

const irradiacaoDeHoje = vi.fn();
const buscarAparelhoPorCodigo = vi.fn();

vi.mock("@/lib/dados/irradiacao", () => ({ irradiacaoDeHoje: () => irradiacaoDeHoje() }));
vi.mock("@/lib/dados/catalogos", () => ({
  buscarAparelhoPorCodigo: (_s: unknown, codigo: string) => buscarAparelhoPorCodigo(codigo),
}));

const { GET } = await import("@/app/api/sol-de-hoje/route");

const arCondicionado = { id: "a", codigo: "ar_condicionado", nome: "Ar-condicionado", potencia_w: 1000, horas_padrao: 8, icone: null };

describe("calcularSolDeHoje", () => {
  it("calcula geração, horas de ar e CO₂ de uma placa no dia", () => {
    expect(calcularSolDeHoje(6.2194, 1000)).toEqual({
      kwhPorPlaca: 2.74,
      horasArCondicionado: 2.7,
      co2EvitadoKg: 0.105,
    });
  });

  it("usa a potência real do ar-condicionado", () => {
    expect(calcularSolDeHoje(5, 2000).horasArCondicionado).toBe(1.1);
  });

  it("irradiação zero dá zero", () => {
    expect(calcularSolDeHoje(0, 1000)).toEqual({ kwhPorPlaca: 0, horasArCondicionado: 0, co2EvitadoKg: 0 });
  });

  it("recusa irradiação negativa e potência inválida", () => {
    expect(() => calcularSolDeHoje(-999, 1000)).toThrow(ErroCalculo);
    expect(() => calcularSolDeHoje(5, 0)).toThrow(ErroCalculo);
  });
});

describe("GET /api/sol-de-hoje", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
    buscarAparelhoPorCodigo.mockResolvedValue(arCondicionado);
  });

  it("devolve o dia mais recente com dado da NASA POWER", async () => {
    irradiacaoDeHoje.mockResolvedValue({ data: "2026-10-09", valor: 6.2194, fonte: "nasa-power" });

    const r = await GET();

    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      data: "2026-10-09",
      irradiacao: 6.22,
      kwhPorPlaca: 2.74,
      horasArCondicionado: 2.7,
      co2EvitadoKg: 0.105,
      estimativa: true,
      fonte: "nasa-power",
    });
    expect(buscarAparelhoPorCodigo).toHaveBeenCalledWith("ar_condicionado");
  });

  it("sem NASA POWER nem cache, responde com o valor do config", async () => {
    irradiacaoDeHoje.mockResolvedValue({ data: null, valor: 5.226, fonte: "config" });

    const corpo = await (await GET()).json();

    expect(corpo).toMatchObject({ data: null, irradiacao: 5.23, kwhPorPlaca: 2.3, fonte: "config", estimativa: true });
  });

  it("responde 404 se o ar-condicionado sumir do catálogo", async () => {
    irradiacaoDeHoje.mockResolvedValue({ data: "2026-10-09", valor: 6, fonte: "cache" });
    buscarAparelhoPorCodigo.mockRejectedValue(new ErroApi(404, "APARELHO_NAO_ENCONTRADO", "Aparelho ar_condicionado não existe."));

    const r = await GET();

    expect(r.status).toBe(404);
    expect((await r.json()).erro.codigo).toBe("APARELHO_NAO_ENCONTRADO");
  });
});
