import { describe, expect, it } from "vitest";
import { descreverMovimentacao } from "../apresentacao-movimentacao";
import type { Movimentacao } from "@/domain";

function base(extra: Partial<Movimentacao>): Movimentacao {
  return {
    id: "m",
    tipo: "saida",
    valor: 100_000,
    data: "2026-03-10",
    categoriaId: "materiais",
    status: "pendente",
    ...extra,
  };
}

describe("descreverMovimentacao", () => {
  it("entrada recebida: sinal +, cor crédito, status recebido", () => {
    const a = descreverMovimentacao(base({ tipo: "entrada", status: "realizado" }));
    expect(a).toMatchObject({ sinal: "+", cor: "credit", status: "recebido", tipoLabel: "Entrada" });
  });

  it("entrada prevista: status previsto", () => {
    const a = descreverMovimentacao(base({ tipo: "entrada", status: "pendente" }));
    expect(a.status).toBe("previsto");
    expect(a.statusLabel).toBe("Previsto");
  });

  it("saída quitada: sinal −, cor débito, status pago", () => {
    const a = descreverMovimentacao(
      base({ tipo: "saida", status: "realizado", valorPago: 100_000 }),
    );
    expect(a).toMatchObject({ sinal: "−", cor: "debit", status: "pago" });
    expect(a.saldoPendente).toBe(0);
  });

  it("saída sem pagamento: a-pagar com saldo pendente total", () => {
    const a = descreverMovimentacao(base({ tipo: "saida", status: "pendente" }));
    expect(a.status).toBe("a-pagar");
    expect(a.saldoPendente).toBe(100_000);
  });

  it("saída parcial: status parcial com saldo restante correto", () => {
    const a = descreverMovimentacao(
      base({ tipo: "saida", status: "pendente", valorPago: 40_000 }),
    );
    expect(a.status).toBe("parcial");
    expect(a.saldoPendente).toBe(60_000);
  });

  it("retirada: rótulo próprio, visual de débito", () => {
    const a = descreverMovimentacao(base({ tipo: "retirada", status: "realizado", valorPago: 100_000 }));
    expect(a.tipoLabel).toBe("Retirada");
    expect(a.cor).toBe("debit");
    expect(a.sinal).toBe("−");
  });
});
