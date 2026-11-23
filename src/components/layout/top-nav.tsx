"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { ehAtivo, NAV_ITEMS } from "./nav-items";

/** Masthead editorial (desktop). Item ativo marcado por filete inferior. */
export function TopNav({ onLancar }: { onLancar: () => void }) {
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-line bg-paper md:block">
      <div className="mx-auto flex h-16 max-w-content items-center gap-8 px-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink"
        >
          Fôlego
        </Link>

        <nav aria-label="Áreas" className="flex items-stretch gap-1">
          {NAV_ITEMS.map((item) => {
            const ativo = ehAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center px-3 py-5 text-sm transition-colors",
                  ativo
                    ? "font-medium text-ink"
                    : "text-ink-2 hover:text-ink",
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-[3px] bg-ink transition-opacity",
                    ativo ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button onClick={onLancar} tamanho="sm">
            <Icon name="plus" size={16} />
            Lançar
          </Button>
        </div>
      </div>
    </header>
  );
}
