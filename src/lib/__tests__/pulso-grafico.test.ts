import { describe, expect, it } from "vitest";
import type { PulsoDia } from "@/domain";
import {
  area,
  escalaX,
  escalaY,
  intervaloY,
  linha,
  pontos,
  type CaixaGrafico,
} from "../pulso-grafico";

const CAIXA: CaixaGrafico = {
  largura: 100,
  altura: 100,
  padX: 10,
  padTopo: 10,
  padBaixo: 10,
};

function dia(extra: Partial<PulsoDia>): PulsoDia {
  return {
    data: "2026-03-01",
    offset: 0,
    saldoConfirmado: 0,
    saldoProjetado: 0,
    linhaSeguranca: 0,
    saidasNoDia: 0,
    recebimentosPrevistosNoDia: 0,
    emRisco: false,
    ...extra,
  };
}

describe("intervaloY", () => {
  it("abrange confirmado, projetado, segurança e sempre o zero", () => {
    const dias = [
      dia({ saldoConfirmado: 100, saldoProjetado: 300, linhaSeguranca: 50 }),
      dia({ saldoConfirmado: -200, saldoProjetado: 0, linhaSeguranca: 50 }),
    ];
    expect(intervaloY(dias)).toEqual([-200, 300]);
  });

  it("inclui o zero mesmo quando todos os valores são positivos", () => {
    const dias = [dia({ saldoConfirmado: 100, saldoProjetado: 100, linhaSeguranca: 100 })];
    expect(intervaloY(dias)).toEqual([0, 100]);
  });

  it("evita série plana degenerada", () => {
    const [min, max] = intervaloY([dia({})]);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(min);
  });
});

describe("escalaX", () => {
  it("mapeia o offset 0 ao início e o horizonte ao fim da área útil", () => {
    expect(escalaX(0, 7, CAIXA)).toBe(10); // padX
    expect(escalaX(7, 7, CAIXA)).toBe(90); // largura − padX
    expect(escalaX(3.5, 7, CAIXA)).toBe(50); // meio
  });

  it("horizonte zero não divide por zero", () => {
    expect(escalaX(0, 0, CAIXA)).toBe(10);
  });
});

describe("escalaY", () => {
  it("inverte o eixo: valor máximo no topo, mínimo na base", () => {
    expect(escalaY(300, -200, 300, CAIXA)).toBe(10); // topo = padTopo
    expect(escalaY(-200, -200, 300, CAIXA)).toBe(90); // base = altura − padBaixo
  });
});

describe("pontos / linha / area", () => {
  const dias = [
    dia({ offset: 0, saldoConfirmado: 0 }),
    dia({ offset: 7, saldoConfirmado: 100 }),
  ];
  const intervalo = intervaloY(dias); // [0, 100]

  it("gera um ponto por dia, posicionando offset e valor", () => {
    const ps = pontos(dias, (d) => d.saldoConfirmado, intervalo, 7, CAIXA);
    expect(ps).toHaveLength(2);
    expect(ps[0]).toEqual({ x: 10, y: 90 }); // offset 0, valor 0 (base)
    expect(ps[1]).toEqual({ x: 90, y: 10 }); // offset 7, valor 100 (topo)
  });

  it("linha serializa os pontos no formato do polyline", () => {
    const ps = pontos(dias, (d) => d.saldoConfirmado, intervalo, 7, CAIXA);
    expect(linha(ps)).toBe("10,90 90,10");
  });

  it("area fecha o caminho na linha-base", () => {
    const ps = pontos(dias, (d) => d.saldoConfirmado, intervalo, 7, CAIXA);
    expect(area(ps, 90)).toBe("M 10 90 L 10 90 L 90 10 L 90 90 Z");
    expect(area([], 90)).toBe("");
  });
});
