/**
 * Núcleo de cálculo dos Relatórios — PURO, sem regra financeira própria.
 *
 * Agrega as movimentações de um período em indicadores de apresentação. Toda a
 * semântica de "quanto de fato entrou/saiu" vem dos helpers do domínio
 * (`valorPago`/`saldoPendente`, ver `movimentacao.ts`); aqui apenas FILTRAMOS por
 * data e SOMAMOS — nenhuma fórmula financeira é reimplementada.
 *
 * BASE TEMPORAL — competência (Entrega 2.8, decisão de produto):
 * o filtro usa o campo `data` do lançamento, que é competência/vencimento OU data
 * de realização (DESIGN.md §2). O modelo NÃO guarda data de pagamento, então estes
 * relatórios são por competência, não por fluxo de caixa na data do pagamento. A
 * interface deve deixar isso explícito. Pagamentos parciais são atribuídos à `data`
 * do lançamento (não têm data própria).
 *
 * Coerência com `calculations.ts`:
 *  - "realizado/recebido/pago"  → `valorPago(m)`   (montante efetivamente realizado);
 *  - "previsto/a receber/a pagar" → `saldoPendente(m)` (restante).
 * Para entradas (atômicas: `receberEntrada` só muda o status), `valorPago` devolve o
 * valor cheio quando realizado e 0 quando pendente — idêntico ao que
 * `entradasRealizadas`/`entradasPrevistas` calculam. Nada é contabilizado em dobro.
 *
 * Filtro de período: datas são strings `AAAA-MM-DD`, comparadas lexicograficamente
 * (como o resto do projeto) — inclusivo em ambas as pontas e sem conversão de fuso.
 */
import { saldoPendente, valorPago } from "@/domain";
import type { Centavos, Movimentacao } from "@/domain";
import { CATEGORIAS_PADRAO, nomeCategoria } from "@/lib/categorias";

/** Intervalo de datas `AAAA-MM-DD`, inclusivo em `inicio` e `fim`. */
export interface PeriodoRelatorio {
  inicio: string;
  fim: string;
}

/** Despesa paga agregada por categoria (apenas saídas; retiradas ficam à parte). */
export interface DespesaCategoria {
  /** Id canônico da categoria; `OUTROS` reúne ids desconhecidos/ausentes. */
  categoriaId: string;
  /** Nome amigável (via `nomeCategoria`). */
  nome: string;
  /** Soma do valor efetivamente pago das saídas desta categoria no período. */
  total: Centavos;
  /** Quantidade de saídas com algum valor pago nesta categoria. */
  quantidade: number;
}

export interface RelatorioPeriodo {
  periodo: PeriodoRelatorio;

  /* Valores REALIZADOS — dinheiro que de fato entrou/saiu (base `valorPago`). */
  entradasRecebidas: Centavos;
  saidasPagas: Centavos;
  retiradasRealizadas: Centavos;
  /** Resultado do período = recebidas − pagas − retiradas (só valores realizados). */
  resultado: Centavos;

  /* Valores PENDENTES/PREVISTOS (base `saldoPendente`) — apresentados SEPARADOS
   * dos realizados, nunca somados ao que já entrou/saiu. */
  /** Entradas previstas: NUNCA são "recebido". */
  entradasAReceber: Centavos;
  saidasAPagar: Centavos;
  retiradasAPagar: Centavos;
  /** Contas pendentes do período (saídas + retiradas a pagar). */
  totalAPagar: Centavos;

  /** Quantidade de movimentações por situação (parciais entram em ambas as pontas). */
  contagem: {
    entradasRecebidas: number;
    entradasAReceber: number;
    saidasPagas: number;
    saidasAPagar: number;
    retiradasRealizadas: number;
    retiradasAPagar: number;
    /** Total de movimentações no período. */
    total: number;
  };

