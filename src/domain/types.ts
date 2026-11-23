/**
 * Tipos do domínio financeiro do Fôlego.
 *
 * REGRA DE OURO (ver DESIGN.md §2): valores monetários são SEMPRE armazenados
 * em centavos inteiros (`Centavos`). A conversão para reais e a formatação
 * pt-BR acontecem apenas na borda de apresentação (ver `money.ts`).
 *
 * Este módulo não depende de React nem de nenhuma camada de interface.
 */

/** Valor monetário em centavos inteiros. Ex.: R$ 12,34 => 1234. */
export type Centavos = number;

export type MovimentacaoTipo = "entrada" | "saida" | "retirada";

export type MovimentacaoStatus = "realizado" | "pendente";

export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "transferencia"
  | "cartao"
  | "outro";

/**
 * Uma movimentação de caixa. `valor` é sempre a magnitude positiva em centavos;
 * o sinal é dado por `tipo` (entrada = +, saida/retirada = −).
 */
export interface Movimentacao {
  id: string;
  tipo: MovimentacaoTipo;
  /** Magnitude total em centavos, sempre >= 0. */
  valor: Centavos;
  /** Data ISO `YYYY-MM-DD`. Para `pendente`, é o vencimento/previsão. */
  data: string;
  categoriaId: string;
  status: MovimentacaoStatus;
  /**
   * Quanto já foi efetivamente pago desta conta (saída/retirada), em centavos.
   * Suporta pagamento parcial (DESIGN.md §2.4): `saldoPendente = valor − valorPago`.
   * Invariante mantido pelas operações: `status === "realizado"` sse, e somente se,
   * `valorPago === valor` (conta quitada). Ausente => modelo atômico (ver `movimentacao.ts`).
   */
  valorPago?: Centavos | null;
  formaPagamento?: FormaPagamento | null;
  /** Vínculo opcional com uma reserva (anti-dupla-contagem, ver DESIGN.md §2.4). */
  reservaId?: string | null;
  descricao?: string | null;
}

/** Envelope virtual dentro do caixa único (ver DESIGN.md §2.1). */
export interface Reserva {
  id: string;
  nome: string;
  /** Meta opcional de quanto se quer guardar. */
  alvo?: Centavos | null;
  /** Quanto já foi separado neste envelope. */
  saldoAtual: Centavos;
}

export interface ConfigFinanceira {
  /** Saldo de abertura: ponto de partida, NÃO é uma receita (ver DESIGN.md §2 regra 1). */
  saldoAbertura: Centavos;
  /** Folga mínima que o app mantém de lado. Começa em 0. */
  margemSeguranca: Centavos;
}

/** Estado financeiro completo — a entrada de todas as funções de cálculo. */
export interface EstadoFinanceiro {
  config: ConfigFinanceira;
  movimentacoes: Movimentacao[];
  reservas: Reserva[];
}

/** Resumo consolidado — o que o dashboard consome (ver DESIGN.md §2.3). */
export interface ResumoFinanceiro {
  saldoAbertura: Centavos;
  /** Dinheiro que já entrou menos o que já saiu de fato. */
  saldoReal: Centavos;
  entradasRealizadas: Centavos;
  saidasRealizadas: Centavos;
  retiradasRealizadas: Centavos;
  /** Entradas pendentes — NUNCA somadas ao saldo/disponível. */
  entradasPrevistas: Centavos;
  /** Total de saídas/retiradas pendentes (bruto). */
  contasPendentes: Centavos;
  /** Parte das contas pendentes não coberta por reservas (anti-dupla-contagem). */
  contasPendentesNaoCobertas: Centavos;
  totalReservas: Centavos;
  margemSeguranca: Centavos;
  /** Reservas + contas pendentes não cobertas. */
  comprometido: Centavos;
  /** saldoReal − comprometido − margem. Pode ser negativo (uso interno). */
  livreBruto: Centavos;
  /** O indicador "Livre pra usar": livreBruto com piso em 0. */
  livreParaUsar: Centavos;
  /** Quanto falta cobrir quando livreBruto < 0. Caso contrário, 0. */
  deficit: Centavos;
  emDeficit: boolean;
}
