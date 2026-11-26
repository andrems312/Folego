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
  // "Pagas" (500,00) também aparece no gráfico; escopa à linha do resumo.
  await expect(
    page.locator("xpath=//dt[normalize-space(.)='Pagas']/following-sibling::dd[1]"),
  ).toHaveText(/R\$\s*500,00/);
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

/* ======================================================================
 * Etapa C — Gráfico de despesas por categoria
 * ==================================================================== */

async function abrirMarco2026(page: Page) {
  await page.getByRole("button", { name: "Personalizado" }).click();
  await page.getByLabel("Início").fill("2026-03-01");
  await page.getByLabel("Fim").fill("2026-03-31");
}

function grafico(page: Page) {
  return page.getByRole("figure", { name: /Para onde o dinheiro foi/ });
}

test("gráfico: múltiplas categorias, ordenação, valores e retiradas de fora", async ({
  page,
}) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "mat", tipo: "saida", valor: 60_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "fer", tipo: "saida", valor: 30_000, data: "2026-03-10", categoriaId: "ferramentas", status: "realizado" },
      { id: "imp", tipo: "saida", valor: 15_000, data: "2026-03-15", categoriaId: "impostos", status: "realizado" },
      { id: "des", tipo: "saida", valor: 3_000, data: "2026-03-20", categoriaId: "deslocamento", status: "realizado" },
      // Retirada — NÃO pode aparecer no gráfico de despesas.
      { id: "ret", tipo: "retirada", valor: 50_000, data: "2026-03-18", categoriaId: "retirada", status: "realizado" },
      // Saída pendente — só o pago entra no gráfico.
      { id: "pend", tipo: "saida", valor: 99_999, data: "2026-03-25", categoriaId: "materiais", status: "pendente" },
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  const fig = grafico(page);
  await expect(fig).toBeVisible();

  // Total das despesas pagas = 600+300+150+30 = 1.080,00 (não inclui retirada).
  await expect(fig.locator("figcaption").getByText(/R\$\s*1\.080,00/)).toBeVisible();

  // Valores por categoria (só o pago; pendente de materiais não soma).
  await expect(fig.locator("li", { hasText: "Materiais" }).getByText(/R\$\s*600,00/)).toBeVisible();
  await expect(fig.locator("li", { hasText: "Ferramentas" }).getByText(/R\$\s*300,00/)).toBeVisible();
  await expect(fig.locator("li", { hasText: "Impostos" }).getByText(/R\$\s*150,00/)).toBeVisible();
  await expect(
    fig.locator("li", { hasText: "Deslocamento" }).getByText(/R\$\s*30,00/),
  ).toBeVisible();

  // Ordenação do maior para o menor.
  const nomes = await fig.locator("ul > li").evaluateAll((lis) =>
    lis.map((li) => li.querySelector("span")?.textContent?.split(" ·")[0] ?? ""),
  );
  expect(nomes).toEqual([
    "Materiais",
    "Ferramentas",
    "Impostos",
    "Deslocamento/combustível",
  ]);

  // Retirada fica fora do gráfico (não há "Retirada pessoal" nem R$ 500,00 aqui).
  await expect(fig.getByText("Retirada pessoal")).toHaveCount(0);
  await expect(fig.getByText(/R\$\s*500,00/)).toHaveCount(0);
  // Mas a retirada aparece no resumo (fora da figura).
  await expect(page.getByText(/R\$\s*500,00/)).toBeVisible();
});

test("gráfico: proporção das barras relativa à maior despesa", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "mat", tipo: "saida", valor: 60_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "fer", tipo: "saida", valor: 30_000, data: "2026-03-10", categoriaId: "ferramentas", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  const fig = grafico(page);
  // A maior (materiais) ocupa 100%; ferramentas (metade) ocupa 50%.
  const barraMat = fig.locator("li", { hasText: "Materiais" }).locator("rect").last();
  const barraFer = fig.locator("li", { hasText: "Ferramentas" }).locator("rect").last();
  await expect(barraMat).toHaveAttribute("width", "100%");
  await expect(barraFer).toHaveAttribute("width", "50%");
});

