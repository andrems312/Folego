/**
 * Apresentação de uma reserva — PURO, sem regra financeira.
 *
 * Deriva o estado visual do progresso em relação à meta (`alvo`). `alvo` é meta de
 * apresentação (Entrega 2.7, decisão 3): não entra em nenhum cálculo de saldo. Aqui
 * só computamos percentual/restante para a barra e o texto. `saldoAtual` e `alvo`
 * vêm do domínio; nada é recalculado do caixa.
 */
import type { Centavos, Reserva } from "@/domain";

export type ResumoReserva =
  | { temMeta: false }
  | {
      temMeta: true;
      meta: Centavos;
      /** 0..100, arredondado e limitado (não passa de 100 mesmo se exceder a meta). */
      percentual: number;
      /** Quanto falta para a meta (0 se já atingida). */
      restante: Centavos;
      atingida: boolean;
    };

export function resumoReserva(reserva: Reserva): ResumoReserva {
  const alvo = reserva.alvo ?? null;
  if (alvo === null || alvo <= 0) return { temMeta: false };

  const percentual = Math.max(
    0,
    Math.min(100, Math.round((reserva.saldoAtual / alvo) * 100)),
  );
  const restante = Math.max(0, alvo - reserva.saldoAtual);
  return {
    temMeta: true,
    meta: alvo,
    percentual,
    restante,
    atingida: reserva.saldoAtual >= alvo,
  };
}
