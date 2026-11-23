/**
 * Operações de domínio — transições de estado puras, imutáveis e validadas.
 *
 * API pública ÚNICA e segura: toda operação que pode receber dados inválidos
 * retorna um `ResultadoOperacao` discriminado — ou `{ ok: true, estado }`, ou
 * `{ ok: false, codigo, erro }`. Nunca há mutação parcial: em caso de erro, o
 * estado de entrada permanece intacto (atomicidade — regra 6).
 */
import { ehDataValida } from "./data";
import { afetouSaldoReal, saldoPendente, valorPago } from "./movimentacao";
import type {
  Centavos,
  EstadoFinanceiro,
  FormaPagamento,
  Movimentacao,
  MovimentacaoStatus,
  MovimentacaoTipo,
  Reserva,
} from "./types";

export type CodigoErro =
  | "VALOR_INVALIDO"
  | "MOVIMENTACAO_INEXISTENTE"
  | "MOVIMENTACAO_NAO_PAGAVEL"
  | "CONTA_JA_QUITADA"
  | "VALOR_ACIMA_DO_PENDENTE"
  | "RESERVA_INEXISTENTE"
  | "VALOR_ACIMA_DO_SALDO_RESERVA"
  | "VINCULO_INVALIDO"
  | "VINCULO_BLOQUEADO"
  | "MOVIMENTACAO_COM_PAGAMENTO"
  | "VALOR_ABAIXO_DO_PAGO"
  | "DATA_INVALIDA"
  | "ID_INVALIDO"
  | "ID_DUPLICADO"
  | "CATEGORIA_INVALIDA"
  | "MOVIMENTACAO_NAO_RECEBIVEL"
  | "ENTRADA_JA_RECEBIDA";

export type ResultadoOperacao =
  | { ok: true; estado: EstadoFinanceiro }
  | { ok: false; codigo: CodigoErro; erro: string };

function erro(codigo: CodigoErro, mensagem: string): ResultadoOperacao {
  return { ok: false, codigo, erro: mensagem };
}

function ePositivoInteiro(valor: Centavos): boolean {
  return Number.isInteger(valor) && valor > 0;
}

function mapReserva(
  e: EstadoFinanceiro,
  reservaId: string,
  fn: (r: Reserva) => Reserva,
): EstadoFinanceiro {
  return {
    ...e,
    reservas: e.reservas.map((r) => (r.id === reservaId ? fn(r) : r)),
  };
}

/* ======================================================================
 * Pagamento (parcial ou integral)
 * ==================================================================== */

/**
 * Registra um pagamento (parcial ou integral) de uma conta pendente.
 *
 * Valida ANTES de mudar qualquer estado: valor inteiro positivo; movimentação
 * existente e pagável; conta não quitada; valor ≤ saldo pendente; vínculo válido.
 * Efeito: `valorPago` sobe; `status` vira `realizado` só quando quita; o saldo
 * real cai só pelo valor pago; se vinculada, a reserva baixa `min(valor, saldoReserva)`.
 */
export function registrarPagamento(
  e: EstadoFinanceiro,
  movimentacaoId: string,
  valor: Centavos,
): ResultadoOperacao {
  if (!ePositivoInteiro(valor)) {
    return erro(
      "VALOR_INVALIDO",
      "O valor do pagamento precisa ser um número inteiro positivo em centavos.",
    );
  }

  const mov = e.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) {
    return erro("MOVIMENTACAO_INEXISTENTE", "A movimentação informada não existe.");
  }
  if (mov.tipo !== "saida" && mov.tipo !== "retirada") {
    return erro(
      "MOVIMENTACAO_NAO_PAGAVEL",
      "Só contas (saída ou retirada) podem ser pagas.",
    );
  }

  const pendente = saldoPendente(mov);
  if (pendente <= 0) {
    return erro("CONTA_JA_QUITADA", "Esta conta já está totalmente paga.");
  }
  if (valor > pendente) {
    return erro(
      "VALOR_ACIMA_DO_PENDENTE",
      "O pagamento excede o saldo pendente da conta.",
    );
  }
  if (mov.reservaId) {
    const reserva = e.reservas.find((r) => r.id === mov.reservaId);
    if (!reserva) {
      return erro(
        "VINCULO_INVALIDO",
        "A conta está vinculada a uma reserva que não existe.",
      );
    }
  }

  const novoValorPago = valorPago(mov) + valor;
  const quitada = novoValorPago >= mov.valor;

  let estado: EstadoFinanceiro = {
    ...e,
    movimentacoes: e.movimentacoes.map((m) =>
      m.id === movimentacaoId
        ? {
            ...m,
            valorPago: novoValorPago,
            status: quitada ? ("realizado" as const) : ("pendente" as const),
          }
        : m,
    ),
  };

  if (mov.reservaId) {
    const reserva = estado.reservas.find((r) => r.id === mov.reservaId);
    if (reserva) {
      const baixa = Math.min(valor, reserva.saldoAtual);
      estado = mapReserva(estado, reserva.id, (r) => ({
        ...r,
        saldoAtual: r.saldoAtual - baixa,
      }));
    }
  }

  return { ok: true, estado };
}

