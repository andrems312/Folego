import { LegendaEstados } from "@/components/ui/legenda-estados";
import { ResumoVisaoGeral } from "@/components/visao-geral/resumo-visao-geral";

/**
 * Visão geral. O número-herói "Livre pra usar" e o detalhamento vêm do store
 * (dados derivados de `resumoFinanceiro`, reativos) via `ResumoVisaoGeral`.
 * O Pulso do Caixa chega em um checkpoint seguinte.
 */
export default function VisaoGeralPage() {
  return (
    <div className="space-y-10">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Visão geral
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <ResumoVisaoGeral />

        {/* Pulso do Caixa — placeholder honesto */}
        <section>
          <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
            Pulso do Caixa
          </p>
          <div className="mt-3 flex h-48 items-center justify-center rounded-md border border-dashed border-line-2 bg-surface px-6 text-center">
            <p className="font-text text-sm text-ink-3">
              O instrumento que mostra seu caixa dia a dia chega no próximo
              checkpoint.
            </p>
          </div>
          <LegendaEstados className="mt-5" />
        </section>
      </div>

      <p className="max-w-reading font-ui text-xs text-ink-3">
        Os valores vêm do seu estado financeiro, guardado neste navegador. Começam
        de um exemplo coerente (DESIGN.md §2.5) até você registrar os seus. O
        resumo reage às movimentações — nenhuma fórmula vive na interface.
      </p>
    </div>
  );
}
