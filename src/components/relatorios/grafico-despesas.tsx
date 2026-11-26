"use client";

import { useId } from "react";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/domain";
import type { Centavos } from "@/domain";
import type { DespesaCategoria } from "@/lib/relatorio";
import { barrasDespesas, larguraBarraPct } from "@/lib/relatorio-grafico";

/**
 * Gráfico de despesas pagas por categoria (Entrega 2.8 / Etapa C).
 *
 * Barras horizontais em SVG inline, sem dependências. NENHUM cálculo aqui: consome
 * `despesasPorCategoria`/`totalDespesasPagas` do helper (Etapa A). Só despesas
 * efetivamente PAGAS (nunca pendentes); retiradas já ficam de fora do agregado.
 * Cor por entidade (§4.2, tokens `--cat-1..6`); rótulo direto em cada barra, então
 * a identificação não depende de cor e dispensa legenda. Os nomes e valores são
 * texto HTML (legíveis, acessíveis); a barra é reforço visual (`aria-hidden`).
 */
export function GraficoDespesas({
  despesas,
  total,
}: {
  despesas: DespesaCategoria[];
  total: Centavos;
}) {
  const tituloId = useId();
  const descricaoId = useId();

  if (despesas.length === 0 || total <= 0) {
    return (
      <section className="max-w-reading border-t border-line pt-4">
        <h2 className="font-ui text-sm text-ink-2">Para onde o dinheiro foi</h2>
        <p className="mt-2 font-text text-ink-3">
          Não há despesas pagas neste período para detalhar por categoria.
        </p>
      </section>
    );
  }

  const barras = barrasDespesas(despesas);
  const descricao = `Despesas pagas por categoria no período, da maior para a menor. Total de ${formatBRL(
    total,
  )} em ${barras.length} ${barras.length === 1 ? "categoria" : "categorias"}.`;

  return (
    <figure
      aria-labelledby={tituloId}
      aria-describedby={descricaoId}
      className="max-w-reading space-y-4 border-t border-line pt-4"
    >
      <figcaption className="flex items-baseline justify-between gap-4">
        <span id={tituloId} className="font-ui text-sm text-ink-2">
          Para onde o dinheiro foi
        </span>
        <span className="text-right">
          <span className="block font-ui text-xs text-ink-3">Despesas pagas</span>
          <Money value={total} estado="real" className="text-sm" />
        </span>
      </figcaption>

      <p id={descricaoId} className="sr-only">
        {descricao}
      </p>

      <ul className="space-y-3">
        {barras.map((b) => {
          const largura = larguraBarraPct(b.fracao);
          return (
            <li key={b.categoriaId} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-ui text-sm text-ink">
                  {b.nome}
                  {b.quantidade > 0 && (
                    <span className="text-ink-3">
                      {" "}
                      · {b.quantidade}{" "}
                      {b.quantidade === 1 ? "lançamento" : "lançamentos"}
                    </span>
                  )}
                </span>
                <Money value={b.total} estado="real" className="shrink-0 text-sm" />
              </div>
              <svg
                width="100%"
                height="12"
                aria-hidden="true"
                className="block overflow-visible"
              >
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="12"
                  rx="2"
                  style={{ fill: "var(--surface-2)" }}
                />
                <rect
                  x="0"
                  y="0"
                  width={`${largura}%`}
                  height="12"
                  rx="2"
                  style={{ fill: `var(--cat-${b.corSlot})` }}
                />
              </svg>
            </li>
          );
        })}
      </ul>

      <p className="font-ui text-xs text-ink-3">
        Considera só o que já foi pago no período; contas a pagar não entram aqui.
      </p>
    </figure>
  );
}
