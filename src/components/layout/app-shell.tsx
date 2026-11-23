"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "./bottom-nav";
import { ComingSoonSheet } from "./coming-soon-sheet";
import { TopNav } from "./top-nav";

/**
 * Casca do app: masthead no desktop, cabeçalho enxuto + barra inferior no
 * mobile. Mesma arquitetura de informação nos dois tamanhos (DESIGN.md §7).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [lancarAberto, setLancarAberto] = useState(false);
  const abrirLancar = () => setLancarAberto(true);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav onLancar={abrirLancar} />

      {/* Cabeçalho mobile */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-paper px-4 md:hidden">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          Fôlego
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-content flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>

      <BottomNav onLancar={abrirLancar} />
      <ComingSoonSheet aberto={lancarAberto} onFechar={() => setLancarAberto(false)} />
    </div>
  );
}
