/**
 * Catálogo de categorias — fonte de verdade única e reutilizável.
 *
 * Os IDs são preservados exatamente como já existiam (evita quebrar dados
 * persistidos). Categorias são apenas rótulos de apresentação; o domínio não as
 * valida (categoriaId é string livre).
 */
export interface Categoria {
  id: string;
  nome: string;
}

export const CATEGORIAS_PADRAO: readonly Categoria[] = [
  { id: "servicos", nome: "Serviços prestados" },
  { id: "materiais", nome: "Materiais" },
  { id: "deslocamento", nome: "Deslocamento/combustível" },
  { id: "ferramentas", nome: "Ferramentas" },
  { id: "impostos", nome: "Impostos" },
  { id: "retirada", nome: "Retirada pessoal" },
] as const;

const porId = new Map(CATEGORIAS_PADRAO.map((c) => [c.id, c.nome]));

/** Nome amigável de uma categoria; fallback "Outros" para id desconhecido/ausente. */
export function nomeCategoria(categoriaId: string | null | undefined): string {
  if (!categoriaId) return "Outros";
  return porId.get(categoriaId) ?? "Outros";
}
