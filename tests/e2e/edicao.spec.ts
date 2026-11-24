import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa C (edição) — agora acionada pela folha de detalhe (Etapa D).
 * Seed: m1 "Instalação elétrica" (recebida — valor bloqueado); m4 "Material"
 * (pendente — valor editável; reduzir p/ R$ 1.000,00 leva o livre a R$ 1.480,00).
 */

const CHAVE = "folego:estado:v1";

const REALIZADA = "Instalação elétrica"; // m1
const CONTA = "Material"; // m4
const PREVISTA = "Serviço concluído"; // m5

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

function naContaHoje(page: Page) {
  return page
    .getByText("Na conta hoje", { exact: true })
    .locator("xpath=following-sibling::dd");
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

async function abrirEdicao(page: Page, texto: string) {
  const detalhe = await abrirDetalhe(page, texto);
  await detalhe.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("edita informações não-financeiras de uma realizada; valor fica bloqueado", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const ed = await abrirEdicao(page, REALIZADA);

  await expect(ed.getByText(/não pode ser alterado/i)).toBeVisible();
  await expect(ed.locator("#valor-edicao")).toHaveCount(0);

  await ed.getByLabel("Categoria").selectOption({ value: "ferramentas" });
  await ed.getByLabel("Descrição (opcional)").fill("Instalação revisada");
  await ed.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();

  const linha = page.locator("li", { hasText: "Instalação revisada" });
  await expect(linha).toBeVisible();
  await expect(linha.getByText(/Ferramentas/)).toBeVisible();

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(naContaHoje(page)).toHaveText(/4\.280,00/);
  await page.reload();
  await page.getByRole("link", { name: "Movimentações" }).first().click();
  await expect(page.getByText("Instalação revisada")).toBeVisible();
});

test("edita o valor de uma conta pendente; resumo reage e persiste", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const ed = await abrirEdicao(page, CONTA);
  await ed.getByLabel("Valor").fill("1.000,00");
  await ed.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();

  const linha = page.locator("li", { hasText: CONTA });
  await expect(linha.getByText(/1\.000,00/)).toBeVisible();
  await expect(linha.getByText("A pagar", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Visão geral" }).first().click();
  await expect(heroLivre(page)).toHaveText(/1\.480,00/);
  await page.reload();
  await expect(heroLivre(page)).toHaveText(/1\.480,00/);
});

test("editar valor abaixo do já pago é barrado; folha aberta e estado intacto", async ({
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
        descricao: "Conta parcial edit",
      },
    ],
  });
  await page.goto("/movimentacoes");
  const ed = await abrirEdicao(page, "Conta parcial edit");
  await ed.getByLabel("Valor").fill("300,00");
  await ed.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(ed).toBeVisible();
  await expect(ed.getByText(/menor do que você já pagou/i)).toBeVisible();
  await expect(ed.getByLabel("Valor")).toHaveValue("300,00");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator("li", { hasText: "Conta parcial edit" })
      .getByText(/Parcial · falta R\$\s*600,00/),
  ).toBeVisible();
});

test("foco: abre a edição pelo detalhe e retorna à linha ao fechar (Escape)", async ({
  page,
}) => {
  await page.goto("/movimentacoes");
  const gatilho = page
    .locator("li", { hasText: PREVISTA })
    .getByRole("button", { name: /Abrir detalhes/ });
  await gatilho.click();
  await page.getByRole("dialog").getByRole("button", { name: "Editar" }).click();
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
