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

/** Caracteres que planilhas interpretam como início de fórmula. */
const GATILHO_FORMULA = new Set(["=", "+", "-", "@"]);

/**
 * Decide se um campo precisa ser neutralizado contra CSV Injection. Considera:
 *  - início com caractere de controle (TAB, CR, LF e demais < 0x20), que algumas
 *    planilhas descartam, revelando um gatilho logo atrás; e
 *  - o primeiro caractere "visível" (ignorando espaços e controles à esquerda)
 *    sendo `=`, `+`, `-` ou `@` — ou seja, gatilhos precedidos de espaço/controle
 *    também são pegos.
 */
function precisaNeutralizar(valor: string): boolean {
  if (valor.length === 0) return false;
  if (valor.charCodeAt(0) < 0x20) return true; // TAB/CR/LF/controle no início
  const visivel = valor.replace(/^[\s\u0000-\u001f]+/, "");
  return GATILHO_FORMULA.has(visivel.charAt(0));
}

/**
 * Neutraliza um campo que a planilha poderia interpretar como fórmula, prefixando
 * um apóstrofo (convenção "isto é texto"). Não altera o dado original — só a
 * representação exportada. Números válidos (começam com dígito) nunca são afetados.
 */
export function protegerInjecao(valor: string): string {
  return precisaNeutralizar(valor) ? `'${valor}` : valor;
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