/**
 * Conveniência: paga integralmente o saldo pendente de uma conta. Delega a
 * `registrarPagamento` (atalho de pagamento, não uma segunda API de reserva).
 * Mantém a assinatura histórica (`EstadoFinanceiro`); em erro, devolve o estado
 * inalterado.
 */
export function pagarConta(
  e: EstadoFinanceiro,
  movimentacaoId: string,
): EstadoFinanceiro {
  const mov = e.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) return e;
  const pendente = saldoPendente(mov);
  if (pendente <= 0) return e;
  const resultado = registrarPagamento(e, movimentacaoId, pendente);
  return resultado.ok ? resultado.estado : e;
}

/* ======================================================================
 * Reservas — API pública ÚNICA (regra 4)
 * ==================================================================== */

/**
 * Guardar em uma reserva (envelope virtual). NÃO é saída de dinheiro: o saldo
 * real não muda; só aumenta o envelope — logo o comprometido sobe e o "Livre pra
 * usar" desce. Rejeita valor inválido e reserva inexistente.
 */
export function guardarNaReserva(
  e: EstadoFinanceiro,
  reservaId: string,
  valor: Centavos,
): ResultadoOperacao {
  if (!ePositivoInteiro(valor)) {
    return erro("VALOR_INVALIDO", "O valor a guardar precisa ser inteiro positivo.");
  }
  if (!e.reservas.some((r) => r.id === reservaId)) {
    return erro("RESERVA_INEXISTENTE", "A reserva informada não existe.");
  }
  return {
    ok: true,
    estado: mapReserva(e, reservaId, (r) => ({
      ...r,
      saldoAtual: r.saldoAtual + valor,
    })),
  };
}

/**
 * Resgatar de uma reserva (desfazer a separação). Também não mexe no saldo real.
 * Rejeita valor inválido, reserva inexistente e resgate acima do saldo guardado —
 * nunca deixa o envelope negativo.
 */
export function resgatarDaReserva(
  e: EstadoFinanceiro,
  reservaId: string,
  valor: Centavos,
): ResultadoOperacao {
  if (!ePositivoInteiro(valor)) {
    return erro("VALOR_INVALIDO", "O valor a resgatar precisa ser inteiro positivo.");
  }
  const reserva = e.reservas.find((r) => r.id === reservaId);
  if (!reserva) {
    return erro("RESERVA_INEXISTENTE", "A reserva informada não existe.");
  }
  if (valor > reserva.saldoAtual) {
    return erro(
      "VALOR_ACIMA_DO_SALDO_RESERVA",
      "O resgate excede o saldo guardado na reserva.",
    );
  }
  return {
    ok: true,
    estado: mapReserva(e, reservaId, (r) => ({
      ...r,
      saldoAtual: r.saldoAtual - valor,
    })),
  };
}

/* ======================================================================
 * Exclusão e edição seguras (regras 1, 2, 3)
 * ==================================================================== */

/**
 * Exclui uma movimentação. REJEITA (regra 2) quando ela já afetou o saldo real —
 * entrada recebida ou conta com qualquer valor pago — para não apagar dinheiro
 * que já entrou/saiu do caixa (regra 1). Movimentações ainda sem efeito (entrada
 * prevista, conta pendente sem pagamento) podem ser excluídas.
 */
