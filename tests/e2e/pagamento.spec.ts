import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 3 (pagamentos) — agora acionado pela folha de detalhe (Etapa D).
 * Seed: conta "Material — fornecedor" (m4), saída pendente R$ 1.150,00, sem reserva.
 */

const CONTA = "Material"; // m4
const ENTRADA = "Instalação elétrica"; // m1
const SAIDA_PAGA = "Combustível"; // m2

function naContaHoje(page: Page) {
  return page
    .getByText("Na conta hoje", { exact: true })
    .locator("xpath=following-sibling::dd");
}

function heroLivre(page: Page) {
  return page
    .getByText("Livre pra usar", { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

async function abrirDetalhe(page: Page, texto: string) {
  await page
    .locator("li", { hasText: texto })
    .getByRole("button", { name: /Abrir detalhes/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function abrirPagamento(page: Page, texto: string) {
  const detalhe = await abrirDetalhe(page, texto);
  await detalhe.getByRole("button", { name: "Pagar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("pagamento integral (Quitar tudo): conta vira 'Pago' e deixa de oferecer Pagar", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const pg = await abrirPagamento(page, CONTA);
  await expect(pg.getByText("Falta pagar")).toBeVisible();
  await pg.getByRole("button", { name: "Quitar tudo" }).click();
  await pg.getByRole("button", { name: "Registrar pagamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Conta quitada.")).toBeVisible();

  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText("Pago", { exact: true })).toBeVisible();

  // O detalhe dessa conta já não oferece "Pagar".
  const d = await abrirDetalhe(page, CONTA);
  await expect(d.getByRole("button", { name: "Pagar" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/3\.130,00/);
  await page.reload();
  await expect(naContaHoje(page)).toHaveText(/3\.130,00/);
});

test("pagamento parcial: segue pendente e mostra 'Já pago' ao reabrir", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const pg = await abrirPagamento(page, CONTA);
  await pg.getByLabel("Valor do pagamento").fill("400,00");
  await pg.getByRole("button", { name: "Registrar pagamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();

  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText(/Parcial · falta/)).toBeVisible();
  await expect(linha.getByText(/750,00/)).toBeVisible();

  // Reabrir o pagamento mostra "Já pago" e o novo "Falta pagar".
  const pg2 = await abrirPagamento(page, CONTA);
  await expect(pg2.getByText("Já pago")).toBeVisible();
  await expect(pg2.getByText(/400,00/)).toBeVisible();
  await expect(pg2.getByText(/750,00/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/3\.880,00/);
  await expect(heroLivre(page)).toHaveText(/1\.330,00/);
  await page.reload();
  await expect(naContaHoje(page)).toHaveText(/3\.880,00/);
});

test("pagar acima do pendente é barrado; folha segue aberta e o estado não muda", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const pg = await abrirPagamento(page, CONTA);
  await pg.getByLabel("Valor do pagamento").fill("2.000,00");
  await pg.getByRole("button", { name: "Registrar pagamento" }).click();

  await expect(pg).toBeVisible();
  await expect(pg.getByText(/maior do que falta pagar/i)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator("li", { hasText: CONTA }).getByText("A pagar", { exact: true }),
  ).toBeVisible();
});

test("o detalhe não oferece 'Pagar' para entrada nem para saída já paga", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const d1 = await abrirDetalhe(page, ENTRADA);
  await expect(d1.getByRole("button", { name: "Pagar" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const d2 = await abrirDetalhe(page, SAIDA_PAGA);
  await expect(d2.getByText("Pago", { exact: true })).toBeVisible();
  await expect(d2.getByRole("button", { name: "Pagar" })).toHaveCount(0);
});

test("foco: abre o pagamento pelo detalhe e retorna à linha ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: CONTA })
    .getByRole("button", { name: /Abrir detalhes/ });
  await gatilho.click();
  await page.getByRole("dialog").getByRole("button", { name: "Pagar" }).click();
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
