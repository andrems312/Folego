import { formatBRL } from "@/domain";
import type { Reserva } from "@/domain";
import { resumoReserva } from "@/lib/reserva";

/**
 * Linha de reserva no estilo livro-caixa: nome à esquerda, saldo à direita. Quando
 * há meta, uma barra fina de progresso (a cor reforça; o texto "falta R$ X" carrega
 * o sentido) e o restante; sem meta, só o saldo — nenhum percentual inventado.
 *
 * Com `onAbrir` (listagem, já cliente), a linha vira um acionador acessível que abre
 * a folha de detalhe (onde ficam Guardar/Resgatar/Editar/Excluir). Sem a prop,
 * permanece read-only.
 */
export function LinhaReserva({
  reserva,
  onAbrir,
}: {
  reserva: Reserva;
  onAbrir?: (reserva: Reserva) => void;
}) {
  const r = resumoReserva(reserva);

  const conteudo = (
    <>
      <span className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 truncate font-ui text-ink">{reserva.nome}</span>
        <span className="shrink-0 tabular font-text text-ink">
          {formatBRL(reserva.saldoAtual)}
        </span>
      </span>

      {r.temMeta ? (
        <span className="mt-2 block">
          <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={r.percentual}
            aria-label={`Progresso da reserva ${reserva.nome}`}
            className="block h-1 w-full overflow-hidden rounded-pill bg-surface-2"
          >
            <span
              className="block h-full rounded-pill bg-credit"
              style={{ width: `${r.percentual}%` }}
            />
          </span>
          <span className="mt-1.5 block font-ui text-xs text-ink-3">
            {r.atingida
              ? `Meta de ${formatBRL(r.meta)} alcançada.`
              : `Meta de ${formatBRL(r.meta)} — falta ${formatBRL(r.restante)}`}
          </span>
        </span>
      ) : (
        <span className="mt-1.5 block font-ui text-xs text-ink-3">
          Sem meta definida.
        </span>
      )}
    </>
  );

  if (onAbrir) {
    return (
      <li className="border-b border-line last:border-b-0">
        <button
          type="button"
          onClick={() => onAbrir(reserva)}
          aria-label={`Abrir reserva: ${reserva.nome}`}
          className="block w-full rounded-sm py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {conteudo}
        </button>
      </li>
    );
  }

  return (
    <li className="block border-b border-line py-4 last:border-b-0">{conteudo}</li>
  );
}
