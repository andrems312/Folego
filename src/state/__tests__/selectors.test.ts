import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  filtrarPorTipo,
  ordenarPorDataDesc,
  prepararMovimentacoes,
} from "../selectors";
import type { Movimentacao } from "@/domain";

function mov(id: string, data: string, tipo: Movimentacao["tipo"] = "saida"): Movimentacao {
  return {
    id,
    tipo,
    valor: 10_000,
    data,
    categoriaId: "materiais",
    status: "pendente",
  };
}

describe("ordenarPorDataDesc", () => {
  it("ordena da data mais recente para a mais antiga", () => {
    const entrada = [mov("a", "2026-03-01"), mov("b", "2026-03-10"), mov("c", "2026-03-05")];
    const r = ordenarPorDataDesc(entrada);
    expect(r.map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("mesma data: preserva a ordem original (estável/previsível)", () => {
    const entrada = [
      mov("a", "2026-03-10"),
      mov("b", "2026-03-10"),
      mov("c", "2026-03-10"),
    ];
    expect(ordenarPorDataDesc(entrada).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("não muta o array original", () => {
    const entrada = [mov("a", "2026-03-01"), mov("b", "2026-03-10")];
    const copia = entrada.slice();
    ordenarPorDataDesc(entrada);
    expect(entrada).toEqual(copia);
    expect(entrada[0]?.id).toBe("a"); // ordem original intacta
  });
});

describe("agruparPorDia", () => {
  it("agrupa por dia, em ordem decrescente", () => {
    const entrada = [
      mov("a", "2026-03-10"),
      mov("b", "2026-03-09"),
      mov("c", "2026-03-10"),
    ];
    const grupos = agruparPorDia(entrada);
    expect(grupos.map((g) => g.data)).toEqual(["2026-03-10", "2026-03-09"]);
    expect(grupos[0]?.movimentacoes.map((m) => m.id)).toEqual(["a", "c"]);
    expect(grupos[1]?.movimentacoes.map((m) => m.id)).toEqual(["b"]);
  });
});

describe("filtrarPorTipo", () => {
  const dados = [
    mov("e1", "2026-03-10", "entrada"),
    mov("s1", "2026-03-10", "saida"),
    mov("r1", "2026-03-10", "retirada"),
    mov("e2", "2026-03-09", "entrada"),
  ];

  it("filtra entradas", () => {
    expect(filtrarPorTipo(dados, "entrada").map((m) => m.id)).toEqual(["e1", "e2"]);
  });
  it("filtra saídas", () => {
    expect(filtrarPorTipo(dados, "saida").map((m) => m.id)).toEqual(["s1"]);
  });
  it("filtra retiradas", () => {
    expect(filtrarPorTipo(dados, "retirada").map((m) => m.id)).toEqual(["r1"]);
  });
  it("'todas' devolve tudo (cópia, sem mutar)", () => {
    const r = filtrarPorTipo(dados, "todas");
    expect(r).toHaveLength(4);
    expect(r).not.toBe(dados); // cópia
    expect(dados).toHaveLength(4); // original intacto
  });
});

describe("prepararMovimentacoes (pipeline) não muta a entrada", () => {
  it("filtra + ordena + agrupa sem alterar o array original", () => {
    const dados = [
      mov("a", "2026-03-01", "entrada"),
      mov("b", "2026-03-10", "saida"),
      mov("c", "2026-03-10", "entrada"),
    ];
    const snapshot = JSON.stringify(dados);
    const grupos = prepararMovimentacoes(dados, "entrada");
    expect(JSON.stringify(dados)).toBe(snapshot); // original intacto
    // só entradas, agrupadas por dia desc
    expect(grupos.map((g) => g.data)).toEqual(["2026-03-10", "2026-03-01"]);
    expect(grupos[0]?.movimentacoes.map((m) => m.id)).toEqual(["c"]);
  });
});