export function excluirMovimentacao(
  e: EstadoFinanceiro,
  movimentacaoId: string,
): ResultadoOperacao {
  const mov = e.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) {
    return erro("MOVIMENTACAO_INEXISTENTE", "A movimentação informada não existe.");
  }
  if (afetouSaldoReal(mov)) {
    return erro(
      "MOVIMENTACAO_COM_PAGAMENTO",
      "Esta movimentação já afetou o saldo real (paga ou recebida) e não pode ser excluída. Edite ou estorne antes.",
    );
  }
  return {
    ok: true,
    estado: {
      ...e,
      movimentacoes: e.movimentacoes.filter((m) => m.id !== movimentacaoId),
    },
  };
}

/** Campos editáveis de uma movimentação (nunca `valorPago` nem `status`, que são derivados). */
export interface AlteracoesMovimentacao {
  valor?: Centavos;
  data?: string;
  categoriaId?: string;
  descricao?: string | null;
  formaPagamento?: FormaPagamento | null;
  reservaId?: string | null;
}

/**
 * Edita uma movimentação PRESERVANDO o histórico de pagamento (regra 3):
 *  - `valorPago` é mantido; nunca se edita o valor para abaixo do já pago;
 *  - o `status` é recalculado a partir de `valorPago` vs novo `valor` (coerência);
 *  - não permite trocar o vínculo de reserva de uma conta que já recebeu pagamento;
 *  - valida valor (inteiro ≥ 0), data e existência da reserva vinculada.
 */
export function editarMovimentacao(
  e: EstadoFinanceiro,
  movimentacaoId: string,
  alteracoes: AlteracoesMovimentacao,
): ResultadoOperacao {
  const mov = e.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) {
    return erro("MOVIMENTACAO_INEXISTENTE", "A movimentação informada não existe.");
  }

  const pago = valorPago(mov);
  const novoValor = alteracoes.valor ?? mov.valor;

  if (!Number.isInteger(novoValor) || novoValor < 0) {
    return erro("VALOR_INVALIDO", "O valor precisa ser um inteiro não-negativo em centavos.");
  }
  if (novoValor < pago) {
    return erro(
      "VALOR_ABAIXO_DO_PAGO",
      "O valor da conta não pode ficar abaixo do que já foi pago.",
    );
  }
  if (alteracoes.data !== undefined && !ehDataValida(alteracoes.data)) {
    return erro(
      "DATA_INVALIDA",
      "Data inválida: use AAAA-MM-DD com dia e mês que existam.",
    );
  }

  const novoReservaId =
    alteracoes.reservaId !== undefined ? alteracoes.reservaId : mov.reservaId ?? null;
  if (novoReservaId && !e.reservas.some((r) => r.id === novoReservaId)) {
    return erro("VINCULO_INVALIDO", "A reserva vinculada não existe.");
  }
  const trocaDeVinculo =
    alteracoes.reservaId !== undefined &&
    (alteracoes.reservaId ?? null) !== (mov.reservaId ?? null);
  if (pago > 0 && trocaDeVinculo) {
    return erro(
      "VINCULO_BLOQUEADO",
      "Não é possível trocar a reserva de uma conta que já recebeu pagamento.",
    );
  }

  const ehConta = mov.tipo === "saida" || mov.tipo === "retirada";
  const novoStatus = ehConta
    ? pago >= novoValor
      ? ("realizado" as const)
      : ("pendente" as const)
    : mov.status;

  const atualizada: Movimentacao = {
    ...mov,
    valor: novoValor,
    data: alteracoes.data ?? mov.data,
    categoriaId: alteracoes.categoriaId ?? mov.categoriaId,
    descricao: alteracoes.descricao !== undefined ? alteracoes.descricao : mov.descricao,
    formaPagamento:
      alteracoes.formaPagamento !== undefined
        ? alteracoes.formaPagamento
        : mov.formaPagamento,
    reservaId: novoReservaId,
    valorPago: mov.valorPago, // histórico preservado
    status: novoStatus,
  };

  return {
    ok: true,
    estado: {
      ...e,
      movimentacoes: e.movimentacoes.map((m) =>
        m.id === movimentacaoId ? atualizada : m,
      ),
    },
  };
}

/* ======================================================================
 * Criação e recebimento (Checkpoint 2 — Entrega 2.0)
 * ==================================================================== */

/**
 * Dados para criar uma movimentação. O `id` é fornecido pelo chamador, para que a
 * operação permaneça pura e determinística (a geração de id fica na borda).
 */
