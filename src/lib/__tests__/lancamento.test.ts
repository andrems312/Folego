import { describe, expect, it } from "vitest";
import {
  construirNovaMovimentacao,
  criarGuardaEnvio,
  mensagemDeErro,
  type CamposLancamento,
} from "../lancamento";

function campos(extra: Partial<CamposLancamento> = {}): CamposLancamento {
  return {
    tipo: "entrada",
    valorTexto: "100,00",
    data: "2026-03-10",
    categoriaId: "servicos",
    status: "realizado",
    descricao: "",
    formaPagamento: "",
    ...extra,
  };
}

describe("construirNovaMovimentacao", () => {
  it("monta os dados com valor em centavos (via domínio)", () => {
    const r = construirNovaMovimentacao(campos({ valorTexto: "1.234,56" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.valor).toBe(123456);
      expect(r.dados.tipo).toBe("entrada");
      expect(r.dados.data).toBe("2026-03-10"); // preservada, sem conversão
    }
  });

  it("descrição vazia vira null; preenchida é aparada", () => {
    const vazia = construirNovaMovimentacao(campos({ descricao: "   " }));
    const cheia = construirNovaMovimentacao(campos({ descricao: "  Serviço X " }));
    if (vazia.ok) expect(vazia.dados.descricao).toBeNull();
    if (cheia.ok) expect(cheia.dados.descricao).toBe("Serviço X");
  });

  it("forma de pagamento vazia vira null; preenchida é mantida", () => {
    const sem = construirNovaMovimentacao(campos({ formaPagamento: "" }));
    const com = construirNovaMovimentacao(campos({ formaPagamento: "pix" }));
    if (sem.ok) expect(sem.dados.formaPagamento).toBeNull();
    if (com.ok) expect(com.dados.formaPagamento).toBe("pix");
  });

  it("não envia reservaId (vínculo adiado)", () => {
    const r = construirNovaMovimentacao(campos());
    if (r.ok) expect(r.dados.reservaId).toBeUndefined();
  });

  it("valor inválido ou zero é rejeitado no campo valor", () => {
    expect(construirNovaMovimentacao(campos({ valorTexto: "abc" })).ok).toBe(false);
    const zero = construirNovaMovimentacao(campos({ valorTexto: "0,00" }));
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.campo).toBe("valor");
  });
});

describe("criarGuardaEnvio", () => {
  it("envios consecutivos: a ação roda uma única vez (segunda é ignorada)", () => {
    const guarda = criarGuardaEnvio();
    let execucoes = 0;
    const salvar = () => {
      execucoes += 1;
      return true; // sucesso
    };

    expect(guarda.tentar(salvar)).toBe("sucesso");
    // Segundo clique imediato, antes de qualquer desmontagem:
    expect(guarda.tentar(salvar)).toBe("ignorado");
    expect(guarda.tentar(salvar)).toBe("ignorado");
    expect(execucoes).toBe(1);
    expect(guarda.emAndamento()).toBe(true); // permanece travada após sucesso
  });

  it("em caso de erro, libera a guarda para nova tentativa", () => {
    const guarda = criarGuardaEnvio();
    let execucoes = 0;
    const falhar = () => {
      execucoes += 1;
      return false; // erro
    };

    expect(guarda.tentar(falhar)).toBe("erro");
    expect(guarda.emAndamento()).toBe(false);
    // Nova tentativa é permitida após o erro:
    expect(guarda.tentar(falhar)).toBe("erro");
    expect(execucoes).toBe(2);
  });

  it("após um erro seguido de sucesso, trava no sucesso", () => {
    const guarda = criarGuardaEnvio();
    let ok = false;
    const acao = () => ok;

    expect(guarda.tentar(acao)).toBe("erro"); // ok = false
    ok = true;
    expect(guarda.tentar(acao)).toBe("sucesso"); // agora grava
    expect(guarda.tentar(acao)).toBe("ignorado"); // e trava
  });
});

describe("mensagemDeErro", () => {
  it("mapeia códigos conhecidos", () => {
    expect(mensagemDeErro("VALOR_INVALIDO")).toMatch(/maior que zero/i);
    expect(mensagemDeErro("CATEGORIA_INVALIDA")).toMatch(/categoria/i);
    expect(mensagemDeErro("DATA_INVALIDA")).toMatch(/data/i);
    expect(mensagemDeErro("ESTADO_NAO_PRONTO")).toMatch(/carregando/i);
  });

  it("código desconhecido cai na mensagem padrão", () => {
    expect(mensagemDeErro("QUALQUER_OUTRO")).toMatch(/não foi possível salvar/i);
  });

  it("mapeia os erros de recebimento e pagamento (Entrega 2.4)", () => {
    expect(mensagemDeErro("MOVIMENTACAO_INEXISTENTE")).toMatch(/não encontramos/i);
    expect(mensagemDeErro("MOVIMENTACAO_NAO_RECEBIVEL")).toMatch(
      /entradas podem ser recebidas/i,
    );
    expect(mensagemDeErro("ENTRADA_JA_RECEBIDA")).toMatch(/já foi recebida/i);
    expect(mensagemDeErro("MOVIMENTACAO_NAO_PAGAVEL")).toMatch(/podem ser pagas/i);
    expect(mensagemDeErro("CONTA_JA_QUITADA")).toMatch(/totalmente paga/i);
    expect(mensagemDeErro("VALOR_ACIMA_DO_PENDENTE")).toMatch(/falta pagar/i);
    expect(mensagemDeErro("VINCULO_INVALIDO")).toMatch(/reserva/i);
  });

  it("os códigos de recebimento/pagamento não caem na mensagem padrão", () => {
    const padrao = mensagemDeErro("QUALQUER_OUTRO");
    const codigos = [
      "MOVIMENTACAO_INEXISTENTE",
      "MOVIMENTACAO_NAO_RECEBIVEL",
      "ENTRADA_JA_RECEBIDA",
      "MOVIMENTACAO_NAO_PAGAVEL",
      "CONTA_JA_QUITADA",
      "VALOR_ACIMA_DO_PENDENTE",
      "VINCULO_INVALIDO",
    ];
    for (const codigo of codigos) {
      expect(mensagemDeErro(codigo)).not.toBe(padrao);
    }
  });

  it("mapeia os erros de edição e exclusão (Entrega 2.5)", () => {
    expect(mensagemDeErro("MOVIMENTACAO_COM_PAGAMENTO")).toMatch(
      /não pode ser excluída/i,
    );
    expect(mensagemDeErro("VALOR_ABAIXO_DO_PAGO")).toMatch(
      /menor do que você já pagou/i,
    );
    expect(mensagemDeErro("VINCULO_BLOQUEADO")).toMatch(/trocar a reserva/i);
  });

  it("os códigos de edição/exclusão não caem na mensagem padrão", () => {
    const padrao = mensagemDeErro("QUALQUER_OUTRO");
    const codigos = [
      "MOVIMENTACAO_COM_PAGAMENTO",
      "VALOR_ABAIXO_DO_PAGO",
      "VINCULO_BLOQUEADO",
    ];
    for (const codigo of codigos) {
      expect(mensagemDeErro(codigo)).not.toBe(padrao);
    }
  });
});