test("gráfico: categoria única ocupa a barra inteira", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "imp", tipo: "saida", valor: 25_000, data: "2026-03-10", categoriaId: "impostos", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  const fig = grafico(page);
  await expect(fig.locator("ul > li")).toHaveCount(1);
  await expect(fig.getByText("Impostos")).toBeVisible();
  await expect(
    fig.locator("li", { hasText: "Impostos" }).getByText(/R\$\s*250,00/),
  ).toBeVisible();
  await expect(
    fig.locator("li", { hasText: "Impostos" }).locator("rect").last(),
  ).toHaveAttribute("width", "100%");
});

test("gráfico: valor pequeno continua visível (piso da barra)", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "mat", tipo: "saida", valor: 100_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "imp", tipo: "saida", valor: 1_000, data: "2026-03-10", categoriaId: "impostos", status: "realizado" }, // 1% do maior
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  const fig = grafico(page);
  // 1% ficaria quase invisível; o piso garante 2%.
  await expect(
    fig.locator("li", { hasText: "Impostos" }).locator("rect").last(),
  ).toHaveAttribute("width", "2%");
});

test("gráfico: período sem despesas pagas mostra o vazio editorial", async ({
  page,
}) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      // Só entrada recebida e saída pendente: nenhuma despesa paga.
      { id: "e", tipo: "entrada", valor: 100_000, data: "2026-03-10", categoriaId: "servicos", status: "realizado" },
      { id: "s", tipo: "saida", valor: 40_000, data: "2026-03-12", categoriaId: "materiais", status: "pendente" },
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  await expect(
    page.getByText(/Não há despesas pagas neste período para detalhar por categoria/),
  ).toBeVisible();
  // Não renderiza barras artificiais.
  await expect(grafico(page)).toHaveCount(0);
});

test("gráfico: descrição acessível com total e nº de categorias", async ({
  page,
}) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "mat", tipo: "saida", valor: 60_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "fer", tipo: "saida", valor: 30_000, data: "2026-03-10", categoriaId: "ferramentas", status: "realizado" },
    ],
  });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  await expect(
    grafico(page).getByText(/Total de R\$\s*900,00 em 2 categorias/),
  ).toBeVisible();
});

