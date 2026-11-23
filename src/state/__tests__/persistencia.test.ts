import { describe, expect, it } from "vitest";
import { estadoDemo } from "@/demo/fixtures";
import {
  CHAVE_ESTADO,
  VERSAO_ESTADO,
  devePersistir,
  interpretarArmazenado,
  serializarEstado,
} from "../persistencia";

describe("serialização versionada", () => {
  it("round-trip: serializar e interpretar devolve o mesmo estado", () => {
    const raw = serializarEstado(estadoDemo);
    const r = interpretarArmazenado(raw);
    expect(r.tipo).toBe("ok");
    if (r.tipo === "ok") expect(r.estado).toEqual(estadoDemo);
  });

  it("a chave é versionada", () => {
    expect(CHAVE_ESTADO).toContain(`v${VERSAO_ESTADO}`);
  });
});

describe("interpretarArmazenado — dados inválidos não são aceitos", () => {
  it("null ou vazio => primeira vez (vazio)", () => {
    expect(interpretarArmazenado(null).tipo).toBe("vazio");
    expect(interpretarArmazenado("").tipo).toBe("vazio");
  });

  it("JSON corrompido => invalido", () => {
    const r = interpretarArmazenado("{isto não é json");
    expect(r.tipo).toBe("invalido");
  });

  it("conteúdo não-objeto (número, null textual) => invalido", () => {
    expect(interpretarArmazenado(JSON.stringify(42)).tipo).toBe("invalido");
    expect(interpretarArmazenado("null").tipo).toBe("invalido");
  });

  it("versão incompatível => invalido", () => {
    const r = interpretarArmazenado(
      JSON.stringify({ versao: 999, estado: estadoDemo }),
    );
    expect(r.tipo).toBe("invalido");
    if (r.tipo === "invalido") expect(r.mensagem).toMatch(/[Vv]ersão/);
  });

  it("estado inconsistente (data impossível) => invalido (validado pelo domínio)", () => {
    const corrompido = {
      ...estadoDemo,
      movimentacoes: [{ ...estadoDemo.movimentacoes[0], data: "2026-02-31" }],
    };
    const r = interpretarArmazenado(
      JSON.stringify({ versao: VERSAO_ESTADO, estado: corrompido }),
    );
    expect(r.tipo).toBe("invalido");
  });
});

describe("devePersistir — nunca salva antes da hidratação nem sobre dados inválidos", () => {
  it("carregando nunca persiste", () => {
    expect(devePersistir("carregando", true)).toBe(false);
  });

  it("dados-invalidos nunca persiste", () => {
    expect(devePersistir("dados-invalidos", true)).toBe(false);
  });

  it("pronto persiste só com storage disponível", () => {
    expect(devePersistir("pronto", true)).toBe(true);
    expect(devePersistir("pronto", false)).toBe(false);
  });
});
