import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.6 / Etapa 2 — Resumo do Pulso em /previsao.
 *
 * A projeção usa "hoje" (UTC) real, e o seed demo tem datas relativas a hoje —
 * por isso os seeds de risco/negativo abaixo também usam datas relativas (emDias).
 */

const CHAVE = "folego:estado:v1";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatBRL = (centavos: number) => brl.format(centavos / 100);

function emDias(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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

test("abre /previsao no horizonte padrão de 7 dias, sem risco (seed demo)", async ({
  page,
}) => {
  await page.goto("/previsao");
  await expect(page).toHaveURL(/\/previsao$/);
  await expect(page.getByText("Pulso do caixa")).toBeVisible();

  // Padrão: 7 dias selecionado.
  await expect(page.getByRole("button", { name: "7 dias" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await expect(page.getByText(/Sem apertos à vista nos próximos 7 dias/)).toBeVisible();
  await expect(page.getByText("Na conta hoje")).toBeVisible();
  await expect(page.getByText(/4\.280,00/)).toBeVisible();

  // Nota honesta sobre a origem dos dados.
  await expect(page.getByText(/não é uma consulta ao seu banco/i)).toBeVisible();
});

test("alterna entre 7, 15 e 30 dias e os indicadores reagem", async ({ page }) => {
  await page.goto("/previsao");

  // 7 dias: nenhum recebimento previsto cai no período (m5/m6 são +8/+12).
  await expect(page.getByText(/próximos 7 dias/)).toBeVisible();
  await expect(page.getByText(/2\.400,00/)).toHaveCount(0);

  await page.getByRole("button", { name: "15 dias" }).click();
  await expect(page.getByRole("button", { name: "15 dias" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/próximos 15 dias/)).toBeVisible();
  await expect(page.getByText(/2\.400,00/)).toBeVisible(); // previstos entram no período

  await page.getByRole("button", { name: "30 dias" }).click();
  await expect(page.getByText(/próximos 30 dias/)).toBeVisible();
  await expect(page.getByText(/2\.400,00/)).toBeVisible();
});

test("cenário com risco destaca o primeiro dia de aperto", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 200_000, margemSeguranca: 100_000 },
    reservas: [],
    movimentacoes: [
      {
        id: "aluguel",
        tipo: "saida",
        valor: 150_000,
        data: emDias(3),
        categoriaId: "materiais",
        status: "pendente",
        descricao: "Aluguel",
      },
    ],
  });
  await page.goto("/previsao");

  await expect(page.getByText(/Seu caixa aperta em/)).toBeVisible();
  await expect(page.getByText(/Sem apertos/)).toHaveCount(0);
});

test("sem movimentações previstas não mostra tela vazia e exibe o saldo", async ({
  page,
}) => {
  await semearEstado(page, {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [
      {
        id: "e1",
        tipo: "entrada",
        valor: 50_000,
        data: "2026-01-01",
        categoriaId: "servicos",
        status: "realizado",
        descricao: "Serviço antigo",
      },
    ],
  });
  await page.goto("/previsao");

  await expect(
    page.getByText(/Nenhuma conta ou recebimento previsto/),
  ).toBeVisible();
  await expect(page.getByText("Na conta hoje")).toBeVisible();
  await expect(page.getByText(/1\.500,00/)).toBeVisible(); // 1.000 + 500
});

test("exibe valores negativos sem escondê-los", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 50_000, margemSeguranca: 0 },
    reservas: [],
    movimentacoes: [
      {
        id: "conta",
        tipo: "saida",
        valor: 150_000,
        data: emDias(2),
        categoriaId: "materiais",
        status: "pendente",
        descricao: "Conta grande",
      },
    ],
  });
  await page.goto("/previsao");

  // Menor saldo garantido = 50.000 − 150.000 = −100.000 (R$ -1.000,00): exibido,
  // não escondido (pode aparecer em mais de um indicador do período).
  await expect(page.getByText(formatBRL(-100_000)).first()).toBeVisible();
});

test("responsivo mobile: sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/previsao");
  await expect(page.getByText("Pulso do caixa")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("acessibilidade: seletor de horizonte comunica o estado selecionado", async ({
  page,
}) => {
  await page.goto("/previsao");
  await expect(
    page.getByRole("group", { name: "Horizonte da previsão" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "7 dias" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "30 dias" }).click();
  await expect(page.getByRole("button", { name: "30 dias" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "7 dias" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
