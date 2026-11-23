/**
 * Reducer do store financeiro — PURO. Não executa operações do domínio nem
 * efeitos colaterais; apenas transições de forma do estado do store.
 *
 * As operações financeiras rodam FORA daqui (ver `acoes.ts`), e só o estado já
 * computado chega como payload de `COMMIT`/`HIDRATADO`/`RECOMECAR`.
 */
import type { EstadoFinanceiro } from "@/domain";

export type StatusStore = "carregando" | "pronto" | "dados-invalidos";

export interface EstadoStore {
  /** carregando: antes de ler o localStorage; pronto: operável; dados-invalidos: recuperação. */
  status: StatusStore;
  /** Estado financeiro corrente (válido). Durante 'carregando', é o seed. */
  estado: EstadoFinanceiro;
  /** Falso quando o localStorage está inacessível (trabalha em memória). */
  persistenciaDisponivel: boolean;
  /** Mensagem de erro/recuperação para a interface. */
  aviso: string | null;
}

export type AcaoStore =
  | { type: "HIDRATADO"; estado: EstadoFinanceiro }
  | { type: "DADOS_INVALIDOS"; mensagem: string }
  | { type: "PERSISTENCIA_INDISPONIVEL"; mensagem: string }
  | { type: "COMMIT"; estado: EstadoFinanceiro }
  | { type: "RECOMECAR"; estado: EstadoFinanceiro };

export function estadoInicialStore(seed: EstadoFinanceiro): EstadoStore {
  return {
    status: "carregando",
    estado: seed,
    persistenciaDisponivel: true,
    aviso: null,
  };
}

export function reducer(s: EstadoStore, a: AcaoStore): EstadoStore {
  switch (a.type) {
    case "HIDRATADO":
      return { ...s, status: "pronto", estado: a.estado, aviso: null };

    case "DADOS_INVALIDOS":
      // Mantém status não-pronto de propósito: assim a persistência NÃO grava por
      // cima dos dados inválidos, e a interface entra em modo de recuperação.
      return { ...s, status: "dados-invalidos", aviso: a.mensagem };

    case "PERSISTENCIA_INDISPONIVEL":
      // Storage inacessível (leitura/escrita falhou): segue operável em memória.
      return {
        ...s,
        status: "pronto",
        persistenciaDisponivel: false,
        aviso: a.mensagem,
      };

    case "COMMIT":
      // Só aplica sobre um estado pronto/válido (nunca antes da hidratação).
      if (s.status !== "pronto") return s;
      return { ...s, estado: a.estado };

    case "RECOMECAR":
      return { ...s, status: "pronto", estado: a.estado, aviso: null };

    default:
      return s;
  }
}
