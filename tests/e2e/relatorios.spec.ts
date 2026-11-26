import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.8 / Etapa B — Resumo dos Relatórios (base competência).
 *
 * Seeds deterministas via localStorage. Para valores exatos usamos um período
 * personalizado fixo (independe de "hoje"); para "Este mês"/"Mês passado" usamos
 * datas calculadas em relação à data atual.
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const SO_ABERTURA = { config: { saldoAbertura: 300_000, margemSeguranca: 0 } };

test("período personalizado mostra os indicadores com valores corretos", async ({
  page,
}) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "e1", tipo: "entrada", valor: 300_000, data: "2026-03-10", categoriaId: "servicos", status: "realizado" },
      { id: "e2", tipo: "entrada", valor: 200_000, data: "2026-03-20", categoriaId: "servicos", status: "pendente" },
      { id: "s1", tipo: "saida", valor: 50_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "s2", tipo: "saida", valor: 40_000, data: "2026-03-25", categoriaId: "ferramentas", status: "pendente" },
      { id: "r1", tipo: "retirada", valor: 20_000, data: "2026-03-18", categoriaId: "retirada", status: "realizado" },
      // Fora de março — não pode aparecer:
      { id: "fora", tipo: "entrada", valor: 999_999, data: "2026-04-02", categoriaId: "servicos", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");

  await page.getByRole("button", { name: "Personalizado" }).click();
  await page.getByLabel("Início").fill("2026-03-01");
  await page.getByLabel("Fim").fill("2026-03-31");

  await expect(page.getByText(/R\$\s*3\.000,00/)).toBeVisible(); // Recebidas
  await expect(page.getByText(/R\$\s*2\.000,00/)).toBeVisible(); // A receber
  await expect(page.getByText(/R\$\s*500,00/)).toBeVisible(); // Pagas
  await expect(page.getByText(/R\$\s*400,00/)).toBeVisible(); // A pagar
  await expect(page.getByText(/R\$\s*200,00/)).toBeVisible(); // Retiradas
  await expect(page.getByText(/R\$\s*2\.300,00/)).toBeVisible(); // Resultado (3000−500−200)
  await expect(page.getByText(/5 movimentações no período/)).toBeVisible();

  // O lançamento de abril não entra no período.
  await expect(page.getByText(/R\$\s*9\.999,99/)).toHaveCount(0);
});

test("nota de transparência (competência) fica visível", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "e1", tipo: "entrada", valor: 100_000, data: isoLocal(new Date()), categoriaId: "servicos", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");

  await expect(
    page.getByText(/Por data de lançamento \(competência\)/),
  ).toBeVisible();
});

test("Este mês e Mês passado selecionam o período certo e atualizam os valores", async ({
  page,
}) => {
  const agora = new Date();
  const hoje = isoLocal(agora);
  const mesPassado = isoLocal(new Date(agora.getFullYear(), agora.getMonth() - 1, 15));

  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      // Mês atual: Recebidas 1.000,00 (valor único, distinto do Resultado).
      { id: "atual-e", tipo: "entrada", valor: 100_000, data: hoje, categoriaId: "servicos", status: "realizado" },
      { id: "atual-s", tipo: "saida", valor: 40_000, data: hoje, categoriaId: "materiais", status: "realizado" },
      // Mês passado: Recebidas 5.000,00 (valor único).
      { id: "ant-e", tipo: "entrada", valor: 500_000, data: mesPassado, categoriaId: "servicos", status: "realizado" },
      { id: "ant-s", tipo: "saida", valor: 50_000, data: mesPassado, categoriaId: "materiais", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");

  // Padrão = Este mês: vê Recebidas de hoje (1.000,00), não o do mês passado.
  await expect(page.getByText(/R\$\s*1\.000,00/)).toBeVisible();
  await expect(page.getByText(/R\$\s*5\.000,00/)).toHaveCount(0);

  await page.getByRole("button", { name: "Mês passado" }).click();

  // Agora vê Recebidas do mês passado (5.000,00) e some o de hoje.
  await expect(page.getByText(/R\$\s*5\.000,00/)).toBeVisible();
  await expect(page.getByText(/R\$\s*1\.000,00/)).toHaveCount(0);
});

test("período sem movimentações mostra o estado vazio", async ({ page }) => {
  await semearEstado(page, { ...SO_ABERTURA, reservas: [], movimentacoes: [] });
  await page.goto("/relatorios");

  await expect(
    page.getByText(/Ainda não há dados suficientes para um relatório deste período/),
  ).toBeVisible();
});

test("período inválido (início depois do fim) não mostra o resumo", async ({
  page,
}) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "x", tipo: "entrada", valor: 100_000, data: "2030-01-15", categoriaId: "servicos", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");

  await page.getByRole("button", { name: "Personalizado" }).click();
  await page.getByLabel("Início").fill("2030-01-20");
  await page.getByLabel("Fim").fill("2030-01-10");

  await expect(
    page.getByText(/A data de início precisa ser igual ou anterior/),
  ).toBeVisible();
  await expect(page.getByText(/Ajuste as datas para ver o relatório/)).toBeVisible();
  await expect(page.getByText("Resultado do período")).toHaveCount(0);
});

test("estado de recuperação quando os dados salvos são inválidos", async ({
  page,
}) => {
  await semearEstado(page, { config: "quebrado" });
  await page.goto("/relatorios");

  await expect(
    page.getByText("Encontramos dados salvos com problema"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Recomeçar do zero" })).toBeVisible();
});

test("responsivo mobile: sem overflow horizontal", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "m", tipo: "entrada", valor: 123_456, data: isoLocal(new Date()), categoriaId: "servicos", status: "realizado" },
    ],
  });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/relatorios");

  await expect(page.getByText("Resultado do período")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
