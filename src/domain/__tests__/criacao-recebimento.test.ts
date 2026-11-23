import { describe, expect, it } from "vitest";
import {
  comprometido,
  contasPendentes,
  entradasPrevistas,
  saldoReal,
} from "../calculations";
import { afetouSaldoReal, saldoPendente, valorPago } from "../movimentacao";
import {
  adicionarMovimentacao,
  receberEntrada,
  registrarPagamento,
  type NovaMovimentacao,
  type ResultadoOperacao,
} from "../operations";
import type { EstadoFinanceiro } from "../types";

function base(): EstadoFinanceiro {
  return {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    movimentacoes: [],
  };
}

function nova(extra: Partial<NovaMovimentacao> = {}): NovaMovimentacao {
  return {
    id: "n1",
    tipo: "saida",
    valor: 50_000,
    data: "2026-03-10",
    categoriaId: "materiais",
    status: "pendente",
    ...extra,
  };
}

function ok(r: ResultadoOperacao): EstadoFinanceiro {
  if (!r.ok) throw new Error(`esperava sucesso, veio: ${r.codigo} ${r.erro}`);
  return r.estado;
}

describe("adicionarMovimentacao — criação válida", () => {
  it("entrada realizada entra no saldo real", () => {
    const e = ok(
      adicionarMovimentacao(base(), nova({ id: "e", tipo: "entrada", valor: 200_000, status: "realizado" })),
    );
    expect(saldoReal(e)).toBe(300_000); // 100.000 + 200.000
    expect(e.movimentacoes).toHaveLength(1);
    expect(e.movimentacoes[0]?.status).toBe("realizado");
  });

  it("entrada prevista (pendente) fica à parte, sem mexer no saldo real", () => {
    const e = ok(
      adicionarMovimentacao(base(), nova({ id: "e", tipo: "entrada", valor: 240_000, status: "pendente" })),
    );
    expect(saldoReal(e)).toBe(100_000); // inalterado
    expect(entradasPrevistas(e)).toBe(240_000);
  });

  it("saída pendente vira compromisso e pode ser excluída (ainda sem efeito no saldo)", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ valor: 50_000 })));
    expect(saldoReal(e)).toBe(100_000);
    expect(contasPendentes(e)).toBe(50_000);
    const m = e.movimentacoes[0]!;
    expect(valorPago(m)).toBe(0);
    expect(afetouSaldoReal(m)).toBe(false);
  });

  it("saída realizada (já paga) baixa o saldo real e nasce quitada", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ valor: 30_000, status: "realizado" })));
    expect(saldoReal(e)).toBe(70_000);
    const m = e.movimentacoes[0]!;
    expect(valorPago(m)).toBe(30_000);
    expect(saldoPendente(m)).toBe(0);
    expect(afetouSaldoReal(m)).toBe(true);
  });

  it("retirada pessoal realizada baixa o saldo real", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ tipo: "retirada", valor: 20_000, status: "realizado" })));
    expect(saldoReal(e)).toBe(80_000);
  });

  it("guarda a data EXATAMENTE como informada (sem deslocamento de fuso)", () => {
    for (const data of ["2026-01-01", "2026-03-10", "2026-12-31"]) {
      const e = ok(adicionarMovimentacao(base(), nova({ data })));
      expect(e.movimentacoes[0]?.data).toBe(data);
    }
  });

  it("cria conta pendente vinculada a reserva válida (cobertura reflete)", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ valor: 50_000, reservaId: "r1" })));
    // reserva 80.000 cobre os 50.000 -> comprometido = só a reserva (80.000)
    expect(comprometido(e)).toBe(80_000);
  });
});

