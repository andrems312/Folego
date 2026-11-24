import { Icon } from "@/components/ui/icon";

/**
 * Estados de ausência:
 *  - "vazio": não há nenhuma movimentação (conta nova) — convite acolhedor.
 *  - "filtro": há movimentações, mas nenhuma do tipo filtrado — não confundir
 *    com conta sem dados.
 */
export function SemMovimentacoes({ variante }: { variante: "vazio" | "filtro" }) {
  if (variante === "filtro") {
    return (
      <div className="max-w-reading border-t-2 border-line py-10">
        <p className="font-ui text-ink-2">
          Nenhuma movimentação desse tipo por aqui.
        </p>
        <p className="mt-1 font-ui text-sm text-ink-3">
          Troque o filtro para ver o restante.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-reading border-t-2 border-ink py-10">
      <span className="text-ink-2">
        <Icon name="movimentacoes" size={24} />
      </span>
      <h2 className="mt-3 font-display text-xl text-ink">Nada por aqui ainda</h2>
      <p className="mt-2 max-w-reading font-text text-ink-2">
        Quando você registrar entradas e saídas, elas aparecem aqui — as mais
        recentes primeiro, agrupadas por dia.
      </p>
    </div>
  );
}
