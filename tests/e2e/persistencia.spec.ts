import { expect, test } from "@playwright/test";

const CHAVE = "folego:estado:v1";

/** Semeia o localStorage antes de qualquer script da página. */
async function semear(
  page: import("@playwright/test").Page,
  valor: string,
): Promise<void> {
  await page.addInitScript(
    (dados) => {
      try {
        window.localStorage.setItem(dados.chave, dados.valor);
      } catch {
        /* ignore */
      }
    },
    { chave: CHAVE, valor },
  );
}

test("A — usuário retornando: carrega os dados salvos e o demo NÃO os substitui", async ({
  page,
}) => {
  // Estado válido, distinto do demo (livre pra usar = R$ 7.777,00).
  const estado = {
    config: { saldoAbertura: 777_700, margemSeguranca: 0 },
    movimentacoes: [],
    reservas: [],
  };
  await semear(page, JSON.stringify({ versao: 1, estado }));

  await page.goto("/");

  // Carregou os dados salvos...
  await expect(page.getByText(/7\.777,00/).first()).toBeVisible();
  // ...e o seed de demonstração (R$ 1.330,00) NÃO aparece.
  await expect(page.getByText(/1\.330,00/)).toHaveCount(0);

  // Os dados no armazenamento continuam sendo os do usuário (não o demo).
  const salvo = await page.evaluate((c) => window.localStorage.getItem(c), CHAVE);
  expect(salvo).toContain("777700");
  expect(salvo).not.toContain("300000"); // saldoAbertura do demo
});

test("B — dados inválidos: entra em recuperação e preserva o conteúdo original", async ({
  page,
}) => {
  const corrompido = "{ isto não é json valido";
  await semear(page, corrompido);

  await page.goto("/");

  // Modo de recuperação é apresentado (sem assumir início do zero).
  await expect(page.getByText(/dados salvos com problema/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Recomeçar do zero/i }),
  ).toBeVisible();

  // Conteúdo original preservado: nenhuma gravação automática o substituiu.
  const salvo = await page.evaluate((c) => window.localStorage.getItem(c), CHAVE);
  expect(salvo).toBe(corrompido);
});

test("C — falha de escrita: app funciona em memória e comunica a indisponibilidade", async ({
  page,
}) => {
  // Sabota apenas o setItem (getItem continua funcionando).
  await page.addInitScript(() => {
    try {
      const proto = Object.getPrototypeOf(window.localStorage);
      Object.defineProperty(proto, "setItem", {
        configurable: true,
        value() {
          throw new Error("setItem bloqueado no teste");
        },
      });
    } catch {
      /* ignore */
    }
  });

  await page.goto("/");

  // Continua funcionando em memória (mostra o seed).
  await expect(page.getByText(/1\.330,00/).first()).toBeVisible();
  // Comunica que não foi possível salvar.
  await expect(page.getByText(/não foi possível salvar/i)).toBeVisible();
});
