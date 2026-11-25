/**
 * Apresentação de uma reserva — PURO, sem regra financeira.
 *
 * Deriva o estado visual do progresso em relação à meta (`alvo`). `alvo` é meta de
 * apresentação (Entrega 2.7, decisão 3): não entra em nenhum cálculo de saldo. Aqui
 * só computamos percentual/restante para a barra e o texto. `saldoAtual` e `alvo`
 * vêm do domínio; nada é recalculado do caixa.
 */
import { validarValorMonetario } from "@/domain";
import type { Centavos, Reserva } from "@/domain";

/**
 * Mapeamento PURO do formulário de reserva (nome + meta opcional) para o domínio.
 * Só valida FORMATO (nome não-vazio; meta, se informada, é valor monetário válido).
 * A regra de negócio fica em `criarReserva`/`editarReserva`. Meta vazia = sem meta.
 */
export type ResultadoCamposReserva =
  | { ok: true; nome: string; alvo: Centavos | null }
  | { ok: false; campo: "nome" | "meta"; erro: string };

export function construirCamposReserva(
  nome: string,
  metaTexto: string,
): ResultadoCamposReserva {
  const nomeTrim = nome.trim();
  if (nomeTrim === "") {
    return { ok: false, campo: "nome", erro: "Dê um nome para a reserva." };
  }
  const metaTrim = metaTexto.trim();
  if (metaTrim === "") {
    return { ok: true, nome: nomeTrim, alvo: null };
  }
  const meta = validarValorMonetario(metaTrim);
  if (!meta.ok) {
    return { ok: false, campo: "meta", erro: meta.erro };
  }
  return { ok: true, nome: nomeTrim, alvo: meta.centavos };
}

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
