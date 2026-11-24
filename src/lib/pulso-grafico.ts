/**
 * Geometria do gráfico do Pulso — PURA, sem cálculo financeiro.
 *
 * Converte a série `PulsoDia[]` (já calculada pelo domínio e recortada por
 * horizonte) em coordenadas de um sistema de viewBox fixo. Nenhuma regra
 * financeira é reimplementada: só escala/posicionamento.
 */
import type { PulsoDia } from "@/domain";

export interface CaixaGrafico {
  largura: number;
  altura: number;
  padX: number;
  padTopo: number;
  padBaixo: number;
}

export interface Ponto {
  x: number;
  y: number;
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Intervalo [min, max] do eixo Y, abrangendo saldo confirmado, projetado e a
 * linha de segurança de todos os dias — e sempre o zero, para que a linha-base e
 * eventuais valores negativos fiquem visíveis.
 */
export function intervaloY(dias: readonly PulsoDia[]): [number, number] {
  let min = 0;
  let max = 0;
  for (const d of dias) {
    min = Math.min(min, d.saldoConfirmado, d.saldoProjetado, d.linhaSeguranca);
    max = Math.max(max, d.saldoConfirmado, d.saldoProjetado, d.linhaSeguranca);
  }
  if (min === max) max = min + 1; // evita divisão por zero em série plana
  return [min, max];
}

/** Posição horizontal do offset (0..horizonte) dentro da caixa. */
export function escalaX(
  offset: number,
  horizonte: number,
  caixa: CaixaGrafico,
): number {
  const util = caixa.largura - caixa.padX * 2;
  const t = horizonte <= 0 ? 0 : offset / horizonte;
  return arredondar(caixa.padX + t * util);
}

/** Posição vertical de um valor (eixo invertido: maior valor = topo). */
export function escalaY(
  valor: number,
  yMin: number,
  yMax: number,
  caixa: CaixaGrafico,
): number {
  const util = caixa.altura - caixa.padTopo - caixa.padBaixo;
  const t = yMax === yMin ? 0 : (valor - yMin) / (yMax - yMin);
  return arredondar(caixa.altura - caixa.padBaixo - t * util);
}

/** Converte a série em pontos, usando um acessor para o valor de cada dia. */
export function pontos(
  dias: readonly PulsoDia[],
  valorDe: (d: PulsoDia) => number,
  intervalo: readonly [number, number],
  horizonte: number,
  caixa: CaixaGrafico,
): Ponto[] {
  const [yMin, yMax] = intervalo;
  return dias.map((d) => ({
    x: escalaX(d.offset, horizonte, caixa),
    y: escalaY(valorDe(d), yMin, yMax, caixa),
  }));
}

/** String `points` para um `<polyline>`. */
export function linha(ps: readonly Ponto[]): string {
  return ps.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Caminho `d` de uma área entre a série e a linha-base `yBase`. */
export function area(ps: readonly Ponto[], yBase: number): string {
  if (ps.length === 0) return "";
  const base = arredondar(yBase);
  const primeiro = ps[0];
  const ultimo = ps[ps.length - 1];
  const corpo = ps.map((p) => `L ${p.x} ${p.y}`).join(" ");
  return `M ${primeiro.x} ${base} ${corpo} L ${ultimo.x} ${base} Z`;
}
