/**
 * Validação de data de calendário — pura, sem `Date` nem conversão de fuso.
 *
 * Checa o formato AAAA-MM-DD **e** se a data existe de verdade (mês 1–12, dia
 * válido para o mês, ano bissexto considerado). Não constrói `Date`, para não
 * sofrer deslocamento de fuso nem "rolagem" (ex.: 2026-02-31 → 2026-03-03).
 */
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function ehAnoBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function ehDataValida(iso: string): boolean {
  const m = FORMATO.exec(iso);
  if (!m) return false;

  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);

  if (mes < 1 || mes > 12) return false;

  const diasNoMes = [
    31,
    ehAnoBissexto(ano) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const max = diasNoMes[mes - 1]!;
  return dia >= 1 && dia <= max;
}
