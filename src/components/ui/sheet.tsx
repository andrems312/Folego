"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icon";

const FOCAVEIS =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Folha acessível reutilizável: bottom-sheet no mobile, modal no desktop.
 * Fecha por botão, Escape e overlay. Gerencia foco: foca o primeiro campo ao
 * abrir, prende o Tab dentro da folha e restaura o foco ao gatilho ao fechar.
 */
export function Sheet({
  aberto,
  onFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  const painelRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    gatilhoRef.current = document.activeElement as HTMLElement | null;

    const painel = painelRef.current;
    const itens = painel?.querySelectorAll<HTMLElement>(FOCAVEIS);
    (itens && itens.length > 0 ? itens[0] : painel)?.focus?.();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      if (e.key === "Tab" && painel) {
        const focaveis = painel.querySelectorAll<HTMLElement>(FOCAVEIS);
        if (focaveis.length === 0) return;
        const primeiro = focaveis[0]!;
        const ultimo = focaveis[focaveis.length - 1]!;
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      gatilhoRef.current?.focus?.();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-titulo"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-[var(--overlay)]"
      />
      <div
        ref={painelRef}
        className="relative m-0 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-md bg-surface shadow-overlay sm:m-4 sm:rounded-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="sheet-titulo" className="font-display text-xl text-ink">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
