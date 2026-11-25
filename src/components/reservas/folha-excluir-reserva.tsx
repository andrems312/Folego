"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/domain";
import type { Reserva } from "@/domain";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes } from "@/state/estado-financeiro-provider";

/**
 * Confirmação de exclusão de reserva. Consome `acoes.excluirReserva`. Se houver
 * saldo, avisa que o valor volta ao "Livre pra usar". Se houver conta vinculada, o
 * domínio bloqueia (`RESERVA_COM_VINCULO`) e a mensagem aparece aqui, sem excluir.
 */
export function FolhaExcluirReserva({
  reserva,
  onFechar,
}: {
  reserva: Reserva | null;
  onFechar: () => void;
}) {
  return (
    <Sheet aberto={reserva != null} onFechar={onFechar} titulo="Excluir reserva">
      {reserva && <ConfirmacaoExclusao reserva={reserva} onSucesso={onFechar} />}
    </Sheet>
  );
}

function ConfirmacaoExclusao({
  reserva,
  onSucesso,
}: {
  reserva: Reserva;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  const temSaldo = reserva.saldoAtual > 0;

  function confirmar() {
    if (guardaRef.current!.emAndamento()) return;
    setErro(null);
    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.excluirReserva(reserva.id);
      if (r.ok) {
        toast("Reserva excluída.");
        onSucesso();
        return true;
      }
      setErro(mensagemDeErro(r.codigo));
      return false;
    });
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="font-ui text-ink">{reserva.nome}</p>
        <div className="flex items-baseline justify-between border-y border-line py-3">
          <span className="font-ui text-sm text-ink-2">Guardado</span>
          <span className="tabular font-text text-ink">
            {formatBRL(reserva.saldoAtual)}
          </span>
        </div>
      </div>

      <p className="font-text text-sm text-ink-2">
        {temSaldo
          ? `Os ${formatBRL(reserva.saldoAtual)} guardados deixam de ficar separados e voltam a compor o seu “Livre pra usar”. Essa ação não pode ser desfeita.`
          : "Essa ação não pode ser desfeita."}
      </p>

      {erro && (
        <p role="alert" className="font-ui text-sm text-risk">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secondary" type="button" onClick={onSucesso}>
          Cancelar
        </Button>
        <Button
          variante="danger"
          type="button"
          onClick={confirmar}
          disabled={enviando}
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}
