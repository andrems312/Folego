import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa B (exclusão) — agora acionada pela folha de detalhe (Etapa D).
 * Seed de demonstração: m5/m6 previstas (excluíveis); m4 conta pendente sem
 * pagamento (excluível); m1/m2/m3 com efeito no saldo (não excluíveis).
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

async function abrirDetalhe(page: Page, texto: string) {
  await page
    .locator("li", { hasText: texto })
    .getByRole("button", { name: /Abrir detalhes/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function abrirExclusao(page: Page, texto: string) {
  const detalhe = await abrirDetalhe(page, texto);
  await detalhe.getByRole("button", { name: "Excluir", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("exclui uma entrada prevista pelo detalhe: some da lista e persiste", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const confirm = await abrirExclusao(page, PREVISTA);
  await confirm.getByRole("button", { name: "Excluir", exact: true }).click();

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
  const confirm = await abrirExclusao(page, CONTA_PENDENTE);
  await confirm.getByRole("button", { name: "Excluir", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("li", { hasText: CONTA_PENDENTE })).toHaveCount(0);

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/2\.480,00/);
  await page.reload();
  await expect(heroLivre(page)).toHaveText(/2\.480,00/);
});

test("o detalhe não oferece 'Excluir' para movimentações com efeito no saldo", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  for (const texto of [RECEBIDA, SAIDA_PAGA, RETIRADA]) {
    const d = await abrirDetalhe(page, texto);
    await expect(
      d.getByRole("button", { name: "Excluir", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("o detalhe não oferece 'Excluir' para conta parcialmente paga", async ({
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
        valorPago: 40_000,
        descricao: "Conta parcial e2e",
      },
    ],
  });
  await page.goto("/movimentacoes");
  const d = await abrirDetalhe(page, "Conta parcial e2e");
  await expect(d.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(
    0,
  );
  await expect(d.getByRole("button", { name: "Pagar" })).toBeVisible();
});

test("cancelar a confirmação não exclui a movimentação", async ({ page }) => {
  await page.goto("/movimentacoes");
  const confirm = await abrirExclusao(page, PREVISTA);
  await confirm.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("li", { hasText: PREVISTA })).toBeVisible();
});

test("foco: abre a confirmação pelo detalhe e retorna à linha ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Abrir detalhes/ });
  await gatilho.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
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