test("gráfico: responsivo mobile sem overflow", async ({ page }) => {
  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "mat", tipo: "saida", valor: 60_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado" },
      { id: "fer", tipo: "saida", valor: 30_000, data: "2026-03-10", categoriaId: "ferramentas", status: "realizado" },
      { id: "imp", tipo: "saida", valor: 15_000, data: "2026-03-15", categoriaId: "impostos", status: "realizado" },
    ],
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/relatorios");
  await abrirMarco2026(page);

  await expect(grafico(page)).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

/* ======================================================================
 * Etapa D — Tabela detalhada dos lançamentos
 * ==================================================================== */

async function abrirTabela(page: Page) {
  await page.getByText("Lançamentos do período", { exact: true }).click();
}

const SEED_MARCO = {
  ...SO_ABERTURA,
  reservas: [],
  movimentacoes: [
    { id: "ea", tipo: "entrada", valor: 300_000, data: "2026-03-10", categoriaId: "servicos", status: "realizado", descricao: "Serviço A" },
    { id: "eb", tipo: "entrada", valor: 200_000, data: "2026-03-20", categoriaId: "servicos", status: "pendente", descricao: "Serviço B" },
    { id: "sx", tipo: "saida", valor: 50_000, data: "2026-03-05", categoriaId: "materiais", status: "realizado", descricao: "Material X" },
    { id: "sy", tipo: "saida", valor: 40_000, data: "2026-03-25", categoriaId: "ferramentas", status: "pendente", descricao: "Ferramenta Y" },
    { id: "sz", tipo: "saida", valor: 100_000, valorPago: 30_000, data: "2026-03-12", categoriaId: "materiais", status: "pendente", descricao: "Fornecedor Z" },
    { id: "rr", tipo: "retirada", valor: 20_000, data: "2026-03-18", categoriaId: "retirada", status: "realizado", descricao: "Pró-labore" },
    // Fora do período:
    { id: "fora", tipo: "entrada", valor: 999_999, data: "2026-04-02", categoriaId: "servicos", status: "realizado", descricao: "Fora do mês" },
  ],
};

test("tabela: lançamentos do período, filtro, valores realizado/pendente", async ({
  page,
}) => {
  await semearEstado(page, SEED_MARCO);
  await page.goto("/relatorios");
  await abrirMarco2026(page);
  await abrirTabela(page);

  const tabela = page.getByRole("table");
  await expect(tabela).toBeVisible();

  // 6 lançamentos no período (o de abril fica de fora).
  await expect(tabela.locator("tbody tr")).toHaveCount(6);
  await expect(tabela.getByText("Fora do mês")).toHaveCount(0);

  // Pagamento parcial: realizado −R$300,00 e pendente R$700,00 na mesma linha.
  const parcial = tabela.locator("tr", { hasText: "Fornecedor Z" });
  await expect(parcial.getByText(/R\$\s*300,00/)).toBeVisible();
  await expect(parcial.getByText(/R\$\s*700,00/)).toBeVisible();

  // Entrada prevista: pendente R$2.000,00 (não é recebida).
  const prevista = tabela.locator("tr", { hasText: "Serviço B" });
  await expect(prevista.getByText(/R\$\s*2\.000,00/)).toBeVisible();

  // Saída a pagar: pendente R$400,00.
  await expect(
    tabela.locator("tr", { hasText: "Ferramenta Y" }).getByText(/R\$\s*400,00/),
  ).toBeVisible();

  // Retirada identificada como retirada, com a categoria própria.
  const retirada = tabela.locator("tr", { hasText: "Pró-labore" });
  await expect(retirada.getByText("Retirada", { exact: true })).toBeVisible();
  await expect(retirada.getByText("Retirada pessoal")).toBeVisible();
  await expect(retirada.getByText(/R\$\s*200,00/)).toBeVisible();
});

test("tabela: ordenação do mais recente ao mais antigo", async ({ page }) => {
  await semearEstado(page, SEED_MARCO);
  await page.goto("/relatorios");
  await abrirMarco2026(page);
  await abrirTabela(page);

  const descricoes = await page
    .getByRole("table")
    .locator("tbody tr td:nth-child(2)")
    .allInnerTexts();
  expect(descricoes).toEqual([
    "Ferramenta Y", // 25
    "Serviço B", // 20
    "Pró-labore", // 18
    "Fornecedor Z", // 12
    "Serviço A", // 10
    "Material X", // 05
  ]);
});

test("tabela: estrutura acessível (cabeçalhos de coluna)", async ({ page }) => {
  await semearEstado(page, SEED_MARCO);
  await page.goto("/relatorios");
  await abrirMarco2026(page);
  await abrirTabela(page);

  for (const nome of ["Data", "Descrição", "Tipo", "Categoria", "Realizado", "Pendente"]) {
    await expect(page.getByRole("columnheader", { name: nome })).toBeVisible();
  }
});

test("tabela: atualiza ao trocar o período", async ({ page }) => {
  const agora = new Date();
  const hoje = isoLocal(agora);
  const mesPassado = isoLocal(new Date(agora.getFullYear(), agora.getMonth() - 1, 15));

  await semearEstado(page, {
    ...SO_ABERTURA,
    reservas: [],
    movimentacoes: [
      { id: "atual", tipo: "entrada", valor: 100_000, data: hoje, categoriaId: "servicos", status: "realizado", descricao: "Deste mês" },
      { id: "anterior", tipo: "entrada", valor: 500_000, data: mesPassado, categoriaId: "servicos", status: "realizado", descricao: "Do mês passado" },
    ],
  });
  await page.goto("/relatorios");
  await abrirTabela(page);

  const tabela = page.getByRole("table");
  await expect(tabela.getByText("Deste mês")).toBeVisible();
  await expect(tabela.getByText("Do mês passado")).toHaveCount(0);

  await page.getByRole("button", { name: "Mês passado" }).click();
  await expect(tabela.getByText("Do mês passado")).toBeVisible();
  await expect(tabela.getByText("Deste mês")).toHaveCount(0);
});

test("tabela: responsivo mobile usa listagem sem overflow", async ({ page }) => {
  await semearEstado(page, SEED_MARCO);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/relatorios");
  await abrirMarco2026(page);
  await abrirTabela(page);

  // No mobile a tabela fica oculta; a listagem compacta mostra os mesmos dados.
  await expect(page.getByRole("table")).toBeHidden();
  await expect(page.locator("details ul").getByText("Fornecedor Z")).toBeVisible();
  await expect(page.getByText(/Pendente R\$\s*700,00/)).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
