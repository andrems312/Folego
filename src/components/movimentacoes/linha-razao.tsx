import { Button } from "@/components/ui/button";
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
 * Ação opcional de recebimento (`onReceber`): quando fornecida pelo contexto
 * (listagem, que já é cliente), a linha oferece "Receber" apenas em entradas
 * previstas. Sem a prop, a linha permanece puramente read-only, como antes. A
 * decisão de quando a ação é válida continua no domínio — aqui só a oferta.
 */
export function LinhaRazao({
  m,
  onReceber,
}: {
  m: Movimentacao;
  onReceber?: (m: Movimentacao) => void;
}) {
  const a = descreverMovimentacao(m);
  const corValor = a.cor === "credit" ? "text-credit" : "text-debit";
  const podeReceber = Boolean(onReceber) && a.status === "previsto";

  const meta = [
    nomeCategoria(m.categoriaId),
    m.formaPagamento ? FORMA_PAGAMENTO_LABEL[m.formaPagamento] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-ui text-ink">{m.descricao ?? a.tipoLabel}</p>
        <p className="mt-0.5 truncate font-ui text-xs text-ink-3">
          <span className="text-ink-2">{a.tipoLabel}</span>
          {meta && ` · ${meta}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("tabular font-text", corValor)}>
          {a.sinal} {formatBRL(m.valor)}
        </p>
        <p className="mt-0.5">
          <StatusTag apresentacao={a} />
        </p>
        {podeReceber && (
          <p className="mt-2">
            <Button
              tamanho="sm"
              variante="secondary"
              onClick={() => onReceber!(m)}
              aria-label={`Receber entrada: ${m.descricao ?? "entrada prevista"}`}
            >
              Receber
            </Button>
          </p>
        )}
      </div>
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
