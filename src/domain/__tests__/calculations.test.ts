import { describe, expect, it } from "vitest";
import { estadoDemo } from "@/demo/fixtures";
import {
  comprometido,
  contasPendentes,
  contasPendentesNaoCobertas,
  entradasPrevistas,
  entradasRealizadas,
  livreBruto,
  livreParaUsar,
  resumoFinanceiro,
  saldoReal,
  totalReservas,
} from "../calculations";
import type { EstadoFinanceiro, Movimentacao } from "../types";

function estado(parcial: Partial<EstadoFinanceiro>): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 0, margemSeguranca: 0 },
    movimentacoes: [],
    reservas: [],
    ...parcial,
  };
}

function conta(
  valor: number,
  extra: Partial<Movimentacao> = {},
): Movimentacao {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "saida",
    valor,
    data: "2026-01-01",
    categoriaId: "materiais",
    status: "pendente",
    ...extra,
  };
}

describe("exemplo trabalhado do DESIGN.md §2.5", () => {
  const r = resumoFinanceiro(estadoDemo);

  it("saldo real = R$ 4.280,00", () => {
    expect(saldoReal(estadoDemo)).toBe(428_000);
    expect(r.saldoReal).toBe(428_000);
  });

  it("total de reservas = R$ 800,00", () => {
    expect(totalReservas(estadoDemo)).toBe(80_000);
  });

  it("comprometido = R$ 1.950,00", () => {
    expect(comprometido(estadoDemo)).toBe(195_000);
  });

  it("livre pra usar = R$ 1.330,00", () => {
    expect(livreParaUsar(estadoDemo)).toBe(133_000);
    expect(r.livreBruto).toBe(133_000);
    expect(r.emDeficit).toBe(false);
    expect(r.deficit).toBe(0);
  });

  it("recebimentos previstos = R$ 2.400,00 e ficam à parte", () => {
    expect(entradasPrevistas(estadoDemo)).toBe(240_000);
    // previstos não entram no saldo real nem no livre
    expect(r.saldoReal).toBe(428_000);
    expect(r.livreParaUsar).toBe(133_000);
  });
});

describe("saldo inicial (regra 1)", () => {
  it("abertura não é contada como entrada/serviço prestado", () => {
    const e = estado({
      config: { saldoAbertura: 300_000, margemSeguranca: 0 },
    });
    expect(saldoReal(e)).toBe(300_000);
    expect(entradasRealizadas(e)).toBe(0); // abertura não aparece como entrada
  });

  it("abertura soma ao saldo junto das entradas realizadas", () => {
    const e = estado({
      config: { saldoAbertura: 300_000, margemSeguranca: 0 },
      movimentacoes: [
        conta(200_000, { tipo: "entrada", status: "realizado" }),
      ],
    });
    expect(saldoReal(e)).toBe(500_000);
    expect(entradasRealizadas(e)).toBe(200_000);
  });
});

describe("movimentações realizadas x pendentes (regra 2)", () => {
  it("entradas pendentes não entram no saldo real", () => {
    const e = estado({
      movimentacoes: [conta(100_000, { tipo: "entrada", status: "pendente" })],
    });
    expect(saldoReal(e)).toBe(0);
    expect(entradasPrevistas(e)).toBe(100_000);
  });

  it("saídas pendentes não baixam o saldo real, mas entram nos compromissos", () => {
    const e = estado({
      config: { saldoAbertura: 100_000, margemSeguranca: 0 },
      movimentacoes: [conta(40_000, { tipo: "saida", status: "pendente" })],
    });
    expect(saldoReal(e)).toBe(100_000); // inalterado
    expect(contasPendentes(e)).toBe(40_000);
    expect(comprometido(e)).toBe(40_000);
    expect(livreParaUsar(e)).toBe(60_000);
  });
});

describe("anti-dupla-contagem de contas vinculadas (regra 4 / §2.4)", () => {
  const reservaDe = (saldoAtual: number) => [
    { id: "r1", nome: "Impostos", saldoAtual },
  ];

  it("conta de 800 coberta por reserva de 800: comprometido = 800", () => {
    const e = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [conta(80_000, { reservaId: "r1" })],
    });
    expect(contasPendentesNaoCobertas(e)).toBe(0);
    expect(comprometido(e)).toBe(80_000); // não 160.000
  });

  it("conta de 1.000 coberta por reserva de 800: apenas 200 descobertos", () => {
    const e = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [conta(100_000, { reservaId: "r1" })],
    });
    expect(contasPendentesNaoCobertas(e)).toBe(20_000);
    expect(comprometido(e)).toBe(100_000); // 800 reserva + 200 descoberto
  });

  it("conta de 500 coberta por reserva de 800: não desconta os 500 de novo", () => {
    const e = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [conta(50_000, { reservaId: "r1" })],
    });
    expect(contasPendentesNaoCobertas(e)).toBe(0);
    expect(comprometido(e)).toBe(80_000); // só a reserva
  });

  it("várias contas vinculadas à mesma reserva somam antes de cobrir", () => {
    const totalmente = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [
        conta(30_000, { reservaId: "r1" }),
        conta(30_000, { reservaId: "r1" }),
      ],
    });
    expect(contasPendentesNaoCobertas(totalmente)).toBe(0);
    expect(comprometido(totalmente)).toBe(80_000);

    const excedente = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [
        conta(50_000, { reservaId: "r1" }),
        conta(50_000, { reservaId: "r1" }),
      ],
    });
    expect(contasPendentesNaoCobertas(excedente)).toBe(20_000); // 1.000 − 800
    expect(comprometido(excedente)).toBe(100_000);
  });

  it("conta sem reserva conta integralmente", () => {
    const e = estado({
      reservas: reservaDe(80_000),
      movimentacoes: [conta(50_000)], // sem reservaId
    });
    expect(contasPendentesNaoCobertas(e)).toBe(50_000);
    expect(comprometido(e)).toBe(130_000);
  });

  it("reserva sem contas vinculadas entra só pelo seu saldo", () => {
    const e = estado({ reservas: reservaDe(80_000) });
    expect(contasPendentesNaoCobertas(e)).toBe(0);
    expect(comprometido(e)).toBe(80_000);
  });

  it("vínculo a reserva inexistente não gera cobertura", () => {
    const e = estado({
      reservas: [],
      movimentacoes: [conta(50_000, { reservaId: "fantasma" })],
    });
    expect(contasPendentesNaoCobertas(e)).toBe(50_000);
  });
});

