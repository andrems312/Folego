/**
 * Geometria do gráfico de despesas por categoria — PURO, sem cálculo financeiro.
 *
 * Converte `DespesaCategoria[]` (já agregado, ordenado e com total > 0 pelo helper
 * da Etapa A) em barras: fração proporcional à MAIOR despesa do período e slot de
 * cor da paleta §4.2. Nada é somado nem recalculado aqui — só proporção e cor.
 *
 * Regra §4.2: a cor segue a ENTIDADE (categoria), nunca o ranking. Uma categoria
 * sem slot próprio (ex.: "Serviços prestados" como despesa, ou o balde "Outros")
 * cai no slot 6 ("Outros"). Nunca se cria cor nova para uma 7ª categoria.
 */
import type { Centavos } from "@/domain";
import type { DespesaCategoria } from "./relatorio";

export interface BarraDespesa {
  categoriaId: string;
  nome: string;
  total: Centavos;
  quantidade: number;
  /** Fração 0..1 em relação à maior despesa do período (largura da barra). */
  fracao: number;
  /** Slot 1..6 da paleta categórica (§4.2), por entidade. */
  corSlot: number;
}

/** Categoria → slot de cor §4.2 (por entidade). O resto vai para "Outros" (6). */
const SLOT_POR_CATEGORIA: Readonly<Record<string, number>> = {
  materiais: 1,
  deslocamento: 2,
  ferramentas: 3,
  impostos: 4,
  retirada: 5,
};

/** Slot de cor (1..6) da categoria. Desconhecida/"servicos"/"Outros" → 6. */
export function corSlotDe(categoriaId: string): number {
  return SLOT_POR_CATEGORIA[categoriaId] ?? 6;
}

/**
 * Barras a partir das despesas por categoria. Preserva a ordem recebida (o helper
 * já ordena do maior para o menor). A fração usa a MAIOR despesa como referência.
 */
export function barrasDespesas(
  despesas: readonly DespesaCategoria[],
): BarraDespesa[] {
  const maior = despesas.reduce((m, d) => Math.max(m, d.total), 0);
  return despesas.map((d) => ({
    categoriaId: d.categoriaId,
    nome: d.nome,
    total: d.total,
    quantidade: d.quantidade,
    fracao: maior > 0 ? d.total / maior : 0,
    corSlot: corSlotDe(d.categoriaId),
  }));
}

/**
 * Piso visual (em %) para que uma barra muito pequena continue perceptível. O
 * valor exato é sempre mostrado em texto ao lado, então o piso não engana a
 * leitura — só evita uma barra invisível.
 */
export const PISO_BARRA_PCT = 2;

/** Largura da barra em %, com piso visual. Fração 0 continua 0 (sem barra). */
export function larguraBarraPct(fracao: number): number {
  const pct = Math.max(0, Math.min(1, fracao)) * 100;
  return pct === 0 ? 0 : Math.max(pct, PISO_BARRA_PCT);
}