describe("adicionarMovimentacao — validações (atômicas)", () => {
  const e = base();

  it("id vazio", () => {
    const r = adicionarMovimentacao(e, nova({ id: "  " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("ID_INVALIDO");
  });

  it("id duplicado", () => {
    const comUma = ok(adicionarMovimentacao(e, nova({ id: "x" })));
    const r = adicionarMovimentacao(comUma, nova({ id: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("ID_DUPLICADO");
  });

  it("valor zero, negativo ou não inteiro", () => {
    expect(adicionarMovimentacao(e, nova({ valor: 0 })).ok).toBe(false);
    expect(adicionarMovimentacao(e, nova({ valor: -1 })).ok).toBe(false);
    const frac = adicionarMovimentacao(e, nova({ valor: 10.5 }));
    expect(frac.ok).toBe(false);
    if (!frac.ok) expect(frac.codigo).toBe("VALOR_INVALIDO");
  });

  it("categoria vazia", () => {
    const r = adicionarMovimentacao(e, nova({ categoriaId: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("CATEGORIA_INVALIDA");
  });

  it("data em formato inválido", () => {
    const r = adicionarMovimentacao(e, nova({ data: "10/03/2026" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("DATA_INVALIDA");
  });

  it("data impossível (dia/mês que não existem) é rejeitada", () => {
    for (const data of [
      "2026-02-31",
      "2026-13-10",
      "2026-04-31",
      "2026-00-10",
      "2026-01-00",
      "2026-02-29", // 2026 não é bissexto
    ]) {
      const r = adicionarMovimentacao(e, nova({ data }));
      expect(r.ok, data).toBe(false);
      if (!r.ok) expect(r.codigo).toBe("DATA_INVALIDA");
    }
  });

  it("aceita 29/02 em ano bissexto", () => {
    expect(adicionarMovimentacao(e, nova({ data: "2028-02-29" })).ok).toBe(true);
  });

  it("reserva inexistente", () => {
    const r = adicionarMovimentacao(e, nova({ reservaId: "fantasma" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_INVALIDO");
  });

  it("vínculo de reserva em entrada é rejeitado", () => {
    const r = adicionarMovimentacao(e, nova({ tipo: "entrada", reservaId: "r1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_INVALIDO");
  });

  it("conta já paga vinculada a reserva é bloqueada (crie pendente e pague)", () => {
    const r = adicionarMovimentacao(e, nova({ status: "realizado", reservaId: "r1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("VINCULO_BLOQUEADO");
  });

  it("nenhuma criação inválida altera o estado de entrada", () => {
    const antes = JSON.stringify(e);
    adicionarMovimentacao(e, nova({ valor: 0 }));
    adicionarMovimentacao(e, nova({ data: "x" }));
    adicionarMovimentacao(e, nova({ reservaId: "fantasma" }));
    expect(JSON.stringify(e)).toBe(antes);
  });
});

describe("adicionarMovimentacao — integra com o domínio existente", () => {
  it("criar pendente e pagar parcialmente respeita a anti-dupla-contagem", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ valor: 50_000, reservaId: "r1" })));
    const pago = ok(registrarPagamento(e, "n1", 20_000));
    expect(saldoReal(pago)).toBe(80_000); // 100.000 − 20.000 pago
    expect(saldoPendente(pago.movimentacoes[0]!)).toBe(30_000);
  });
});

describe("receberEntrada", () => {
  function comPrevista(): EstadoFinanceiro {
    return ok(
      adicionarMovimentacao(base(), nova({ id: "p", tipo: "entrada", valor: 150_000, status: "pendente" })),
    );
  }

  it("recebe uma entrada prevista: passa a contar no saldo real", () => {
    const e = comPrevista();
    expect(saldoReal(e)).toBe(100_000);
    expect(entradasPrevistas(e)).toBe(150_000);

    const recebido = ok(receberEntrada(e, "p"));
    expect(recebido.movimentacoes[0]?.status).toBe("realizado");
    expect(saldoReal(recebido)).toBe(250_000);
    expect(entradasPrevistas(recebido)).toBe(0);
  });

  it("rejeita receber uma conta (saída)", () => {
    const e = ok(adicionarMovimentacao(base(), nova({ id: "c", tipo: "saida", status: "pendente" })));
    const r = receberEntrada(e, "c");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_NAO_RECEBIVEL");
  });

  it("rejeita entrada já recebida", () => {
    const e = ok(receberEntrada(comPrevista(), "p"));
    const r = receberEntrada(e, "p");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("ENTRADA_JA_RECEBIDA");
  });

  it("rejeita movimentação inexistente", () => {
    const r = receberEntrada(base(), "nao-existe");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_INEXISTENTE");
  });

  it("não altera o estado em caso de erro (atomicidade)", () => {
    const e = comPrevista();
    const antes = JSON.stringify(e);
    receberEntrada(e, "nao-existe");
    expect(JSON.stringify(e)).toBe(antes);
  });
});
