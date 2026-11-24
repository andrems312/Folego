import { describe, expect, it } from "vitest";
import { CATEGORIAS_PADRAO, nomeCategoria } from "../categorias";

describe("nomeCategoria", () => {
  it("resolve o nome de uma categoria conhecida", () => {
    expect(nomeCategoria("materiais")).toBe("Materiais");
    expect(nomeCategoria("servicos")).toBe("Serviços prestados");
  });

  it("categoria desconhecida cai no fallback 'Outros'", () => {
    expect(nomeCategoria("inexistente")).toBe("Outros");
  });

  it("id ausente (null/undefined/vazio) cai em 'Outros'", () => {
    expect(nomeCategoria(null)).toBe("Outros");
    expect(nomeCategoria(undefined)).toBe("Outros");
    expect(nomeCategoria("")).toBe("Outros");
  });
});

describe("CATEGORIAS_PADRAO", () => {
  it("preserva os IDs existentes (não quebra dados persistidos)", () => {
    const ids = CATEGORIAS_PADRAO.map((c) => c.id);
    expect(ids).toEqual([
      "servicos",
      "materiais",
      "deslocamento",
      "ferramentas",
      "impostos",
      "retirada",
    ]);
  });
});
