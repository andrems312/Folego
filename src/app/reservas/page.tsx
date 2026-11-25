import { ListaReservas } from "@/components/reservas/lista-reservas";

/**
 * Reservas — consulta (Entrega 2.7 / Etapa D). Envelopes virtuais dentro do caixa
 * único (DESIGN.md §2.1): dinheiro separado por finalidade, que sai do "Livre pra
 * usar" mas continua sendo do usuário. Criar/abastecer chega nas etapas seguintes.
 */
export default function ReservasPage() {
  return (
    <div className="space-y-6">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Reservas
      </p>
      <ListaReservas />
    </div>
  );
}