  /** Despesas pagas agrupadas por categoria, da maior para a menor. */
  despesasPorCategoria: DespesaCategoria[];
  /** Total geral das despesas pagas por categoria (= `saidasPagas`). */
  totalDespesasPagas: Centavos;
}

/** Chave canônica das categorias desconhecidas/ausentes. */
const OUTROS = "__outros__";

/** Ids de categoria reconhecidos pelo catálogo (fonte única). */
const IDS_CONHECIDOS = new Set(CATEGORIAS_PADRAO.map((c) => c.id));

/** Verdadeiro quando `data` está dentro de [inicio, fim] (inclusivo). */
function noPeriodo(data: string, periodo: PeriodoRelatorio): boolean {
  return data >= periodo.inicio && data <= periodo.fim;
}

/**
 * Relatório agregado de um período (puro). Movimentações fora de
 * [periodo.inicio, periodo.fim] não participam de nenhum cálculo. Um período sem
 * movimentações (ou com `inicio > fim`) retorna a estrutura completa zerada.
 */
export function relatorioDoPeriodo(
  movimentacoes: readonly Movimentacao[],
  periodo: PeriodoRelatorio,
): RelatorioPeriodo {
  const doPeriodo = movimentacoes.filter((m) => noPeriodo(m.data, periodo));

  let entradasRecebidas = 0;
  let entradasAReceber = 0;
  let saidasPagas = 0;
  let saidasAPagar = 0;
  let retiradasRealizadas = 0;
  let retiradasAPagar = 0;

  const contagem = {
    entradasRecebidas: 0,
    entradasAReceber: 0,
    saidasPagas: 0,
    saidasAPagar: 0,
    retiradasRealizadas: 0,
    retiradasAPagar: 0,
    total: doPeriodo.length,
  };

  // Acumula despesas pagas por categoria preservando a ordem de 1º aparecimento,
  // para um desempate estável antes da ordenação por valor.
  const porCategoria = new Map<string, DespesaCategoria>();

  for (const m of doPeriodo) {
    const pago = valorPago(m);
    const pendente = saldoPendente(m);

    if (m.tipo === "entrada") {
      entradasRecebidas += pago;
      entradasAReceber += pendente;
      if (pago > 0) contagem.entradasRecebidas += 1;
      if (pendente > 0) contagem.entradasAReceber += 1;
      continue;
    }

    if (m.tipo === "retirada") {
      retiradasRealizadas += pago;
      retiradasAPagar += pendente;
      if (pago > 0) contagem.retiradasRealizadas += 1;
      if (pendente > 0) contagem.retiradasAPagar += 1;
      continue;
    }

    // m.tipo === "saida"
    saidasPagas += pago;
    saidasAPagar += pendente;
    if (pago > 0) contagem.saidasPagas += 1;
    if (pendente > 0) contagem.saidasAPagar += 1;

    // Detalhamento por categoria: só o que foi efetivamente pago.
    if (pago > 0) {
      const conhecida = IDS_CONHECIDOS.has(m.categoriaId);
      const chave = conhecida ? m.categoriaId : OUTROS;
      const atual = porCategoria.get(chave);
      if (atual) {
        atual.total += pago;
        atual.quantidade += 1;
      } else {
        porCategoria.set(chave, {
          categoriaId: chave,
          nome: conhecida ? nomeCategoria(m.categoriaId) : "Outros",
          total: pago,
          quantidade: 1,
        });
      }
    }
  }

  const despesasPorCategoria = [...porCategoria.values()].sort(
    (a, b) => b.total - a.total,
  );

  return {
    periodo,
    entradasRecebidas,
    saidasPagas,
    retiradasRealizadas,
    resultado: entradasRecebidas - saidasPagas - retiradasRealizadas,
    entradasAReceber,
    saidasAPagar,
    retiradasAPagar,
    totalAPagar: saidasAPagar + retiradasAPagar,
    contagem,
    despesasPorCategoria,
    totalDespesasPagas: saidasPagas,
  };
}
