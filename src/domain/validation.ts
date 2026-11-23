/**
 * Validação de fronteira do domínio (P3).
 *
 * Schemas Zod + funções que garantem que NENHUM dado inválido entre nas operações
 * financeiras: valores monetários em centavos inteiros, vínculos existentes,
 * saldos dentro dos limites e coerência entre `status` e `valorPago`.
 *
 * Framework-agnóstico (sem React).
 */
import { z } from "zod";
import { ehDataValida } from "./data";
import { parseBRLParaCentavos } from "./money";
import type { EstadoFinanceiro } from "./types";

const dataISO = z
  .string()
  .refine(ehDataValida, "Data inválida: use AAAA-MM-DD com dia e mês que existam.");

export const movimentacaoTipoSchema = z.enum(["entrada", "saida", "retirada"]);
export const movimentacaoStatusSchema = z.enum(["realizado", "pendente"]);
export const formaPagamentoSchema = z.enum([
  "pix",
  "dinheiro",
  "transferencia",
  "cartao",
  "outro",
]);

export const movimentacaoSchema = z
  .object({
    id: z.string().min(1),
    tipo: movimentacaoTipoSchema,
    valor: z.number().int().nonnegative(),
    data: dataISO,
    categoriaId: z.string().min(1),
    status: movimentacaoStatusSchema,
    valorPago: z.number().int().nonnegative().nullish(),
    formaPagamento: formaPagamentoSchema.nullish(),
    reservaId: z.string().min(1).nullish(),
    descricao: z.string().nullish(),
  })
  .superRefine((m, ctx) => {
    if (m.valorPago != null) {
      // Valores monetários: valorPago nunca excede o valor total.
      if (m.valorPago > m.valor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valorPago"],
          message: "valorPago não pode exceder o valor total da conta.",
        });
      }
      // Coerência status x pagamento, só para contas (saída/retirada).
      if (m.tipo === "saida" || m.tipo === "retirada") {
        const quitada = m.valorPago >= m.valor;
        if (quitada && m.status !== "realizado") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["status"],
            message: "Conta totalmente paga deve ter status 'realizado'.",
          });
        }
        if (!quitada && m.status !== "pendente") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["status"],
            message: "Conta não quitada deve ter status 'pendente'.",
          });
        }
      }
    }
  });

export const reservaSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  alvo: z.number().int().nonnegative().nullish(),
  saldoAtual: z.number().int().nonnegative(),
});

export const configFinanceiraSchema = z.object({
  saldoAbertura: z.number().int(),
  margemSeguranca: z.number().int().nonnegative(),
});

export const estadoFinanceiroSchema = z
  .object({
    config: configFinanceiraSchema,
    movimentacoes: z.array(movimentacaoSchema),
    reservas: z.array(reservaSchema),
  })
  .superRefine((e, ctx) => {
    const idsReservas = new Set(e.reservas.map((r) => r.id));
    e.movimentacoes.forEach((m, i) => {
      // Vínculo inválido: reservaId que não existe.
      if (m.reservaId && !idsReservas.has(m.reservaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["movimentacoes", i, "reservaId"],
          message: `Vínculo inválido: reserva '${m.reservaId}' não existe.`,
        });
      }
    });
    // IDs de movimentação únicos.
    const idsMov = e.movimentacoes.map((m) => m.id);
    if (new Set(idsMov).size !== idsMov.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movimentacoes"],
        message: "Há movimentações com id duplicado.",
      });
    }
    // IDs de reserva únicos.
    const idsRes = e.reservas.map((r) => r.id);
    if (new Set(idsRes).size !== idsRes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reservas"],
        message: "Há reservas com id duplicado.",
      });
    }
  });

export type ResultadoValidacao<T> =
  | { ok: true; valor: T }
  | { ok: false; erros: string[] };

/**
 * Valida e tipa dados desconhecidos como `EstadoFinanceiro`. Versão que retorna
 * resultado, para quem quer tratar os erros.
 */
export function validarEstadoFinanceiro(
  dados: unknown,
): ResultadoValidacao<EstadoFinanceiro> {
  const parsed = estadoFinanceiroSchema.safeParse(dados);
  if (!parsed.success) {
    return {
      ok: false,
      erros: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`,
      ),
    };
  }
  return { ok: true, valor: parsed.data as EstadoFinanceiro };
}

/** Erro lançado quando dados externos não passam na validação de fronteira. */
export class EstadoInvalidoError extends Error {
  readonly erros: string[];
  constructor(erros: string[]) {
    super(`Estado financeiro inválido: ${erros.join("; ")}`);
    this.name = "EstadoInvalidoError";
    this.erros = erros;
  }
}

/**
 * PORTA DE ENTRADA OBRIGATÓRIA do domínio para dados externos (armazenamento,
 * importação, formulários). Retorna um `EstadoFinanceiro` garantidamente válido
 * ou LANÇA `EstadoInvalidoError` — assim a validação não pode ser silenciosamente
 * ignorada: ou os dados passam, ou nada entra no domínio (regra 5 / DESIGN.md §2.8).
 */
export function carregarEstadoFinanceiro(dados: unknown): EstadoFinanceiro {
  const resultado = validarEstadoFinanceiro(dados);
  if (!resultado.ok) throw new EstadoInvalidoError(resultado.erros);
  return resultado.valor;
}

export type ResultadoValorMonetario =
  | { ok: true; centavos: number }
  | { ok: false; erro: string };

/**
 * Valida a digitação de um valor monetário para um lançamento.
 * Exige um número reconhecível e estritamente positivo (lançamentos registram
 * magnitude; o sinal vem do tipo).
 */
export function validarValorMonetario(entrada: string): ResultadoValorMonetario {
  const centavos = parseBRLParaCentavos(entrada);
  if (centavos === null) return { ok: false, erro: "Informe um valor válido." };
  if (centavos <= 0) return { ok: false, erro: "O valor precisa ser maior que zero." };
  return { ok: true, centavos };
}
