"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/domain";
import type { Movimentacao } from "@/domain";
import { nomeCategoria } from "@/lib/categorias";
import { diaDaSemana, formatarDataLonga } from "@/lib/formato-data";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes } from "@/state/estado-financeiro-provider";

/**
 * Folha de confirmação de recebimento de uma entrada prevista.
 *
 * Consome EXCLUSIVAMENTE `acoes.receber` — a regra financeira vive no domínio.
 * Reusa Sheet (foco/Escape/retorno), Toast, Button e a guarda anti-duplo-envio.
 * O conteúdo desmonta ao fechar (o Sheet retorna null), reiniciando a guarda a
 * cada abertura, exatamente como a folha de criação.
 */
export function FolhaRecebimento({
  movimentacao,
  onFechar,
}: {
  movimentacao: Movimentacao | null;
  onFechar: () => void;
}) {
  return (
    <Sheet
      aberto={movimentacao != null}
      onFechar={onFechar}
      titulo="Confirmar recebimento"
    >
      {movimentacao && (
        <ConfirmacaoRecebimento
          movimentacao={movimentacao}
          onSucesso={onFechar}
        />
      )}
    </Sheet>
  );
}

function ConfirmacaoRecebimento({
  movimentacao,
  onSucesso,
}: {
  movimentacao: Movimentacao;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Guarda síncrona contra duplo envio (mesmo padrão da folha de criação).
  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  function confirmar() {
    if (guardaRef.current!.emAndamento()) return;
    setErro(null);
    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.receber(movimentacao.id);
      if (r.ok) {
        toast("Recebimento confirmado.");
        onSucesso();
        return true;
      }
      setErro(mensagemDeErro(r.codigo));
      return false;
    });
    // Em erro, libera para nova tentativa; em sucesso a folha fecha/desmonta.
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="font-ui text-ink">{movimentacao.descricao ?? "Entrada"}</p>
        <p className="font-ui text-xs text-ink-3">
          <span className="text-ink-2">
            {nomeCategoria(movimentacao.categoriaId)}
          </span>
          {" · "}
          {diaDaSemana(movimentacao.data)}, {formatarDataLonga(movimentacao.data)}
        </p>
      </div>

      <div className="flex items-baseline justify-between border-y border-line py-3">
        <span className="font-ui text-sm text-ink-2">Valor a receber</span>
        <span className="tabular font-text text-lg text-credit">
          + {formatBRL(movimentacao.valor)}
        </span>
      </div>

      <p className="font-text text-sm text-ink-2">
        Ao confirmar, esse valor passa a contar no seu saldo e no “Livre pra
        usar”.
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
        <Button type="button" onClick={confirmar} disabled={enviando}>
          Confirmar recebimento
        </Button>
      </div>
    </div>
  );
}
