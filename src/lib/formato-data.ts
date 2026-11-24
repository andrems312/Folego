/**
 * Formatação de datas para EXIBIÇÃO (pt-BR), a partir de strings "AAAA-MM-DD".
 *
 * NUNCA usa `new Date("AAAA-MM-DD")` (que interpreta como UTC e pode deslocar o
 * dia). As partes da data vêm direto da string; o `Date` só é usado com
 * componentes LOCAIS (ano, mês-1, dia) e apenas para derivar o dia da semana.
 */
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const DIAS_SEMANA = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

function partes(iso: string): { ano: number; mes: number; dia: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** Ex.: "2026-03-10" => "10 de março de 2026". */
export function formatarDataLonga(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${p.dia} de ${MESES[p.mes - 1] ?? ""} de ${p.ano}`;
}

/** Ex.: "2026-03-10" => "10 mar 2026". */
export function formatarDataCurta(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${p.dia} ${MESES_CURTO[p.mes - 1] ?? ""} ${p.ano}`;
}

/** Dia da semana por extenso. Usa Date LOCAL (sem deslocamento de fuso). */
export function diaDaSemana(iso: string): string {
  const p = partes(iso);
  if (!p) return "";
  const d = new Date(p.ano, p.mes - 1, p.dia); // local, não UTC
  return DIAS_SEMANA[d.getDay()] ?? "";
}
