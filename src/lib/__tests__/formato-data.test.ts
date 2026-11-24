import { describe, expect, it } from "vitest";
import {
  diaDaSemana,
  formatarDataCurta,
  formatarDataLonga,
} from "../formato-data";

describe("formatarDataLonga", () => {
  it("formata em pt-BR por extenso", () => {
    expect(formatarDataLonga("2026-03-10")).toBe("10 de março de 2026");
  });

  it("NÃO desloca o dia (sem conversão UTC)", () => {
    // Um parsing via UTC poderia mostrar 31/12/2025; aqui tem de ser 1/1/2026.
    expect(formatarDataLonga("2026-01-01")).toBe("1 de janeiro de 2026");
    expect(formatarDataLonga("2026-12-31")).toBe("31 de dezembro de 2026");
  });

  it("entrada inválida volta como veio", () => {
    expect(formatarDataLonga("10/03/2026")).toBe("10/03/2026");
  });
});

describe("formatarDataCurta", () => {
  it("formato compacto", () => {
    expect(formatarDataCurta("2026-03-10")).toBe("10 mar 2026");
  });
});

describe("diaDaSemana", () => {
  it("retorna um dia da semana válido, sem deslocar", () => {
    const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    expect(nomes).toContain(diaDaSemana("2026-03-10"));
  });
});
