import { describe, expect, it } from "vitest";
import { projetarCaixa } from "../projection";
import type { EstadoFinanceiro } from "../types";

const HOJE = "2026-03-01";

describe("projeção temporal (regra 7 / DESIGN.md §9)", () => {
  const estado: EstadoFinanceiro = {
    config: { saldoAbertura: 428_000, margemSeguranca: 100_000 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    movimentacoes: [
      // conta sem reserva, vence em 5 dias
      {
        id: "material",
        tipo: "saida",
        valor: 115_000,
        data: "2026-03-06",
        categoriaId: "materiais",
        status: "pendente",
      },
      // recebimento previsto em 8 dias
      {
        id: "receber",
        tipo: "entrada",
        valor: 240_000,
        data: "2026-03-09",
        categoriaId: "servicos",
        status: "pendente",
      },
    ],
  };

  const { dias } = projetarCaixa(estado, { horizonteDias: 15, hoje: HOJE });

  it("gera um ponto por dia, de hoje até o horizonte", () => {
    expect(dias).toHaveLength(16); // 0..15
    expect(dias[0]?.data).toBe(HOJE);
    expect(dias[0]?.offset).toBe(0);
    expect(dias[15]?.data).toBe("2026-03-16");
  });

  it("dia 0 parte do saldo real, sem misturar projeção", () => {
    const d0 = dias[0]!;
    expect(d0.saldoConfirmado).toBe(428_000);
    expect(d0.saldoProjetado).toBe(428_000); // nada previsto ainda caiu
    expect(d0.linhaSeguranca).toBe(180_000); // margem 100.000 + reserva 80.000
    expect(d0.emRisco).toBe(false);
  });

  it("a conta a vencer baixa o saldo confirmado no dia do vencimento", () => {
    const anteriorAoVencimento = dias.find((d) => d.data === "2026-03-05")!;
    const noVencimento = dias.find((d) => d.data === "2026-03-06")!;
    expect(anteriorAoVencimento.saldoConfirmado).toBe(428_000);
    expect(noVencimento.saldoConfirmado).toBe(313_000); // 428.000 − 115.000
    expect(noVencimento.saidasNoDia).toBe(115_000);
  });

  it("o previsto só aparece na linha projetada, nunca na confirmada", () => {
    const aposReceber = dias.find((d) => d.data === "2026-03-09")!;
    expect(aposReceber.saldoConfirmado).toBe(313_000); // sem o previsto
    expect(aposReceber.saldoProjetado).toBe(553_000); // 313.000 + 240.000
    expect(aposReceber.recebimentosPrevistosNoDia).toBe(240_000);
  });

  it("após o vencimento, o confirmado acima da linha coincide com o livre pra usar", () => {
    // 313.000 − 180.000 = 133.000  (= R$ 1.330,00, o livre pra usar do §2.5)
    const noVencimento = dias.find((d) => d.data === "2026-03-06")!;
    expect(noVencimento.saldoConfirmado - noVencimento.linhaSeguranca).toBe(133_000);
  });
});

describe("detecção de risco", () => {
  it("sinaliza risco quando o confirmado cai abaixo da linha de segurança", () => {
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 200_000, margemSeguranca: 100_000 },
      reservas: [],
      movimentacoes: [
        {
          id: "aluguel",
          tipo: "saida",
          valor: 150_000,
          data: "2026-03-10",
          categoriaId: "materiais",
          status: "pendente",
        },
      ],
    };
    const { dias, primeiroDiaDeRisco } = projetarCaixa(estado, {
      horizonteDias: 15,
      hoje: HOJE,
    });
    // após pagar 150.000: saldo 50.000 < linha 100.000 => risco
    expect(primeiroDiaDeRisco?.data).toBe("2026-03-10");
    const noDia = dias.find((d) => d.data === "2026-03-10")!;
    expect(noDia.emRisco).toBe(true);
    expect(noDia.saldoConfirmado).toBe(50_000);
  });

  it("conta coberta por reserva baixa a linha de segurança e evita falso risco", () => {
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 200_000, margemSeguranca: 0 },
      reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
      movimentacoes: [
        {
          id: "imposto",
          tipo: "saida",
          valor: 80_000,
          data: "2026-03-10",
          categoriaId: "impostos",
          status: "pendente",
          reservaId: "r1",
        },
      ],
    };
    const { dias, primeiroDiaDeRisco } = projetarCaixa(estado, {
      horizonteDias: 15,
      hoje: HOJE,
    });
    const d0 = dias[0]!;
    expect(d0.linhaSeguranca).toBe(80_000); // reserva ainda intacta
    const aposPagar = dias.find((d) => d.data === "2026-03-10")!;
    expect(aposPagar.saldoConfirmado).toBe(120_000); // 200.000 − 80.000
    expect(aposPagar.linhaSeguranca).toBe(0); // reserva consumida => piso desce
    expect(aposPagar.emRisco).toBe(false); // pagar o que estava reservado não é risco
    expect(primeiroDiaDeRisco).toBeNull();
  });
});

describe("horizontes", () => {
  it("respeita 7, 15 e 30 dias", () => {
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 100_000, margemSeguranca: 0 },
      reservas: [],
      movimentacoes: [],
    };
    expect(projetarCaixa(estado, { horizonteDias: 7, hoje: HOJE }).dias).toHaveLength(8);
    expect(projetarCaixa(estado, { horizonteDias: 15, hoje: HOJE }).dias).toHaveLength(16);
    expect(projetarCaixa(estado, { horizonteDias: 30, hoje: HOJE }).dias).toHaveLength(31);
  });
});
