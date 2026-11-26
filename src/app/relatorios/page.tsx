import { ResumoRelatorio } from "@/components/relatorios/resumo-relatorio";

/**
 * Relatórios — primeira versão funcional (Entrega 2.8 / Etapa B): seleção de
 * período e resumo financeiro do período, por data de competência. Gráfico de
 * categorias, tabela e exportação CSV chegam nas etapas seguintes.
 */
export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Relatórios
      </p>
      <ResumoRelatorio />
    </div>
  );
}
