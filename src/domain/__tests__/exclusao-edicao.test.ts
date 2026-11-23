import { describe, expect, it } from "vitest";
import { saldoReal, totalReservas } from "../calculations";
import { saldoPendente, valorPago } from "../movimentacao";
import {
  editarMovimentacao,
  excluirMovimentacao,
  registrarPagamento,
  type ResultadoOperacao,
} from "../operations";
import type { EstadoFinanceiro, Movimentacao } from "../types";

function ok(r: ResultadoOperacao): EstadoFinanceiro {
  if (!r.ok) throw new Error(`esperava sucesso, veio: ${r.codigo} ${r.erro}`);
  return r.estado;
}

function estado(movs: Movimentacao[], reservas = [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }]): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas,
    movimentacoes: movs,
  };
}

const contaPendente: Movimentacao = {
  id: "c",
  tipo: "saida",
  valor: 60_000,
  data: "2026-03-10",
  categoriaId: "materiais",
  status: "pendente",
  reservaId: "r1",
};

describe("C — exclusão segura (regras 1 e 2)", () => {
  it("exclui conta pendente SEM pagamento", () => {
    const e = estado([{ ...contaPendente, reservaId: null }]);
    const depois = ok(excluirMovimentacao(e, "c"));
    expect(depois.movimentacoes).toHaveLength(0);
  });

  it("NÃO exclui conta com pagamento parcial (não apaga o que afetou o saldo real)", () => {
    const parcial = ok(registrarPagamento(estado([contaPendente]), "c", 40_000));
    const saldoAntes = saldoReal(parcial);
    const reservaAntes = totalReservas(parcial);

    const r = excluirMovimentacao(parcial, "c");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_COM_PAGAMENTO");

    // estado intacto: o valor já pago e a baixa de reserva permanecem
    expect(saldoReal(parcial)).toBe(saldoAntes);
    expect(totalReservas(parcial)).toBe(reservaAntes);
    expect(valorPago(parcial.movimentacoes[0]!)).toBe(40_000);
  });

  it("NÃO exclui conta totalmente paga", () => {
    const paga = ok(registrarPagamento(estado([contaPendente]), "c", 60_000));
    const r = excluirMovimentacao(paga, "c");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_COM_PAGAMENTO");
  });

  it("NÃO exclui entrada já recebida (realizada)", () => {
    const e = estado([
      {
        id: "e1",
        tipo: "entrada",
        valor: 100_000,
        data: "2026-03-01",
        categoriaId: "servicos",
        status: "realizado",
      },
    ]);
    const r = excluirMovimentacao(e, "e1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_COM_PAGAMENTO");
  });

  it("exclui entrada prevista (pendente, ainda sem efeito no saldo)", () => {
    const e = estado([
      {
        id: "e1",
        tipo: "entrada",
        valor: 100_000,
        data: "2026-03-20",
        categoriaId: "servicos",
        status: "pendente",
      },
    ]);
    const depois = ok(excluirMovimentacao(e, "e1"));
    expect(depois.movimentacoes).toHaveLength(0);
  });

  it("excluir inexistente é rejeitado", () => {
    const r = excluirMovimentacao(estado([contaPendente]), "zzz");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_INEXISTENTE");
  });
});

describe("C — edição segura (regra 3)", () => {
  it("edita categoria/data/descrição preservando valor e valorPago", () => {
    const parcial = ok(registrarPagamento(estado([contaPendente]), "c", 40_000));
    const editado = ok(
      editarMovimentacao(parcial, "c", {
        categoriaId: "ferramentas",
        data: "2026-03-15",
        descricao: "Furadeira nova",
      }),
    );
    const m = editado.movimentacoes[0]!;
    expect(m.categoriaId).toBe("ferramentas");
    expect(m.data).toBe("2026-03-15");
    expect(valorPago(m)).toBe(40_000); // histórico preservado
    expect(m.valor).toBe(60_000);
    expect(saldoPendente(m)).toBe(20_000);
  });

  it("NÃO permite editar o valor abaixo do que já foi pago", () => {
    const parcial = ok(registrarPagamento(estado([contaPendente]), "c", 40_000));
    const r = editarMovimentacao(parcial, "c", { valor: 30_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VALOR_ABAIXO_DO_PAGO");
    // intacto
    expect(parcial.movimentacoes[0]?.valor).toBe(60_000);
  });

  it("editar o valor para o total já pago quita a conta (status coerente)", () => {
    const parcial = ok(registrarPagamento(estado([contaPendente]), "c", 40_000));
    const editado = ok(editarMovimentacao(parcial, "c", { valor: 40_000 }));
    const m = editado.movimentacoes[0]!;
    expect(m.valor).toBe(40_000);
    expect(valorPago(m)).toBe(40_000);
    expect(m.status).toBe("realizado"); // derivado: pago >= valor
    expect(saldoPendente(m)).toBe(0);
  });

  it("rejeita data em formato inválido", () => {
    const r = editarMovimentacao(estado([contaPendente]), "c", { data: "15/03/2026" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("DATA_INVALIDA");
  });

  it("rejeita vínculo com reserva inexistente", () => {
    const r = editarMovimentacao(estado([contaPendente]), "c", { reservaId: "fantasma" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_INVALIDO");
  });

  it("bloqueia trocar a reserva de uma conta que já recebeu pagamento", () => {
    const comDuasReservas = estado([contaPendente], [
      { id: "r1", nome: "Impostos", saldoAtual: 80_000 },
      { id: "r2", nome: "Ferramentas", saldoAtual: 20_000 },
    ]);
    const parcial = ok(registrarPagamento(comDuasReservas, "c", 10_000));
    const r = editarMovimentacao(parcial, "c", { reservaId: "r2" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_BLOQUEADO");
  });

  it("permite ajustar o vínculo quando a conta ainda não teve pagamento", () => {
    const semPagamento = estado([{ ...contaPendente, reservaId: null }]);
    const editado = ok(editarMovimentacao(semPagamento, "c", { reservaId: "r1" }));
    expect(editado.movimentacoes[0]?.reservaId).toBe("r1");
  });

  it("editar inexistente é rejeitado", () => {
    const r = editarMovimentacao(estado([contaPendente]), "zzz", { valor: 10_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_INEXISTENTE");
  });
});
