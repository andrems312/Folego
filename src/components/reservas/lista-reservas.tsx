"use client";

import { RecuperacaoDados } from "@/components/financeiro/recuperacao-dados";
import { formatBRL } from "@/domain";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { LinhaReserva } from "./linha-reserva";
import { SemReservas } from "./sem-reservas";

/**
 * Tela de Reservas (leitura). Consome o store: total guardado (`resumo.totalReservas`,
 * derivado pelo domínio — sem recálculo aqui), quantidade e a lista. Trata os estados
 * de carregamento, recuperação (dados inválidos) e indisponibilidade de persistência,
 * no mesmo padrão das demais áreas.
 */
export function ListaReservas() {
  const { status, estado, resumo, aviso, recomecar, persistenciaDisponivel } =
    useFinanceiro();

  if (status === "carregando") return <EsqueletoReservas />;
  if (status === "dados-invalidos") {
    return <RecuperacaoDados aviso={aviso} onRecomecar={recomecar} />;
  }

  const reservas = estado.reservas;
  const n = reservas.length;

  return (
    <section className="space-y-8">
      {!persistenciaDisponivel && aviso && (
        <p className="rounded-sm border border-attention bg-attention-bg px-3 py-2 font-ui text-xs text-ink-2">
          {aviso}
        </p>
      )}

      {n === 0 ? (
        <SemReservas />
      ) : (
        <>
          <div>
            <p className="font-ui text-sm text-ink-2">Guardado em reservas</p>
            <p className="mt-1 font-display text-4xl font-semibold tabular leading-none text-ink sm:text-5xl">
              {formatBRL(resumo.totalReservas)}
            </p>
            <p className="mt-2 font-text text-ink-3">
              {n === 1 ? "1 reserva" : `${n} reservas`} · separado do seu “Livre
              pra usar”, mas continua seu
            </p>
          </div>

          <ul className="border-t border-line-2">
            {reservas.map((r) => (
              <LinhaReserva key={r.id} reserva={r} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function EsqueletoReservas() {
  return (
    <section
      aria-busy="true"
      aria-label="Carregando suas reservas"
      className="space-y-8"
    >
      <div>
        <div className="h-4 w-40 rounded-sm bg-surface-2" />
        <div className="mt-2 h-12 w-56 max-w-full rounded-sm bg-surface-2" />
      </div>
      <div className="space-y-4 border-t border-line-2 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-32 rounded-sm bg-surface-2" />
              <div className="h-4 w-20 rounded-sm bg-surface-2" />
            </div>
            <div className="h-1 w-full rounded-pill bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
