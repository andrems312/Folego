import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 3 — Pagamentos parciais e integrais.
 *
 * Seed de demonstração (src/demo/fixtures.ts). Conta "Material — fornecedor"
 * (m4): saída pendente R$ 1.150,00, sem reserva. saldoReal inicial = R$ 4.280,00.
 *  - Parcial R$ 400,00  -> saldoReal 3.880,00; m4 "Parcial · falta R$ 750,00".
 *  - Integral (Quitar tudo) -> saldoReal 3.130,00; m4 "Pago".
 *  - "Livre pra usar" é invariante ao pagar conta descoberta (anti-dupla-contagem).
 * Cada teste roda em contexto isolado (localStorage próprio), então o seed é
 * recriado a cada teste; o reload dentro do teste preserva o estado persistido.
 */

const CONTA = "Material"; // m4 — saída a pagar R$ 1.150,00
const ENTRADA = "Instalação elétrica"; // m1 — entrada recebida (não pagável)
const SAIDA_PAGA = "Combustível"; // m2 — saída já paga
const RETIRADA = "Retirada pessoal"; // m3 — retirada já realizada

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

test("pagamento integral (Quitar tudo): conta vira 'Pago' e some o botão", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  await linha.getByRole("button", { name: /Registrar pagamento/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Falta pagar")).toBeVisible();

  await dialog.getByRole("button", { name: "Quitar tudo" }).click();
  await dialog.getByRole("button", { name: "Registrar pagamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Conta quitada.")).toBeVisible();

  // Reativo na lista: "Pago" e sem ação de pagamento.
  await expect(linha.getByText("Pago", { exact: true })).toBeVisible();
  await expect(
    linha.getByRole("button", { name: /Registrar pagamento/ }),
  ).toHaveCount(0);

  // Reativo no resumo (sem reload): saldo real 4.280,00 -> 3.130,00.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/3\.130,00/);

  // Persiste após recarregar.
  await page.reload();
  await expect(naContaHoje(page)).toHaveText(/3\.130,00/);
});

test("pagamento parcial: conta segue pendente, mostra pago e o que falta", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  await linha.getByRole("button", { name: /Registrar pagamento/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor do pagamento").fill("400,00");
  await dialog.getByRole("button", { name: "Registrar pagamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();

  // Continua pendente, agora parcial com o restante exibido.
  await expect(linha.getByText(/Parcial · falta/)).toBeVisible();
  await expect(linha.getByText(/750,00/)).toBeVisible();
  // O botão Pagar continua disponível.
  await expect(
    linha.getByRole("button", { name: /Registrar pagamento/ }),
  ).toBeVisible();

  // Reabrindo, a folha mostra "Já pago" e o novo "Falta pagar".
  await linha.getByRole("button", { name: /Registrar pagamento/ }).click();
  const dialog2 = page.getByRole("dialog");
  await expect(dialog2.getByText("Já pago")).toBeVisible();
  await expect(dialog2.getByText(/400,00/)).toBeVisible();
  await expect(dialog2.getByText(/750,00/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Reativo no resumo: saldo real 4.280,00 -> 3.880,00; livre invariante.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/3\.880,00/);
  await expect(heroLivre(page)).toHaveText(/1\.330,00/);

  // Persiste após recarregar.
  await page.reload();
  await expect(naContaHoje(page)).toHaveText(/3\.880,00/);
});

test("pagar acima do pendente é barrado; folha segue aberta e o estado não muda", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: CONTA });

  await linha.getByRole("button", { name: /Registrar pagamento/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor do pagamento").fill("2.000,00");
  await dialog.getByRole("button", { name: "Registrar pagamento" }).click();

  // Erro exibido dentro da folha, que permanece aberta.
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/maior do que falta pagar/i)).toBeVisible();

  // Estado inalterado: fecha e a conta continua "A pagar".
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  // Saldo real intacto (4.280,00).
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/4\.280,00/);
});

test("não há botão 'Pagar' em contas quitadas nem em movimentações não pagáveis", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  // Entrada não é pagável.
  await expect(
    page
      .locator("li", { hasText: ENTRADA })
      .getByRole("button", { name: /Registrar pagamento/ }),
  ).toHaveCount(0);

  // Saída já paga.
  const saidaPaga = page.locator("li", { hasText: SAIDA_PAGA });
  await expect(saidaPaga.getByText("Pago", { exact: true })).toBeVisible();
  await expect(
    saidaPaga.getByRole("button", { name: /Registrar pagamento/ }),
  ).toHaveCount(0);

  // Retirada já realizada.
  await expect(
    page
      .locator("li", { hasText: RETIRADA })
      .getByRole("button", { name: /Registrar pagamento/ }),
  ).toHaveCount(0);
});

test("foco: abre a folha de pagamento e retorna ao gatilho ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: CONTA })
    .getByRole("button", { name: /Registrar pagamento/ });
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
