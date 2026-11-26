/**
 * Construção dos períodos dos Relatórios (Etapa B) — PURO, sem regra financeira.
 *
 * Deriva os intervalos "Este mês" e "Mês passado" a partir de uma data de
 * referência (`hoje`), e monta um `PeriodoRelatorio` inclusivo para um mês. A
 * agregação em si fica em `relatorio.ts`; aqui só se calcula o recorte de datas.
 *
 * Datas são strings `AAAA-MM-DD`. Para obter o último dia do mês usamos `Date`
 * apenas com COMPONENTES NUMÉRICOS locais (`new Date(ano, mes, 0)`) — mesmo padrão
 * de `formato-data.ts` —, nunca `new Date("AAAA-MM-DD")` (que seria UTC e poderia
 * deslocar o dia). Assim a virada de ano e fevereiro/bissexto saem corretos.
 */
import type { PeriodoRelatorio } from "./relatorio";

export interface MesAno {
  ano: number;
  /** Mês 1–12. */
  mes: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Data local de hoje como `AAAA-MM-DD` (sem deslocamento de fuso). */
export function hojeISO(referencia: Date = new Date()): string {
  return `${referencia.getFullYear()}-${pad2(referencia.getMonth() + 1)}-${pad2(
    referencia.getDate(),
  )}`;
}

/** Último dia (28/29/30/31) do mês informado. `mes` é 1–12. */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  // `new Date(ano, mes, 0)` = dia 0 do mês seguinte = último dia de `mes` (local).
  return new Date(ano, mes, 0).getDate();
}

/** Mês/ano de uma data `AAAA-MM-DD`. */
function mesDaData(iso: string): MesAno {
  const [ano, mes] = iso.split("-").map(Number);
  return { ano: ano ?? 1970, mes: mes ?? 1 };
}

/** O mês de `hoje`. */
export function mesAtual(hoje: string = hojeISO()): MesAno {
  return mesDaData(hoje);
}

/** O mês anterior ao de `hoje` (vira o ano em janeiro). */
export function mesAnterior(hoje: string = hojeISO()): MesAno {
  const { ano, mes } = mesDaData(hoje);
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

/** Período inclusivo [dia 1, último dia] de um mês. */
export function periodoDoMes({ ano, mes }: MesAno): PeriodoRelatorio {
  return {
    inicio: `${ano}-${pad2(mes)}-01`,
    fim: `${ano}-${pad2(mes)}-${pad2(ultimoDiaDoMes(ano, mes))}`,
  };
}

/** Período "Este mês" a partir de `hoje`. */
export function periodoMesAtual(hoje: string = hojeISO()): PeriodoRelatorio {
  return periodoDoMes(mesAtual(hoje));
}

/** Período "Mês passado" a partir de `hoje`. */
export function periodoMesAnterior(hoje: string = hojeISO()): PeriodoRelatorio {
  return periodoDoMes(mesAnterior(hoje));
}

/**
 * Um período personalizado é válido quando ambas as pontas têm formato
 * `AAAA-MM-DD` e `inicio <= fim` (comparação lexicográfica). A UI usa isto para
 * não apresentar um resumo zerado como se fosse um cálculo real.
 */
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export function periodoValido(periodo: PeriodoRelatorio): boolean {
  return (
    FORMATO.test(periodo.inicio) &&
    FORMATO.test(periodo.fim) &&
    periodo.inicio <= periodo.fim
  );
}
