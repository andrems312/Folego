import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 2 (recebimento) — agora acionado pela folha de detalhe (Etapa D).
 * Seed de demonstração: m5 "Serviço concluído" (prevista R$ 1.500,00); ao receber,
 * "Livre pra usar" vai a R$ 2.830,00.
 */

const PREVISTA = "Serviço concluído"; // m5
const JA_RECEBIDA = "Instalação elétrica"; // m1
const CONTA = "Material"; // m4

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

test("recebe uma entrada prevista pelo detalhe: vira 'Recebido' e entra no 'Livre pra usar'", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const detalhe = await abrirDetalhe(page, PREVISTA);
  await detalhe.getByRole("button", { name: "Receber" }).click();

  const confirm = page.getByRole("dialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Confirmar recebimento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Recebimento confirmado.")).toBeVisible();

  const linha = page.locator("li", { hasText: PREVISTA });
  await expect(linha.getByText("Recebido", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/2\.830,00/);
  await page.reload();
  await expect(heroLivre(page)).toHaveText(/2\.830,00/);
});

test("o detalhe não oferece 'Receber' para entradas recebidas nem para contas", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const d1 = await abrirDetalhe(page, JA_RECEBIDA);
  await expect(d1.getByText("Recebido", { exact: true })).toBeVisible();
  await expect(d1.getByRole("button", { name: "Receber" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const d2 = await abrirDetalhe(page, CONTA);
  await expect(d2.getByRole("button", { name: "Receber" })).toHaveCount(0);
  await expect(d2.getByRole("button", { name: "Pagar" })).toBeVisible();
});

test("foco: abre o recebimento pelo detalhe e retorna à linha ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Abrir detalhes/ });
  await gatilho.click();
  await page.getByRole("dialog").getByRole("button", { name: "Receber" }).click();
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
