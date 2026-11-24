"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { estadoDemo } from "@/demo/fixtures";
import { projetarCaixa, resumoFinanceiro } from "@/domain";
import type {
  EstadoFinanceiro,
  ResultadoProjecao,
  ResumoFinanceiro,
} from "@/domain";
import { gerarId } from "@/lib/id";
import { criarAcoes, type Acoes } from "./acoes";
import {
  CHAVE_ESTADO,
  devePersistir,
  interpretarArmazenado,
  serializarEstado,
} from "./persistencia";
import { estadoInicialStore, reducer, type StatusStore } from "./reducer";

/** Estado "do zero", usado pela recuperação explícita (não é o seed de demonstração). */
const ESTADO_VAZIO: EstadoFinanceiro = {
  config: { saldoAbertura: 0, margemSeguranca: 0 },
  movimentacoes: [],
  reservas: [],
};

interface ContextoFinanceiro {
  status: StatusStore;
  estado: EstadoFinanceiro;
  resumo: ResumoFinanceiro;
  projecao: ResultadoProjecao;
  persistenciaDisponivel: boolean;
  aviso: string | null;
  acoes: Acoes;
  /** Recuperação explícita a partir de dados inválidos: recomeça do zero. */
  recomecar: () => void;
}

const Ctx = createContext<ContextoFinanceiro | null>(null);

export function EstadoFinanceiroProvider({
  children,
  seed = estadoDemo,
}: {
  children: React.ReactNode;
  seed?: EstadoFinanceiro;
}) {
  const [store, dispatch] = useReducer(reducer, seed, estadoInicialStore);

  // Refs sempre com o valor mais recente, para as ações lerem sem recriar closures.
  const estadoRef = useRef(store.estado);
  estadoRef.current = store.estado;
  const statusRef = useRef(store.status);
  statusRef.current = store.status;

  // Hidratação: só no cliente, uma vez. Nada de window/localStorage no render/SSR.
  useEffect(() => {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(CHAVE_ESTADO);
    } catch {
      dispatch({
        type: "PERSISTENCIA_INDISPONIVEL",
        mensagem:
          "Não foi possível acessar o armazenamento local. As alterações não serão salvas nesta sessão.",
      });
      return;
    }
    const resultado = interpretarArmazenado(raw);
    if (resultado.tipo === "ok") {
      dispatch({ type: "HIDRATADO", estado: resultado.estado });
    } else if (resultado.tipo === "vazio") {
      dispatch({ type: "HIDRATADO", estado: estadoRef.current }); // primeira vez: seed
    } else {
      dispatch({ type: "DADOS_INVALIDOS", mensagem: resultado.mensagem });
    }
  }, []);

  // Persistência: apenas após a hidratação (status 'pronto') e com storage disponível.
  useEffect(() => {
    if (!devePersistir(store.status, store.persistenciaDisponivel)) return;
    try {
      window.localStorage.setItem(CHAVE_ESTADO, serializarEstado(store.estado));
    } catch {
      dispatch({
        type: "PERSISTENCIA_INDISPONIVEL",
        mensagem: "Não foi possível salvar as alterações no armazenamento local.",
      });
    }
  }, [store.estado, store.status, store.persistenciaDisponivel]);

  const acoes = useMemo<Acoes>(
    () =>
      criarAcoes(
        () => estadoRef.current,
        (novo) => {
          estadoRef.current = novo;
          dispatch({ type: "COMMIT", estado: novo });
        },
        gerarId,
        () => statusRef.current === "pronto",
      ),
    [],
  );

  const recomecar = useCallback(() => {
    estadoRef.current = ESTADO_VAZIO;
    dispatch({ type: "RECOMECAR", estado: ESTADO_VAZIO });
  }, []);

  const resumo = useMemo(() => resumoFinanceiro(store.estado), [store.estado]);
  // Horizonte máximo (30 dias): a série de 30 contém as de 7 e 15, que a UI obtém
  // por recorte de apresentação (src/lib/pulso.ts), sem recalcular finanças.
  const projecao = useMemo(
    () => projetarCaixa(store.estado, { horizonteDias: 30 }),
    [store.estado],
  );

  const valor = useMemo<ContextoFinanceiro>(
    () => ({
      status: store.status,
      estado: store.estado,
      resumo,
      projecao,
      persistenciaDisponivel: store.persistenciaDisponivel,
      aviso: store.aviso,
      acoes,
      recomecar,
    }),
    [
      store.status,
      store.estado,
      store.persistenciaDisponivel,
      store.aviso,
      resumo,
      projecao,
      acoes,
      recomecar,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useFinanceiro(): ContextoFinanceiro {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useFinanceiro deve ser usado dentro de <EstadoFinanceiroProvider>.",
    );
  }
  return ctx;
}

export function useResumo(): ResumoFinanceiro {
  return useFinanceiro().resumo;
}

export function useAcoes(): Acoes {
  return useFinanceiro().acoes;
}
