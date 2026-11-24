import { describe, expect, it } from "vitest";
import { projetarCaixa } from "@/domain";
import type { EstadoFinanceiro } from "@/domain";
import { recortarHorizonte } from "../pulso";

const HOJE = "2026-03-01";

/** Estado com uma saída (offset 5) e um recebimento previsto (offset 8). */
const estadoBase: EstadoFinanceiro = {
  config: { saldoAbertura: 428_000, margemSeguranca: 100_000 },
  reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
  movimentacoes: [
    {
      id: "material",
      tipo: "saida",
      valor: 115_000,
      data: "2026-03-06", // offset 5
      categoriaId: "materiais",
      status: "pendente",
    },
    {
      id: "receber",
      tipo: "entrada",
      valor: 240_000,
      data: "2026-03-09", // offset 8
      categoriaId: "servicos",
      status: "pendente",
    },
  ],
};

function projecao30(estado: EstadoFinanceiro) {
  return projetarCaixa(estado, { horizonteDias: 30, hoje: HOJE });
}

describe("recortarHorizonte", () => {
  it("recorta 7 dias (offsets 0..7 => 8 pontos)", () => {
    const r = recortarHorizonte(projecao30(estadoBase), 7);
    expect(r.dias).toHaveLength(8);
    expect(r.dias[0]?.offset).toBe(0);
    expect(r.dias[7]?.offset).toBe(7);
    expect(r.dias[0]?.data).toBe(HOJE);
    expect(r.dias[7]?.data).toBe("2026-03-08");
  });

  it("recorta 15 dias (16 pontos)", () => {
    const r = recortarHorizonte(projecao30(estadoBase), 15);
    expect(r.dias).toHaveLength(16);
    expect(r.dias[15]?.offset).toBe(15);
    expect(r.dias[15]?.data).toBe("2026-03-16");
  });

  it("recorta 30 dias (31 pontos)", () => {
    const r = recortarHorizonte(projecao30(estadoBase), 30);
    expect(r.dias).toHaveLength(31);
    expect(r.dias[30]?.offset).toBe(30);
  });

  it("preserva os valores financeiros originais de cada dia", () => {
    const p30 = projecao30(estadoBase);
    const r = recortarHorizonte(p30, 7);
    // mesmos objetos/valores da série original, sem transformação
    expect(r.dias).toEqual(p30.dias.slice(0, 8));
    const noVencimento = r.dias.find((d) => d.data === "2026-03-06")!;
    expect(noVencimento.saldoConfirmado).toBe(313_000); // 428.000 − 115.000
    expect(noVencimento.saidasNoDia).toBe(115_000);
  });

  it("identifica o primeiro dia de risco dentro do recorte", () => {
    // saída grande no offset 5 derruba o confirmado abaixo da linha de segurança
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 200_000, margemSeguranca: 100_000 },
      reservas: [],
      movimentacoes: [
        {
          id: "aluguel",
          tipo: "saida",
          valor: 150_000,
          data: "2026-03-06", // offset 5
          categoriaId: "materiais",
          status: "pendente",
        },
      ],
    };
    const r = recortarHorizonte(projecao30(estado), 7);
    expect(r.primeiroDiaDeRisco?.data).toBe("2026-03-06");
    expect(r.primeiroDiaDeRisco?.offset).toBe(5);
  });

  it("não acusa risco no recorte quando o primeiro risco está fora dele", () => {
    // risco só no offset 10: dentro de 15, fora de 7
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 200_000, margemSeguranca: 100_000 },
      reservas: [],
      movimentacoes: [
        {
          id: "aluguel",
          tipo: "saida",
          valor: 150_000,
          data: "2026-03-11", // offset 10
          categoriaId: "materiais",
          status: "pendente",
        },
      ],
    };
    const p30 = projecao30(estado);
    expect(recortarHorizonte(p30, 7).primeiroDiaDeRisco).toBeNull();
    expect(recortarHorizonte(p30, 15).primeiroDiaDeRisco?.data).toBe("2026-03-11");
  });

  it("não altera a entrada (imutabilidade)", () => {
    const p30 = projecao30(estadoBase);
    const diasAntes = p30.dias;
    const lenAntes = p30.dias.length;
    const riscoAntes = p30.primeiroDiaDeRisco;
    const primeiroDiaAntes = p30.dias[0];

    const r = recortarHorizonte(p30, 7);

    expect(p30.dias).toBe(diasAntes); // mesma referência de array
    expect(p30.dias).toHaveLength(lenAntes);
    expect(p30.primeiroDiaDeRisco).toBe(riscoAntes);
    expect(p30.dias[0]).toBe(primeiroDiaAntes);
    expect(r.dias).not.toBe(p30.dias); // recorte é um novo array
  });

  it("equivale a chamar projetarCaixa diretamente para 7, 15 e 30 (dias e primeiroDiaDeRisco)", () => {
    for (const horizonte of [7, 15, 30] as const) {
      const recorte = recortarHorizonte(projecao30(estadoBase), horizonte);
      const direto = projetarCaixa(estadoBase, { horizonteDias: horizonte, hoje: HOJE });
      expect(recorte.dias).toEqual(direto.dias);
      expect(recorte.primeiroDiaDeRisco).toEqual(direto.primeiroDiaDeRisco);
    }
  });
});
