"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type Tema = "light" | "dark";

function temaEfetivo(): Tema {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [montado, setMontado] = useState(false);
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    setTema(temaEfetivo());
    setMontado(true);
  }, []);

  function alternar() {
    const proximo: Tema = tema === "dark" ? "light" : "dark";
    setTema(proximo);
    document.documentElement.setAttribute("data-theme", proximo);
    try {
      localStorage.setItem("folego-theme", proximo);
    } catch {
      // ambiente sem storage: a troca vale só para esta sessão.
    }
  }

  const proximo = tema === "dark" ? "claro" : "escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={montado ? `Mudar para tema ${proximo}` : "Alternar tema"}
      title={montado ? `Tema ${proximo}` : undefined}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2",
        "transition-colors hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {/* Antes de montar, um ícone neutro evita divergência de hidratação. */}
      {montado ? (
        <Icon name={tema === "dark" ? "sun" : "moon"} size={18} />
      ) : (
        <Icon name="moon" size={18} className="opacity-0" />
      )}
    </button>
  );
}
