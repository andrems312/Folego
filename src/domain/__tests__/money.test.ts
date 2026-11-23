import { describe, expect, it } from "vitest";
import {
  centavosParaReais,
  formatBRL,
  formatBRLComSinal,
  formatNumero,
  parseBRLParaCentavos,
  reaisParaCentavos,
} from "../money";

//   é o espaço fino não-separável que o Intl pt-BR usa após "R$".
const nbsp = " ";

describe("formatBRL", () => {
  it("formata valores normais", () => {
    expect(formatBRL(133000)).toBe(`R$${nbsp}1.330,00`);
    expect(formatBRL(195000)).toBe(`R$${nbsp}1.950,00`);
  });

  it("formata zero", () => {
    expect(formatBRL(0)).toBe(`R$${nbsp}0,00`);
  });

  it("formata negativos", () => {
    expect(formatBRL(-550)).toBe(`-R$${nbsp}5,50`);
  });

  it("formata valores altos", () => {
    expect(formatBRL(1_234_567_89)).toBe(`R$${nbsp}1.234.567,89`);
  });

  it("trata valores não finitos como zero", () => {
    expect(formatBRL(Number.NaN)).toBe(`R$${nbsp}0,00`);
  });
});

describe("formatNumero / formatBRLComSinal", () => {
  it("formata sem símbolo", () => {
    expect(formatNumero(133000)).toBe("1.330,00");
  });

  it("aplica sinal por tipo", () => {
    expect(formatBRLComSinal(120000, "entrada")).toBe(`+ R$${nbsp}1.200,00`);
    expect(formatBRLComSinal(115000, "saida")).toBe(`− R$${nbsp}1.150,00`);
  });
});

describe("conversões", () => {
  it("reais -> centavos arredonda corretamente", () => {
    expect(reaisParaCentavos(1330)).toBe(133000);
    expect(reaisParaCentavos(1330.5)).toBe(133050);
    expect(reaisParaCentavos(0.1)).toBe(10);
  });

  it("centavos -> reais", () => {
    expect(centavosParaReais(133000)).toBe(1330);
  });
});

describe("parseBRLParaCentavos", () => {
  it("interpreta formato pt-BR completo", () => {
    expect(parseBRLParaCentavos("1.234,56")).toBe(123456);
    expect(parseBRLParaCentavos("1.330,00")).toBe(133000);
  });

  it("interpreta formas simplificadas", () => {
    expect(parseBRLParaCentavos("1234,5")).toBe(123450);
    expect(parseBRLParaCentavos("10")).toBe(1000);
    expect(parseBRLParaCentavos("10.50")).toBe(1050); // ponto decimal tolerado
    expect(parseBRLParaCentavos("1.000")).toBe(100000); // ponto como milhar
  });

  it("aceita símbolo e espaços", () => {
    expect(parseBRLParaCentavos("R$ 10,00")).toBe(1000);
    expect(parseBRLParaCentavos(" R$1.200,00 ")).toBe(120000);
  });

  it("interpreta negativos", () => {
    expect(parseBRLParaCentavos("-5,50")).toBe(-550);
  });

  it("rejeita entradas inválidas", () => {
    expect(parseBRLParaCentavos("")).toBeNull();
    expect(parseBRLParaCentavos("abc")).toBeNull();
    expect(parseBRLParaCentavos("12a3")).toBeNull();
  });
});
