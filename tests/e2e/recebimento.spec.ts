import { expect, test } from "@playwright/test";

/**
 * Etapa 2 — Recebimento de entradas previstas.
 *
 * Usa o seed de demonstração (sem addInitScript), cujos valores são canônicos
 * (src/demo/fixtures.ts): livreParaUsar = R$ 1.330,00; a prevista "Serviço
 * concluído — aguardando Pix" = R$ 1.500,00. Ao recebê-la, o saldo real sobe
 * 1.500,00 e o "Livre pra usar" vai a R$ 2.830,00. Sem semear, o estado persiste
 * no reload (um addInitScript re-semearia).
 */

const PREVISTA = "Serviço concluído"; // m5, entrada prevista R$ 1.500,00
const JA_RECEBIDA = "Instalação elétrica"; // m1, entrada já realizada
const CONTA = "Material"; // m4, saída a pagar (fora do escopo desta etapa)

function heroLivre(page: import("@playwright/test").Page) {
  return page
    .getByText("Livre pra usar", { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

test("recebe uma entrada prevista: vira 'Recebido' e entra no 'Livre pra usar'", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const linha = page.locator("li", { hasText: PREVISTA });
  await expect(linha).toBeVisible();
  await expect(linha.getByText("Previsto", { exact: true })).toBeVisible();

  // Abre a folha de confirmação a partir do botão da linha.
  await linha.getByRole("button", { name: /Receber entrada/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Confirmar recebimento" })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Recebimento confirmado.")).toBeVisible();

  // Reativo na lista (mesma rota, sem reload): agora "Recebido" e sem ação.
  await expect(linha.getByText("Recebido", { exact: true })).toBeVisible();
  await expect(
    linha.getByRole("button", { name: /Receber entrada/ }),
  ).toHaveCount(0);

  // Reativo no herói (navegação client-side, sem reload): 1.330,00 -> 2.830,00.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/2\.830,00/);

  // Persiste após recarregar.
  await page.reload();
  await expect(heroLivre(page)).toHaveText(/2\.830,00/);
});

test("entradas já recebidas e contas não oferecem o botão 'Receber'", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const jaRecebida = page.locator("li", { hasText: JA_RECEBIDA });
  await expect(jaRecebida).toBeVisible();
  await expect(jaRecebida.getByText("Recebido", { exact: true })).toBeVisible();
  await expect(
    jaRecebida.getByRole("button", { name: /Receber/ }),
  ).toHaveCount(0);

  // Uma conta a pagar (saída) não é recebível — nenhuma ação nesta etapa.
  const conta = page.locator("li", { hasText: CONTA });
  await expect(conta).toBeVisible();
  await expect(conta.getByRole("button", { name: /Receber/ })).toHaveCount(0);
});

test("foco: abre a folha de recebimento e retorna ao gatilho ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Receber entrada/ });
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
