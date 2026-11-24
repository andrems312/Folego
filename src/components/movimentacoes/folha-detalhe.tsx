"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { afetouSaldoReal, formatBRL } from "@/domain";
import type { FormaPagamento, Movimentacao } from "@/domain";
import { descreverMovimentacao } from "@/lib/apresentacao-movimentacao";
import { nomeCategoria } from "@/lib/categorias";
import { cn } from "@/lib/cn";
import { diaDaSemana, formatarDataLonga } from "@/lib/formato-data";

const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  cartao: "Cartão",
  outro: "Outro",
};

/**
 * Folha de detalhe de uma movimentação: consolida informações e ações.
 *
 * Não executa operação nem contém regra de negócio — apenas apresenta os dados
 * (via helpers do domínio/apresentação) e oferece as ações elegíveis, delegando a
 * execução às folhas já existentes (Receber/Pagar/Editar/Excluir) por meio dos
 * callbacks. A elegibilidade usa as mesmas fontes de verdade das etapas anteriores:
 * `descreverMovimentacao` (status) e `afetouSaldoReal` (domínio).
 */
export function FolhaDetalhe({
  movimentacao,
  onFechar,
  onReceber,
  onPagar,
  onEditar,
  onExcluir,
}: {
  movimentacao: Movimentacao | null;
  onFechar: () => void;
  onReceber: (m: Movimentacao) => void;
  onPagar: (m: Movimentacao) => void;
  onEditar: (m: Movimentacao) => void;
  onExcluir: (m: Movimentacao) => void;
}) {
  return (
    <Sheet
      aberto={movimentacao != null}
      onFechar={onFechar}
      titulo="Detalhes do lançamento"
    >
      {movimentacao && (
        <DetalheMovimentacao
          m={movimentacao}
          onReceber={onReceber}
          onPagar={onPagar}
          onEditar={onEditar}
          onExcluir={onExcluir}
        />
      )}
    </Sheet>
  );
}

function DetalheMovimentacao({
  m,
  onReceber,
  onPagar,
  onEditar,
  onExcluir,
}: {
  m: Movimentacao;
  onReceber: (m: Movimentacao) => void;
  onPagar: (m: Movimentacao) => void;
  onEditar: (m: Movimentacao) => void;
  onExcluir: (m: Movimentacao) => void;
}) {
  const a = descreverMovimentacao(m);
  const podeReceber = a.status === "previsto";
  const podePagar = a.status === "a-pagar" || a.status === "parcial";
  const podeExcluir = !afetouSaldoReal(m);
  const corValor = a.cor === "credit" ? "text-credit" : "text-debit";
  const situacao =
    a.status === "parcial"
      ? `Parcial · falta ${formatBRL(a.saldoPendente)}`
      : a.statusLabel;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="font-ui text-sm text-ink-2">Valor</span>
        <span className={cn("tabular font-text text-xl", corValor)}>
          {a.sinal} {formatBRL(m.valor)}
        </span>
      </div>

      <dl className="space-y-2 font-ui text-sm">
        <LinhaInfo rotulo="Tipo" valor={a.tipoLabel} />
        <LinhaInfo rotulo="Situação" valor={situacao} />
        <LinhaInfo
          rotulo="Data"
          valor={`${diaDaSemana(m.data)}, ${formatarDataLonga(m.data)}`}
        />
        <LinhaInfo rotulo="Categoria" valor={nomeCategoria(m.categoriaId)} />
        <LinhaInfo rotulo="Descrição" valor={m.descricao ?? "—"} />
        <LinhaInfo
          rotulo="Forma de pagamento"
          valor={m.formaPagamento ? FORMA_LABEL[m.formaPagamento] : "—"}
        />
      </dl>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {podeReceber && (
          <Button type="button" onClick={() => onReceber(m)}>
            Receber
          </Button>
        )}
        {podePagar && (
          <Button type="button" onClick={() => onPagar(m)}>
            Pagar
          </Button>
        )}
        <Button variante="secondary" type="button" onClick={() => onEditar(m)}>
          Editar
        </Button>
        {podeExcluir && (
          <Button variante="danger" type="button" onClick={() => onExcluir(m)}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-2">{rotulo}</dt>
      <dd className="min-w-0 text-right text-ink">{valor}</dd>
    </div>
  );
}
