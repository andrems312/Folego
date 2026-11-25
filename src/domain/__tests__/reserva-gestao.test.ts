import { describe, expect, it } from "vitest";
import { comprometido, livreParaUsar, totalReservas } from "../calculations";
import {
  criarReserva,
  editarReserva,
  excluirReserva,
  type ResultadoOperacao,
} from "../operations";
import type { EstadoFinanceiro, Movimentacao } from "../types";

function ok(r: ResultadoOperacao): EstadoFinanceiro {
  if (!r.ok) throw new Error(`esperava sucesso, veio: ${r.codigo} ${r.erro}`);
  return r.estado;
}

function estado(
  reservas: EstadoFinanceiro["reservas"] = [],
  movimentacoes: Movimentacao[] = [],
): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas,
    movimentacoes,
  };
}

const contaVinculada = (extra: Partial<Movimentacao> = {}): Movimentacao => ({
  id: "c",
  tipo: "saida",
  valor: 50_000,
  data: "2026-03-10",
  categoriaId: "impostos",
  status: "pendente",
  reservaId: "r1",
  ...extra,
});

describe("criarReserva", () => {
  it("cria com alvo e saldoAtual zerado", () => {
    const depois = ok(criarReserva(estado(), { id: "r1", nome: "Impostos", alvo: 120_000 }));
    expect(depois.reservas).toHaveLength(1);
    expect(depois.reservas[0]).toEqual({
      id: "r1",
      nome: "Impostos",
      alvo: 120_000,
      saldoAtual: 0,
    });
  });

  it("cria sem alvo (meta nula) e saldoAtual zerado", () => {
    const depois = ok(criarReserva(estado(), { id: "r2", nome: "Emergência" }));
    expect(depois.reservas[0]?.alvo).toBeNull();
    expect(depois.reservas[0]?.saldoAtual).toBe(0);
  });

  it("apara o nome e mantém saldoAtual em zero mesmo se alvo for grande", () => {
    const depois = ok(criarReserva(estado(), { id: "r3", nome: "  Ferramentas  ", alvo: 999_999 }));
    expect(depois.reservas[0]?.nome).toBe("Ferramentas");
    expect(depois.reservas[0]?.saldoAtual).toBe(0);
  });

  it("rejeita id vazio, id duplicado, nome vazio e alvo inválido", () => {
    const base = estado([{ id: "r1", nome: "Impostos", saldoAtual: 0 }]);

    const idVazio = criarReserva(base, { id: "  ", nome: "X" });
    expect(idVazio.ok).toBe(false);
    if (!idVazio.ok) expect(idVazio.codigo).toBe("ID_INVALIDO");

    const dup = criarReserva(base, { id: "r1", nome: "Outra" });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.codigo).toBe("ID_DUPLICADO");

    const nomeVazio = criarReserva(base, { id: "r9", nome: "   " });
    expect(nomeVazio.ok).toBe(false);
    if (!nomeVazio.ok) expect(nomeVazio.codigo).toBe("NOME_INVALIDO");

    for (const alvo of [0, -1, 1_000.5]) {
      const r = criarReserva(base, { id: "r9", nome: "X", alvo });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.codigo).toBe("ALVO_INVALIDO");
    }
  });

  it("não altera o estado de entrada (imutabilidade)", () => {
    const base = estado();
    const antes = JSON.stringify(base);
    criarReserva(base, { id: "r1", nome: "Impostos", alvo: 100_000 });
    expect(JSON.stringify(base)).toBe(antes);
  });
});