describe("múltiplas reservas", () => {
  it("soma reservas e cobre cada vínculo isoladamente", () => {
    const e = estado({
      reservas: [
        { id: "r1", nome: "Impostos", saldoAtual: 80_000 },
        { id: "r2", nome: "Ferramentas", saldoAtual: 50_000 },
      ],
      movimentacoes: [
        conta(100_000, { reservaId: "r1" }), // 20.000 descobertos
        conta(30_000, { reservaId: "r2" }), // coberto
      ],
    });
    expect(totalReservas(e)).toBe(130_000);
    expect(contasPendentesNaoCobertas(e)).toBe(20_000);
    expect(comprometido(e)).toBe(150_000);
  });
});

describe("edição e exclusão não geram inconsistência", () => {
  const base = estado({
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    movimentacoes: [
      conta(50_000, { id: "a" }),
      conta(30_000, { id: "b" }),
    ],
  });

  it("excluir uma conta reduz o comprometido", () => {
    expect(comprometido(base)).toBe(80_000);
    const semB: EstadoFinanceiro = {
      ...base,
      movimentacoes: base.movimentacoes.filter((m) => m.id !== "b"),
    };
    expect(comprometido(semB)).toBe(50_000);
    expect(livreParaUsar(semB)).toBe(150_000);
  });

  it("editar o valor de uma conta recalcula do zero", () => {
    const editado: EstadoFinanceiro = {
      ...base,
      movimentacoes: base.movimentacoes.map((m) =>
        m.id === "a" ? { ...m, valor: 10_000 } : m,
      ),
    };
    expect(comprometido(editado)).toBe(40_000);
  });

  it("alterar o vínculo de reserva reflete na cobertura", () => {
    const comReserva: EstadoFinanceiro = {
      config: { saldoAbertura: 200_000, margemSeguranca: 0 },
      reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 50_000 }],
      movimentacoes: [conta(50_000, { id: "a", reservaId: null })],
    };
    expect(comprometido(comReserva)).toBe(100_000); // 50 reserva + 50 conta solta

    const vinculada: EstadoFinanceiro = {
      ...comReserva,
      movimentacoes: comReserva.movimentacoes.map((m) =>
        m.id === "a" ? { ...m, reservaId: "r1" } : m,
      ),
    };
    expect(comprometido(vinculada)).toBe(50_000); // agora coberta
  });
});

describe("livre pra usar e déficit (regra 5)", () => {
  it("piso em zero, mas déficit real preservado internamente", () => {
    const e = estado({
      config: { saldoAbertura: 50_000, margemSeguranca: 0 },
      reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    });
    const r = resumoFinanceiro(e);
    expect(r.livreBruto).toBe(-30_000); // negativo interno
    expect(r.livreParaUsar).toBe(0); // indicador com piso
    expect(r.deficit).toBe(30_000); // quanto falta cobrir
    expect(r.emDeficit).toBe(true);
  });

  it("a margem de segurança reduz o livre", () => {
    const semMargem = estado({ config: { saldoAbertura: 100_000, margemSeguranca: 0 } });
    expect(livreParaUsar(semMargem)).toBe(100_000);

    const comMargem = estado({
      config: { saldoAbertura: 100_000, margemSeguranca: 40_000 },
    });
    expect(livreBruto(comMargem)).toBe(60_000);
    expect(livreParaUsar(comMargem)).toBe(60_000);
  });
});

describe("casos limites", () => {
  it("estado vazio: tudo zero, sem déficit", () => {
    const r = resumoFinanceiro(estado({}));
    expect(r.saldoReal).toBe(0);
    expect(r.comprometido).toBe(0);
    expect(r.livreParaUsar).toBe(0);
    expect(r.emDeficit).toBe(false);
  });

  it("valores altos não perdem precisão (centavos inteiros)", () => {
    const e = estado({
      config: { saldoAbertura: 10_000_000_00, margemSeguranca: 0 },
      movimentacoes: [conta(2_500_000_00, { reservaId: null })],
    });
    expect(saldoReal(e)).toBe(10_000_000_00);
    expect(comprometido(e)).toBe(2_500_000_00);
    expect(livreParaUsar(e)).toBe(7_500_000_00);
  });
});
