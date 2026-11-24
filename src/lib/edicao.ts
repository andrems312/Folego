/**
 * Mapeamento PURO do formulário de edição para o domínio.
 *
 * Não duplica regra financeira: só faz parsing monetário de FORMATO (via domínio)
 * e monta um `AlteracoesMovimentacao` com os campos editáveis pela UI (Entrega 2.5
 * / D2): valor, data, categoria, descrição e forma de pagamento. NÃO inclui
 * `reservaId` (vínculo de reserva fica fora desta entrega). As validações de
 * negócio (valor ≥ já pago, data válida, etc.) ficam em `editarMovimentacao`.
 */
import { validarValorMonetario } from "@/domain";
import type { AlteracoesMovimentacao, FormaPagamento } from "@/domain";

export interface CamposEdicao {
  /** Ausente quando o valor NÃO é editável (movimentação totalmente realizada). */
  valorTexto?: string;
  data: string; // "AAAA-MM-DD" (do <input type=date>, sem conversão)
  categoriaId: string;
  descricao: string;
  formaPagamento: FormaPagamento | "";
}

export type ResultadoEdicao =
  | { ok: true; alteracoes: AlteracoesMovimentacao }
  | { ok: false; campo: "valor"; erro: string };

export function construirAlteracoes(campos: CamposEdicao): ResultadoEdicao {
  const descricao = campos.descricao.trim();

  const alteracoes: AlteracoesMovimentacao = {
    data: campos.data,
    categoriaId: campos.categoriaId,
    descricao: descricao === "" ? null : descricao,
    formaPagamento: campos.formaPagamento === "" ? null : campos.formaPagamento,
  };

  // Só envia `valor` quando o campo foi oferecido (não totalmente realizada).
  if (campos.valorTexto !== undefined) {
    const valor = validarValorMonetario(campos.valorTexto);
    if (!valor.ok) return { ok: false, campo: "valor", erro: valor.erro };
    alteracoes.valor = valor.centavos;
  }

  return { ok: true, alteracoes };
}
