import { ResumoPulso } from "@/components/pulso/resumo-pulso";

/**
 * Previsão — primeira versão funcional do Pulso do Caixa (Etapa 2): resumo textual
 * e indicadores, com alternância de horizonte (7/15/30). O gráfico chega na Etapa 3.
 */
export default function PrevisaoPage() {
  return (
    <div className="space-y-6">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Previsão
      </p>
      <ResumoPulso />
    </div>
  );
}
