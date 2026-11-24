import { formatBRL } from "@/domain";
import type { FormaPagamento, Movimentacao } from "@/domain";
import {
  descreverMovimentacao,
  type ApresentacaoMovimentacao,
} from "@/lib/apresentacao-movimentacao";
import { nomeCategoria } from "@/lib/categorias";
import { cn } from "@/lib/cn";

const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  cartao: "Cartão",
  outro: "Outro",
};

/**
 * Linha de livro-caixa (apresentacional). Cor crédito/débito composta aqui (não
 * no `Money`), status e forma de pagamento conforme os dados disponíveis.
 *
 * Quando o contexto fornece `onAbrir` (listagem, que já é cliente), a linha inteira
 * vira um acionador acessível que abre a folha de detalhe — onde ficam as ações
 * (Receber/Pagar/Editar/Excluir). Sem a prop, a linha permanece read-only.
 */
export function LinhaRazao({
  m,
  onAbrir,
}: {
  m: Movimentacao;
  onAbrir?: (m: Movimentacao) => void;
}) {
  const a = descreverMovimentacao(m);
  const corValor = a.cor === "credit" ? "text-credit" : "text-debit";

  const meta = [
    nomeCategoria(m.categoriaId),
    m.formaPagamento ? FORMA_PAGAMENTO_LABEL[m.formaPagamento] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const conteudo = (
    <>
      <span className="block min-w-0">
        <span className="block truncate font-ui text-ink">
          {m.descricao ?? a.tipoLabel}
        </span>
        <span className="mt-0.5 block truncate font-ui text-xs text-ink-3">
          <span className="text-ink-2">{a.tipoLabel}</span>
          {meta && ` · ${meta}`}
        </span>
      </span>

      <span className="block shrink-0 text-right">
        <span className={cn("block tabular font-text", corValor)}>
          {a.sinal} {formatBRL(m.valor)}
        </span>
        <span className="mt-0.5 block">
          <StatusTag apresentacao={a} />
        </span>
      </span>
    </>
  );

  if (onAbrir) {
    return (
      <li className="border-b border-line last:border-b-0">
        <button
          type="button"
          onClick={() => onAbrir(m)}
          aria-label={`Abrir detalhes: ${m.descricao ?? a.tipoLabel}`}
          className="flex w-full items-baseline justify-between gap-4 rounded-sm py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {conteudo}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      {conteudo}
    </li>
  );
}

function StatusTag({ apresentacao }: { apresentacao: ApresentacaoMovimentacao }) {
  const cor =
    apresentacao.status === "previsto"
      ? "text-forecast"
      : apresentacao.status === "a-pagar" || apresentacao.status === "parcial"
        ? "text-ink-2" // contraste AA nos dois temas (sem mexer no token --committed)
        : "text-ink-3"; // pago / recebido: assentado, discreto

  const texto =
    apresentacao.status === "parcial"
      ? `Parcial · falta ${formatBRL(apresentacao.saldoPendente)}`
      : apresentacao.statusLabel;

  return <span className={cn("font-ui text-xs", cor)}>{texto}</span>;
}
