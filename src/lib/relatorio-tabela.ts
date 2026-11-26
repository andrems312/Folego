/**
 * Linhas da tabela detalhada dos Relatórios (Etapa D) — PURO, sem recalcular
 * finanças. Filtra as movimentações pelo período (mesma base de competência da
 * `data`, inclusiva nas duas pontas), ordena das mais recentes para as mais
 * antigas e deriva cada linha com os helpers já existentes:
 *   - `descreverMovimentacao` → sinal, tipo, cor, status (sem inventar status);
 *   - `valorPago`/`saldoPendente` → realizado e pendente (sem dupla contagem).
 *
 * Não é um modelo financeiro paralelo: a tabela só expõe, registro a registro, o
 * que o resumo e o gráfico mostram agregado. Reservas não são lançamentos e não
 * aparecem aqui.
 */
import { saldoPendente, valorPago } from "@/domain";
import type { Centavos, Movimentacao, MovimentacaoTipo } from "@/domain";
import {
  descreverMovimentacao,
  type StatusApresentacao,
} from "@/lib/apresentacao-movimentacao";
import { nomeCategoria } from "@/lib/categorias";
import { ordenarPorDataDesc } from "@/state/selectors";
import type { PeriodoRelatorio } from "./relatorio";

export interface LinhaRelatorio {
  id: string;
  data: string;
  /** Descrição do lançamento; cai para o rótulo do tipo quando ausente. */
  descricao: string;
  tipo: MovimentacaoTipo;
  tipoLabel: "Entrada" | "Saída" | "Retirada";
  sinal: "+" | "−";
  /** Token de cor do valor: crédito (entrada) ou débito (saída/retirada). */
  cor: "credit" | "debit";
  categoria: string;
  status: StatusApresentacao;
  statusLabel: string;
  /** Valor efetivamente realizado (recebido/pago) — `valorPago`. */
  realizado: Centavos;
  /** Valor ainda pendente (a receber/a pagar) — `saldoPendente`. */
  pendente: Centavos;
}

/** Linhas do período, mais recentes primeiro (ordenação estável por data). */
export function linhasDoPeriodo(
  movimentacoes: readonly Movimentacao[],
  periodo: PeriodoRelatorio,
): LinhaRelatorio[] {
  const doPeriodo = movimentacoes.filter(
    (m) => m.data >= periodo.inicio && m.data <= periodo.fim,
  );
  return ordenarPorDataDesc(doPeriodo).map((m) => {
    const a = descreverMovimentacao(m);
    const descricao = m.descricao?.trim() ? m.descricao.trim() : a.tipoLabel;
    return {
      id: m.id,
      data: m.data,
      descricao,
      tipo: m.tipo,
      tipoLabel: a.tipoLabel,
      sinal: a.sinal,
      cor: a.cor,
      categoria: nomeCategoria(m.categoriaId),
      status: a.status,
      statusLabel: a.statusLabel,
      realizado: valorPago(m),
      pendente: saldoPendente(m),
    };
  });
}
