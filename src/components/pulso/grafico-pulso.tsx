import type { PulsoDia } from "@/domain";
import { formatarDataCurta } from "@/lib/formato-data";
import {
  area,
  escalaX,
  escalaY,
  intervaloY,
  linha,
  pontos,
  type CaixaGrafico,
} from "@/lib/pulso-grafico";

const CAIXA: CaixaGrafico = {
  largura: 640,
  altura: 200,
  padX: 6,
  padTopo: 14,
  padBaixo: 14,
};

/**
 * Gráfico do Pulso (SVG próprio, sem dependências). Complementa — não substitui —
 * a manchete e os números. Consome a série `PulsoDia[]` já pronta (nenhum cálculo
 * financeiro aqui). Codificação por FORMA além da cor (sólido = confirmado, pontos
 * = previsto, traço = segurança, marca = risco), tokens de tema, descrição acessível
 * via `role="img"` + `aria-label`. Eixo de datas em HTML (não escala, fica legível).
 */
export function GraficoPulso({
  dias,
  horizonteDias,
  primeiroDiaDeRisco,
  descricao,
}: {
  dias: PulsoDia[];
  horizonteDias: number;
  primeiroDiaDeRisco: PulsoDia | null;
  descricao: string;
}) {
  const intervalo = intervaloY(dias);
  const [yMin, yMax] = intervalo;
  const yBase = escalaY(0, yMin, yMax, CAIXA);

  const confirmado = pontos(dias, (d) => d.saldoConfirmado, intervalo, horizonteDias, CAIXA);
  const projetado = pontos(dias, (d) => d.saldoProjetado, intervalo, horizonteDias, CAIXA);
  const seguranca = pontos(dias, (d) => d.linhaSeguranca, intervalo, horizonteDias, CAIXA);

  // O previsto só agrega valor onde sobe acima do confirmado; traçar sempre é ok,
  // mas o pontilhado evita competir com a linha sólida.
  const temPrevisto = dias.some((d) => d.saldoProjetado !== d.saldoConfirmado);

  const risco =
    primeiroDiaDeRisco != null
      ? {
          x: escalaX(primeiroDiaDeRisco.offset, horizonteDias, CAIXA),
          ponto: confirmado[primeiroDiaDeRisco.offset],
        }
      : null;

  return (
    <figure className="mt-2 max-w-[40rem]">
      <svg
        role="img"
        aria-label={descricao}
        viewBox={`0 0 ${CAIXA.largura} ${CAIXA.altura}`}
        className="h-auto w-full"
      >
        {/* Área do confirmado (peso = dinheiro que já é seu) */}
        <path
          d={area(confirmado, yBase)}
          className="fill-ink"
          fillOpacity={0.06}
          stroke="none"
        />

        {/* Linha-base do zero */}
        <line
          x1={CAIXA.padX}
          x2={CAIXA.largura - CAIXA.padX}
          y1={yBase}
          y2={yBase}
          className="stroke-line"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* Linha de segurança (tracejada, cor "comprometido") */}
        <polyline
          points={linha(seguranca)}
          fill="none"
          className="stroke-committed"
          strokeWidth={1.5}
          strokeDasharray="1 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Projetado (pontilhado, cor "previsto") */}
        {temPrevisto && (
          <polyline
            points={linha(projetado)}
            fill="none"
            className="stroke-forecast"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Confirmado (sólido, cor "saldo real") */}
        <polyline
          points={linha(confirmado)}
          fill="none"
          className="stroke-ink"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Primeiro dia de risco: linha vertical tracejada + marca no ponto */}
        {risco && (
          <g>
            <line
              x1={risco.x}
              x2={risco.x}
              y1={CAIXA.padTopo}
              y2={CAIXA.altura - CAIXA.padBaixo}
              className="stroke-risk"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            {risco.ponto && (
              <circle
                cx={risco.ponto.x}
                cy={risco.ponto.y}
                r={3.5}
                className="fill-risk"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        )}
      </svg>

      {/* Eixo de datas em HTML (não escala com o SVG; legível e acessível). */}
      <figcaption className="mt-1 flex justify-between font-ui text-xs text-ink-3">
        <span>{formatarDataCurta(dias[0].data)}</span>
        <span>{formatarDataCurta(dias[dias.length - 1].data)}</span>
      </figcaption>
    </figure>
  );
}
