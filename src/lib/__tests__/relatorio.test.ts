import { describe, expect, it } from "vitest";
import type { Movimentacao, MovimentacaoTipo } from "@/domain";
import { relatorioDoPeriodo, type PeriodoRelatorio } from "../relatorio";

/**
 * Entrega 2.8 / Etapa A — núcleo de cálculo dos relatórios (base competência).
 *
 * Convenção dos cenários: período padrão = março/2026. As asserções verificam
 * VALORES concretos em centavos, nunca só a forma do objeto.
 */
const PERIODO: PeriodoRelatorio = { inicio: "2026-03-01", fim: "2026-03-31" };

let seq = 0;
function mov(
  parcial: Partial<Movimentacao> & { tipo: MovimentacaoTipo },
): Movimentacao {
  seq += 1;
  return {
    id: `m${seq}`,
    tipo: parcial.tipo,
    valor: parcial.valor ?? 10_000,
    data: parcial.data ?? "2026-03-15",
    categoriaId: parcial.categoriaId ?? "servicos",
    status: parcial.status ?? "realizado",
    valorPago: parcial.valorPago,
    reservaId: parcial.reservaId,
    descricao: parcial.descricao,
  };
}

describe("relatorioDoPeriodo — filtro de período (inclusivo, sem fuso)", () => {
  it("inclui os lançamentos exatamente em inicio e fim", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "entrada", valor: 5_000, data: "2026-03-01" }),
        mov({ tipo: "saida", valor: 2_000, data: "2026-03-31" }),
      ],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(5_000);
    expect(r.saidasPagas).toBe(2_000);
    expect(r.contagem.total).toBe(2);
  });

  it("exclui lançamento anterior ao período", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 9_999, data: "2026-02-28" })],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(0);
    expect(r.contagem.total).toBe(0);
  });

  it("exclui lançamento posterior ao período", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 9_999, data: "2026-04-01" })],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(0);
    expect(r.contagem.total).toBe(0);
  });

  it("inicio > fim resulta em período vazio (tudo zerado)", () => {
    const invertido: PeriodoRelatorio = { inicio: "2026-03-31", fim: "2026-03-01" };
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 5_000, data: "2026-03-15" })],
      invertido,
    );
    expect(r.entradasRecebidas).toBe(0);
    expect(r.contagem.total).toBe(0);
  });
});

describe("relatorioDoPeriodo — entradas (recebidas × previstas)", () => {
  it("entrada realizada conta como recebida, não como a receber", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 40_000, status: "realizado" })],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(40_000);
    expect(r.entradasAReceber).toBe(0);
    expect(r.contagem.entradasRecebidas).toBe(1);
    expect(r.contagem.entradasAReceber).toBe(0);
  });

  it("entrada pendente é prevista (a receber), nunca recebida", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 30_000, status: "pendente" })],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(0);
    expect(r.entradasAReceber).toBe(30_000);
    expect(r.contagem.entradasAReceber).toBe(1);
  });

  it("recebimento parcial: separa recebido e a receber sem dupla contagem", () => {
    // Exercita o uso uniforme de valorPago/saldoPendente (o domínio hoje mantém
    // entradas atômicas, mas o relatório lida corretamente com um parcial).
    const r = relatorioDoPeriodo(
      [mov({ tipo: "entrada", valor: 10_000, valorPago: 6_000, status: "pendente" })],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(6_000);
    expect(r.entradasAReceber).toBe(4_000);
    expect(r.contagem.entradasRecebidas).toBe(1);
    expect(r.contagem.entradasAReceber).toBe(1);
  });
});

describe("relatorioDoPeriodo — saídas (pagas × a pagar) e parciais", () => {
  it("saída realizada conta como paga", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "saida", valor: 20_000, status: "realizado" })],
      PERIODO,
    );
    expect(r.saidasPagas).toBe(20_000);
    expect(r.saidasAPagar).toBe(0);
    expect(r.contagem.saidasPagas).toBe(1);
  });

  it("saída pendente conta como a pagar, não como paga", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "saida", valor: 15_000, status: "pendente" })],
      PERIODO,
    );
    expect(r.saidasPagas).toBe(0);
    expect(r.saidasAPagar).toBe(15_000);
    expect(r.contagem.saidasAPagar).toBe(1);
  });

  it("pagamento parcial: separa pago e pendente sem dupla contagem", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "saida", valor: 10_000, valorPago: 4_000, status: "pendente" })],
      PERIODO,
    );
    expect(r.saidasPagas).toBe(4_000);
    expect(r.saidasAPagar).toBe(6_000);
    // O mesmo lançamento aparece nas duas contagens (está parcialmente em cada).
    expect(r.contagem.saidasPagas).toBe(1);
    expect(r.contagem.saidasAPagar).toBe(1);
    // A soma pago + pendente nunca ultrapassa o valor original.
    expect(r.saidasPagas + r.saidasAPagar).toBe(10_000);
  });
});

