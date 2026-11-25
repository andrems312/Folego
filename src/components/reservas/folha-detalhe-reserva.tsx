"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatBRL } from "@/domain";
import type { Reserva } from "@/domain";
import { resumoReserva } from "@/lib/reserva";

/**
 * Folha de detalhe de uma reserva: consolida informações e ações (Guardar, Resgatar,
 * Editar, Excluir). Não executa operação — delega às folhas correspondentes pelos
 * callbacks (fecha o detalhe e abre a ação), no mesmo padrão do detalhe de movimentações.
 */
export function FolhaDetalheReserva({
  reserva,
  onFechar,
  onGuardar,
  onResgatar,
  onEditar,
  onExcluir,
}: {
  reserva: Reserva | null;
  onFechar: () => void;
  onGuardar: (r: Reserva) => void;
  onResgatar: (r: Reserva) => void;
  onEditar: (r: Reserva) => void;
  onExcluir: (r: Reserva) => void;
}) {
  return (
    <Sheet aberto={reserva != null} onFechar={onFechar} titulo="Detalhes da reserva">
      {reserva && (
        <DetalheReserva
          reserva={reserva}
          onGuardar={onGuardar}
          onResgatar={onResgatar}
          onEditar={onEditar}
          onExcluir={onExcluir}
        />
      )}
    </Sheet>
  );
}

function DetalheReserva({
  reserva,
  onGuardar,
  onResgatar,
  onEditar,
  onExcluir,
}: {
  reserva: Reserva;
  onGuardar: (r: Reserva) => void;
  onResgatar: (r: Reserva) => void;
  onEditar: (r: Reserva) => void;
  onExcluir: (r: Reserva) => void;
}) {
  const r = resumoReserva(reserva);
  const podeResgatar = reserva.saldoAtual > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <span className="min-w-0 truncate font-ui text-ink">{reserva.nome}</span>
        <span className="shrink-0 tabular font-text text-xl text-ink">
          {formatBRL(reserva.saldoAtual)}
        </span>
      </div>

      {r.temMeta ? (
        <div>
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
        <p className="font-ui text-xs text-ink-3">Sem meta definida.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button type="button" onClick={() => onGuardar(reserva)}>
          Guardar
        </Button>
        {podeResgatar && (
          <Button variante="secondary" type="button" onClick={() => onResgatar(reserva)}>
            Resgatar
          </Button>
        )}
        <Button variante="secondary" type="button" onClick={() => onEditar(reserva)}>
          Editar
        </Button>
        <Button variante="danger" type="button" onClick={() => onExcluir(reserva)}>
          Excluir
        </Button>
      </div>
    </div>
  );
}
