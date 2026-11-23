import { describe, expect, it } from "vitest";
import { estadoInicialStore, reducer } from "../reducer";
import type { EstadoFinanceiro } from "@/domain";

const seed: EstadoFinanceiro = {
  config: { saldoAbertura: 1000, margemSeguranca: 0 },
  movimentacoes: [],
  reservas: [],
};
const outro: EstadoFinanceiro = {
  config: { saldoAbertura: 9999, margemSeguranca: 0 },
  movimentacoes: [],
  reservas: [],
};

describe("reducer do store (puro)", () => {
  it("estado inicial: carregando, com seed, persistência disponível", () => {
    const s = estadoInicialStore(seed);
    expect(s.status).toBe("carregando");
    expect(s.estado).toBe(seed);
    expect(s.persistenciaDisponivel).toBe(true);
    expect(s.aviso).toBeNull();
  });

  it("HIDRATADO leva a 'pronto' com o estado carregado", () => {
    const s = reducer(estadoInicialStore(seed), { type: "HIDRATADO", estado: outro });
    expect(s.status).toBe("pronto");
    expect(s.estado).toBe(outro);
    expect(s.aviso).toBeNull();
  });

  it("DADOS_INVALIDOS entra em recuperação sem tocar o estado", () => {
    const s = reducer(estadoInicialStore(seed), {
      type: "DADOS_INVALIDOS",
      mensagem: "dados ruins",
    });
    expect(s.status).toBe("dados-invalidos");
    expect(s.aviso).toBe("dados ruins");
    expect(s.estado).toBe(seed);
  });

  it("PERSISTENCIA_INDISPONIVEL fica pronto, porém sem salvar", () => {
    const s = reducer(estadoInicialStore(seed), {
      type: "PERSISTENCIA_INDISPONIVEL",
      mensagem: "sem storage",
    });
    expect(s.status).toBe("pronto");
    expect(s.persistenciaDisponivel).toBe(false);
    expect(s.aviso).toBe("sem storage");
  });

  it("COMMIT só aplica quando 'pronto' (nunca antes da hidratação)", () => {
    const carregando = estadoInicialStore(seed);
    expect(reducer(carregando, { type: "COMMIT", estado: outro })).toBe(carregando);

    const pronto = reducer(carregando, { type: "HIDRATADO", estado: seed });
    const comComMit = reducer(pronto, { type: "COMMIT", estado: outro });
    expect(comComMit.estado).toBe(outro);
  });

  it("COMMIT é ignorado no modo dados-invalidos (não altera dados)", () => {
    const inval = reducer(estadoInicialStore(seed), {
      type: "DADOS_INVALIDOS",
      mensagem: "x",
    });
    expect(reducer(inval, { type: "COMMIT", estado: outro })).toBe(inval);
  });

  it("RECOMECAR volta a 'pronto' com o novo estado e sem aviso", () => {
    const inval = reducer(estadoInicialStore(seed), {
      type: "DADOS_INVALIDOS",
      mensagem: "x",
    });
    const s = reducer(inval, { type: "RECOMECAR", estado: outro });
    expect(s.status).toBe("pronto");
    expect(s.estado).toBe(outro);
    expect(s.aviso).toBeNull();
  });
});
