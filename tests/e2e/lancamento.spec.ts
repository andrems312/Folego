import { expect, test, type Page } from "@playwright/test";

const CHAVE = "folego:estado:v1";

async function semearVazio(page: Page): Promise<void> {
  await page.addInitScript(
    (chave) => {
      try {
        window.localStorage.setItem(
          chave,
          JSON.stringify({
            versao: 1,
            estado: {
              config: { saldoAbertura: 0, margemSeguranca: 0 },
              movimentacoes: [],
              reservas: [],
            },
          }),
        );
      } catch {
        /* ignore */
      }
    },
    CHAVE,
  );
}

async function abrirFolhaDesktop(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Lançar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("abre e fecha a folha de lançamento (Escape)", async ({ page }) => {
  await page.goto("/movimentacoes");
  await abrirFolhaDesktop(page);
  await expect(page.getByText("Novo lançamento")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cria uma entrada recebida e ela aparece na lista", async ({ page }) => {
  await semearVazio(page);
  await page.goto("/movimentacoes");
  await expect(page.getByText(/Nada por aqui ainda/i)).toBeVisible();

  await abrirFolhaDesktop(page);
  await page.getByLabel("Valor").fill("100,00");
  await page.getByLabel("Descrição (opcional)").fill("Serviço de teste");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByText("Lançamento salvo.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Serviço de teste")).toBeVisible();
  await expect(page.getByText(/100,00/).first()).toBeVisible();
});

test("cria uma saída pendente, exibida como 'A pagar'", async ({ page }) => {
  await semearVazio(page);
  await page.goto("/movimentacoes");
  await abrirFolhaDesktop(page);

  await page.getByRole("button", { name: "Saída", exact: true }).click();
  await page.getByLabel("Valor").fill("50,00");
  await page.getByRole("button", { name: "Ainda vou pagar" }).click();
  await page.getByLabel("Descrição (opcional)").fill("Conta de luz");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Conta de luz")).toBeVisible();
  await expect(page.getByText("A pagar")).toBeVisible();
});

test("cria uma retirada", async ({ page }) => {
  await semearVazio(page);
  await page.goto("/movimentacoes");
  await abrirFolhaDesktop(page);

  await page.getByRole("button", { name: "Retirada", exact: true }).click();
  await page.getByLabel("Valor").fill("30,00");
  await page.getByLabel("Descrição (opcional)").fill("Retirada teste");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Retirada teste")).toBeVisible();
  await expect(page.getByText(/30,00/).first()).toBeVisible();
});

test("a Visão geral reflete a criação sem reload", async ({ page }) => {
  await semearVazio(page);
  await page.goto("/");
  await expect(page.getByText("Livre pra usar", { exact: true })).toBeVisible();

  await abrirFolhaDesktop(page);
  await page.getByLabel("Valor").fill("200,00");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/200,00/).first()).toBeVisible();
});

test("valor inválido mostra erro e não fecha a folha", async ({ page }) => {
  await page.goto("/movimentacoes");
  await abrirFolhaDesktop(page);
  await page.getByLabel("Valor").fill("0,00");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/maior que zero/i)).toBeVisible();
});

test("o lançamento persiste após recarregar a página", async ({ page }) => {
  // Sem semear: o seed (demo) é persistido; um addInitScript re-semearia no reload.
  await page.goto("/movimentacoes");
  await abrirFolhaDesktop(page);
  await page.getByLabel("Valor").fill("77,00");
  await page.getByLabel("Descrição (opcional)").fill("Persistido");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByText("Persistido")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Persistido")).toBeVisible();
});

test("entrada pendente: aparece como 'Previsto' e não entra no 'Livre pra usar'", async ({
  page,
}) => {
  // Sem semear: usa o seed (demo), cujo "Livre pra usar" é estável e persiste no reload.
  await page.goto("/");

  const heroValor = page
    .getByText("Livre pra usar", { exact: true })
    .locator("xpath=following-sibling::p[1]");
  await expect(heroValor).toBeVisible();
  const livreAntes = (await heroValor.textContent())?.trim() ?? "";
  expect(livreAntes).toMatch(/R\$/);

  await abrirFolhaDesktop(page);
  await page.getByLabel("Valor").fill("500,00");
  // Entrada é o tipo padrão; marca a situação como ainda a receber (prevista).
  await page.getByRole("button", { name: "Ainda vou receber" }).click();
  await page.getByLabel("Descrição (opcional)").fill("Serviço agendado e2e");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // O previsto NÃO altera o "Livre pra usar".
  await expect(heroValor).toHaveText(livreAntes);

  // Na listagem, a linha correta está marcada como "Previsto".
  await page.goto("/movimentacoes");
  const linha = page.locator("li", { hasText: "Serviço agendado e2e" });
  await expect(linha).toBeVisible();
  await expect(linha.getByText("Previsto", { exact: true })).toBeVisible();
  await expect(linha.getByText(/500,00/)).toBeVisible();

  // Persiste após recarregar.
  await page.reload();
  await expect(
    page.locator("li", { hasText: "Serviço agendado e2e" }),
  ).toBeVisible();
});

test("foco retorna ao botão que abriu a folha ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");

  const gatilho = page.getByRole("button", { name: "Lançar" });
  await gatilho.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // O foco entra na folha (fica contido no diálogo), não permanece no gatilho.
  const focoNoDialogo = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const ativo = document.activeElement;
    return !!(d && ativo && d.contains(ativo));
  });
  expect(focoNoDialogo).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // E retorna ao botão que a abriu.
  await expect(gatilho).toBeFocused();
});

test("fluxo mobile: abre pela barra inferior e cria, sem overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await semearVazio(page);
  await page.goto("/movimentacoes");

  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Valor").fill("10,00");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/10,00/).first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
