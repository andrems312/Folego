import { describe, expect, it } from "vitest";
import {
  BOM_UTF8,
  construirCSV,
  escaparCampoCSV,
  protegerInjecao,
} from "../csv";

describe("protegerInjecao — CSV Injection", () => {
  it("neutraliza campos que começam com caractere de fórmula", () => {
    expect(protegerInjecao("=SOMA(A1:A2)")).toBe("'=SOMA(A1:A2)");
    expect(protegerInjecao("+1")).toBe("'+1");
    expect(protegerInjecao("-1+1")).toBe("'-1+1");
    expect(protegerInjecao("@cmd")).toBe("'@cmd");
    expect(protegerInjecao("\tTAB")).toBe("'\tTAB");
  });

  it("neutraliza gatilho precedido de espaços ou controle", () => {
    expect(protegerInjecao(" =1+1")).toBe("' =1+1"); // espaço antes do =
    expect(protegerInjecao("   @cmd")).toBe("'   @cmd");
    expect(protegerInjecao("\r=cmd")).toBe("'\r=cmd"); // CR antes do =
    expect(protegerInjecao("\n=cmd")).toBe("'\n=cmd"); // LF antes do =
    expect(protegerInjecao("\u0001=x")).toBe("'\u0001=x"); // controle antes do =
  });

  it("neutraliza campo que começa com caractere de controle", () => {
    expect(protegerInjecao("\tTAB")).toBe("'\tTAB");
    expect(protegerInjecao("\u0007bip")).toBe("'\u0007bip");
  });

  it("não altera texto e números comuns", () => {
    expect(protegerInjecao("Material")).toBe("Material");
    expect(protegerInjecao("1234,56")).toBe("1234,56");
    expect(protegerInjecao("0,00")).toBe("0,00");
    expect(protegerInjecao("20/03/2026")).toBe("20/03/2026");
    expect(protegerInjecao("Serviço nº 3")).toBe("Serviço nº 3");
    expect(protegerInjecao("Conta 3 - parcela")).toBe("Conta 3 - parcela"); // hífen no meio
    expect(protegerInjecao("")).toBe("");
  });
});

describe("escaparCampoCSV", () => {
  it("mantém campo simples sem aspas", () => {
    expect(escaparCampoCSV("Material")).toBe("Material");
  });

  it("envolve em aspas quando há separador", () => {
    expect(escaparCampoCSV("Compra; urgente")).toBe('"Compra; urgente"');
  });

  it("dobra aspas internas e envolve", () => {
    expect(escaparCampoCSV('Diz "oi"')).toBe('"Diz ""oi"""');
  });

  it("envolve em aspas quando há quebra de linha", () => {
    expect(escaparCampoCSV("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("protege injeção e, se preciso, também escapa", () => {
    expect(escaparCampoCSV("=1+1")).toBe("'=1+1"); // sem separador: só protege
    expect(escaparCampoCSV("=1;2")).toBe('"\'=1;2"'); // com separador: protege + aspas
  });
});

describe("construirCSV", () => {
  it("usa separador ';', CRLF e BOM por padrão", () => {
    const csv = construirCSV([
      ["A", "B"],
      ["1", "2"],
    ]);
    expect(csv.startsWith(BOM_UTF8)).toBe(true);
    const semBom = csv.slice(BOM_UTF8.length);
    expect(semBom).toBe("A;B\r\n1;2\r\n");
  });

  it("permite desligar o BOM", () => {
    const csv = construirCSV([["A"]], { bom: false });
    expect(csv.startsWith(BOM_UTF8)).toBe(false);
    expect(csv).toBe("A\r\n");
  });
});
