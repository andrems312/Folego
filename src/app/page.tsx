import { PulsoPreview } from "@/components/pulso/pulso-preview";
import { ResumoVisaoGeral } from "@/components/visao-geral/resumo-visao-geral";

/**
 * Visão geral. O número-herói "Livre pra usar" e o detalhamento vêm do store
 * (dados derivados de `resumoFinanceiro`, reativos) via `ResumoVisaoGeral`. A
 * coluna à direita traz um preview compacto do Pulso (próximos 7 dias), com link
 * para a previsão completa em /previsao.
 */
export default function VisaoGeralPage() {
  return (
    <div className="space-y-10">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Visão geral
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <ResumoVisaoGeral />
        <PulsoPreview />
      </div>

      <p className="max-w-reading font-ui text-xs text-ink-3">
        Os valores vêm do seu estado financeiro, guardado neste navegador. Começam
        de um exemplo coerente (DESIGN.md §2.5) até você registrar os seus. O
        resumo reage às movimentações — nenhuma fórmula vive na interface.
      </p>
    </div>
  );
}
