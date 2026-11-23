/**
 * Geração de id na borda (fora do reducer e do domínio puro — regra arquitetural).
 * Usa `crypto.randomUUID` quando disponível; fallback para ambientes sem ele.
 */
export function gerarId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
