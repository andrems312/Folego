import { describe, expect, it } from "vitest";
import type { Movimentacao, MovimentacaoTipo } from "@/domain";
import { linhasDoPeriodo } from "../relatorio-tabela";
import type { PeriodoRelatorio } from "../relatorio";

const PERIODO: PeriodoRelatorio = { inicio: "2026-03-01", fim: "2026-03-31" };

let seq = 0;
function mov(
  parcial: Partial<Movimentacao> & { tipo: MovimentacaoTipo },
): Movimentacao {
  seq += 1;
  return {
    id: parcial.id ?? `m${seq}`,
    tipo: parcial.tipo,
    valor: parcial.valor ?? 10_000,
    data: parcial.data ?? "2026-03-15",
    categoriaId: parcial.categoriaId ?? "servicos",
    status: parcial.status ?? "realizado",
    valorPago: parcial.valorPago,
    descricao: parcial.descricao,
  };
}

describe("linhasDoPeriodo — filtro e ordenação", () => {
  it("inclui só lançamentos dentro do período (inclusivo)", () => {
    const linhas = linhasDoPeriodo(
      [
        mov({ id: "ini", tipo: "entrada", data: "2026-03-01" }),
        mov({ id: "fim", tipo: "saida", data: "2026-03-31" }),
        mov({ id: "antes", tipo: "entrada", data: "2026-02-28" }),
        mov({ id: "depois", tipo: "saida", data: "2026-04-01" }),
      ],
      PERIODO,
    );
    expect(linhas.map((l) => l.id)).toEqual(["fim", "ini"]); // desc por data
  });

  it("ordena das mais recentes para as mais antigas, estável no empate", () => {
    const linhas = linhasDoPeriodo(
      [
        mov({ id: "a", tipo: "entrada", data: "2026-03-10" }),
        mov({ id: "b", tipo: "saida", data: "2026-03-20" }),
        mov({ id: "c", tipo: "retirada", data: "2026-03-10" }), // mesma data de a
      ],
      PERIODO,
    );
    expect(linhas.map((l) => l.id)).toEqual(["b", "a", "c"]);
  });

  it("período sem movimentações retorna lista vazia", () => {
    expect(linhasDoPeriodo([], PERIODO)).toEqual([]);
    expect(
      linhasDoPeriodo([mov({ tipo: "entrada", data: "2026-01-01" })], PERIODO),
    ).toEqual([]);
  });
});

describe("linhasDoPeriodo — realizado e pendente por tipo/status", () => {
  it("entrada recebida: realizado = valor, pendente 0, status recebido", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "entrada", valor: 50_000, status: "realizado" })],
      PERIODO,
    );
    expect(l).toMatchObject({
      tipoLabel: "Entrada",
      sinal: "+",
      cor: "credit",
      status: "recebido",
      realizado: 50_000,
      pendente: 0,
    });
  });

  it("entrada prevista: realizado 0, pendente = valor, status previsto", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "entrada", valor: 30_000, status: "pendente" })],
      PERIODO,
    );
    expect(l).toMatchObject({
      status: "previsto",
      statusLabel: "Previsto",
      realizado: 0,
      pendente: 30_000,
    });
  });

  it("saída paga: realizado = valor, pendente 0, status pago", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "saida", valor: 20_000, status: "realizado" })],
      PERIODO,
    );
    expect(l).toMatchObject({ cor: "debit", status: "pago", realizado: 20_000, pendente: 0 });
  });

  it("saída a pagar: realizado 0, pendente = valor", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "saida", valor: 15_000, status: "pendente" })],
      PERIODO,
    );
    expect(l).toMatchObject({ status: "a-pagar", realizado: 0, pendente: 15_000 });
  });

  it("pagamento parcial: realizado e pendente separados, sem dupla contagem", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "saida", valor: 10_000, valorPago: 4_000, status: "pendente" })],
      PERIODO,
    );
    expect(l?.status).toBe("parcial");
    expect(l?.realizado).toBe(4_000);
    expect(l?.pendente).toBe(6_000);
    expect((l?.realizado ?? 0) + (l?.pendente ?? 0)).toBe(10_000);
  });

  it("retirada é identificada como retirada", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "retirada", valor: 8_000, categoriaId: "retirada", status: "realizado" })],
      PERIODO,
    );
    expect(l).toMatchObject({
      tipo: "retirada",
      tipoLabel: "Retirada",
      cor: "debit",
      categoria: "Retirada pessoal",
      realizado: 8_000,
      pendente: 0,
    });
  });

  it("usa o nome da categoria e cai para o rótulo do tipo sem descrição", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "saida", categoriaId: "materiais", descricao: null })],
      PERIODO,
    );
    expect(l?.categoria).toBe("Materiais");
    expect(l?.descricao).toBe("Saída");
  });

  it("categoria desconhecida vira 'Outros'", () => {
    const [l] = linhasDoPeriodo(
      [mov({ tipo: "saida", categoriaId: "inexistente" })],
      PERIODO,
    );
    expect(l?.categoria).toBe("Outros");
  });
});
