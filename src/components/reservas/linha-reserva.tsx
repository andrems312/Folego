import { formatBRL } from "@/domain";
import type { Reserva } from "@/domain";
import { resumoReserva } from "@/lib/reserva";

/**
 * Linha de reserva no estilo livro-caixa: nome à esquerda, saldo à direita. Quando
 * há meta, uma barra fina de progresso (a cor reforça; o texto "falta R$ X" carrega
 * o sentido) e o restante; sem meta, só o saldo — nenhum percentual inventado.
 */
export function LinhaReserva({ reserva }: { reserva: Reserva }) {
  const r = resumoReserva(reserva);

  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate font-ui text-ink">{reserva.nome}</p>
        <p className="shrink-0 tabular font-text text-ink">
          {formatBRL(reserva.saldoAtual)}
        </p>
      </div>

      {r.temMeta ? (
        <div className="mt-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={r.percentual}
            aria-label={`Progresso da reserva ${reserva.nome}`}
            className="h-1 w-full overflow-hidden rounded-pill bg-surface-2"
          >
            <div
              className="h-full rounded-pill bg-credit"
              style={{ width: `${r.percentual}%` }}
            />
          </div>
          <p className="mt-1.5 font-ui text-xs text-ink-3">
            {r.atingida
              ? `Meta de ${formatBRL(r.meta)} alcançada.`
              : `Meta de ${formatBRL(r.meta)} — falta ${formatBRL(r.restante)}`}
          </p>
        </div>
      ) : (
        <p className="mt-1.5 font-ui text-xs text-ink-3">Sem meta definida.</p>
      )}
    </li>
  );
}
