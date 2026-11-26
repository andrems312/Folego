/**
 * Utilidades de CSV — PURAS, sem dependências. Geram texto CSV compatível com
 * Excel/planilhas brasileiras:
 *   - separador `;` (configuração regional pt-BR);
 *   - fim de linha CRLF (RFC 4180);
 *   - BOM UTF-8 opcional, para o Excel preservar acentos;
 *   - escape de campos com separador, aspas ou quebra de linha;
 *   - proteção contra CSV Injection (fórmulas), neutralizando SÓ no texto exportado
 *     (os dados do aplicativo não são alterados).
 */
export const SEPARADOR_CSV = ";";
export const BOM_UTF8 = "﻿";
const FIM_LINHA = "\r\n";

/** Prefixos que planilhas interpretam como fórmula (CSV Injection). */
const PERIGOSO = /^[=+\-@\t\r]/;

/**
 * Neutraliza um campo que começaria com caractere de fórmula, prefixando um
 * apóstrofo (convenção de planilha para "isto é texto"). Não altera o dado
 * original — só a representação exportada.
 */
export function protegerInjecao(valor: string): string {
  return PERIGOSO.test(valor) ? `'${valor}` : valor;
}

/**
 * Escapa um campo para CSV: primeiro protege contra injeção; depois, se contiver
 * separador, aspas ou quebra de linha, envolve em aspas duplas e dobra as aspas
 * internas.
 */
export function escaparCampoCSV(
  valor: string,
  separador: string = SEPARADOR_CSV,
): string {
  const protegido = protegerInjecao(valor);
  if (
    protegido.includes('"') ||
    protegido.includes(separador) ||
    protegido.includes("\n") ||
    protegido.includes("\r")
  ) {
    return `"${protegido.replace(/"/g, '""')}"`;
  }
  return protegido;
}

export interface OpcoesCSV {
  separador?: string;
  /** Inclui BOM UTF-8 no início (padrão: true). */
  bom?: boolean;
}

/** Monta o CSV a partir de linhas de campos (a primeira costuma ser o cabeçalho). */
export function construirCSV(
  linhas: readonly (readonly string[])[],
  opcoes: OpcoesCSV = {},
): string {
  const separador = opcoes.separador ?? SEPARADOR_CSV;
  const bom = opcoes.bom ?? true;
  const corpo = linhas
    .map((linha) => linha.map((c) => escaparCampoCSV(c, separador)).join(separador))
    .join(FIM_LINHA);
  return `${bom ? BOM_UTF8 : ""}${corpo}${FIM_LINHA}`;
}
