/**
 * Seletores de movimentações — funções PURAS sobre o estado do store.
 *
 * Não duplicam nenhuma regra financeira do domínio: apenas filtram, ordenam e
 * agrupam para apresentação. Nunca mutam o array de entrada.
 */
import type { Movimentacao } from "@/domain";

export type FiltroTipo = "todas" | "entrada" | "saida" | "retirada";

export interface GrupoDia {
  data: string;
  movimentacoes: Movimentacao[];
}

/** Filtra por tipo sem mutar o original ("todas" devolve uma cópia). */
export function filtrarPorTipo(
  movs: readonly Movimentacao[],
  filtro: FiltroTipo,
): Movimentacao[] {
  if (filtro === "todas") return movs.slice();
  return movs.filter((m) => m.tipo === filtro);
}

/**
 * Ordena por data decrescente, de forma ESTÁVEL e previsível: movimentações com
 * a mesma data preservam a ordem original de entrada (desempate por índice).
 */
export function ordenarPorDataDesc(
  movs: readonly Movimentacao[],
): Movimentacao[] {
  return movs
    .map((m, i) => [m, i] as const)
    .sort((a, b) => {
      if (a[0].data < b[0].data) return 1;
      if (a[0].data > b[0].data) return -1;
      return a[1] - b[1];
    })
    .map(([m]) => m);
}

/** Agrupa por dia, já ordenado (dias decrescentes; itens na ordem estável). */
export function agruparPorDia(movs: readonly Movimentacao[]): GrupoDia[] {
  const ordenadas = ordenarPorDataDesc(movs);
  const grupos: GrupoDia[] = [];
  for (const m of ordenadas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === m.data) {
      ultimo.movimentacoes.push(m);
    } else {
      grupos.push({ data: m.data, movimentacoes: [m] });
    }
  }
  return grupos;
}

/** Pipeline de apresentação: filtra (sem mutar) → ordena desc → agrupa por dia. */
export function prepararMovimentacoes(
  movs: readonly Movimentacao[],
  filtro: FiltroTipo,
): GrupoDia[] {
  return agruparPorDia(filtrarPorTipo(movs, filtro));
}
