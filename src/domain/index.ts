/**
 * Ponto de entrada do domínio financeiro do Fôlego.
 *
 * A interface importa daqui (`@/domain`) e nunca de arquivos internos soltos,
 * para manter o motor financeiro centralizado (ver DESIGN.md §17 — arquitetura).
 */
export * from "./types";
export * from "./money";
export * from "./data";
export * from "./movimentacao";
export * from "./calculations";
export * from "./projection";
export * from "./operations";
export * from "./validation";