export interface NovaMovimentacao {
  id: string;
  tipo: MovimentacaoTipo;
  valor: Centavos;
  /** "AAAA-MM-DD" — guardada EXATAMENTE como informada (sem conversão de fuso). */
  data: string;
  categoriaId: string;
  status: MovimentacaoStatus;
  formaPagamento?: FormaPagamento | null;
  reservaId?: string | null;
  descricao?: string | null;
}

/**
 * Adiciona uma nova movimentação, validada e atômica.
 *
 * `valorPago` é DERIVADO do `status` (a criação não aceita pagamento parcial — isso
 * é feito depois por `registrarPagamento`, que não é duplicado aqui):
 *   - saída/retirada: `realizado` ⇒ valorPago = valor (quitada); `pendente` ⇒ 0;
 *   - entrada: sem valor pago (usa só `status`).
 *
 * Regras: `id` não-vazio e único; `valor` inteiro > 0; `categoriaId` não-vazio;
 * `data` no formato AAAA-MM-DD (guardada verbatim); `reservaId`, se informado, deve
 * existir e só vale para contas; não cria conta já paga (`realizado`) vinculada a
 * reserva (para usar reserva, crie `pendente` e pague com `registrarPagamento`).
 */
export function adicionarMovimentacao(
  e: EstadoFinanceiro,
  dados: NovaMovimentacao,
): ResultadoOperacao {
  if (typeof dados.id !== "string" || dados.id.trim() === "") {
    return erro("ID_INVALIDO", "A movimentação precisa de um id não-vazio.");
  }
  if (e.movimentacoes.some((m) => m.id === dados.id)) {
    return erro("ID_DUPLICADO", "Já existe uma movimentação com este id.");
  }
  if (!ePositivoInteiro(dados.valor)) {
    return erro("VALOR_INVALIDO", "O valor precisa ser um inteiro positivo em centavos.");
  }
  if (typeof dados.categoriaId !== "string" || dados.categoriaId.trim() === "") {
    return erro("CATEGORIA_INVALIDA", "Informe uma categoria.");
  }
  if (!ehDataValida(dados.data)) {
    return erro(
      "DATA_INVALIDA",
      "Data inválida: use AAAA-MM-DD com dia e mês que existam.",
    );
  }

  const ehConta = dados.tipo === "saida" || dados.tipo === "retirada";

  if (dados.reservaId != null) {
    if (!ehConta) {
      return erro(
        "VINCULO_INVALIDO",
        "Reservas vinculam-se a contas a pagar (saída/retirada), não a entradas.",
      );
    }
    if (!e.reservas.some((r) => r.id === dados.reservaId)) {
      return erro("VINCULO_INVALIDO", "A reserva vinculada não existe.");
    }
    if (dados.status === "realizado") {
      return erro(
        "VINCULO_BLOQUEADO",
        "Para vincular a uma reserva, crie a conta como pendente e registre o pagamento.",
      );
    }
  }

  const nova: Movimentacao = {
    id: dados.id,
    tipo: dados.tipo,
    valor: dados.valor,
    data: dados.data,
    categoriaId: dados.categoriaId,
    status: dados.status,
    valorPago: ehConta ? (dados.status === "realizado" ? dados.valor : 0) : null,
    formaPagamento: dados.formaPagamento ?? null,
    reservaId: dados.reservaId ?? null,
    descricao: dados.descricao ?? null,
  };

  return {
    ok: true,
    estado: { ...e, movimentacoes: [...e.movimentacoes, nova] },
  };
}

/**
 * Marca uma entrada prevista (pendente) como recebida (realizado), passando a
 * contar no saldo real. Atômica e validada.
 */
export function receberEntrada(
  e: EstadoFinanceiro,
  movimentacaoId: string,
): ResultadoOperacao {
  const mov = e.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) {
    return erro("MOVIMENTACAO_INEXISTENTE", "A movimentação informada não existe.");
  }
  if (mov.tipo !== "entrada") {
    return erro(
      "MOVIMENTACAO_NAO_RECEBIVEL",
      "Só entradas podem ser recebidas. Para contas, use o registro de pagamento.",
    );
  }
  if (mov.status !== "pendente") {
    return erro("ENTRADA_JA_RECEBIDA", "Esta entrada já foi recebida.");
  }
  return {
    ok: true,
    estado: {
      ...e,
      movimentacoes: e.movimentacoes.map((m) =>
        m.id === movimentacaoId ? { ...m, status: "realizado" as const } : m,
      ),
    },
  };
}
