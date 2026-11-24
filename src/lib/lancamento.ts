/**
 * Mapeamento PURO do formulário de lançamento para o domínio.
 *
 * Não duplica regra financeira: só faz parsing monetário (via domínio) e monta o
 * `Omit<NovaMovimentacao, "id">`. Toda validação de negócio fica em
 * `adicionarMovimentacao`; o id é gerado na store. Vínculo a reserva é adiado.
 */
import { validarValorMonetario } from "@/domain";
import type {
  FormaPagamento,
  MovimentacaoStatus,
  MovimentacaoTipo,
  NovaMovimentacao,
} from "@/domain";

export interface CamposLancamento {
  tipo: MovimentacaoTipo;
  valorTexto: string;
  data: string; // "AAAA-MM-DD" (vinda do <input type=date>, sem conversão)
  categoriaId: string;
  status: MovimentacaoStatus;
  descricao: string;
  formaPagamento: FormaPagamento | "";
}

export type ResultadoConstrucao =
  | { ok: true; dados: Omit<NovaMovimentacao, "id"> }
  | { ok: false; campo: "valor"; erro: string };

export function construirNovaMovimentacao(
  campos: CamposLancamento,
): ResultadoConstrucao {
  const valor = validarValorMonetario(campos.valorTexto);
  if (!valor.ok) return { ok: false, campo: "valor", erro: valor.erro };

  const descricao = campos.descricao.trim();

  return {
    ok: true,
    dados: {
      tipo: campos.tipo,
      valor: valor.centavos,
      data: campos.data,
      categoriaId: campos.categoriaId,
      status: campos.status,
      descricao: descricao === "" ? null : descricao,
      formaPagamento: campos.formaPagamento === "" ? null : campos.formaPagamento,
    },
  };
}

/**
 * Guarda síncrona contra envio duplicado. Enquanto um envio está "em andamento",
 * novas tentativas são ignoradas sem executar a ação. Em caso de erro a guarda é
 * liberada (permite nova tentativa); em caso de sucesso permanece travada (a
 * folha fecha/desmonta em seguida).
 */
export interface GuardaEnvio {
  tentar(acao: () => boolean): "sucesso" | "erro" | "ignorado";
  emAndamento(): boolean;
}

export function criarGuardaEnvio(): GuardaEnvio {
  let ativo = false;
  return {
    tentar(acao) {
      if (ativo) return "ignorado";
      ativo = true;
      const ok = acao();
      if (!ok) {
        ativo = false;
        return "erro";
      }
      return "sucesso";
    },
    emAndamento() {
      return ativo;
    },
  };
}

/** Mensagem amigável para um código de erro de ação/domínio. */
export function mensagemDeErro(codigo: string): string {
  switch (codigo) {
    case "VALOR_INVALIDO":
      return "Informe um valor maior que zero.";
    case "CATEGORIA_INVALIDA":
      return "Escolha uma categoria.";
    case "DATA_INVALIDA":
      return "Escolha uma data válida.";
    case "ESTADO_NAO_PRONTO":
      return "Ainda estamos carregando seus dados. Tente de novo em instantes.";
    case "ID_DUPLICADO":
    case "ID_INVALIDO":
      return "Não foi possível salvar. Tente de novo.";
    // Recebimento e pagamento (Entrega 2.4) — erros reais de `receberEntrada`
    // e `registrarPagamento`. A regra vive no domínio; aqui só a apresentação.
    case "MOVIMENTACAO_INEXISTENTE":
      return "Não encontramos essa movimentação. Atualize a página e tente de novo.";
    case "MOVIMENTACAO_NAO_RECEBIVEL":
      return "Só entradas podem ser recebidas. Para contas, registre um pagamento.";
    case "ENTRADA_JA_RECEBIDA":
      return "Essa entrada já foi recebida.";
    case "MOVIMENTACAO_NAO_PAGAVEL":
      return "Só contas (saída ou retirada) podem ser pagas.";
    case "CONTA_JA_QUITADA":
      return "Essa conta já está totalmente paga.";
    case "VALOR_ACIMA_DO_PENDENTE":
      return "O valor é maior do que falta pagar nessa conta.";
    case "VINCULO_INVALIDO":
      return "A reserva vinculada a essa conta não existe mais. Revise o vínculo e tente de novo.";
    // Edição e exclusão (Entrega 2.5) — erros reais de `editarMovimentacao` e
    // `excluirMovimentacao`. A regra vive no domínio; aqui só a apresentação.
    case "MOVIMENTACAO_COM_PAGAMENTO":
      return "Essa movimentação já mexeu no seu saldo e não pode ser excluída. Se precisar, você pode editá-la.";
    case "VALOR_ABAIXO_DO_PAGO":
      return "O novo valor não pode ser menor do que você já pagou nessa conta.";
    case "VINCULO_BLOQUEADO":
      return "Não dá para trocar a reserva de uma conta que já teve pagamento.";
    default:
      return "Não foi possível salvar o lançamento. Confira os dados e tente de novo.";
  }
}
