import { describe, expect, it } from "vitest";
import { saldoReal, totalReservas } from "@/domain";
import type { EstadoFinanceiro } from "@/domain";
import { criarAcoes } from "../acoes";

/**
 * Integração das ações com o domínio, sem React: um "commit" falso coleta os
 * estados confirmados e um gerador de id determinístico substitui o da borda.
 */
function cenario(
  opts: { inicial?: Partial<EstadoFinanceiro>; estaPronto?: () => boolean } = {},
) {
  let estado: EstadoFinanceiro = {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos", saldoAtual: 80_000 }],
    movimentacoes: [],
    ...opts.inicial,
  };
  const commits: EstadoFinanceiro[] = [];
  let idsGerados = 0;
  const acoes = criarAcoes(
    () => estado,
    (novo) => {
      estado = novo;
      commits.push(novo);
    },
    () => `id-${++idsGerados}`,
    opts.estaPronto ?? (() => true),
  );
  return { acoes, commits, atual: () => estado, idsGerados: () => idsGerados };
}

describe("ações do store integradas ao domínio", () => {
  it("adicionar válido: comita uma vez e injeta o id gerado na borda", () => {
    const c = cenario();
    const r = c.acoes.adicionar({
      tipo: "entrada",
      valor: 50_000,
      data: "2026-03-10",
      categoriaId: "servicos",
      status: "realizado",
    });
    expect(r.ok).toBe(true);
    expect(c.commits).toHaveLength(1);
    expect(c.atual().movimentacoes[0]?.id).toBe("id-1");
    expect(saldoReal(c.atual())).toBe(150_000);
  });

  it("adicionar inválido NÃO comita (atomicidade preservada)", () => {
    const c = cenario();
    const r = c.acoes.adicionar({
      tipo: "saida",
      valor: 0,
      data: "2026-03-10",
      categoriaId: "materiais",
      status: "pendente",
    });
    expect(r.ok).toBe(false);
    expect(c.commits).toHaveLength(0);
  });

  it("registrarPagamento integra (anti-dupla-contagem do domínio)", () => {
    const c = cenario();
    c.acoes.adicionar({
      tipo: "saida",
      valor: 50_000,
      data: "2026-03-10",
      categoriaId: "materiais",
      status: "pendente",
      reservaId: "r1",
    });
    const id = c.atual().movimentacoes[0]!.id;
    const r = c.acoes.registrarPagamento(id, 20_000);
    expect(r.ok).toBe(true);
    expect(saldoReal(c.atual())).toBe(80_000);
  });

  it("excluir movimentação já paga é rejeitado pelo domínio", () => {
    const c = cenario();
    c.acoes.adicionar({
      tipo: "saida",
      valor: 30_000,
      data: "2026-03-10",
      categoriaId: "materiais",
      status: "realizado",
    });
    const id = c.atual().movimentacoes[0]!.id;
    const r = c.acoes.excluir(id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("MOVIMENTACAO_COM_PAGAMENTO");
  });

  it("receber entrada prevista integra", () => {
    const c = cenario();
    c.acoes.adicionar({
      tipo: "entrada",
      valor: 40_000,
      data: "2026-03-10",
      categoriaId: "servicos",
      status: "pendente",
    });
    const id = c.atual().movimentacoes[0]!.id;
    const r = c.acoes.receber(id);
    expect(r.ok).toBe(true);
    expect(saldoReal(c.atual())).toBe(140_000);
  });

  it("guardar e resgatar reservas integram e rejeitam resgate acima do saldo", () => {
    const c = cenario();
    expect(c.acoes.guardarEmReserva("r1", 10_000).ok).toBe(true);
    expect(totalReservas(c.atual())).toBe(90_000);

    const over = c.acoes.resgatarDeReserva("r1", 999_999);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.codigo).toBe("VALOR_ACIMA_DO_SALDO_RESERVA");
  });

  it("criarReserva: comita uma vez, injeta o id da borda e começa zerada", () => {
    const c = cenario({ inicial: { reservas: [] } });
    const r = c.acoes.criarReserva({ nome: "Emergência", alvo: 120_000 });
    expect(r.ok).toBe(true);
    expect(c.commits).toHaveLength(1);
    const reserva = c.atual().reservas[0];
    expect(reserva?.id).toBe("id-1"); // gerado na borda do store
    expect(reserva?.nome).toBe("Emergência");
    expect(reserva?.alvo).toBe(120_000);
    expect(reserva?.saldoAtual).toBe(0);
  });

  it("criarReserva inválida (nome vazio) NÃO comita nem gera id", () => {
    const c = cenario({ inicial: { reservas: [] } });
    const r = c.acoes.criarReserva({ nome: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("NOME_INVALIDO");
    expect(c.commits).toHaveLength(0);
  });

  it("editarReserva: altera nome/alvo preservando o saldo", () => {
    const c = cenario(); // reserva r1, saldo 80.000
    const r = c.acoes.editarReserva("r1", { nome: "Tributos", alvo: 150_000 });
    expect(r.ok).toBe(true);
    expect(c.commits).toHaveLength(1);
    const reserva = c.atual().reservas.find((x) => x.id === "r1");
    expect(reserva?.nome).toBe("Tributos");
    expect(reserva?.alvo).toBe(150_000);
    expect(reserva?.saldoAtual).toBe(80_000);
  });

  it("editarReserva inexistente é rejeitada e não comita", () => {
    const c = cenario();
    const r = c.acoes.editarReserva("fantasma", { nome: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_INEXISTENTE");
    expect(c.commits).toHaveLength(0);
  });

  it("excluirReserva sem vínculo remove e libera o comprometido", () => {
    const c = cenario(); // reserva r1 saldo 80.000, sem movimentações
    const r = c.acoes.excluirReserva("r1");
    expect(r.ok).toBe(true);
    expect(c.atual().reservas).toHaveLength(0);
    expect(totalReservas(c.atual())).toBe(0);
  });

  it("excluirReserva com conta vinculada é bloqueada pelo domínio", () => {
    const c = cenario();
    c.acoes.adicionar({
      tipo: "saida",
      valor: 50_000,
      data: "2026-03-10",
      categoriaId: "impostos",
      status: "pendente",
      reservaId: "r1",
    });
    const antesCommits = c.commits.length;
    const r = c.acoes.excluirReserva("r1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("RESERVA_COM_VINCULO");
    expect(c.commits).toHaveLength(antesCommits); // nenhum commit novo
    expect(c.atual().reservas).toHaveLength(1); // reserva intacta
  });
});

describe("gating — ações só executam no estado 'pronto'", () => {
  const nova = {
    tipo: "entrada" as const,
    valor: 50_000,
    data: "2026-03-10",
    categoriaId: "servicos",
    status: "realizado" as const,
  };

  it("fora de pronto: retorna ESTADO_NAO_PRONTO, não comita e NÃO executa o domínio", () => {
    const c = cenario({ estaPronto: () => false });
    const r = c.acoes.adicionar(nova);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("ESTADO_NAO_PRONTO");
    expect(c.commits).toHaveLength(0);
    expect(c.atual().movimentacoes).toHaveLength(0);
    // Nenhum id foi gerado => o thunk do domínio nem chegou a rodar.
    expect(c.idsGerados()).toBe(0);
  });

  it("fora de pronto: todas as ações financeiras são bloqueadas", () => {
    const c = cenario({ estaPronto: () => false });
    expect(c.acoes.receber("x").ok).toBe(false);
    expect(c.acoes.registrarPagamento("x", 100).ok).toBe(false);
    expect(c.acoes.editar("x", { valor: 100 }).ok).toBe(false);
    expect(c.acoes.excluir("x").ok).toBe(false);
    expect(c.acoes.guardarEmReserva("r1", 100).ok).toBe(false);
    expect(c.acoes.resgatarDeReserva("r1", 100).ok).toBe(false);
    expect(c.acoes.criarReserva({ nome: "Nova" }).ok).toBe(false);
    expect(c.acoes.editarReserva("r1", { nome: "X" }).ok).toBe(false);
    expect(c.acoes.excluirReserva("r1").ok).toBe(false);
    expect(c.commits).toHaveLength(0);
    // Nenhum id gerado => os thunks do domínio nem rodaram (gating antes do domínio).
    expect(c.idsGerados()).toBe(0);
  });

  it("em pronto: a ação executa normalmente", () => {
    const c = cenario({ estaPronto: () => true });
    const r = c.acoes.adicionar(nova);
    expect(r.ok).toBe(true);
    expect(c.commits).toHaveLength(1);
    expect(c.idsGerados()).toBe(1);
  });
});
