/**
 * Dados de demonstração — o exemplo trabalhado do DESIGN.md §2.5.
 *
 * Usado como fixture de referência nos testes e para preencher a interface de
 * fundação com números coerentes (um prestador de serviço real), nunca fictícios
 * ou incoerentes. As datas pendentes são relativas a "hoje" para que a futura
 * projeção do Pulso faça sentido; o resumo em si independe de datas.
 *
 * Verificação (DESIGN.md §2.5):
 *   saldoReal           = R$ 4.280,00 (428000)
 *   totalReservas       = R$   800,00  (80000)
 *   comprometido        = R$ 1.950,00 (195000)
 *   margemSeguranca     = R$ 1.000,00 (100000)
 *   livreParaUsar       = R$ 1.330,00 (133000)
 *   entradasPrevistas   = R$ 2.400,00 (240000)
 */
import { carregarEstadoFinanceiro } from "@/domain";

function hojeMais(dias: number): string {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/** Dados brutos do exemplo (§2.5), validados na carga abaixo. */
const dadosDemo = {
  config: {
    saldoAbertura: 300_000, // R$ 3.000,00 em caixa ao começar a usar o app
    margemSeguranca: 100_000, // R$ 1.000,00
  },
  reservas: [
    { id: "r-impostos", nome: "Impostos", alvo: 120_000, saldoAtual: 80_000 },
  ],
  movimentacoes: [
    // Realizadas -> compõem o saldo real (3.000 + 2.000 − 500 − 220 = 4.280)
    {
      id: "m1",
      tipo: "entrada",
      valor: 200_000,
      data: hojeMais(-6),
      categoriaId: "servicos",
      status: "realizado",
      formaPagamento: "pix",
      descricao: "Instalação elétrica — cliente Marcos",
    },
    {
      id: "m2",
      tipo: "saida",
      valor: 50_000,
      data: hojeMais(-4),
      categoriaId: "deslocamento",
      status: "realizado",
      formaPagamento: "dinheiro",
      descricao: "Combustível da semana",
    },
    {
      id: "m3",
      tipo: "retirada",
      valor: 22_000,
      data: hojeMais(-2),
      categoriaId: "retirada",
      status: "realizado",
      descricao: "Retirada pessoal",
    },
    // Conta pendente (sem reserva) -> comprometido
    {
      id: "m4",
      tipo: "saida",
      valor: 115_000,
      data: hojeMais(5),
      categoriaId: "materiais",
      status: "pendente",
      descricao: "Material — fornecedor",
    },
    // Recebimentos previstos -> sempre à parte
    {
      id: "m5",
      tipo: "entrada",
      valor: 150_000,
      data: hojeMais(8),
      categoriaId: "servicos",
      status: "pendente",
      descricao: "Serviço concluído — aguardando Pix",
    },
    {
      id: "m6",
      tipo: "entrada",
      valor: 90_000,
      data: hojeMais(12),
      categoriaId: "servicos",
      status: "pendente",
      descricao: "Manutenção — aguardando pagamento",
    },
  ],
};

/**
 * Estado-exemplo fiel ao DESIGN.md §2.5 — passa pela porta de entrada obrigatória
 * do domínio. Se o exemplo ficar inconsistente, a validação falha na carga (porta
 * única: a validação é aplicada, não apenas disponível).
 */
export const estadoDemo = carregarEstadoFinanceiro(dadosDemo);
