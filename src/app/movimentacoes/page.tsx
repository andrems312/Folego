import { ListaMovimentacoes } from "@/components/movimentacoes/lista-movimentacoes";

/**
 * Movimentações — livro-caixa visual, somente consulta. A lista consome o store
 * financeiro (ver `ListaMovimentacoes`).
 */
export default function MovimentacoesPage() {
  return (
    <div className="space-y-8">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Movimentações
      </p>
      <ListaMovimentacoes />
    </div>
  );
}
