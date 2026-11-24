"use client";

import { useMemo, useState } from "react";
import { RecuperacaoDados } from "@/components/financeiro/recuperacao-dados";
import { diaDaSemana, formatarDataLonga } from "@/lib/formato-data";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { prepararMovimentacoes, type FiltroTipo } from "@/state/selectors";
import { FiltroTipoMovimentacao } from "./filtro-tipo";
import { LinhaRazao } from "./linha-razao";
import { SemMovimentacoes } from "./sem-movimentacoes";

/**
 * Lista de movimentações (read-only), consumindo exclusivamente o store.
 * Reage ao filtro sem reload; trata carregamento, recuperação, vazio e
 * filtro-sem-resultados.
 */
export function ListaMovimentacoes() {
  const { status, estado, aviso, recomecar } = useFinanceiro();
  const [filtro, setFiltro] = useState<FiltroTipo>("todas");

  const grupos = useMemo(
    () => prepararMovimentacoes(estado.movimentacoes, filtro),
    [estado.movimentacoes, filtro],
  );

  if (status === "carregando") return <EsqueletoLista />;
  if (status === "dados-invalidos") {
    return <RecuperacaoDados aviso={aviso} onRecomecar={recomecar} />;
  }

  const semNenhuma = estado.movimentacoes.length === 0;

  return (
    <div className="space-y-6">
      <FiltroTipoMovimentacao valor={filtro} onChange={setFiltro} />

      {semNenhuma ? (
        <SemMovimentacoes variante="vazio" />
      ) : grupos.length === 0 ? (
        <SemMovimentacoes variante="filtro" />
      ) : (
        <div className="space-y-8">
          {grupos.map((g) => (
            <section key={g.data}>
              <h2 className="mb-1 font-ui text-xs uppercase tracking-[0.1em] text-ink-3">
                <span className="text-ink-2">{diaDaSemana(g.data)}</span>
                {" · "}
                {formatarDataLonga(g.data)}
              </h2>
              <ul className="border-t border-line-2">
                {g.movimentacoes.map((m) => (
                  <LinhaRazao key={m.id} m={m} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EsqueletoLista() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Carregando movimentações"
    >
      <div className="h-9 w-72 max-w-full rounded-sm bg-surface-2" />
      <div className="space-y-4 border-t border-line-2 pt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-4 w-40 max-w-[55%] rounded-sm bg-surface-2" />
            <div className="h-4 w-24 shrink-0 rounded-sm bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
