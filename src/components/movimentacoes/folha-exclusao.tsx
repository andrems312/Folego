"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/domain";
import type { Movimentacao } from "@/domain";
import { nomeCategoria } from "@/lib/categorias";
import { formatarDataLonga } from "@/lib/formato-data";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes } from "@/state/estado-financeiro-provider";

/**
 * Folha de confirmação de exclusão de uma movimentação.
 *
 * Consome EXCLUSIVAMENTE `acoes.excluir` — a regra (o que pode ou não ser
 * excluído) vive no domínio. Reusa Sheet (foco/Escape/retorno), Toast, Button e
 * a guarda anti-duplo-envio. O conteúdo desmonta ao fechar (Sheet retorna null),
 * reiniciando a guarda a cada abertura.
 */
export function FolhaExclusao({
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
      titulo="Excluir lançamento"
    >
      {movimentacao && (
        <ConfirmacaoExclusao movimentacao={movimentacao} onSucesso={onFechar} />
      )}
    </Sheet>
  );
}

function ConfirmacaoExclusao({
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

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  const sinal = movimentacao.tipo === "entrada" ? "+" : "−";

  function confirmar() {
    if (guardaRef.current!.emAndamento()) return;
    setErro(null);
    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.excluir(movimentacao.id);
      if (r.ok) {
        toast("Lançamento excluído.");
        onSucesso();
        return true;
      }
      setErro(mensagemDeErro(r.codigo));
      return false;
    });
    // Em erro, libera a guarda e o botão e mantém a folha aberta (estado intacto
    // pela atomicidade do store). Em sucesso a folha fecha/desmonta.
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="font-ui text-ink">
          {movimentacao.descricao ?? "Movimentação"}
        </p>
        <p className="font-ui text-xs text-ink-3">
          <span className="text-ink-2">
            {nomeCategoria(movimentacao.categoriaId)}
          </span>
          {" · "}
          {formatarDataLonga(movimentacao.data)}
        </p>
      </div>

      <div className="flex items-baseline justify-between border-y border-line py-3">
        <span className="font-ui text-sm text-ink-2">Valor</span>
        <span className="tabular font-text text-lg text-ink">
          {sinal} {formatBRL(movimentacao.valor)}
        </span>
      </div>

      <p className="font-text text-sm text-ink-2">
        Essa ação não pode ser desfeita.
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
