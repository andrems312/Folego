import { describe, expect, it } from "vitest";
import { construirAlteracoes, type CamposEdicao } from "../edicao";

function campos(extra: Partial<CamposEdicao> = {}): CamposEdicao {
  return {
    valorTexto: "100,00",
    data: "2026-03-10",
    categoriaId: "materiais",
    descricao: "",
    formaPagamento: "",
    ...extra,
  };
}

describe("construirAlteracoes", () => {
  it("monta as alterações com valor em centavos quando o valor é editável", () => {
    const r = construirAlteracoes(campos({ valorTexto: "1.234,56" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.alteracoes.valor).toBe(123456);
      expect(r.alteracoes.data).toBe("2026-03-10"); // preservada, sem conversão
      expect(r.alteracoes.categoriaId).toBe("materiais");
    }
  });

  it("omite o valor quando o campo não é oferecido (totalmente realizada)", () => {
    const r = construirAlteracoes(campos({ valorTexto: undefined }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("valor" in r.alteracoes).toBe(false);
      expect(r.alteracoes.valor).toBeUndefined();
      // os demais campos continuam presentes
      expect(r.alteracoes.data).toBe("2026-03-10");
    }
  });

  it("descrição vazia vira null; preenchida é aparada", () => {
    const vazia = construirAlteracoes(campos({ descricao: "   " }));
    const cheia = construirAlteracoes(campos({ descricao: "  Furadeira " }));
    if (vazia.ok) expect(vazia.alteracoes.descricao).toBeNull();
    if (cheia.ok) expect(cheia.alteracoes.descricao).toBe("Furadeira");
  });

  it("forma de pagamento vazia vira null; preenchida é mantida", () => {
    const sem = construirAlteracoes(campos({ formaPagamento: "" }));
    const com = construirAlteracoes(campos({ formaPagamento: "pix" }));
    if (sem.ok) expect(sem.alteracoes.formaPagamento).toBeNull();
    if (com.ok) expect(com.alteracoes.formaPagamento).toBe("pix");
  });

  it("nunca inclui reservaId (vínculo fora do escopo da edição)", () => {
    const r = construirAlteracoes(campos());
    if (r.ok) expect("reservaId" in r.alteracoes).toBe(false);
  });

  it("valor inválido ou zero é rejeitado no campo valor", () => {
    expect(construirAlteracoes(campos({ valorTexto: "abc" })).ok).toBe(false);
    const zero = construirAlteracoes(campos({ valorTexto: "0,00" }));
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.campo).toBe("valor");
  });
});
