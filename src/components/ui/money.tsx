import { formatBRL } from "@/domain";
import type { Centavos } from "@/domain";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Exibe um valor monetário comunicando o TIPO de dinheiro sem depender só de cor
 * (DESIGN.md §3 — regra inegociável):
 *   - real:      sólido, cheio.
 *   - committed: cor própria + ícone de cadeado (está na conta, mas tem dono).
 *   - forecast:  contorno tracejado + marcador oco + itálico (ainda não entrou).
 * Cada estado não-real também carrega um rótulo para leitores de tela.
 */
export type EstadoDinheiro = "real" | "committed" | "forecast";

const rotuloEstado: Record<EstadoDinheiro, string> = {
  real: "",
  committed: "comprometido",
  forecast: "previsto",
};

const corEstado: Record<EstadoDinheiro, string> = {
  real: "text-ink",
  committed: "text-committed",
  forecast: "text-forecast",
};

export interface MoneyProps {
  value: Centavos;
  estado?: EstadoDinheiro;
  /** Prefixo de sinal explícito para linhas de razão. */
  sinal?: "+" | "−";
  className?: string;
}

export function Money({ value, estado = "real", sinal, className }: MoneyProps) {
  const texto = `${sinal ? `${sinal} ` : ""}${formatBRL(value)}`;
  const rotulo = rotuloEstado[estado];

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 font-text",
        corEstado[estado],
        className,
      )}
    >
      {estado === "committed" && (
        <Icon name="lock" size={14} className="shrink-0 opacity-80" />
      )}
      {estado === "forecast" && (
        <span aria-hidden="true" className="opacity-70">
          ◌
        </span>
      )}
      <span
        className={cn(
          estado === "forecast" &&
            "border-b border-dashed border-forecast italic",
        )}
      >
        {texto}
      </span>
      {rotulo && <span className="sr-only"> ({rotulo})</span>}
    </span>
  );
}
