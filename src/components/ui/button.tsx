import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "md" | "sm";

const variantes: Record<Variante, string> = {
  primary: "bg-ink text-ink-inverse hover:opacity-90",
  secondary:
    "border border-line-2 text-ink bg-transparent hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-risk text-risk bg-transparent hover:bg-risk-bg",
};

const tamanhos: Record<Tamanho, string> = {
  md: "h-11 md:h-10 px-4 text-[0.95rem]",
  sm: "h-9 px-3 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export function Button({
  variante = "primary",
  tamanho = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-ui font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...rest}
    />
  );
}
