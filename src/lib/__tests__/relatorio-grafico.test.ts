import { describe, expect, it } from "vitest";
import type { DespesaCategoria } from "../relatorio";
import {
  barrasDespesas,
  corSlotDe,
  larguraBarraPct,
  PISO_BARRA_PCT,
} from "../relatorio-grafico";

function cat(
  categoriaId: string,
  total: number,
  quantidade = 1,
  nome = categoriaId,
): DespesaCategoria {
  return { categoriaId, nome, total, quantidade };
}

describe("corSlotDe — cor por entidade (§4.2)", () => {
  it("mapeia as categorias com slot próprio", () => {
    expect(corSlotDe("materiais")).toBe(1);
    expect(corSlotDe("deslocamento")).toBe(2);
    expect(corSlotDe("ferramentas")).toBe(3);
    expect(corSlotDe("impostos")).toBe(4);
    expect(corSlotDe("retirada")).toBe(5);
  });

  it("categorias sem slot próprio caem em 'Outros' (6)", () => {
    expect(corSlotDe("__outros__")).toBe(6);
    expect(corSlotDe("servicos")).toBe(6);
    expect(corSlotDe("desconhecida_xyz")).toBe(6);
    expect(corSlotDe("")).toBe(6);
  });
});

describe("barrasDespesas — proporção e cor", () => {
  it("fração relativa à maior despesa; a maior é 1", () => {
    const barras = barrasDespesas([
      cat("materiais", 24_000, 2, "Materiais"),
      cat("ferramentas", 12_000, 1, "Ferramentas"),
      cat("impostos", 6_000, 1, "Impostos"),
    ]);
    expect(barras.map((b) => b.fracao)).toEqual([1, 0.5, 0.25]);
    expect(barras.map((b) => b.corSlot)).toEqual([1, 3, 4]);
    // Preserva ordem e metadados.
    expect(barras[0]).toMatchObject({ nome: "Materiais", total: 24_000, quantidade: 2 });
  });

  it("categoria única tem fração 1", () => {
    const barras = barrasDespesas([cat("impostos", 5_000)]);
    expect(barras).toHaveLength(1);
    expect(barras[0]?.fracao).toBe(1);
    expect(barras[0]?.corSlot).toBe(4);
  });

  it("lista vazia retorna nenhuma barra", () => {
    expect(barrasDespesas([])).toEqual([]);
  });

  it("valor pequeno mantém a fração verdadeira (não é inflada aqui)", () => {
    const barras = barrasDespesas([
      cat("materiais", 100_000),
      cat("impostos", 1_000), // 1% do maior
    ]);
    expect(barras[1]?.fracao).toBeCloseTo(0.01, 5);
  });
});

describe("larguraBarraPct — piso visual sem distorcer o texto", () => {
  it("converte fração em porcentagem", () => {
    expect(larguraBarraPct(1)).toBe(100);
    expect(larguraBarraPct(0.5)).toBe(50);
  });

  it("aplica piso para frações muito pequenas", () => {
    expect(larguraBarraPct(0.001)).toBe(PISO_BARRA_PCT);
    expect(larguraBarraPct(0.0001)).toBe(PISO_BARRA_PCT);
  });

  it("fração 0 não desenha barra", () => {
    expect(larguraBarraPct(0)).toBe(0);
  });

  it("limita a 100% e nunca abaixo de 0", () => {
    expect(larguraBarraPct(1.5)).toBe(100);
    expect(larguraBarraPct(-1)).toBe(0);
  });
});
