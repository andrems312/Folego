import { expect, test, type Page } from "@playwright/test";

const CHAVE = "folego:estado:v1";

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

test("lista as movimentações do store ao abrir a rota", async ({ page }) => {
  await page.goto("/movimentacoes");
  await expect(page).toHaveURL(/\/movimentacoes$/);
  // dados vindos do store (seed) após a hidratação
  await expect(page.getByText(/Material.*fornecedor/).first()).toBeVisible();
  await expect(page.getByText(/Instalação elétrica/).first()).toBeVisible();
});

test("ordena por data decrescente (mais recente acima)", async ({ page }) => {
  await page.goto("/movimentacoes");
  const recente = page.getByText(/Manutenção.*aguardando/).first();
  const antigo = page.getByText(/Instalação elétrica/).first();
  await expect(recente).toBeVisible();
  await expect(antigo).toBeVisible();
  const yRecente = (await recente.boundingBox())!.y;
  const yAntigo = (await antigo.boundingBox())!.y;
  expect(yRecente).toBeLessThan(yAntigo);
});

test("alterna os filtros de tipo sem reload", async ({ page }) => {
  await page.goto("/movimentacoes");
  await expect(page.getByText(/Material.*fornecedor/).first()).toBeVisible();

  await page.getByRole("button", { name: "Entradas" }).click();
  await expect(page.getByText(/Instalação elétrica/).first()).toBeVisible();
  await expect(page.getByText(/Material.*fornecedor/)).toHaveCount(0);

  await page.getByRole("button", { name: "Saídas" }).click();
  await expect(page.getByText(/Material.*fornecedor/).first()).toBeVisible();
  await expect(page.getByText(/Instalação elétrica/)).toHaveCount(0);

  await page.getByRole("button", { name: "Retiradas" }).click();
  await expect(page.getByText(/Retirada pessoal/).first()).toBeVisible();
  await expect(page.getByText(/Material.*fornecedor/)).toHaveCount(0);
});

test("estado vazio quando não há nenhuma movimentação", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 0, margemSeguranca: 0 },
    movimentacoes: [],
    reservas: [],
  });
  await page.goto("/movimentacoes");
  await expect(page.getByText(/Nada por aqui ainda/i)).toBeVisible();
});

test("filtro sem resultados não se confunde com conta vazia", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 0, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [
      {
        id: "e1",
        tipo: "entrada",
        valor: 50_000,
        data: "2026-03-10",
        categoriaId: "servicos",
        status: "realizado",
        descricao: "Serviço avulso",
      },
    ],
  });
  await page.goto("/movimentacoes");
  await expect(page.getByText("Serviço avulso")).toBeVisible();

  await page.getByRole("button", { name: "Saídas" }).click();
  await expect(page.getByText(/Nenhuma movimentação desse tipo/i)).toBeVisible();
});

test("responsivo mobile: sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/movimentacoes");
  await expect(page.getByText(/Material.*fornecedor/).first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