describe("relatorioDoPeriodo — retiradas (destacadas)", () => {
  it("retirada realizada entra em retiradasRealizadas e fora das despesas por categoria", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "retirada", valor: 7_000, categoriaId: "retirada" }),
        mov({ tipo: "saida", valor: 3_000, categoriaId: "materiais" }),
      ],
      PERIODO,
    );
    expect(r.retiradasRealizadas).toBe(7_000);
    // Não se mistura com despesas comuns, mesmo com categoria conhecida "retirada".
    expect(r.despesasPorCategoria.map((c) => c.categoriaId)).toEqual(["materiais"]);
    expect(r.totalDespesasPagas).toBe(3_000);
  });

  it("retirada pendente conta como a pagar", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "retirada", valor: 5_000, status: "pendente" })],
      PERIODO,
    );
    expect(r.retiradasRealizadas).toBe(0);
    expect(r.retiradasAPagar).toBe(5_000);
    expect(r.totalAPagar).toBe(5_000);
    expect(r.contagem.retiradasAPagar).toBe(1);
  });
});

describe("relatorioDoPeriodo — despesas pagas por categoria", () => {
  it("agrupa saídas da mesma categoria somando o valor pago", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "saida", valor: 20_000, categoriaId: "materiais" }),
        mov({ tipo: "saida", valor: 4_000, categoriaId: "materiais" }),
      ],
      PERIODO,
    );
    expect(r.despesasPorCategoria).toHaveLength(1);
    expect(r.despesasPorCategoria[0]).toMatchObject({
      categoriaId: "materiais",
      nome: "Materiais",
      total: 24_000,
      quantidade: 2,
    });
  });

  it("ordena as categorias da maior despesa para a menor", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "saida", valor: 5_000, categoriaId: "materiais" }),
        mov({ tipo: "saida", valor: 12_000, categoriaId: "ferramentas" }),
        mov({ tipo: "saida", valor: 8_000, categoriaId: "deslocamento" }),
      ],
      PERIODO,
    );
    expect(r.despesasPorCategoria.map((c) => c.categoriaId)).toEqual([
      "ferramentas",
      "deslocamento",
      "materiais",
    ]);
    expect(r.despesasPorCategoria.map((c) => c.total)).toEqual([12_000, 8_000, 5_000]);
  });

  it("colapsa categorias desconhecidas e vazias em 'Outros'", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "saida", valor: 3_000, categoriaId: "inexistente_xyz" }),
        mov({ tipo: "saida", valor: 2_000, categoriaId: "" }),
        mov({ tipo: "saida", valor: 1_000, categoriaId: "servicos" }),
      ],
      PERIODO,
    );
    expect(r.despesasPorCategoria).toHaveLength(2);
    const outros = r.despesasPorCategoria.find((c) => c.categoriaId === "__outros__");
    expect(outros).toMatchObject({ nome: "Outros", total: 5_000, quantidade: 2 });
    expect(r.despesasPorCategoria.find((c) => c.categoriaId === "servicos")?.total).toBe(
      1_000,
    );
  });

  it("saída totalmente pendente não cria linha de categoria (só conta o pago)", () => {
    const r = relatorioDoPeriodo(
      [mov({ tipo: "saida", valor: 9_000, status: "pendente", categoriaId: "materiais" })],
      PERIODO,
    );
    expect(r.despesasPorCategoria).toHaveLength(0);
    expect(r.totalDespesasPagas).toBe(0);
  });

  it("na parcial, a categoria recebe só o valor efetivamente pago", () => {
    const r = relatorioDoPeriodo(
      [
        mov({
          tipo: "saida",
          valor: 10_000,
          valorPago: 4_000,
          status: "pendente",
          categoriaId: "materiais",
        }),
      ],
      PERIODO,
    );
    expect(r.despesasPorCategoria[0]).toMatchObject({ total: 4_000, quantidade: 1 });
  });
});

