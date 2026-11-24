import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.5 / Etapa B — Exclusão de movimentações.
 *
 * Seed de demonstração (src/demo/fixtures.ts):
 *  - m5/m6: entradas previstas (excluíveis).
 *  - m4: conta pendente R$ 1.150,00 SEM pagamento (excluível). Removê-la libera o
 *        comprometido: "Livre pra usar" 1.330,00 -> 2.480,00 (saldoReal intacto).
 *  - m1 (entrada recebida), m2 (saída paga), m3 (retirada realizada): NÃO excluíveis.
 * Cada teste roda em contexto isolado; o reload dentro do teste preserva o estado.
 */

const CHAVE = "folego:estado:v1";

const PREVISTA = "Serviço concluído"; // m5
const CONTA_PENDENTE = "Material"; // m4
const RECEBIDA = "Instalação elétrica"; // m1
const SAIDA_PAGA = "Combustível"; // m2
const RETIRADA = "Retirada pessoal"; // m3

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

test("exclui uma entrada prevista: some da lista e persiste", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: PREVISTA });
  await expect(linha).toBeVisible();

  await linha.getByRole("button", { name: /Excluir lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento excluído.")).toBeVisible();
  await expect(page.locator("li", { hasText: PREVISTA })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("li", { hasText: PREVISTA })).toHaveCount(0);
});

test("exclui conta pendente sem pagamento e o resumo reage; persiste", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: CONTA_PENDENTE });
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  await linha.getByRole("button", { name: /Excluir lançamento/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("li", { hasText: CONTA_PENDENTE })).toHaveCount(0);

  // Resumo reativo (sem reload): removê-la libera o comprometido -> 2.480,00.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/2\.480,00/);

  await page.reload();
  await expect(heroLivre(page)).toHaveText(/2\.480,00/);
});

test("a ação Excluir fica oculta para movimentações com efeito no saldo", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  // Entrada já recebida.
  await expect(
    page
      .locator("li", { hasText: RECEBIDA })
      .getByRole("button", { name: /Excluir/ }),
  ).toHaveCount(0);

  // Saída já paga.
  await expect(
    page
      .locator("li", { hasText: SAIDA_PAGA })
      .getByRole("button", { name: /Excluir/ }),
  ).toHaveCount(0);

  // Retirada já realizada.
  await expect(
    page
      .locator("li", { hasText: RETIRADA })
      .getByRole("button", { name: /Excluir/ }),
  ).toHaveCount(0);
});

test("a ação Excluir fica oculta para conta parcialmente paga", async ({
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
        valorPago: 40_000, // parcialmente paga -> afetou o saldo real
        descricao: "Conta parcial e2e",
      },
    ],
  });
  await page.goto("/movimentacoes");

  const linha = page.locator("li", { hasText: "Conta parcial e2e" });
  await expect(linha.getByText(/Parcial · falta/)).toBeVisible();
  // Não é excluível (tem pagamento), mas segue pagável.
  await expect(
    linha.getByRole("button", { name: /Excluir/ }),
  ).toHaveCount(0);
  await expect(
    linha.getByRole("button", { name: /Registrar pagamento/ }),
  ).toBeVisible();
});

test("cancelar a confirmação não exclui a movimentação", async ({ page }) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: PREVISTA });

  await linha.getByRole("button", { name: /Excluir lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("li", { hasText: PREVISTA })).toBeVisible();
});

test("foco: abre a confirmação e retorna ao gatilho ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Excluir lançamento/ });
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
