import { describe, expect, it } from "vitest";
import { estadoDemo } from "@/demo/fixtures";
import {
  carregarEstadoFinanceiro,
  EstadoInvalidoError,
  validarEstadoFinanceiro,
} from "../validation";
import type { EstadoFinanceiro } from "../types";

/** Estado válido mínimo, para variar campos inválidos a partir dele. */
function valido(): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 50_000 }],
    movimentacoes: [
      {
        id: "c",
        tipo: "saida",
        valor: 80_000,
        data: "2026-03-10",
        categoriaId: "materiais",
        status: "pendente",
        reservaId: "r1",
      },
    ],
  };
}

describe("P3 — validação de fronteira do estado financeiro", () => {
  it("aceita o estado de demonstração (exemplo do DESIGN.md)", () => {
    const r = validarEstadoFinanceiro(estadoDemo);
    expect(r.ok).toBe(true);
  });

  it("aceita uma conta parcialmente paga coerente", () => {
    const e = valido();
    e.movimentacoes[0]!.valorPago = 30_000; // pendente, 30.000 pagos
    expect(validarEstadoFinanceiro(e).ok).toBe(true);
  });

  it("rejeita valor negativo", () => {
    const e = valido();
    (e.movimentacoes[0] as { valor: number }).valor = -1;
    expect(validarEstadoFinanceiro(e).ok).toBe(false);
  });

  it("rejeita valor não inteiro (centavos fracionários)", () => {
    const e = valido();
    (e.movimentacoes[0] as { valor: number }).valor = 80_000.5;
    expect(validarEstadoFinanceiro(e).ok).toBe(false);
  });

  it("rejeita valorPago maior que o valor", () => {
    const e = valido();
    e.movimentacoes[0]!.valorPago = 90_000; // > 80.000
    const r = validarEstadoFinanceiro(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/valorPago/);
  });

  it("rejeita reserva com saldo negativo", () => {
    const e = valido();
    e.reservas[0]!.saldoAtual = -100;
    expect(validarEstadoFinanceiro(e).ok).toBe(false);
  });

  it("rejeita vínculo inválido (reserva inexistente)", () => {
    const e = valido();
    e.movimentacoes[0]!.reservaId = "nao-existe";
    const r = validarEstadoFinanceiro(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/Vínculo inválido/);
  });

  it("rejeita data em formato inválido", () => {
    const e = valido();
    e.movimentacoes[0]!.data = "10/03/2026";
    expect(validarEstadoFinanceiro(e).ok).toBe(false);
  });

  it("rejeita incoerência entre status e valorPago", () => {
    const e = valido();
    // totalmente paga mas ainda marcada como pendente
    e.movimentacoes[0]!.valorPago = 80_000;
    e.movimentacoes[0]!.status = "pendente";
    const r = validarEstadoFinanceiro(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/realizado/);
  });

  it("rejeita ids de movimentação duplicados", () => {
    const e = valido();
    e.movimentacoes.push({ ...e.movimentacoes[0]! });
    const r = validarEstadoFinanceiro(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/duplicado/);
  });

  it("rejeita margem de segurança negativa", () => {
    const e = valido();
    e.config.margemSeguranca = -500;
    expect(validarEstadoFinanceiro(e).ok).toBe(false);
  });
});

describe("P4(B) — carregarEstadoFinanceiro aplica a validação na entrada", () => {
  it("retorna um estado tipado para dados válidos", () => {
    const e = carregarEstadoFinanceiro(valido());
    expect(e.movimentacoes).toHaveLength(1);
  });

  it("LANÇA EstadoInvalidoError para dados inválidos (não há como ignorar)", () => {
    const e = valido();
    (e.movimentacoes[0] as { valor: number }).valor = -1;
    expect(() => carregarEstadoFinanceiro(e)).toThrow(EstadoInvalidoError);
  });

  it("o fixture de demonstração passa pela porta de entrada (carrega sem lançar)", () => {
    // estadoDemo é produzido por carregarEstadoFinanceiro em src/demo/fixtures.ts
    expect(estadoDemo.movimentacoes.length).toBeGreaterThan(0);
  });
});
