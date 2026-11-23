import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** As cinco áreas do Fôlego, em ordem fixa (DESIGN.md §7). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão geral", icon: "overview" },
  { href: "/movimentacoes", label: "Movimentações", icon: "movimentacoes" },
  { href: "/previsao", label: "Previsão", icon: "previsao" },
  { href: "/reservas", label: "Reservas", icon: "reservas" },
  { href: "/relatorios", label: "Relatórios", icon: "relatorios" },
];

/** No mobile, a barra inferior mostra 2 + ＋ + 1 + "Mais" (DESIGN.md §7.2). */
export const NAV_PRIMARIAS_MOBILE = NAV_ITEMS.slice(0, 3); // Visão, Movimentações, Previsão
export const NAV_SECUNDARIAS_MOBILE = NAV_ITEMS.slice(3); // Reservas, Relatórios

export function ehAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
