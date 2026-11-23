import { describe, expect, it } from "vitest";
import { ehAnoBissexto, ehDataValida } from "../data";

describe("ehDataValida", () => {
  it("aceita datas reais", () => {
    for (const d of ["2026-01-01", "2026-03-10", "2026-12-31", "2028-02-29"]) {
      expect(ehDataValida(d), d).toBe(true);
    }
  });

  it("rejeita formato inválido", () => {
    for (const d of ["10/03/2026", "2026-3-10", "2026/03/10", "", "x", "2026-03-1", "2026-03-10 "]) {
      expect(ehDataValida(d), d).toBe(false);
    }
  });

  it("rejeita datas de calendário impossíveis", () => {
    for (const d of [
      "2026-02-31",
      "2026-13-10",
      "2026-04-31",
      "2026-00-10",
      "2026-01-00",
      "2026-02-29",
      "2026-06-31",
    ]) {
      expect(ehDataValida(d), d).toBe(false);
    }
  });
});

describe("ehAnoBissexto", () => {
  it("segue a regra gregoriana", () => {
    expect(ehAnoBissexto(2028)).toBe(true);
    expect(ehAnoBissexto(2026)).toBe(false);
    expect(ehAnoBissexto(2000)).toBe(true);
    expect(ehAnoBissexto(1900)).toBe(false);
  });
});
