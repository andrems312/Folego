"use client";

import Link from "next/link";
import { LegendaEstados } from "@/components/ui/legenda-estados";
import { formatBRL } from "@/domain";
import { formatarDataLonga } from "@/lib/formato-data";
import { recortarHorizonte, resumirPulso } from "@/lib/pulso";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { GraficoPulso } from "./grafico-pulso";

/**
 * Preview compacto do Pulso para a Home (Entrega 2.6 / Etapa 4).
 *
 * Responde "o caixa está tranquilo ou há aperto nos próximos 7 dias?" sem repetir
 * os números do herói "Livre pra usar" nem os quatro indicadores de /previsao.
 * Reaproveita a projeção do Provider via `recortarHorizonte`/`resumirPulso` e o
 * `GraficoPulso` — nenhum cálculo ou geometria nova. A previsão completa (7/15/30 +
 * indicadores) fica em /previsao, para onde o CTA aponta.
 */
export function PulsoPreview() {
  const { status, projecao } = useFinanceiro();

  // A recuperação de dados inválidos é apresentada pela coluna da esquerda
  // (`ResumoVisaoGeral`); não duplicamos o cartão de recuperação aqui.
  if (status === "dados-invalidos") return null;
  if (status === "carregando") return <PreviewEsqueleto />;

  const recorte = recortarHorizonte(projecao, 7);
  const indicadores = resumirPulso(recorte);

  const descricao =
    indicadores.emRisco && indicadores.primeiroDiaDeRisco
      ? `Projeção do caixa para 7 dias. Aperto previsto em ${formatarDataLonga(indicadores.primeiroDiaDeRisco.data)}; menor saldo garantido ${formatBRL(indicadores.menorConfirmado)}.`
      : `Projeção do caixa para 7 dias. Sem aperto previsto; menor saldo garantido ${formatBRL(indicadores.menorConfirmado)}.`;

  return (
    <section aria-labelledby="pulso-preview-titulo" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p
          id="pulso-preview-titulo"
          className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3"
        >
          Pulso do Caixa
        </p>
        <Link
          href="/previsao"
          className="rounded-sm font-ui text-xs text-forecast hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Ver previsão →
        </Link>
      </div>

      {indicadores.emRisco && indicadores.primeiroDiaDeRisco ? (
        <h2 className="font-display text-lg text-ink">
          Seu caixa aperta em{" "}
          {formatarDataLonga(indicadores.primeiroDiaDeRisco.data)}.
        </h2>
      ) : (
        <h2 className="font-display text-lg text-ink">
          Sem apertos à vista nos próximos 7 dias.
        </h2>
      )}

      <GraficoPulso
        dias={recorte.dias}
        horizonteDias={indicadores.horizonteDias}
        primeiroDiaDeRisco={recorte.primeiroDiaDeRisco}
        descricao={descricao}
      />

      <LegendaEstados />
    </section>
  );
}

function PreviewEsqueleto() {
  return (
    <section aria-busy="true" aria-label="Carregando o Pulso" className="space-y-4">
      <div className="h-3 w-28 rounded-sm bg-surface-2" />
      <div className="h-6 w-56 max-w-full rounded-sm bg-surface-2" />
      <div className="h-32 w-full rounded-md bg-surface-2" />
    </section>
  );
}
