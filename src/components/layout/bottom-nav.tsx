"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  ehAtivo,
  NAV_ITEMS,
  NAV_SECUNDARIAS_MOBILE,
} from "./nav-items";

function ItemBarra({
  href,
  label,
  icon,
  ativo,
}: {
  href: string;
  label: string;
  icon: IconName;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem]",
        ativo ? "text-ink" : "text-ink-3",
      )}
    >
      <Icon name={icon} size={20} />
      <span className={cn(ativo && "font-medium")}>{label}</span>
    </Link>
  );
}

/** Barra inferior (mobile): 2 áreas + ＋ central + 1 área + "Mais". */
export function BottomNav({ onLancar }: { onLancar: () => void }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);

  const [visao, movimentacoes, previsao] = NAV_ITEMS;

  return (
    <>
      {maisAberto && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mais áreas"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMaisAberto(false)}
            className="absolute inset-0 bg-[var(--overlay)]"
          />
          <nav
            className="absolute inset-x-0 bottom-0 rounded-t-md border-t border-line bg-surface p-2 shadow-overlay"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {NAV_SECUNDARIAS_MOBILE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMaisAberto(false)}
                className="flex items-center gap-3 rounded-sm px-4 py-3 text-ink hover:bg-surface-2"
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      <nav
        aria-label="Áreas"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-paper md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {visao && (
          <ItemBarra {...visao} ativo={ehAtivo(pathname, visao.href)} />
        )}
        {movimentacoes && (
          <ItemBarra
            {...movimentacoes}
            ativo={ehAtivo(pathname, movimentacoes.href)}
          />
        )}

        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onLancar}
            aria-label="Novo lançamento"
            className="-mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-ink-inverse shadow-overlay"
          >
            <Icon name="plus" size={24} />
          </button>
        </div>

        {previsao && (
          <ItemBarra {...previsao} ativo={ehAtivo(pathname, previsao.href)} />
        )}

        <button
          type="button"
          onClick={() => setMaisAberto((v) => !v)}
          aria-expanded={maisAberto}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem]",
            maisAberto ? "text-ink" : "text-ink-3",
          )}
        >
          <Icon name="mais" size={20} />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}
