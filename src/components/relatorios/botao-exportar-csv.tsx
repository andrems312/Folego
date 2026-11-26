"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatarDataCurta } from "@/lib/formato-data";
import type { PeriodoRelatorio } from "@/lib/relatorio";
import { nomeArquivoCSV, relatorioParaCSV } from "@/lib/relatorio-csv";
import type { LinhaRelatorio } from "@/lib/relatorio-tabela";

/** Dispara o download de um texto como arquivo, sem tocar nos dados do app. */
function baixarArquivo(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Botão "Exportar CSV" dos Relatórios (Etapa E). Exporta exatamente os lançamentos
 * do PERÍODO SELECIONADO (os mesmos da tabela), via `relatorioParaCSV`. Só leitura:
 * não altera nenhum dado. Sem dados, dá feedback em vez de baixar um arquivo vazio.
 */
export function BotaoExportarCSV({
  linhas,
  periodo,
}: {
  linhas: LinhaRelatorio[];
  periodo: PeriodoRelatorio;
}) {
  const toast = useToast();
  const periodoLabel = `${formatarDataCurta(periodo.inicio)} a ${formatarDataCurta(
    periodo.fim,
  )}`;

  function exportar() {
    if (linhas.length === 0) {
      toast("Nenhum lançamento para exportar neste período.");
      return;
    }
    baixarArquivo(
      relatorioParaCSV(linhas),
      nomeArquivoCSV(periodo),
      "text/csv;charset=utf-8;",
    );
    toast("Relatório exportado em CSV.");
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variante="secondary"
        tamanho="sm"
        onClick={exportar}
        aria-label={`Exportar CSV dos lançamentos do período ${periodoLabel}`}
      >
        Exportar CSV
      </Button>
      <span className="font-ui text-xs text-ink-3">{periodoLabel}</span>
    </div>
  );
}
