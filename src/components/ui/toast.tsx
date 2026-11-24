"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface Toast {
  id: number;
  mensagem: string;
}

const Ctx = createContext<((mensagem: string) => void) | null>(null);

/** Sistema mínimo de toast (sem dependências). Acessível via aria-live. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const mostrar = useCallback((mensagem: string) => {
    const id = ++idRef.current;
    setToasts((atual) => [...atual, { id, mensagem }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-2"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-sm border border-line-2 bg-surface px-4 py-2.5 font-ui text-sm text-ink shadow-overlay"
            >
              {t.mensagem}
            </div>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): (mensagem: string) => void {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>.");
  return ctx;
}
