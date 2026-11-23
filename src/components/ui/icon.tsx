import type { SVGProps } from "react";

/**
 * Ícones monoline editoriais (traço fino, grade 24, `currentColor`).
 * DESIGN.md §8 — nunca emoji. Família própria, estilo gravura de contador.
 */
export type IconName =
  | "overview"
  | "movimentacoes"
  | "previsao"
  | "reservas"
  | "relatorios"
  | "mais"
  | "plus"
  | "sun"
  | "moon"
  | "lock"
  | "alerta"
  | "x";

const paths: Record<IconName, React.ReactNode> = {
  overview: (
    <>
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
      <path d="M9 5v14" />
    </>
  ),
  movimentacoes: (
    <>
      <path d="M4 7h10" />
      <path d="M4 12h16" />
      <path d="M4 17h7" />
      <path d="M17 5l3 2-3 2" />
    </>
  ),
  previsao: (
    <>
      <path d="M3 15l4-5 3 3 4-7 3 4 4-2" />
      <path d="M3 20h18" />
    </>
  ),
  reservas: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  relatorios: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8 10V7a4 4 0 118 0v3" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5l9 16H3l9-16z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
