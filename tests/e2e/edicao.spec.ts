import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.5 / Etapa C — Edição de movimentações.
 *
 * Seed de demonstração (src/demo/fixtures.ts):
 *  - m1 "Instalação elétrica": entrada recebida R$ 2.000,00 (totalmente realizada
 *        -> valor bloqueado; informações não-financeiras editáveis).
 *  - m4 "Material — fornecedor": conta pendente R$ 1.150,00 (valor editável).
 *        Reduzir para R$ 1.000,00 -> "Livre pra usar" 1.330,00 -> 1.480,00.
 * Cada teste roda em contexto isolado; o reload preserva o estado persistido.
 */

const CHAVE = "folego:estado:v1";

const REALIZADA = "Instalação elétrica"; // m1
const CONTA = "Material"; // m4
const PREVISTA = "Serviço concluído"; // m5

async function semearEstado(page: Page, estado: unknown): Promise<void> {
  await page.addInitScript(
    (dados) => {
      try {
        window.localStorage.setItem(dados.chave, dados.valor);
      } catch {
        /* ignore */
      }
    },
    { chave: CHAVE, valor: JSON.stringify({ versao: 1, estado }) },
  );
}

function heroLivre(page: Page) {
  return page
    .getByText("Livre pra usar", { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

function naContaHoje(page: Page) {
  return page
    .getByText("Na conta hoje", { exact: true })
    .locator("xpath=following-sibling::dd");
}

test("edita informações não-financeiras de uma realizada; valor fica bloqueado", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: REALIZADA });

  await linha.getByRole("button", { name: /Editar lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Valor bloqueado: nota visível e sem campo editável de valor.
  await expect(dialog.getByText(/não pode ser alterado/i)).toBeVisible();
  await expect(dialog.locator("#valor-edicao")).toHaveCount(0);

  await dialog.getByLabel("Categoria").selectOption({ value: "ferramentas" });
  await dialog.getByLabel("Descrição (opcional)").fill("Instalação revisada");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();

  const linhaAtualizada = page.locator("li", { hasText: "Instalação revisada" });
  await expect(linhaAtualizada).toBeVisible();
  await expect(linhaAtualizada.getByText(/Ferramentas/)).toBeVisible();

  // Saldo real inalterado (nenhuma mudança de valor) e persistência.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/4\.280,00/);
  await page.reload();
  await page.getByRole("link", { name: "Movimentações" }).first().click();
  await expect(page.getByText("Instalação revisada")).toBeVisible();
});

test("edita o valor de uma conta pendente; resumo reage e persiste", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  await linha.getByRole("button", { name: /Editar lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor").fill("1.000,00");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();

  await expect(linha.getByText(/1\.000,00/)).toBeVisible();
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  // Reduzir o pendente libera comprometido: "Livre pra usar" 1.330 -> 1.480.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/1\.480,00/);
  await page.reload();
  await expect(heroLivre(page)).toHaveText(/1\.480,00/);
});

test("editar valor abaixo do já pago é barrado; folha aberta e estado intacto", async ({
  page,
}) => {
  await semearEstado(page, {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [
      {
        id: "p1",
        tipo: "saida",
        valor: 100_000,
        data: "2026-03-10",
        categoriaId: "materiais",
        status: "pendente",
        valorPago: 40_000, // já pagou R$ 400,00
        descricao: "Conta parcial edit",
      },
    ],
  });
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: "Conta parcial edit" });
  await expect(linha.getByText(/Parcial · falta/)).toBeVisible();

  await linha.getByRole("button", { name: /Editar lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor").fill("300,00"); // R$ 300 < R$ 400 já pago
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();

  // Erro dentro da folha, que permanece aberta; valor digitado preservado.
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/menor do que você já pagou/i)).toBeVisible();
  await expect(dialog.getByLabel("Valor")).toHaveValue("300,00");

  // Estado intacto: fecha e a conta continua com o valor e o pendente originais.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(linha.getByText(/Parcial · falta R\$\s*600,00/)).toBeVisible();
});

test("foco: abre a edição e retorna ao gatilho ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Editar lançamento/ });
  await gatilho.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const focoNoDialogo = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const ativo = document.activeElement;
    return !!(d && ativo && d.contains(ativo));
  });
  expect(focoNoDialogo).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(gatilho).toBeFocused();
});