describe("relatorioDoPeriodo — resultado, consistência e período vazio", () => {
  it("cenário completo: valores, resultado, contagens e ausência de dupla contagem", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "entrada", valor: 50_000, status: "realizado", data: "2026-03-10" }),
        mov({ tipo: "entrada", valor: 30_000, status: "pendente", data: "2026-03-20" }),
        mov({ tipo: "saida", valor: 20_000, status: "realizado", categoriaId: "materiais", data: "2026-03-05" }),
        mov({ tipo: "saida", valor: 15_000, status: "pendente", categoriaId: "ferramentas", data: "2026-03-25" }),
        mov({ tipo: "saida", valor: 10_000, valorPago: 4_000, status: "pendente", categoriaId: "materiais", data: "2026-03-12" }),
        mov({ tipo: "retirada", valor: 8_000, status: "realizado", categoriaId: "retirada", data: "2026-03-18" }),
        // Fora do período:
        mov({ tipo: "entrada", valor: 99_999, data: "2026-02-10" }),
        mov({ tipo: "saida", valor: 77_777, data: "2026-04-02" }),
      ],
      PERIODO,
    );

    expect(r.entradasRecebidas).toBe(50_000);
    expect(r.entradasAReceber).toBe(30_000);
    expect(r.saidasPagas).toBe(24_000); // 20.000 + 4.000
    expect(r.saidasAPagar).toBe(21_000); // 15.000 + 6.000
    expect(r.retiradasRealizadas).toBe(8_000);
    expect(r.retiradasAPagar).toBe(0);
    expect(r.resultado).toBe(18_000); // 50.000 − 24.000 − 8.000
    expect(r.totalAPagar).toBe(21_000);

    expect(r.contagem).toEqual({
      entradasRecebidas: 1,
      entradasAReceber: 1,
      saidasPagas: 2,
      saidasAPagar: 2,
      retiradasRealizadas: 1,
      retiradasAPagar: 0,
      total: 6,
    });

    // Despesas por categoria: só o pago; ferramentas (pendente) não aparece.
    expect(r.despesasPorCategoria.map((c) => c.categoriaId)).toEqual(["materiais"]);
    expect(r.despesasPorCategoria[0]?.total).toBe(24_000);

    // Sem dupla contagem: total das categorias === saídas pagas === total geral.
    const somaCategorias = r.despesasPorCategoria.reduce((a, c) => a + c.total, 0);
    expect(somaCategorias).toBe(r.saidasPagas);
    expect(r.totalDespesasPagas).toBe(r.saidasPagas);
  });

  it("período sem nenhuma movimentação retorna estrutura completa zerada", () => {
    const r = relatorioDoPeriodo([], PERIODO);
    expect(r).toEqual({
      periodo: PERIODO,
      entradasRecebidas: 0,
      saidasPagas: 0,
      retiradasRealizadas: 0,
      resultado: 0,
      entradasAReceber: 0,
      saidasAPagar: 0,
      retiradasAPagar: 0,
      totalAPagar: 0,
      contagem: {
        entradasRecebidas: 0,
        entradasAReceber: 0,
        saidasPagas: 0,
        saidasAPagar: 0,
        retiradasRealizadas: 0,
        retiradasAPagar: 0,
        total: 0,
      },
      despesasPorCategoria: [],
      totalDespesasPagas: 0,
    });
  });

  it("movimentações existem, mas nenhuma no período → zerado", () => {
    const r = relatorioDoPeriodo(
      [
        mov({ tipo: "entrada", valor: 50_000, data: "2026-01-10" }),
        mov({ tipo: "saida", valor: 20_000, data: "2026-05-10" }),
      ],
      PERIODO,
    );
    expect(r.entradasRecebidas).toBe(0);
    expect(r.saidasPagas).toBe(0);
    expect(r.resultado).toBe(0);
    expect(r.despesasPorCategoria).toEqual([]);
    expect(r.contagem.total).toBe(0);
  });
});
