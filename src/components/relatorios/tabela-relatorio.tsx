"use client";

import { useId, useState } from "react";
import { formatBRL } from "@/domain";
import type { Centavos } from "@/domain";
import { cn } from "@/lib/cn";
import { formatarDataCurta } from "@/lib/formato-data";
import type { LinhaRelatorio } from "@/lib/relatorio-tabela";

/**
 * Tabela detalhada dos lançamentos do período (Entrega 2.8 / Etapa D).
 *
 * Rastreabilidade do resumo/gráfico: cada registro, com realizado e pendente
 * vindos dos helpers do domínio (via `linhasDoPeriodo`). NENHUM cálculo aqui.
 * Fica recolhida num `<details>` para não competir com o resumo e o gráfico.
 * Responsiva: `<table>` semântica no desktop, listagem compacta no mobile — sem
 * scroll horizontal. Não há totalizador: somar entradas, saídas e retiradas numa
 * única linha seria incoerente; os totais coerentes ficam no resumo acima.
 */
export function TabelaRelatorio({ linhas }: { linhas: LinhaRelatorio[] }) {
  const tituloId = useId();
  const [aberto, setAberto] = useState(false);

  if (linhas.length === 0) {
    return (
      <section
        aria-labelledby={tituloId}
        className="max-w-reading border-t border-line pt-4"
      >
        <h2 id={tituloId} className="font-ui text-sm text-ink-2">
          Lançamentos do período
        </h2>
        <p className="mt-2 font-text text-ink-3">
          Nenhum lançamento no período selecionado.
        </p>
      </section>
    );
  }

  const n = linhas.length;

  return (
    <section aria-labelledby={tituloId} className="border-t border-line pt-4">
      <details
        className="group"
        onToggle={(e) => setAberto((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span id={tituloId} className="font-ui text-sm text-ink-2">
            Lançamentos do período
          </span>
          <span className="font-ui text-xs text-ink-3">
            · {n} {n === 1 ? "lançamento" : "lançamentos"}
          </span>
          <span
            aria-hidden="true"
            className="ml-auto font-ui text-xs text-forecast"
          >
            <span className="group-open:hidden">mostrar</span>
            <span className="hidden group-open:inline">ocultar</span>
          </span>
        </summary>

        {aberto && (
          <>
        {/* Desktop: tabela semântica com cabeçalho fixo e zebra. */}
        <table className="mt-4 hidden w-full border-collapse text-left sm:table">
          <caption className="sr-only">
            Lançamentos do período, do mais recente ao mais antigo, com valor
            realizado e pendente de cada um.
          </caption>
          <thead>
            <tr className="border-b border-line-2">
              <Th>Data</Th>
              <Th>Descrição</Th>
              <Th>Tipo</Th>
              <Th>Categoria</Th>
              <Th alinhar="direita">Realizado</Th>
              <Th alinhar="direita">Pendente</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-line even:bg-surface">
                <td className="tabular whitespace-nowrap py-2 pr-3 align-top font-ui text-sm text-ink-2">
                  {formatarDataCurta(l.data)}
                </td>
                <td className="py-2 pr-3 align-top font-ui text-sm text-ink">
                  {l.descricao}
                </td>
                <td className="py-2 pr-3 align-top font-ui text-sm text-ink-2">
                  {l.tipoLabel}
                </td>
                <td className="py-2 pr-3 align-top font-ui text-sm text-ink-2">
                  {l.categoria}
                </td>
                <td className="py-2 pl-3 text-right align-top">
                  <Realizado valor={l.realizado} cor={l.cor} sinal={l.sinal} />
                </td>
                <td className="py-2 pl-3 text-right align-top">
                  <Pendente valor={l.pendente} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile: listagem compacta (mesmos dados, sem scroll horizontal). */}
        <ul className="mt-4 sm:hidden">
          {linhas.map((l) => (
            <li key={l.id} className="border-b border-line py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-ui text-sm text-ink">
                  {l.descricao}
                </span>
                <span className="shrink-0">
                  <Realizado valor={l.realizado} cor={l.cor} sinal={l.sinal} />
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 font-ui text-xs text-ink-3">
                <span className="min-w-0 truncate">
                  {l.tipoLabel} · {l.categoria} · {formatarDataCurta(l.data)}
                </span>
                {l.pendente > 0 && (
                  <span className="shrink-0 text-ink-2">
                    Pendente {formatBRL(l.pendente)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
          </>
        )}
      </details>
    </section>
  );
}

function Th({
  children,
  alinhar,
}: {
  children: React.ReactNode;
  alinhar?: "direita";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 bg-paper py-2 font-ui text-xs font-medium uppercase tracking-[0.08em] text-ink-3",
        alinhar === "direita" ? "pl-3 text-right" : "pr-3 text-left",
      )}
    >
      {children}
    </th>
  );
}

function Realizado({
  valor,
  cor,
  sinal,
}: {
  valor: Centavos;
  cor: "credit" | "debit";
  sinal: "+" | "−";
}) {
  if (valor === 0) {
    return (
      <span className="tabular font-text text-sm text-ink-3" aria-label="nada realizado">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "tabular font-text text-sm",
        cor === "credit" ? "text-credit" : "text-debit",
      )}
    >
      {sinal} {formatBRL(valor)}
    </span>
  );
}

function Pendente({ valor }: { valor: Centavos }) {
  if (valor === 0) {
    return (
      <span className="tabular font-text text-sm text-ink-3" aria-label="nada pendente">
        —
      </span>
    );
  }
  return <span className="tabular font-text text-sm text-ink-2">{formatBRL(valor)}</span>;
}
