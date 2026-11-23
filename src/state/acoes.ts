/**
 * Ações do store — a camada que CHAMA as operações do domínio (fora do reducer).
 *
 * Fábrica pura: cada ação (1) verifica se o store está `pronto`; (2) se não,
 * retorna um erro tipado explícito SEM executar o domínio nem commitar; (3) se
 * sim, executa a operação do domínio e só confirma (`commit`) quando `ok`,
 * preservando a atomicidade. Não há regra de negócio aqui — apenas o gating, o
 * roteamento para o domínio e a injeção de id na borda.
 */
import {
  adicionarMovimentacao,
  editarMovimentacao,
  excluirMovimentacao,
  guardarNaReserva,
  receberEntrada,
  registrarPagamento,
  resgatarDaReserva,
} from "@/domain";
import type {
  AlteracoesMovimentacao,
  Centavos,
  CodigoErro,
  EstadoFinanceiro,
  NovaMovimentacao,
  ResultadoOperacao,
} from "@/domain";

/** Vocabulário de erro das ações: os códigos do domínio + o gating do store. */
export type CodigoErroAcao = CodigoErro | "ESTADO_NAO_PRONTO";

/** Resultado de uma ação do store. Compatível com `ResultadoOperacao` (superconjunto). */
export type ResultadoAcao =
  | { ok: true; estado: EstadoFinanceiro }
  | { ok: false; codigo: CodigoErroAcao; erro: string };

export interface Acoes {
  adicionar(dados: Omit<NovaMovimentacao, "id">): ResultadoAcao;
  receber(movimentacaoId: string): ResultadoAcao;
  registrarPagamento(movimentacaoId: string, valor: Centavos): ResultadoAcao;
  editar(movimentacaoId: string, alteracoes: AlteracoesMovimentacao): ResultadoAcao;
  excluir(movimentacaoId: string): ResultadoAcao;
  guardarEmReserva(reservaId: string, valor: Centavos): ResultadoAcao;
  resgatarDeReserva(reservaId: string, valor: Centavos): ResultadoAcao;
}

export function criarAcoes(
  obterEstado: () => EstadoFinanceiro,
  commit: (estado: EstadoFinanceiro) => void,
  gerarId: () => string,
  estaPronto: () => boolean,
): Acoes {
  /**
   * Executa uma operação do domínio apenas quando o store está `pronto`.
   * `operacao` é um thunk: nada do domínio (nem a geração de id) roda antes do gating.
   */
  function executar(operacao: () => ResultadoOperacao): ResultadoAcao {
    if (!estaPronto()) {
      return {
        ok: false,
        codigo: "ESTADO_NAO_PRONTO",
        erro: "O app ainda está carregando ou em modo de recuperação. Tente novamente em instantes.",
      };
    }
    const resultado = operacao();
    if (resultado.ok) commit(resultado.estado);
    return resultado;
  }

  return {
    adicionar: (dados) =>
      executar(() => adicionarMovimentacao(obterEstado(), { ...dados, id: gerarId() })),
    receber: (id) => executar(() => receberEntrada(obterEstado(), id)),
    registrarPagamento: (id, valor) =>
      executar(() => registrarPagamento(obterEstado(), id, valor)),
    editar: (id, alteracoes) =>
      executar(() => editarMovimentacao(obterEstado(), id, alteracoes)),
    excluir: (id) => executar(() => excluirMovimentacao(obterEstado(), id)),
    guardarEmReserva: (reservaId, valor) =>
      executar(() => guardarNaReserva(obterEstado(), reservaId, valor)),
    resgatarDeReserva: (reservaId, valor) =>
      executar(() => resgatarDaReserva(obterEstado(), reservaId, valor)),
  };
}
