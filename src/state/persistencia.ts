/**
 * Persistência temporária em localStorage (chave versionada).
 *
 * As funções aqui são PURAS (recebem a string crua, não tocam o DOM) — o acesso
 * real ao `localStorage` fica no provider. Isso mantém a lógica de hidratação
 * testável sem navegador.
 *
 * Estratégia de dados inválidos (regra da entrega): se o conteúdo salvo não puder
 * ser validado por `carregarEstadoFinanceiro`, retornamos `invalido` com mensagem;
 * o provider NÃO sobrescreve o armazenamento nesse caso (entra em recuperação).
 */
import { carregarEstadoFinanceiro, EstadoInvalidoError } from "@/domain";
import type { EstadoFinanceiro } from "@/domain";
import type { StatusStore } from "./reducer";

/** Chave versionada: trocar a versão invalida formatos antigos de forma controlada. */
export const CHAVE_ESTADO = "folego:estado:v1";
export const VERSAO_ESTADO = 1;

interface Envelope {
  versao: number;
  estado: EstadoFinanceiro;
}

export type ResultadoHidratacao =
  | { tipo: "vazio" }
  | { tipo: "ok"; estado: EstadoFinanceiro }
  | { tipo: "invalido"; mensagem: string };

export function serializarEstado(estado: EstadoFinanceiro): string {
  const envelope: Envelope = { versao: VERSAO_ESTADO, estado };
  return JSON.stringify(envelope);
}

/**
 * Interpreta o conteúdo bruto do armazenamento. Valida o estado com a porta de
 * entrada do domínio (`carregarEstadoFinanceiro`).
 */
export function interpretarArmazenado(raw: string | null): ResultadoHidratacao {
  if (raw === null || raw === "") return { tipo: "vazio" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      tipo: "invalido",
      mensagem: "Os dados salvos estão corrompidos (JSON inválido).",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { tipo: "invalido", mensagem: "Formato dos dados salvos não reconhecido." };
  }

  const envelope = parsed as { versao?: unknown; estado?: unknown };
  if (envelope.versao !== VERSAO_ESTADO) {
    return {
      tipo: "invalido",
      mensagem: `Versão dos dados salvos incompatível (esperada v${VERSAO_ESTADO}).`,
    };
  }

  try {
    const estado = carregarEstadoFinanceiro(envelope.estado);
    return { tipo: "ok", estado };
  } catch (e) {
    const detalhe =
      e instanceof EstadoInvalidoError
        ? e.erros.slice(0, 3).join("; ")
        : "estrutura inválida";
    return { tipo: "invalido", mensagem: `Dados salvos inconsistentes: ${detalhe}.` };
  }
}

/**
 * Regra única de quando gravar: só depois da hidratação (status `pronto`) e com
 * persistência disponível. Garante que o estado inicial nunca sobrescreva o
 * armazenamento antes de a leitura concluir, nem por cima de dados inválidos.
 */
export function devePersistir(
  status: StatusStore,
  persistenciaDisponivel: boolean,
): boolean {
  return status === "pronto" && persistenciaDisponivel;
}
