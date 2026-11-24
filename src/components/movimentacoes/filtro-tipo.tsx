import { cn } from "@/lib/cn";
import type { FiltroTipo } from "@/state/selectors";

const OPCOES: { valor: FiltroTipo; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "entrada", rotulo: "Entradas" },
  { valor: "saida", rotulo: "Saídas" },
  { valor: "retirada", rotulo: "Retiradas" },
];

/** Filtro por tipo (controlado). Reativo, sem reload. */
export function FiltroTipoMovimentacao({
  valor,
  onChange,
}: {
  valor: FiltroTipo;
  onChange: (valor: FiltroTipo) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar por tipo"
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
