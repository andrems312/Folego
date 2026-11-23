"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Placeholder honesto para a folha de lançamento, que chega no próximo
 * checkpoint. Evita um botão morto sem antecipar a tela de Movimentações.
 */
export function ComingSoonSheet({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lancar-titulo"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-[var(--overlay)]"
      />
      <div
        className="relative m-0 w-full max-w-md rounded-t-md bg-surface p-6 shadow-overlay sm:m-4 sm:rounded-md"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="lancar-titulo" className="font-display text-xl text-ink">
            Novo lançamento
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="font-text text-ink-2">
          A folha para registrar entradas, saídas e retiradas em poucos segundos
          chega no próximo checkpoint. Por enquanto, esta é a fundação do
          produto.
        </p>
        <div className="mt-5 flex justify-end">
          <Button variante="secondary" onClick={onFechar}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
