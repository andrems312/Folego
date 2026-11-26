/**
 * Exportação do relatório para CSV — PURO, sem recalcular finanças.
 *
 * Consome as MESMAS linhas da tabela (Etapa D, `LinhaRelatorio` de
 * `relatorio-tabela.ts`): realizado e pendente já vêm de `valorPago`/`saldoPendente`.
 * Aqui só se FORMATA para planilha (data DD/MM/AAAA, número pt-BR sem símbolo de
 * moeda e sem perda de centavos) e se monta o CSV via `construirCSV`.
 */
import type { PeriodoRelatorio } from "./relatorio";
import type { LinhaRelatorio } from "./relatorio-tabela";
import { construirCSV } from "./csv";

export const CABECALHO_CSV = [
  "Data",
  "Descrição",
  "Tipo",
  "Categoria",
  "Realizado",
  "Pendente",
  "Status",
] as const;

/** `AAAA-MM-DD` → `DD/MM/AAAA`. Mantém a string se o formato não bater. */
export function dataParaBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Centavos inteiros → número pt-BR sem separador de milhar e com vírgula decimal
 * (ex.: 123456 => "1234,56"). Aritmética inteira: sem perda de centavos.
 */
export function centavosParaNumeroBR(centavos: number): string {
  const seguro = Number.isFinite(centavos) ? Math.round(centavos) : 0;
  const negativo = seguro < 0;
  const abs = Math.abs(seguro);
  const reais = Math.trunc(abs / 100);
  const cent = String(abs % 100).padStart(2, "0");
  return `${negativo ? "-" : ""}${reais},${cent}`;
}

/** Monta o CSV dos lançamentos (cabeçalho + linhas), pronto para o Excel. */
export function relatorioParaCSV(linhas: readonly LinhaRelatorio[]): string {
  const dados = linhas.map((l) => [
    dataParaBR(l.data),
    l.descricao,
    l.tipoLabel,
    l.categoria,
    centavosParaNumeroBR(l.realizado),
    centavosParaNumeroBR(l.pendente),
    l.statusLabel,
  ]);
  return construirCSV([[...CABECALHO_CSV], ...dados]);
}

/** Nome do arquivo: `folego-relatorio-<inicio>-<fim>.csv` (datas ISO, sem ambiguidade). */
export function nomeArquivoCSV(periodo: PeriodoRelatorio): string {
  const limpa = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "periodo");
  return `folego-relatorio-${limpa(periodo.inicio)}-${limpa(periodo.fim)}.csv`;
}
