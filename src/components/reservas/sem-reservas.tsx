import { Button } from "@/components/ui/button";

/**
 * Estado vazio de Reservas — explica a finalidade no tom do Fôlego e oferece a
 * criação da primeira reserva (quando o store está pronto, via `onCriar`).
 */
export function SemReservas({ onCriar }: { onCriar?: () => void }) {
  return (
    <div className="max-w-reading border-t-2 border-ink pt-6">
      <h2 className="font-display text-2xl text-ink">
        Separe dinheiro sem tirar do caixa
      </h2>
      <p className="mt-2 font-text text-ink-2">
        Reservas são envelopes dentro do seu caixa: você separa uma parte para uma
        finalidade — impostos, uma folga, uma ferramenta — sem tirá-la da conta. O
        que está reservado sai do “Livre pra usar”, mas continua sendo seu.
      </p>
      {onCriar && (
        <div className="mt-6">
          <Button type="button" onClick={onCriar}>
            Criar primeira reserva
          </Button>
        </div>
      )}
    </div>
  );
}
