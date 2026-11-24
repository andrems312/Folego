import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.5 / Etapa D — Folha de detalhe (consolidação das ações).
 *
 * A linha abre uma folha de detalhe com as informações e as ações elegíveis
 * (Receber/Pagar/Editar/Excluir), conforme o estado — mesmas regras do domínio.
 * Seed de demonstração (src/demo/fixtures.ts).
 */

const PREVISTA = "Serviço concluído"; // m5 — entrada prevista
const CONTA = "Material"; // m4 — conta a pagar
const RECEBIDA = "Instalação elétrica"; // m1 — entrada recebida

async function abrirDetalhe(page: Page, texto: string) {
  await page
    .locator("li", { hasText: texto })
    .getByRole("button", { name: /Abrir detalhes/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("o detalhe apresenta as informações da movimentação", async ({ page }) => {
  await page.goto("/movimentacoes");
  const d = await abrirDetalhe(page, PREVISTA);

  await expect(d.getByText("Detalhes do lançamento")).toBeVisible();
  await expect(d.getByText("Tipo")).toBeVisible();
  await expect(d.getByText("Entrada", { exact: true })).toBeVisible();
  await expect(d.getByText("Situação")).toBeVisible();
  await expect(d.getByText("Previsto", { exact: true })).toBeVisible();
  await expect(d.getByText("Categoria")).toBeVisible();
  await expect(d.getByText(/1\.500,00/)).toBeVisible();
});

test("ações da prevista: Receber/Editar/Excluir, sem Pagar", async ({ page }) => {
  await page.goto("/movimentacoes");
  const d = await abrirDetalhe(page, PREVISTA);
  await expect(d.getByRole("button", { name: "Receber" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Excluir" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Pagar" })).toHaveCount(0);
});

test("ações da conta a pagar: Pagar/Editar/Excluir, sem Receber", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const d = await abrirDetalhe(page, CONTA);
  await expect(d.getByRole("button", { name: "Pagar" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Excluir" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Receber" })).toHaveCount(0);
});

test("ações da realizada: apenas Editar (sem Receber/Pagar/Excluir)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const d = await abrirDetalhe(page, RECEBIDA);
  await expect(d.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Receber" })).toHaveCount(0);
  await expect(d.getByRole("button", { name: "Pagar" })).toHaveCount(0);
  await expect(d.getByRole("button", { name: "Excluir" })).toHaveCount(0);
});

test("foco: abre o detalhe e retorna ao gatilho ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Abrir detalhes/ });
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
