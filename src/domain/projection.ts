/**
 * Projeção temporal do caixa — a lógica que o Pulso do Caixa consome (DESIGN.md §9).
 *
 * O componente visual NÃO recalcula nada: ele recebe `PulsoDia[]` pronto.
 *
 * Regras (DESIGN.md §9 + §2, decisão de refinamento documentada abaixo):
 *
 *  - O dia 0 parte do `saldoReal` de hoje (nunca mistura saldo real com projeção).
 *    O `saldoReal` já embute a parte PAGA de contas parcialmente quitadas (P1).
 *  - `saldoConfirmado(d)` = saldoReal − Σ SALDO PENDENTE de saídas/retiradas com
 *      vencimento ≤ d. Usa o valor RESTANTE, não o original. Previstos NÃO entram aqui.
 *  - `saldoProjetado(d)` = saldoConfirmado(d) + Σ entradas previstas com data ≤ d.
 *      O cenário "se o previsto entrar". Sempre separado do confirmado.
 *  - `linhaSeguranca(d)` = margem + (reservas − reservas já consumidas por contas
 *      vinculadas pagas até d). Refinamento da anti-dupla-contagem no tempo: quando
 *      uma conta coberta por reserva é quitada, ela baixa o caixa E libera a reserva
 *      que a protegia, então o piso de segurança desce na mesma medida — evitando um
 *      falso risco. (Em DESIGN.md §9 a linha de segurança é descrita como fixa; aqui
 *      ela é por-dia para manter coerência com §2.4. Não muda identidade nem escopo.)
 *  - `emRisco(d)` = saldoConfirmado(d) < linhaSeguranca(d).
 */
import { saldoReal, totalReservas } from "./calculations";
import { saldoPendente } from "./movimentacao";
import type { Centavos, EstadoFinanceiro, Movimentacao } from "./types";

export type HorizontePulso = 7 | 15 | 30;

export interface PulsoDia {
  /** Data ISO `YYYY-MM-DD`. */
  data: string;
  /** Deslocamento em dias a partir de hoje (0 = hoje). */
  offset: number;
  /** Saldo considerando só o confirmado (piso honesto). */
  saldoConfirmado: Centavos;
  /** Saldo incluindo recebimentos previstos (cenário otimista). */
  saldoProjetado: Centavos;
  /** Piso que não se deve cruzar: margem + reservas ainda não consumidas. */
  linhaSeguranca: Centavos;
  /** Saldo pendente de saídas/retiradas vencendo exatamente neste dia (batimentos ↓). */
  saidasNoDia: Centavos;
  /** Recebimentos previstos esperados exatamente neste dia (batimentos ocos ↑). */
  recebimentosPrevistosNoDia: Centavos;
  /** Verdadeiro quando o saldo confirmado fica abaixo da linha de segurança. */
  emRisco: boolean;
}

export interface OpcoesProjecao {
  horizonteDias: HorizontePulso;
  /** Data ISO de "hoje". Default: data atual. Injetável para testes determinísticos. */
  hoje?: string;
}

export interface ResultadoProjecao {
  dias: PulsoDia[];
  /** Primeiro dia (a partir de hoje) em que o saldo confirmado entra em risco. */
  primeiroDiaDeRisco: PulsoDia | null;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const ePendente = (m: Movimentacao) => m.status === "pendente";
const eSaidaOuRetirada = (m: Movimentacao) =>
  m.tipo === "saida" || m.tipo === "retirada";

function somaPendente(movs: Movimentacao[]): Centavos {
  return movs.reduce((acc, m) => acc + saldoPendente(m), 0);
}

function somaValor(movs: Movimentacao[]): Centavos {
  return movs.reduce((acc, m) => acc + m.valor, 0);
}

/** Quanto de reserva foi consumido por contas vinculadas com vencimento ≤ data. */
function reservasConsumidasAte(e: EstadoFinanceiro, data: string): Centavos {
  let consumido = 0;
  for (const reserva of e.reservas) {
    const contasAteData = e.movimentacoes.filter(
      (m) =>
        eSaidaOuRetirada(m) &&
        m.reservaId === reserva.id &&
        m.data <= data &&
        saldoPendente(m) > 0,
    );
    const restante = somaPendente(contasAteData);
    consumido += Math.min(restante, reserva.saldoAtual);
  }
  return consumido;
}

/** Gera a série diária do Pulso do Caixa. */
export function projetarCaixa(
  e: EstadoFinanceiro,
  opcoes: OpcoesProjecao,
): ResultadoProjecao {
  const hoje = opcoes.hoje ?? hojeISO();
  const base = saldoReal(e);
  const margem = e.config.margemSeguranca;
  const reservas = totalReservas(e);

  // Contas com saldo ainda pendente (inclui as parcialmente pagas).
  const pendentesSaida = e.movimentacoes.filter(
    (m) => eSaidaOuRetirada(m) && saldoPendente(m) > 0,
  );
  const pendentesEntrada = e.movimentacoes.filter(
    (m) => ePendente(m) && m.tipo === "entrada",
  );

  const dias: PulsoDia[] = [];
  let primeiroDiaDeRisco: PulsoDia | null = null;

  for (let offset = 0; offset <= opcoes.horizonteDias; offset++) {
    const data = addDays(hoje, offset);

    const saidasAteData = somaPendente(
      pendentesSaida.filter((m) => m.data <= data),
    );
    const entradasAteData = somaValor(
      pendentesEntrada.filter((m) => m.data <= data),
    );
    const saidasNoDia = somaPendente(
      pendentesSaida.filter((m) => m.data === data),
    );
    const recebimentosPrevistosNoDia = somaValor(
      pendentesEntrada.filter((m) => m.data === data),
    );

    const saldoConfirmado = base - saidasAteData;
    const saldoProjetado = saldoConfirmado + entradasAteData;
    const linhaSeguranca = margem + (reservas - reservasConsumidasAte(e, data));
    const emRisco = saldoConfirmado < linhaSeguranca;

    const dia: PulsoDia = {
      data,
      offset,
      saldoConfirmado,
      saldoProjetado,
      linhaSeguranca,
      saidasNoDia,
      recebimentosPrevistosNoDia,
      emRisco,
    };
    dias.push(dia);
    if (emRisco && primeiroDiaDeRisco === null) primeiroDiaDeRisco = dia;
  }

  return { dias, primeiroDiaDeRisco };
}
