/**
 * Formatação e conversão monetária (pt-BR).
 *
 * Domínio em centavos inteiros; apresentação em reais. Puro, sem dependências
 * de interface.
 */
import type { Centavos } from "./types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlSemSimbolo = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata centavos como moeda pt-BR. Ex.: 133000 => "R$ 1.330,00". */
export function formatBRL(valor: Centavos): string {
  const seguro = Number.isFinite(valor) ? valor : 0;
  return brl.format(seguro / 100);
}

/** Formata apenas o número, sem o símbolo R$. Ex.: 133000 => "1.330,00". */
export function formatNumero(valor: Centavos): string {
  const seguro = Number.isFinite(valor) ? valor : 0;
  return brlSemSimbolo.format(seguro / 100);
}

/**
 * Formata com sinal explícito conforme o tipo de movimentação.
 * Entradas recebem "+", saídas/retiradas recebem "−" (menos tipográfico).
 */
export function formatBRLComSinal(
  valor: Centavos,
  sinal: "entrada" | "saida",
): string {
  const magnitude = formatBRL(Math.abs(valor));
  return sinal === "entrada" ? `+ ${magnitude}` : `− ${magnitude}`;
}

/** Converte reais (número) para centavos inteiros. Ex.: 1330.5 => 133050. */
export function reaisParaCentavos(reais: number): Centavos {
  if (!Number.isFinite(reais)) return 0;
  return Math.round(reais * 100);
}

/** Converte centavos para reais (número). Ex.: 133000 => 1330. */
export function centavosParaReais(valor: Centavos): number {
  return valor / 100;
}

/**
 * Interpreta a digitação do usuário como centavos. Aceita formatos pt-BR e
 * alguns tolerados. Retorna `null` quando a entrada não é um valor válido.
 *
 * Exemplos: "1.234,56" => 123456 · "1234,5" => 123450 · "10" => 1000
 * · "R$ 10,00" => 1000 · "-5,50" => -550 · "abc" => null · "" => null
 */
export function parseBRLParaCentavos(entrada: string): Centavos | null {
  let s = entrada.trim().replace(/\s/g, "").replace(/r\$/gi, "");
  if (s === "") return null;

  const negativo = s.startsWith("-");
  if (negativo) s = s.slice(1);
  if (s === "" || /[^0-9.,]/.test(s)) return null;

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");

  if (temVirgula) {
    // Vírgula é o separador decimal; ponto é milhar.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (temPonto) {
    const partes = s.split(".");
    const ultima = partes[partes.length - 1] ?? "";
    // Ponto com 1–2 casas finais => decimal; caso contrário, milhar.
    if (partes.length === 2 && ultima.length <= 2) {
      // já está em formato decimal com ponto
    } else {
      s = s.replace(/\./g, "");
    }
  }

  const valor = Number(s);
  if (!Number.isFinite(valor)) return null;

  const centavos = Math.round(valor * 100);
  return negativo ? -centavos : centavos;
}
