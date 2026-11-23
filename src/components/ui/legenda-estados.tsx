import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Legenda das quatro naturezas de dinheiro (DESIGN.md §3). A FORMA é a chave;
 * a cor só reforça. Aparece onde estados se misturam (Pulso, Previsão, relatórios).
 */
const itens = [
  { nome: "Saldo real", desc: "já é seu" },
  { nome: "Comprometido", desc: "já tem dono" },
  { nome: "Previsto", desc: "ainda vai entrar" },
  { nome: "Risco", desc: "aperto à vista" },
] as const;

function Marca({ tipo }: { tipo: (typeof itens)[number]["nome"] }) {
  if (tipo === "Saldo real") {
    return <span className="h-3 w-3 rounded-full bg-ink" aria-hidden />;
  }
  if (tipo === "Comprometido") {
    return (
      <span
        className="pattern-committed h-3 w-3 rounded-[1px] border border-committed"
        aria-hidden
      />
    );
  }
  if (tipo === "Previsto") {
    return (
      <span
        className="h-3 w-3 rounded-full border border-dashed border-forecast"
        aria-hidden
      />
    );
  }
  return <Icon name="alerta" size={14} className="text-risk" />;
}

export function LegendaEstados({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-5 gap-y-2 font-ui text-xs text-ink-2",
        className,
      )}
    >
      {itens.map((i) => (
        <li key={i.nome} className="inline-flex items-center gap-2">
          <Marca tipo={i.nome} />
          <span>
            <span className="font-medium text-ink">{i.nome}</span>
            <span className="text-ink-3"> — {i.desc}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
