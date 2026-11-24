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
import type { HorizontePulso, ResultadoProjecao } from "@/domain";

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
