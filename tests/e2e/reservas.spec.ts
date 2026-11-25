import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.7 / Etapa D — Reservas (leitura).
 * Seed demo: reserva "Impostos" — saldo R$ 800,00, meta R$ 1.200,00 (falta R$ 400,00).
 */

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

test("renderiza a reserva seed com nome, saldo, meta, progresso e restante", async ({
  page,
}) => {
  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/reservas$/);

  // Resumo geral.
  await expect(page.getByText("Guardado em reservas")).toBeVisible();
  await expect(page.getByText(/1 reserva\b/)).toBeVisible();

  // Linha da reserva.
  const linha = page.locator("li", { hasText: "Impostos" });
  await expect(linha).toBeVisible();
  await expect(linha.getByText(/R\$\s*800,00/)).toBeVisible(); // saldo
  await expect(linha.getByText(/Meta de R\$\s*1\.200,00/)).toBeVisible();
  await expect(linha.getByText(/falta R\$\s*400,00/)).toBeVisible();

  // Progresso: 80.000 / 120.000 = 67%.
  const barra = linha.getByRole("progressbar");
  await expect(barra).toHaveAttribute("aria-valuenow", "67");
});

test("reserva sem meta mostra o saldo sem inventar progresso", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 0, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Emergência", saldoAtual: 50_000 }],
    movimentacoes: [],
  });
  await page.goto("/reservas");

  const linha = page.locator("li", { hasText: "Emergência" });
  await expect(linha.getByText(/R\$\s*500,00/)).toBeVisible();
  await expect(linha.getByText("Sem meta definida")).toBeVisible();
  await expect(linha.getByRole("progressbar")).toHaveCount(0);
});

test("estado vazio explica as reservas sem fingir ação", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 0, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [],
  });
  await page.goto("/reservas");

  await expect(
    page.getByText("Separe dinheiro sem tirar do caixa"),
  ).toBeVisible();
  await expect(page.getByText(/envelopes dentro do seu caixa/i)).toBeVisible();
  // Sem lista e sem "N reservas".
  await expect(page.getByText(/reservas?\b/).first()).toBeVisible(); // o eyebrow existe
  await expect(page.locator("li")).toHaveCount(0);
});

test("responsivo mobile: sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/reservas");
  await expect(page.getByText("Impostos")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
