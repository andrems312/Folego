# Fôlego

Controle de caixa para profissionais autônomos e pequenos prestadores de serviço.
**Saiba quanto seu negócio pode respirar.**

O Fôlego responde, em segundos: *quanto é mesmo meu pra usar hoje, sem
comprometer o futuro do negócio?* — separando com honestidade o que já é seu, o
que já tem dono e o que ainda vai entrar.

> **Fonte de verdade de design:** [`DESIGN.md`](./DESIGN.md).
> Identidade livro-caixa editorial · voz humana · Pulso do Caixa com rigor de
> instrumento.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Zod · Vitest · Playwright.

## Arquitetura

O **domínio financeiro** (`src/domain`) é puro e independente de React: toda
fórmula vive ali, com testes. A interface consome o motor via `@/domain` e nunca
recalcula.

```
src/
  app/            # rotas (App Router) e tela de Visão geral
  components/
    ui/           # componentes-base (Button, Money, Icon, ...)
    layout/       # casca, navegação
  domain/         # motor financeiro puro + testes
    __tests__/
  demo/           # dados de demonstração (exemplo do DESIGN.md §2.5)
  lib/            # utilitários
tests/e2e/        # testes de fumaça (Playwright)
```

## Scripts

```bash
npm run dev         # desenvolvimento
npm run build       # build de produção
npm run start       # servir o build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # testes de unidade (Vitest)
npm run e2e         # testes de fumaça (Playwright)
```

## Status

Checkpoint 1 — fundação do projeto e motor financeiro testado. As telas
completas (Movimentações, Previsão, Reservas, Relatórios) e o Pulso do Caixa
chegam em checkpoints seguintes.
