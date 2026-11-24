"use client";

import type { HorizontePulso } from "@/domain";
import { cn } from "@/lib/cn";

const OPCOES: { valor: HorizontePulso; rotulo: string }[] = [
  { valor: 7, rotulo: "7 dias" },
  { valor: 15, rotulo: "15 dias" },
  { valor: 30, rotulo: "30 dias" },
];

/**
 * Alternância de horizonte (7/15/30), acessível (mesmo padrão do `Segmented`:
 * `role="group"` + `aria-pressed`). Reativo, sem reload; não persiste a escolha.
 */
export function SeletorHorizonte({
  valor,
  onChange,
}: {
  valor: HorizontePulso;
  onChange: (v: HorizontePulso) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Horizonte da previsão"
      className="inline-flex flex-wrap gap-1 rounded-sm border border-line p-1"
    >
      {OPCOES.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(o.valor)}
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
  );
}
