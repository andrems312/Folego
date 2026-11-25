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

test("a Home mostra o preview do Pulso e leva à previsão completa", async ({
  page,
}) => {
  await page.goto("/");

  // Preview do Pulso presente (gráfico acessível de 7 dias).
  await expect(
    page.getByRole("img", { name: /Projeção do caixa para 7 dias/ }),
  ).toBeVisible();
  // Demo não tem aperto no período.
  await expect(page.getByText(/Sem apertos à vista nos próximos 7 dias/)).toBeVisible();
  // O placeholder antigo foi removido.
  await expect(page.getByText(/chega no próximo checkpoint/i)).toHaveCount(0);

  // O CTA leva à previsão completa.
  await page.getByRole("link", { name: /Ver previsão/ }).click();
  await expect(page).toHaveURL(/\/previsao$/);
});

test("a navegação leva às outras áreas", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByRole("link", { name: "Movimentações" }).first().click();
  await expect(page).toHaveURL(/\/movimentacoes$/);
  // A rota agora renderiza a listagem real (filtro de tipo presente).
  await expect(page.getByRole("button", { name: "Todas" })).toBeVisible();
});

test("persiste o estado no localStorage (chave versionada) após hidratar", async ({
  page,
}) => {
  await page.goto("/");
  // Espera a hidratação concluir (o resumo só aparece quando 'pronto').
  await expect(page.getByText(/1\.330,00/).first()).toBeVisible();

  const salvo = await page.evaluate(() =>
    window.localStorage.getItem("folego:estado:v1"),
  );
  expect(salvo).toBeTruthy();
  expect(salvo).toContain('"versao":1');
});
