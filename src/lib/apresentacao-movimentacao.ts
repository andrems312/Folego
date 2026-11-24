/**
 * Mapeamento de apresentação de uma movimentação — PURO, sem recalcular finanças.
 *
 * Usa os helpers do domínio (`valorPago`, `saldoPendente`, `estaQuitada`) para
 * decidir sinal, cor (crédito/débito) e status visível. Não inventa status nem
 * reproduz cálculo financeiro na UI.
 */
import { estaQuitada, saldoPendente, valorPago } from "@/domain";
import type { Centavos, Movimentacao } from "@/domain";

export type StatusApresentacao =
  | "recebido"
  | "previsto"
  | "pago"
  | "a-pagar"
  | "parcial";

export interface ApresentacaoMovimentacao {
  sinal: "+" | "−";
  tipoLabel: "Entrada" | "Saída" | "Retirada";
  /** Token de cor do valor: crédito (entrada) ou débito (saída/retirada). */
  cor: "credit" | "debit";
  status: StatusApresentacao;
  statusLabel: string;
  /** Saldo ainda pendente (> 0 em "a-pagar" e "parcial"). */
  saldoPendente: Centavos;
}

export function descreverMovimentacao(m: Movimentacao): ApresentacaoMovimentacao {
  if (m.tipo === "entrada") {
    const previsto = m.status !== "realizado";
    return {
      sinal: "+",
      tipoLabel: "Entrada",
      cor: "credit",
      status: previsto ? "previsto" : "recebido",
      statusLabel: previsto ? "Previsto" : "Recebido",
      saldoPendente: 0,
    };
  }

  const tipoLabel = m.tipo === "saida" ? "Saída" : "Retirada";
  const pendente = saldoPendente(m);

  if (estaQuitada(m)) {
    return { sinal: "−", tipoLabel, cor: "debit", status: "pago", statusLabel: "Pago", saldoPendente: 0 };
  }
  if (valorPago(m) > 0) {
    return {
      sinal: "−",
      tipoLabel,
      cor: "debit",
      status: "parcial",
      statusLabel: "Parcial",
      saldoPendente: pendente,
    };
  }
  return {
    sinal: "−",
    tipoLabel,
    cor: "debit",
    status: "a-pagar",
    statusLabel: "A pagar",
    saldoPendente: pendente,
  };
}
