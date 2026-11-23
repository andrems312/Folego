import { describe, expect, it } from "vitest";
import {
  comprometido,
  livreParaUsar,
  saldoReal,
  totalReservas,
} from "../calculations";
import {
  guardarNaReserva,
  pagarConta,
  resgatarDaReserva,
  type ResultadoOperacao,
} from "../operations";
import type { EstadoFinanceiro } from "../types";

function estadoBase(): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 428_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 0 }],
    movimentacoes: [],
  };
}

function ok(r: ResultadoOperacao): EstadoFinanceiro {
  if (!r.ok) throw new Error(`esperava sucesso, veio: ${r.codigo} ${r.erro}`);
  return r.estado;
}

describe("reservar não é gastar (regra 3) — API única", () => {
  it("guardar aumenta o comprometido e reduz o livre, sem mexer no saldo real", () => {
    const antes = estadoBase();
    expect(saldoReal(antes)).toBe(428_000);
    expect(livreParaUsar(antes)).toBe(428_000);

    const depois = ok(guardarNaReserva(antes, "r1", 80_000));
    expect(saldoReal(depois)).toBe(428_000); // inalterado
    expect(totalReservas(depois)).toBe(80_000);
    expect(comprometido(depois)).toBe(80_000);
    expect(livreParaUsar(depois)).toBe(348_000);
    // imutabilidade
    expect(antes.reservas[0]?.saldoAtual).toBe(0);
  });

  it("resgatar devolve ao disponível sem alterar o saldo real", () => {
    const comReserva = ok(guardarNaReserva(estadoBase(), "r1", 80_000));
    const resgatado = ok(resgatarDaReserva(comReserva, "r1", 30_000));
    expect(saldoReal(resgatado)).toBe(428_000);
    expect(totalReservas(resgatado)).toBe(50_000);
    expect(livreParaUsar(resgatado)).toBe(378_000);
  });

  it("resgatar acima do saldo é rejeitado (sem clamp silencioso, sem negativo)", () => {
    const comReserva = ok(guardarNaReserva(estadoBase(), "r1", 50_000));
    const r = resgatarDaReserva(comReserva, "r1", 999_999);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_ACIMA_DO_SALDO_RESERVA");
    // estado de entrada intacto
    expect(totalReservas(comReserva)).toBe(50_000);
  });
});

describe("pagar conta vinculada não duplica o efeito (regra 4)", () => {
  it("baixa o saldo real e a reserva na mesma medida coberta", () => {
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 428_000, margemSeguranca: 0 },
      reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
      movimentacoes: [
        {
          id: "conta-imposto",
          tipo: "saida",
          valor: 80_000,
          data: "2026-01-10",
          categoriaId: "impostos",
          status: "pendente",
          reservaId: "r1",
        },
      ],
    };

    expect(comprometido(estado)).toBe(80_000);
    expect(livreParaUsar(estado)).toBe(348_000);

    const pago = pagarConta(estado, "conta-imposto");

    expect(saldoReal(pago)).toBe(348_000);
    expect(totalReservas(pago)).toBe(0);
    expect(comprometido(pago)).toBe(0);
    expect(livreParaUsar(pago)).toBe(348_000);
  });

  it("pagar conta sem reserva só baixa o saldo real", () => {
    const estado: EstadoFinanceiro = {
      config: { saldoAbertura: 428_000, margemSeguranca: 0 },
      reservas: [],
      movimentacoes: [
        {
          id: "material",
          tipo: "saida",
          valor: 115_000,
          data: "2026-01-05",
          categoriaId: "materiais",
          status: "pendente",
        },
      ],
    };
    expect(comprometido(estado)).toBe(115_000);
    const pago = pagarConta(estado, "material");
    expect(saldoReal(pago)).toBe(313_000);
    expect(comprometido(pago)).toBe(0);
    expect(livreParaUsar(pago)).toBe(313_000);
  });

  it("pagar id inexistente ou já realizado não altera nada", () => {
    const estado = estadoBase();
    expect(pagarConta(estado, "nao-existe")).toBe(estado);
  });
});