describe("editarReserva", () => {
  const base = estado([{ id: "r1", nome: "Impostos", alvo: 120_000, saldoAtual: 80_000 }]);

  it("edita nome e alvo preservando saldoAtual e id", () => {
    const depois = ok(editarReserva(base, "r1", { nome: "Tributos", alvo: 150_000 }));
    expect(depois.reservas[0]).toEqual({
      id: "r1",
      nome: "Tributos",
      alvo: 150_000,
      saldoAtual: 80_000,
    });
  });

  it("permite remover a meta (alvo = null) sem tocar no saldo", () => {
    const depois = ok(editarReserva(base, "r1", { alvo: null }));
    expect(depois.reservas[0]?.alvo).toBeNull();
    expect(depois.reservas[0]?.saldoAtual).toBe(80_000);
  });

  it("não altera campos não informados", () => {
    const depois = ok(editarReserva(base, "r1", { nome: "Impostos (novo)" }));
    expect(depois.reservas[0]?.alvo).toBe(120_000); // preservado
    expect(depois.reservas[0]?.saldoAtual).toBe(80_000);
  });

  it("rejeita reserva inexistente", () => {
    const r = editarReserva(base, "fantasma", { nome: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_INEXISTENTE");
  });

  it("valida nome e alvo", () => {
    const nome = editarReserva(base, "r1", { nome: "   " });
    expect(nome.ok).toBe(false);
    if (!nome.ok) expect(nome.codigo).toBe("NOME_INVALIDO");

    for (const alvo of [0, -5, 10.5]) {
      const r = editarReserva(base, "r1", { alvo });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.codigo).toBe("ALVO_INVALIDO");
    }
  });

  it("não altera o estado de entrada (imutabilidade)", () => {
    const antes = JSON.stringify(base);
    editarReserva(base, "r1", { nome: "Tributos", alvo: 150_000 });
    expect(JSON.stringify(base)).toBe(antes);
  });
});

describe("excluirReserva", () => {
  it("exclui quando não há conta vinculada e devolve o saldo ao livre", () => {
    // saldoReal 200.000; reserva 80.000 comprometida => livre 120.000
    const base = estado([{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }]);
    expect(comprometido(base)).toBe(80_000);
    expect(livreParaUsar(base)).toBe(120_000);

    const depois = ok(excluirReserva(base, "r1"));
    expect(depois.reservas).toHaveLength(0);
    expect(totalReservas(depois)).toBe(0);
    expect(comprometido(depois)).toBe(0); // deixou de estar comprometido
    expect(livreParaUsar(depois)).toBe(200_000); // voltou ao livre
  });

  it("bloqueia a exclusão quando há conta vinculada (pendente)", () => {
    const base = estado(
      [{ id: "r1", nome: "Impostos", saldoAtual: 50_000 }],
      [contaVinculada()],
    );
    const r = excluirReserva(base, "r1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_COM_VINCULO");
  });

  it("bloqueia mesmo se a conta vinculada já estiver paga, pois o vínculo persiste", () => {
    const base = estado(
      [{ id: "r1", nome: "Impostos", saldoAtual: 0 }],
      [contaVinculada({ status: "realizado", valorPago: 50_000 })],
    );
    const r = excluirReserva(base, "r1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_COM_VINCULO");
  });

  it("rejeita reserva inexistente", () => {
    const r = excluirReserva(estado(), "fantasma");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_INEXISTENTE");
  });

  it("não altera o estado de entrada (imutabilidade)", () => {
    const base = estado([{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }]);
    const antes = JSON.stringify(base);
    excluirReserva(base, "r1");
    expect(JSON.stringify(base)).toBe(antes);
  });
});

describe("atomicidade — nenhuma operação inválida altera o estado", () => {
  it("criar/editar/excluir inválidos deixam o estado intacto", () => {
    const base = estado(
      [{ id: "r1", nome: "Impostos", alvo: 120_000, saldoAtual: 80_000 }],
      [contaVinculada()],
    );
    const antes = JSON.stringify(base);

    criarReserva(base, { id: "r1", nome: "dup" }); // ID_DUPLICADO
    criarReserva(base, { id: "r9", nome: "   " }); // NOME_INVALIDO
    editarReserva(base, "fantasma", { nome: "X" }); // RESERVA_INEXISTENTE
    editarReserva(base, "r1", { alvo: -1 }); // ALVO_INVALIDO
    excluirReserva(base, "r1"); // RESERVA_COM_VINCULO
    excluirReserva(base, "fantasma"); // RESERVA_INEXISTENTE

    expect(JSON.stringify(base)).toBe(antes);
  });
});
