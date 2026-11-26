import { describe, expect, it } from "vitest";
import {
  hojeISO,
  mesAnterior,
  mesAtual,
  periodoDoMes,
  periodoMesAnterior,
  periodoMesAtual,
  periodoValido,
  ultimoDiaDoMes,
} from "../periodo-relatorio";

describe("hojeISO — data local sem fuso", () => {
  it("formata ano-mês-dia com zero à esquerda", () => {
    // Date local: 3 de março de 2026.
    expect(hojeISO(new Date(2026, 2, 3))).toBe("2026-03-03");
    expect(hojeISO(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("ultimoDiaDoMes — virada e bissexto", () => {
  it("meses de 30 e 31 dias", () => {
    expect(ultimoDiaDoMes(2026, 1)).toBe(31); // janeiro
    expect(ultimoDiaDoMes(2026, 4)).toBe(30); // abril
    expect(ultimoDiaDoMes(2026, 12)).toBe(31); // dezembro
  });

  it("fevereiro em ano não bissexto tem 28 dias", () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
  });

  it("fevereiro em ano bissexto tem 29 dias", () => {
    expect(ultimoDiaDoMes(2028, 2)).toBe(29);
    expect(ultimoDiaDoMes(2000, 2)).toBe(29); // divisível por 400
    expect(ultimoDiaDoMes(1900, 2)).toBe(28); // divisível por 100, não por 400
  });
});

describe("mesAtual / mesAnterior — virada de ano", () => {
  it("mês atual vem da data de referência", () => {
    expect(mesAtual("2026-03-15")).toEqual({ ano: 2026, mes: 3 });
  });

  it("mês anterior em meio de ano", () => {
    expect(mesAnterior("2026-03-15")).toEqual({ ano: 2026, mes: 2 });
  });

  it("mês anterior em janeiro vira para dezembro do ano anterior", () => {
    expect(mesAnterior("2026-01-10")).toEqual({ ano: 2025, mes: 12 });
  });
});

describe("periodoDoMes / periodoMesAtual / periodoMesAnterior", () => {
  it("monta período inclusivo do primeiro ao último dia", () => {
    expect(periodoDoMes({ ano: 2026, mes: 2 })).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
    expect(periodoDoMes({ ano: 2028, mes: 2 })).toEqual({
      inicio: "2028-02-01",
      fim: "2028-02-29",
    });
  });

  it("'este mês' e 'mês passado' a partir de hoje", () => {
    expect(periodoMesAtual("2026-03-20")).toEqual({
      inicio: "2026-03-01",
      fim: "2026-03-31",
    });
    expect(periodoMesAnterior("2026-03-20")).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
  });

  it("'mês passado' em janeiro cruza o ano", () => {
    expect(periodoMesAnterior("2026-01-05")).toEqual({
      inicio: "2025-12-01",
      fim: "2025-12-31",
    });
  });
});

describe("periodoValido", () => {
  it("aceita intervalo com inicio <= fim", () => {
    expect(periodoValido({ inicio: "2026-03-01", fim: "2026-03-31" })).toBe(true);
    expect(periodoValido({ inicio: "2026-03-10", fim: "2026-03-10" })).toBe(true);
  });

  it("rejeita inicio > fim", () => {
    expect(periodoValido({ inicio: "2026-03-31", fim: "2026-03-01" })).toBe(false);
  });

  it("rejeita formato inválido ou vazio", () => {
    expect(periodoValido({ inicio: "", fim: "2026-03-31" })).toBe(false);
    expect(periodoValido({ inicio: "2026-3-1", fim: "2026-03-31" })).toBe(false);
  });
});
