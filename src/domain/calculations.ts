/**
 * Cálculos financeiros centrais do Fôlego.
 *
 * Todas as funções são puras: recebem um `EstadoFinanceiro` e retornam números
 * em centavos. A interface nunca recalcula — consome `resumoFinanceiro`.
 *
 * Fórmulas canônicas (DESIGN.md §2.3 e §2.4):
 *   saldoReal    = saldoAbertura + Σ entradas(realizado) − Σ (saidas+retiradas) pagas
 *   comprometido = totalReservas + contasPendentesNaoCobertas
 *   livreBruto   = saldoReal − comprometido − margemSeguranca
 *   livreParaUsar = max(0, livreBruto)
 *
 * Com pagamento parcial (P1): o que importa para o saldo é o valor efetivamente
 * PAGO; o que importa para o comprometido/projeção é o saldo PENDENTE (restante).
 */
import { saldoPendente, valorPago } from "./movimentacao";
import type {
  Centavos,
  EstadoFinanceiro,
  Movimentacao,
  ResumoFinanceiro,
} from "./types";

const eRealizado = (m: Movimentacao) => m.status === "realizado";
const ePendente = (m: Movimentacao) => m.status === "pendente";
const eSaidaOuRetirada = (m: Movimentacao) =>
  m.tipo === "saida" || m.tipo === "retirada";

function somaValor(movs: Movimentacao[]): Centavos {
  return movs.reduce((acc, m) => acc + m.valor, 0);
}

function somaValorPago(movs: Movimentacao[]): Centavos {
  return movs.reduce((acc, m) => acc + valorPago(m), 0);
}

function somaSaldoPendente(movs: Movimentacao[]): Centavos {
  return movs.reduce((acc, m) => acc + saldoPendente(m), 0);
}

/** Entradas efetivamente recebidas (realizadas). */
export function entradasRealizadas(e: EstadoFinanceiro): Centavos {
  return somaValor(e.movimentacoes.filter((m) => eRealizado(m) && m.tipo === "entrada"));
}

/** Saídas efetivamente pagas (inclui a parte paga de contas parcialmente quitadas). */
export function saidasRealizadas(e: EstadoFinanceiro): Centavos {
  return somaValorPago(e.movimentacoes.filter((m) => m.tipo === "saida"));
}

/** Retiradas efetivamente pagas (inclui a parte paga de retiradas parciais). */
export function retiradasRealizadas(e: EstadoFinanceiro): Centavos {
  return somaValorPago(e.movimentacoes.filter((m) => m.tipo === "retirada"));
}

/**
 * Saldo real: só o dinheiro que de fato entrou/saiu altera o saldo.
 * O saldo de abertura é o ponto de partida, não uma entrada (DESIGN.md §2 regra 1).
 */
export function saldoReal(e: EstadoFinanceiro): Centavos {
  return (
    e.config.saldoAbertura +
    entradasRealizadas(e) -
    saidasRealizadas(e) -
    retiradasRealizadas(e)
  );
}

/** Recebimentos previstos: entradas pendentes. NUNCA entram no saldo/disponível. */
export function entradasPrevistas(e: EstadoFinanceiro): Centavos {
  return somaValor(e.movimentacoes.filter((m) => ePendente(m) && m.tipo === "entrada"));
}

/** Total a pagar (saldo PENDENTE de saídas/retiradas — o valor restante, não o original). */
export function contasPendentes(e: EstadoFinanceiro): Centavos {
  return somaSaldoPendente(e.movimentacoes.filter(eSaidaOuRetirada));
}

/** Soma do que já foi separado em todas as reservas. */
export function totalReservas(e: EstadoFinanceiro): Centavos {
  return e.reservas.reduce((acc, r) => acc + r.saldoAtual, 0);
}

/**
 * Contas pendentes NÃO cobertas por reservas (anti-dupla-contagem, DESIGN.md §2.4).
 *
 * Trabalha sobre o SALDO PENDENTE de cada conta (valor restante). Uma conta
 * vinculada é coberta até o saldo da reserva; a cobertura é calculada sobre a SOMA
 * das contas daquela reserva, então uma reserva nunca cobre além do próprio saldo.
 */
export function contasPendentesNaoCobertas(e: EstadoFinanceiro): Centavos {
  const contas = e.movimentacoes.filter(
    (m) => eSaidaOuRetirada(m) && saldoPendente(m) > 0,
  );

  let descoberto = 0;

  // Contas sem reserva contam integralmente (pelo restante).
  for (const m of contas) {
    if (!m.reservaId) descoberto += saldoPendente(m);
  }

  // Contas vinculadas: agrupa por reserva e desconta a cobertura uma única vez.
  const porReserva = new Map<string, number>();
  for (const m of contas) {
    if (m.reservaId) {
      porReserva.set(
        m.reservaId,
        (porReserva.get(m.reservaId) ?? 0) + saldoPendente(m),
      );
    }
  }
  for (const [reservaId, restanteDaReserva] of porReserva) {
    const reserva = e.reservas.find((r) => r.id === reservaId);
    const saldoReserva = reserva ? reserva.saldoAtual : 0; // reserva inexistente => sem cobertura
    const coberto = Math.min(restanteDaReserva, saldoReserva);
    descoberto += restanteDaReserva - coberto; // só o excedente
  }

  return descoberto;
}

/** Comprometido: reservas + contas pendentes não cobertas. */
export function comprometido(e: EstadoFinanceiro): Centavos {
  return totalReservas(e) + contasPendentesNaoCobertas(e);
}

/** livreBruto = saldoReal − comprometido − margem. Pode ser negativo. */
export function livreBruto(e: EstadoFinanceiro): Centavos {
  return saldoReal(e) - comprometido(e) - e.config.margemSeguranca;
}

/** "Livre pra usar": livreBruto com piso em 0. */
export function livreParaUsar(e: EstadoFinanceiro): Centavos {
  return Math.max(0, livreBruto(e));
}

/** Déficit real: quanto falta cobrir quando livreBruto < 0. Caso contrário, 0. */
export function deficit(e: EstadoFinanceiro): Centavos {
  const bruto = livreBruto(e);
  return bruto < 0 ? -bruto : 0;
}

/** Resumo consolidado — a fonte única para a interface. */
export function resumoFinanceiro(e: EstadoFinanceiro): ResumoFinanceiro {
  const bruto = livreBruto(e);
  return {
    saldoAbertura: e.config.saldoAbertura,
    saldoReal: saldoReal(e),
    entradasRealizadas: entradasRealizadas(e),
    saidasRealizadas: saidasRealizadas(e),
    retiradasRealizadas: retiradasRealizadas(e),
    entradasPrevistas: entradasPrevistas(e),
    contasPendentes: contasPendentes(e),
    contasPendentesNaoCobertas: contasPendentesNaoCobertas(e),
    totalReservas: totalReservas(e),
    margemSeguranca: e.config.margemSeguranca,
    comprometido: comprometido(e),
    livreBruto: bruto,
    livreParaUsar: Math.max(0, bruto),
    deficit: bruto < 0 ? -bruto : 0,
    emDeficit: bruto < 0,
  };
}
