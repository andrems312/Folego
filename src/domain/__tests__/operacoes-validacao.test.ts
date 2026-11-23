import { describe, expect, it } from "vitest";
import { totalReservas } from "../calculations";
import {
  guardarNaReserva,
  pagarConta,
  registrarPagamento,
  resgatarDaReserva,
} from "../operations";
import type { EstadoFinanceiro } from "../types";

function estadoComConta(reservaId?: string): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 30_000 }],
    movimentacoes: [
      {
        id: "c",
        tipo: "saida",
        valor: 80_000,
        data: "2026-03-10",
        categoriaId: "materiais",
        status: "pendente",
        reservaId: reservaId ?? null,
      },
    ],
  };
}

describe("P2 — registrarPagamento rejeita entradas inválidas sem mutar o estado", () => {
  const e = estadoComConta();

  it("movimentação inexistente", () => {
    const r = registrarPagamento(e, "nao-existe", 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_INEXISTENTE");
  });

  it("valor zero ou negativo", () => {
    expect(registrarPagamento(e, "c", 0).ok).toBe(false);
    const neg = registrarPagamento(e, "c", -500);
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.codigo).toBe("VALOR_INVALIDO");
  });

  it("valor não inteiro (centavos fracionários)", () => {
    const r = registrarPagamento(e, "c", 10_000.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_INVALIDO");
  });

  it("pagamento acima do saldo pendente", () => {
    const r = registrarPagamento(e, "c", 80_001);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_ACIMA_DO_PENDENTE");
  });

  it("movimentação não pagável (entrada)", () => {
    const comEntrada: EstadoFinanceiro = {
      config: { saldoAbertura: 0, margemSeguranca: 0 },
      reservas: [],
      movimentacoes: [
        {
          id: "e1",
          tipo: "entrada",
          valor: 50_000,
          data: "2026-03-10",
          categoriaId: "servicos",
          status: "pendente",
        },
      ],
    };
    const r = registrarPagamento(comEntrada, "e1", 50_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_NAO_PAGAVEL");
  });

  it("vínculo inválido: reserva inexistente", () => {
    const r = registrarPagamento(estadoComConta("fantasma"), "c", 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_INVALIDO");
  });

  it("conta já quitada", () => {
    const quitado = pagarConta(e, "c");
    const r = registrarPagamento(quitado, "c", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("CONTA_JA_QUITADA");
  });

  it("nenhuma operação inválida altera o estado (atomicidade)", () => {
    const antes = JSON.stringify(e);
    registrarPagamento(e, "c", 0);
    registrarPagamento(e, "c", 999_999);
    registrarPagamento(e, "nao-existe", 100);
    expect(JSON.stringify(e)).toBe(antes);
  });
});

describe("P2 — reserva nunca fica negativa ao pagar conta vinculada", () => {
  it("baixa no máximo o saldo da reserva (min), sem negativar", () => {
    const e = estadoComConta("r1"); // reserva 30.000, conta 80.000
    const pago = pagarConta(e, "c");
    expect(totalReservas(pago)).toBe(0); // 30.000 − min(80.000, 30.000) = 0
    expect(totalReservas(pago)).toBeGreaterThanOrEqual(0);
  });
});

describe("P4 — reservas: API pública ÚNICA, validada", () => {
  const e: EstadoFinanceiro = {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 50_000 }],
    movimentacoes: [],
  };

  it("guardar em reserva inexistente é rejeitado", () => {
    const r = guardarNaReserva(e, "x", 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_INEXISTENTE");
  });

  it("guardar valor inválido é rejeitado", () => {
    expect(guardarNaReserva(e, "r1", 0).ok).toBe(false);
    expect(guardarNaReserva(e, "r1", -1).ok).toBe(false);
    expect(guardarNaReserva(e, "r1", 10_000.5).ok).toBe(false);
  });

  it("resgatar acima do saldo guardado é rejeitado", () => {
    const r = resgatarDaReserva(e, "r1", 60_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_ACIMA_DO_SALDO_RESERVA");
  });

  it("resgatar de reserva inexistente é rejeitado", () => {
    const r = resgatarDaReserva(e, "x", 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_INEXISTENTE");
  });

  it("guardar e resgatar válidos funcionam", () => {
    const g = guardarNaReserva(e, "r1", 10_000);
    expect(g.ok).toBe(true);
    if (g.ok) expect(totalReservas(g.estado)).toBe(60_000);

    const r = resgatarDaReserva(e, "r1", 20_000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(totalReservas(r.estado)).toBe(30_000);
  });
});
