import { describe, expect, it } from "vitest";
import {
  comprometido,
  contasPendentes,
  livreParaUsar,
  saldoReal,
  totalReservas,
} from "../calculations";
import { saldoPendente } from "../movimentacao";
import { projetarCaixa } from "../projection";
import { registrarPagamento, type ResultadoOperacao } from "../operations";
import type { EstadoFinanceiro, Movimentacao } from "../types";

/** Garante sucesso e devolve o novo estado (falha o teste caso contrário). */
function ok(r: ResultadoOperacao): EstadoFinanceiro {
  if (!r.ok) throw new Error(`esperava sucesso, veio erro: ${r.codigo} ${r.erro}`);
  return r.estado;
}

function conta(
  valor: number,
  extra: Partial<Movimentacao> = {},
): Movimentacao {
  return {
    id: "c",
    tipo: "saida",
    valor,
    data: "2026-03-10",
    categoriaId: "materiais",
    status: "pendente",
    ...extra,
  };
}

describe("P1 — pagamento parcial de conta sem reserva", () => {
  const base: EstadoFinanceiro = {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [conta(100_000)], // R$ 1.000,00
  };

  it("R$ 400, depois R$ 300, depois R$ 300 quita a conta", () => {
    let e = ok(registrarPagamento(base, "c", 40_000)); // paga 400
    expect(saldoReal(e)).toBe(160_000); // só o pago sai do caixa
    expect(contasPendentes(e)).toBe(60_000); // restante
    expect(comprometido(e)).toBe(60_000);
    expect(livreParaUsar(e)).toBe(100_000);
    expect(e.movimentacoes[0]?.status).toBe("pendente");
    expect(saldoPendente(e.movimentacoes[0]!)).toBe(60_000);

    e = ok(registrarPagamento(e, "c", 30_000)); // paga mais 300
    expect(saldoReal(e)).toBe(130_000);
    expect(contasPendentes(e)).toBe(30_000);
    expect(livreParaUsar(e)).toBe(100_000);

    e = ok(registrarPagamento(e, "c", 30_000)); // paga os últimos 300
    expect(saldoReal(e)).toBe(100_000);
    expect(contasPendentes(e)).toBe(0);
    expect(comprometido(e)).toBe(0);
    expect(e.movimentacoes[0]?.status).toBe("realizado"); // quitada
    expect(saldoPendente(e.movimentacoes[0]!)).toBe(0);
  });

  it("não deixa pagar mais que o saldo pendente", () => {
    const r = registrarPagamento(base, "c", 100_001);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_ACIMA_DO_PENDENTE");
    // estado de entrada intacto
    expect(saldoReal(base)).toBe(200_000);
    expect(contasPendentes(base)).toBe(100_000);
  });

  it("conta já quitada rejeita novo pagamento", () => {
    const quitada = ok(registrarPagamento(base, "c", 100_000));
    const r = registrarPagamento(quitada, "c", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("CONTA_JA_QUITADA");
  });

  it("a projeção considera o valor RESTANTE, não o original", () => {
    const pago = ok(registrarPagamento(base, "c", 60_000)); // restam 400
    const { dias } = projetarCaixa(pago, { horizonteDias: 15, hoje: "2026-03-01" });
    const d0 = dias[0]!;
    const noVencimento = dias.find((d) => d.data === "2026-03-10")!;
    expect(d0.saldoConfirmado).toBe(140_000); // 200.000 − 60.000 já pago
    expect(noVencimento.saldoConfirmado).toBe(100_000); // cai só os 400 restantes
    expect(noVencimento.saidasNoDia).toBe(40_000);
  });
});

describe("P1 — pagamento parcial de conta vinculada a reserva (sem dupla contagem)", () => {
  const base: EstadoFinanceiro = {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    movimentacoes: [conta(80_000, { reservaId: "r1" })],
  };

  it("o livre pra usar permanece invariante durante os pagamentos", () => {
    expect(comprometido(base)).toBe(80_000);
    expect(livreParaUsar(base)).toBe(20_000); // 100.000 − 80.000

    const p1 = ok(registrarPagamento(base, "c", 30_000));
    expect(saldoReal(p1)).toBe(70_000); // caixa cai 300
    expect(totalReservas(p1)).toBe(50_000); // reserva baixa 300
    expect(comprometido(p1)).toBe(50_000);
    expect(livreParaUsar(p1)).toBe(20_000); // invariante

    const p2 = ok(registrarPagamento(p1, "c", 50_000)); // quita
    expect(saldoReal(p2)).toBe(20_000);
    expect(totalReservas(p2)).toBe(0);
    expect(comprometido(p2)).toBe(0);
    expect(livreParaUsar(p2)).toBe(20_000); // segue invariante
  });
});

describe("P1 — duas contas usando a mesma reserva com pagamento parcial", () => {
  const base: EstadoFinanceiro = {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    movimentacoes: [
      conta(50_000, { id: "a", reservaId: "r1" }),
      conta(50_000, { id: "b", reservaId: "r1" }),
    ],
  };

  it("cobre no máximo o saldo da reserva, somando as duas contas", () => {
    // antes: reserva 800 + descoberto (1.000 − 800 = 200) => comprometido 1.000
    expect(comprometido(base)).toBe(100_000);
    expect(livreParaUsar(base)).toBe(100_000);

    const pago = ok(registrarPagamento(base, "a", 30_000)); // paga 300 da conta A
    expect(saldoReal(pago)).toBe(170_000);
    expect(totalReservas(pago)).toBe(50_000); // reserva baixa 300
    // restante total 700; coberto min(700,500)=500; descoberto 200 => comprometido 700
    expect(comprometido(pago)).toBe(70_000);
    expect(livreParaUsar(pago)).toBe(100_000); // invariante
  });
});
