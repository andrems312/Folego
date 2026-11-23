/**
 * Helpers de pagamento de uma movimentação (suporte a pagamento parcial — P1).
 *
 * Modelo: uma saída/retirada guarda `valor` (total) e, opcionalmente, `valorPago`
 * (quanto já foi efetivamente pago). O saldo pendente é `valor − valorPago`.
 *
 * Compatibilidade: quando `valorPago` é ausente, caímos no modelo atômico antigo
 * (realizado => pago integral; pendente => nada pago), preservando o comportamento
 * e os testes já existentes.
 */
import type { Centavos, Movimentacao } from "./types";

/** Quanto já foi efetivamente pago/realizado desta movimentação. */
export function valorPago(m: Movimentacao): Centavos {
  if (typeof m.valorPago === "number") return m.valorPago;
  return m.status === "realizado" ? m.valor : 0;
}

/** Quanto ainda falta pagar (nunca negativo). */
export function saldoPendente(m: Movimentacao): Centavos {
  return Math.max(0, m.valor - valorPago(m));
}

/** Verdadeiro quando não há mais saldo pendente. */
export function estaQuitada(m: Movimentacao): boolean {
  return saldoPendente(m) <= 0;
}

/**
 * Verdadeiro quando a movimentação já alterou o saldo real:
 *  - entrada: foi recebida (`realizado`);
 *  - saída/retirada: tem algum valor pago (parcial ou total).
 * Movimentações assim NÃO podem ser excluídas pela operação comum (DESIGN.md §2.8),
 * para não apagar dinheiro que já entrou/saiu do caixa.
 */
export function afetouSaldoReal(m: Movimentacao): boolean {
  if (m.tipo === "entrada") return m.status === "realizado";
  return valorPago(m) > 0;
}
