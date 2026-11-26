"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export type ModoPeriodo = "este-mes" | "mes-passado" | "personalizado";

const OPCOES: { valor: ModoPeriodo; rotulo: string }[] = [
  { valor: "este-mes", rotulo: "Este mês" },
  { valor: "mes-passado", rotulo: "Mês passado" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

/**
 * Seletor de período dos Relatórios. Segmentado acessível (mesmo padrão do
 * `SeletorHorizonte`: `role="group"` + `aria-pressed`), reativo e sem reload. No
 * modo "Personalizado" revela dois campos de data nativos (`type="date"`), que já
 * produzem o formato `AAAA-MM-DD` e são navegáveis por teclado.
 */
export function SeletorPeriodo({
  modo,
  onModo,
  inicio,
  fim,
  onInicio,
  onFim,
  invalido,
}: {
  modo: ModoPeriodo;
  onModo: (m: ModoPeriodo) => void;
  inicio: string;
  fim: string;
  onInicio: (v: string) => void;
  onFim: (v: string) => void;
  invalido: boolean;
}) {
  const idInicio = useId();
  const idFim = useId();
  const idErro = useId();

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Período do relatório"
        className="inline-flex flex-wrap gap-1 rounded-sm border border-line p-1"
      >
        {OPCOES.map((o) => {
          const ativo = o.valor === modo;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => onModo(o.valor)}
              className={cn(
                "rounded-sm px-3 py-1.5 font-ui text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                ativo
                  ? "bg-ink text-ink-inverse"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>

      {modo === "personalizado" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={idInicio} className="font-ui text-xs text-ink-2">
              Início
            </label>
            <input
              id={idInicio}
              type="date"
              value={inicio}
              onChange={(e) => onInicio(e.target.value)}
              aria-invalid={invalido}
              aria-describedby={invalido ? idErro : undefined}
              className={cn(
                "tabular rounded-sm border bg-surface px-3 py-1.5 font-ui text-sm text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                invalido ? "border-risk" : "border-line",
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={idFim} className="font-ui text-xs text-ink-2">
              Fim
            </label>
            <input
              id={idFim}
              type="date"
              value={fim}
              onChange={(e) => onFim(e.target.value)}
              aria-invalid={invalido}
              aria-describedby={invalido ? idErro : undefined}
              className={cn(
                "tabular rounded-sm border bg-surface px-3 py-1.5 font-ui text-sm text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                invalido ? "border-risk" : "border-line",
              )}
            />
          </div>
          {invalido && (
            <p id={idErro} role="alert" className="font-ui text-xs text-risk">
              A data de início precisa ser igual ou anterior à data de fim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
