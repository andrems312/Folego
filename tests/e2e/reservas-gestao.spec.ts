import { expect, test, type Page } from "@playwright/test";

/**
 * Entrega 2.7 / Etapa E — Gestão de reservas.
 * Seed demo: reserva "Impostos" (saldo R$ 800,00, meta R$ 1.200,00); livre R$ 1.330,00.
 */

const CHAVE = "folego:estado:v1";
const IMPOSTOS = "Impostos";

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

async function abrirDetalhe(page: Page, nome: string) {
  await page
    .locator("li", { hasText: nome })
    .getByRole("button", { name: /Abrir reserva/ })
    .click();
  const d = page.getByRole("dialog");
  await expect(d).toBeVisible();
  return d;
}

const vazio = {
  config: { saldoAbertura: 300_000, margemSeguranca: 0 },
  reservas: [],
  movimentacoes: [],
};

test("criar reserva com meta a partir do estado vazio", async ({ page }) => {
  await semearEstado(page, vazio);
  await page.goto("/reservas");

  await page.getByRole("button", { name: "Criar primeira reserva" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Férias");
  await dialog.getByLabel("Meta (opcional)").fill("500,00");
  await dialog.getByRole("button", { name: "Criar reserva", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Reserva criada.")).toBeVisible();

  const linha = page.locator("li", { hasText: "Férias" });
  await expect(linha.getByText(/R\$\s*0,00/)).toBeVisible();
  await expect(linha.getByText(/Meta de R\$\s*500,00/)).toBeVisible();
});

test("a reserva criada persiste após recarregar", async ({ page }) => {
  // Sem semear (seed demo é persistido; um addInitScript re-semearia no reload).
  await page.goto("/reservas");
  await page.getByRole("button", { name: "Nova reserva" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Poupança");
  await dialog.getByRole("button", { name: "Criar reserva", exact: true }).click();
  await expect(page.locator("li", { hasText: "Poupança" })).toBeVisible();

  await page.reload();
  await expect(page.locator("li", { hasText: "Poupança" })).toBeVisible();
});

test("criar reserva sem meta mostra 'Sem meta definida'", async ({ page }) => {
  await semearEstado(page, vazio);
  await page.goto("/reservas");

  await page.getByRole("button", { name: "Criar primeira reserva" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Emergência");
  await dialog.getByRole("button", { name: "Criar reserva", exact: true }).click();

  const linha = page.locator("li", { hasText: "Emergência" });
  await expect(linha.getByText("Sem meta definida")).toBeVisible();
});

test("não duplica reserva ao enviar duas vezes seguidas", async ({ page }) => {
  await semearEstado(page, vazio);
  await page.goto("/reservas");

  await page.getByRole("button", { name: "Criar primeira reserva" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Única");
  await dialog
    .getByRole("button", { name: "Criar reserva", exact: true })
    .dblclick();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("li", { hasText: "Única" })).toHaveCount(1);
});

test("editar nome e meta, depois remover a meta", async ({ page }) => {
  await page.goto("/reservas");
  let d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Editar" }).click();

  let form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill("Tributos");
  await form.getByLabel("Meta (opcional)").fill("1.500,00");
  await form.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  const linha = page.locator("li", { hasText: "Tributos" });
  await expect(linha.getByText(/Meta de R\$\s*1\.500,00/)).toBeVisible();

  // Remover a meta: limpar o campo.
  d = await abrirDetalhe(page, "Tributos");
  await d.getByRole("button", { name: "Editar" }).click();
  form = page.getByRole("dialog");
  await form.getByLabel("Meta (opcional)").fill("");
  await form.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(
    page.locator("li", { hasText: "Tributos" }).getByText("Sem meta definida"),
  ).toBeVisible();
});

test("guardar dinheiro aumenta a reserva e reduz o livre", async ({ page }) => {
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Guardar", exact: true }).click();

  const folha = page.getByRole("dialog");
  await expect(folha.getByText("Disponível pra guardar")).toBeVisible();
  await expect(folha.getByText(/1\.330,00/)).toBeVisible(); // livre disponível
  await folha.getByLabel("Quanto guardar").fill("200,00");
  await folha.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Dinheiro guardado.")).toBeVisible();
  await expect(
    page.locator("li", { hasText: IMPOSTOS }).getByText(/R\$\s*1\.000,00/),
  ).toBeVisible();

  // Livre caiu de 1.330 para 1.130.
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/1\.130,00/);
});

test("resgatar dinheiro reduz a reserva", async ({ page }) => {
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Resgatar", exact: true }).click();

  const folha = page.getByRole("dialog");
  await folha.getByLabel("Quanto resgatar").fill("300,00");
  await folha.getByRole("button", { name: "Resgatar", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Dinheiro resgatado.")).toBeVisible();
  await expect(
    page.locator("li", { hasText: IMPOSTOS }).getByText(/R\$\s*500,00/),
  ).toBeVisible();
});

test("resgatar acima do saldo é barrado pelo domínio", async ({ page }) => {
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Resgatar", exact: true }).click();

  const folha = page.getByRole("dialog");
  await folha.getByLabel("Quanto resgatar").fill("5.000,00");
  await folha.getByRole("button", { name: "Resgatar", exact: true }).click();

  await expect(folha).toBeVisible();
  await expect(folha.getByText(/mais do que guardou/i)).toBeVisible();
});

test("guardar acima do disponível é barrado pela interface", async ({ page }) => {
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Guardar", exact: true }).click();

  const folha = page.getByRole("dialog");
  await folha.getByLabel("Quanto guardar").fill("5.000,00"); // > livre 1.330,00
  await folha.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(folha).toBeVisible();
  await expect(folha.getByText(/só pode guardar até/i)).toBeVisible();
});

test("excluir reserva sem saldo", async ({ page }) => {
  await semearEstado(page, {
    config: { saldoAbertura: 100_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Vazia", saldoAtual: 0 }],
    movimentacoes: [],
  });
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, "Vazia");
  await d.getByRole("button", { name: "Excluir" }).click();

  const confirm = page.getByRole("dialog");
  await confirm.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Reserva excluída.")).toBeVisible();
  await expect(page.locator("li", { hasText: "Vazia" })).toHaveCount(0);
});

test("excluir reserva com saldo libera o valor para o livre", async ({ page }) => {
  await page.goto("/reservas"); // demo: Impostos saldo 800, livre 1.330
  const d = await abrirDetalhe(page, IMPOSTOS);
  await d.getByRole("button", { name: "Excluir" }).click();

  const confirm = page.getByRole("dialog");
  await expect(confirm.getByText(/voltam a compor o seu/i)).toBeVisible();
  await confirm.getByRole("button", { name: "Excluir" }).click();

  await expect(page.locator("li", { hasText: IMPOSTOS })).toHaveCount(0);
  // Livre sobe de 1.330 para 2.130 (800 deixam de estar comprometidos).
  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/2\.130,00/);
});

test("exclusão bloqueada quando a reserva tem conta vinculada", async ({
  page,
}) => {
  await semearEstado(page, {
    config: { saldoAbertura: 200_000, margemSeguranca: 0 },
    reservas: [{ id: "r1", nome: "Impostos vinculada", saldoAtual: 30_000 }],
    movimentacoes: [
      {
        id: "c",
        tipo: "saida",
        valor: 50_000,
        data: "2026-03-10",
        categoriaId: "impostos",
        status: "pendente",
        reservaId: "r1",
      },
    ],
  });
  await page.goto("/reservas");
  const d = await abrirDetalhe(page, "Impostos vinculada");
  await d.getByRole("button", { name: "Excluir" }).click();

  const confirm = page.getByRole("dialog");
  await confirm.getByRole("button", { name: "Excluir" }).click();

  await expect(confirm).toBeVisible();
  await expect(confirm.getByText(/ligada a uma conta|desfaça o vínculo/i)).toBeVisible();
  // Estado intacto.
  await page.keyboard.press("Escape");
  await expect(
    page.locator("li", { hasText: "Impostos vinculada" }),
  ).toBeVisible();
});

test("responsivo mobile: sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/reservas");
  await expect(page.getByText(IMPOSTOS)).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
