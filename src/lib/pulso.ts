/**
 * Apresentação do Pulso do Caixa — recorte da série de projeção por horizonte.
 *
 * PURO e sem cálculo financeiro: apenas fatia a série já pronta (`PulsoDia[]`,
 * calculada pelo domínio em `projetarCaixa`) para o horizonte pedido e reidentifica
 * o primeiro dia de risco DENTRO do recorte, por filtragem. A fonte da verdade
 * financeira continua no domínio; aqui não se recalcula nada.
 *
 * Convenção do domínio preservada: a série tem `horizonte + 1` pontos (offset 0 =
 * hoje; offsets 1..horizonte = próximos dias). Logo o recorte de N dias mantém os
 * offsets 0..N, isto é, `N + 1` pontos.
 */
import type {
  Centavos,
  HorizontePulso,
  PulsoDia,
  ResultadoProjecao,
} from "@/domain";

/**
 * Recorta uma projeção (tipicamente de 30 dias, exposta pelo Provider) para o
 * horizonte de 7, 15 ou 30 dias. Não altera a entrada.
 */
export function recortarHorizonte(
  projecao: ResultadoProjecao,
  horizonte: HorizontePulso,
): ResultadoProjecao {
  const dias = projecao.dias.slice(0, horizonte + 1);
  const primeiroDiaDeRisco = dias.find((d) => d.emRisco) ?? null;
  return { dias, primeiroDiaDeRisco };
}

/**
 * Indicadores de apresentação derivados de uma série já recortada. São apenas
 * AGREGAÇÕES (mínimo, somas, leitura de pontos) sobre o que o domínio já calculou
 * — nenhuma regra financeira é reimplementada aqui.
 */
export interface IndicadoresPulso {
  /** Saldo confirmado de hoje (ponto 0 da série). */
  saldoAtual: Centavos;
  /** Menor saldo confirmado no período e o dia em que ocorre. */
  menorConfirmado: Centavos;
  diaMenorConfirmado: PulsoDia;
  /** Saldo confirmado e projetado no último dia do horizonte. */
  confirmadoFinal: Centavos;
  projetadoFinal: Centavos;
  /** Quanto o projetado supera o confirmado ao fim (o que ainda pode entrar). */
  aEntrar: Centavos;
  /** Total de saídas/retiradas pendentes vencendo no período. */
  totalAPagar: Centavos;
  /** Total de recebimentos previstos no período. */
  totalPrevisto: Centavos;
  emRisco: boolean;
  primeiroDiaDeRisco: PulsoDia | null;
  /** Número de dias à frente (offset do último ponto). */
  horizonteDias: number;
}

/** Resume uma projeção recortada em indicadores de apresentação (puro). */
export function resumirPulso(recorte: ResultadoProjecao): IndicadoresPulso {
  const dias = recorte.dias;
  const primeiro = dias[0];
  const ultimo = dias[dias.length - 1];

  let diaMenorConfirmado = primeiro;
  let totalAPagar = 0;
  let totalPrevisto = 0;
  for (const d of dias) {
    if (d.saldoConfirmado < diaMenorConfirmado.saldoConfirmado) {
      diaMenorConfirmado = d;
    }
    totalAPagar += d.saidasNoDia;
    totalPrevisto += d.recebimentosPrevistosNoDia;
  }

  return {
    saldoAtual: primeiro.saldoConfirmado,
    menorConfirmado: diaMenorConfirmado.saldoConfirmado,
    diaMenorConfirmado,
    confirmadoFinal: ultimo.saldoConfirmado,
    projetadoFinal: ultimo.saldoProjetado,
    aEntrar: ultimo.saldoProjetado - ultimo.saldoConfirmado,
    totalAPagar,
    totalPrevisto,
    emRisco: recorte.primeiroDiaDeRisco !== null,
    primeiroDiaDeRisco: recorte.primeiroDiaDeRisco,
    horizonteDias: ultimo.offset,
  };
}
