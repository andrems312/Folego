import { expect, test } from "@playwright/test";

test("a Visão geral carrega com a marca e o indicador principal", async ({
  page,
}) => {
  await page.goto("/");

  // A marca aparece (cabeçalho).
  await expect(page.getByText("Fôlego").first()).toBeVisible();

  // O indicador-herói do produto está presente.
  await expect(page.getByText("Livre pra usar").first()).toBeVisible();

  // O valor do exemplo do DESIGN.md §2.5 é renderizado (R$ 1.330,00).
  await expect(page.getByText(/1\.330,00/).first()).toBeVisible();
});

test("a navegação leva às outras áreas", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByRole("link", { name: "Movimentações" }).first().click();
  await expect(page).toHaveURL(/\/movimentacoes$/);
  await expect(page.getByText("Em construção")).toBeVisible();
});
