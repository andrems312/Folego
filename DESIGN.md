# Fôlego — Sistema de Design

> **Fonte de verdade visual e de linguagem do Fôlego.**
> Este documento guia toda a implementação do frontend. Quando o código e este
> documento divergirem, este documento vence — e deve ser atualizado se uma
> decisão mudar. Nada aqui é decorativo: cada regra existe para que um prestador
> de serviço leigo entenda, em segundos, **quanto dinheiro pode usar sem
> comprometer o futuro do negócio.**

**Status:** decisões de produto e direção visual FECHADAS (não reabrir).
**Stack-alvo:** Next.js + TypeScript · Tailwind CSS · shadcn/ui (fortemente
customizado) · Recharts (apenas relatórios) · PostgreSQL · Supabase (Auth/Storage)
· Zod · Vitest + Playwright.

---

## Sumário

1. [Posicionamento e identidade](#1-posicionamento-e-identidade)
2. [Modelo financeiro (regras de cálculo)](#2-modelo-financeiro-regras-de-cálculo)
3. [Regra inegociável do dinheiro](#3-regra-inegociável-do-dinheiro)
4. [Cor — tokens e temas](#4-cor--tokens-e-temas)
5. [Tipografia e hierarquia](#5-tipografia-e-hierarquia)
6. [Espaçamento, grid, bordas, elevação](#6-espaçamento-grid-bordas-elevação)
7. [Navegação](#7-navegação)
8. [Componentes](#8-componentes)
9. [Pulso do Caixa (especificação)](#9-pulso-do-caixa-especificação)
10. [Telas do MVP](#10-telas-do-mvp)
11. [Estados: vazio, carregando, erro, sucesso, alerta](#11-estados-vazio-carregando-erro-sucesso-alerta)
12. [Acessibilidade e contraste](#12-acessibilidade-e-contraste)
13. [Microinterações e animação](#13-microinterações-e-animação)
14. [Linguagem e microcopy](#14-linguagem-e-microcopy)
15. [Padrões reutilizáveis](#15-padrões-reutilizáveis)
16. [O que evitar](#16-o-que-evitar)
17. [Notas de implementação (tokens → Tailwind/shadcn)](#17-notas-de-implementação)

---

## 1. Posicionamento e identidade

**Produto.** Fôlego é um sistema web de controle de caixa para profissionais
autônomos e pequenos prestadores de serviço (eletricista, técnico, instalador,
profissional de beleza, serviços residenciais). Recebem por serviço, têm renda
que oscila e hoje controlam o dinheiro no caderninho, em planilha ou na memória.

**Promessa.** *Saiba quanto seu negócio pode respirar.* O Fôlego responde, em
segundos: **quanto é mesmo meu pra usar hoje, sem comprometer o futuro?**

**O que o Fôlego NÃO é.** Não é banco digital, não é contador, não é consultor.
É uma ferramenta de **organização e visualização**. Todo cálculo é transparente e
baseado no que o próprio usuário registrou.

### Direção visual (híbrido definitivo)

| Camada | Origem | Papel |
|---|---|---|
| **Identidade** | **A — Livro-caixa editorial** | Pele do produto: papel, linhas, colunas, hierarquia editorial, serifa com personalidade, números bem alinhados. Sofisticado, confiável, original. |
| **Voz e experiência** | **C — Finanças humanas** | Português natural, linguagem para quem nunca usou software financeiro, acolhedor sem ser infantil, calma e clareza sem culpar o usuário. |
| **Pulso do Caixa** | **B — Instrumento financeiro** | Apenas aqui: rigor de instrumento de medição — escalas, linhas, indicadores, leitura de risco. Sem neon, sem visual gamer, sem excesso de animação. |

**Personalidade em uma frase:** *o caderninho de confiança do prestador, que agora
faz as contas sozinho — com a calma de quem explica, não cobra.*

**Elemento proprietário:** o **Pulso do Caixa** (§9). É a assinatura do Fôlego e
aparece na Visão geral e na Previsão.

---

## 2. Modelo financeiro (regras de cálculo)

Esta seção é a **lógica canônica**. A interface nunca contradiz estas regras, e o
desenvolvimento as implementa exatamente. Decisões já aprovadas — não reabrir.

### 2.1 Entidades (conceitual)

```
Movimentacao
  id
  tipo          : 'entrada' | 'saida' | 'retirada'
  valor         : number (centavos, inteiro — evita erro de ponto flutuante)
  data          : date        // competência/vencimento OU data de realização
  categoria     : CategoriaId
  status        : 'realizado' | 'pendente'
  valorPago     : number | null   // centavos já pagos (pagamento parcial); ausente => modelo atômico
  formaPagamento: 'pix' | 'dinheiro' | 'transferencia' | 'cartao' | 'outro' | null  // etiqueta opcional
  reservaId     : ReservaId | null   // vínculo p/ evitar dupla contagem
  descricao     : string | null

Reserva  (envelope virtual dentro do caixa único)
  id
  nome          : string
  alvo          : number | null   // meta opcional
  saldoAtual    : number          // quanto já foi separado

Config
  margemSeguranca: number   // começa em 0 (centavos)
```

Valores monetários **sempre em centavos inteiros** no domínio; formatação pt-BR
só na borda de apresentação.

### 2.2 As definições (vocabulário canônico)

| Conceito | Definição | Entra no "disponível"? |
|---|---|---|
| **Saldo em conta** | Σ entradas *realizadas* − Σ (saídas + retiradas) *realizadas* | base |
| **Contas pendentes** | saídas/retiradas com `status = pendente` (têm vencimento) | reduz |
| **Reservas** | Σ `reserva.saldoAtual` (dinheiro com destinação) | reduz |
| **Margem de segurança** | folga definida pelo usuário (começa em R$ 0) | reduz |
| **Recebimentos previstos** | entradas com `status = pendente` | **NUNCA** |

### 2.3 Fórmulas

```
saldoEmConta       = Σ entradas(realizado) − Σ (saidas+retiradas)(realizado)

comprometido       = totalReservas + contasPendentesNaoCobertas   // ver 2.4

disponivelRetirada = max(0, saldoEmConta − comprometido − margemSeguranca)

recebimentosPrevistos = Σ entradas(pendente)   // exibido SEMPRE em separado
```

- `disponivelRetirada` tem **piso em 0**. Se o cálculo for negativo, exibe
  **R$ 0,00** + alerta de risco explicando (nunca um número negativo cru).
- `recebimentosPrevistos` **nunca** soma a `saldoEmConta` nem a
  `disponivelRetirada`. É sempre uma linha/área à parte, com tratamento "previsto".

### 2.4 Anti-dupla-contagem (regra crítica)

Um compromisso **não pode** reduzir o disponível duas vezes. O caso clássico: uma
conta pendente que será paga por uma reserva (ex.: reserva "Impostos" e a conta de
imposto). Se somássemos reserva **e** conta, descontaríamos o mesmo dinheiro duas
vezes.

**Regra.** Uma conta pendente vinculada a uma reserva (`reservaId != null`) é
considerada **coberta** até o saldo daquela reserva. A parte coberta sai da soma de
contas pendentes; só a parte descoberta conta.

```
Para cada reserva R:
  contasDaReserva = Σ contasPendentes com reservaId = R.id
  coberto(R)      = min(contasDaReserva, R.saldoAtual)

contasPendentesNaoCobertas =
    Σ contasPendentes semReserva
  + Σ_R max(0, contasDaReserva(R) − R.saldoAtual)   // só o excedente

comprometido = totalReservas + contasPendentesNaoCobertas
```

- **Reservar NÃO é saída de dinheiro.** Separar valor numa reserva move dinheiro
  para um envelope virtual: `saldoEmConta` **não muda**, mas `disponivelRetirada`
  diminui (o dinheiro passou a ter dono). O saldo real reflete só movimentações
  efetivamente realizadas.
- Pagar a conta vinculada é uma **saída realizada** que baixa a reserva: a reserva
  diminui e o saldo em conta diminui no mesmo ato — sem novo desconto no disponível.

**Pagamento parcial (regra).** Uma conta pode ser paga em partes. O campo
`valorPago` guarda quanto já foi pago; `saldoPendente = valor − valorPago`. Regras:

- O **saldo real** cai apenas pelo valor **efetivamente pago** (parcial inclusive).
- O **comprometido** e a **projeção** usam o **saldo pendente** (restante), nunca o
  valor original.
- Uma conta só é **quitada** (`status = realizado`) quando `saldoPendente` chega a 0.
- Se vinculada a reserva, cada pagamento baixa a reserva por `min(valorPago, saldoReserva)`
  — a cobertura acompanha o pagamento, sem dupla contagem. Pagar uma conta totalmente
  coberta **não altera** o "Livre pra usar".
- Operações de pagamento **rejeitam** entradas inválidas (valor ≤ 0 ou não inteiro,
  conta inexistente/não-pagável/já quitada, valor acima do pendente, vínculo inválido)
  e **nunca** aplicam mudança parcial de estado (`registrarPagamento` → resultado
  `{ ok, estado }` | `{ ok:false, codigo, erro }`).

**Validação de fronteira.** Dados externos passam por `validarEstadoFinanceiro`
antes de entrar nas operações: centavos inteiros, vínculos (`reservaId`) existentes,
saldos não-negativos, coerência entre `status` e `valorPago`, ids únicos.

### 2.5 Exemplo trabalhado (usado como dado-exemplo nas telas)

| Item | Valor |
|---|---|
| Saldo em conta (realizados) | R$ 4.280,00 |
| Reserva "Impostos" (guardado) | R$ 800,00 |
| Conta pendente "Material – fornecedor" (vence em 5 dias, sem reserva) | R$ 1.150,00 |
| Margem de segurança | R$ 1.000,00 |
| **Comprometido** = 800 + 1.150 | **R$ 1.950,00** |
| **Disponível para retirada** = 4.280 − 1.950 − 1.000 | **R$ 1.330,00** |
| Recebimentos previstos (2 serviços aguardando Pix) — *à parte* | R$ 2.400,00 |

**Com dupla contagem evitada:** se a reserva "Impostos" (800) estivesse vinculada a
uma conta de imposto de R$ 800, `comprometido` = 800 + 0 = **800** (não 1.600).

### 2.6 Categorias padrão (editáveis)

`Serviços prestados` (entrada) · `Materiais` · `Deslocamento/combustível` ·
`Ferramentas` · `Impostos` · `Retirada pessoal`. O usuário cria, renomeia e remove.
`Retirada pessoal` é categoria própria e sempre identificável nos relatórios.

### 2.7 Exportação

CSV no MVP (abre no Excel/Sheets, separador `;`, UTF-8 com BOM, decimais pt-BR).
PDF fica para depois.

### 2.8 Operações e integridade do estado

O motor financeiro expõe uma **API pública única e segura**. Toda operação que
pode receber dados inválidos é **atômica** e retorna um resultado tipado
`{ ok: true, estado } | { ok: false, codigo, erro }` — em caso de erro, **nada**
no estado é alterado.

- **Reservas:** uma só API — `guardarNaReserva` e `resgatarDaReserva` (validadas,
  retornam resultado). Rejeitam valor inválido, reserva inexistente e resgate acima
  do saldo guardado; **nunca** deixam o envelope negativo. (Não há segunda API
  "leniente".)
- **Validação na fronteira:** dados externos entram no domínio **somente** por
  `carregarEstadoFinanceiro(dados)`, que valida e **lança** em caso de inconsistência
  (centavos inteiros, `reservaId` existente, saldos não-negativos, coerência
  `status`↔`valorPago`, ids únicos). A validação é **aplicada**, não apenas
  disponível. `validarEstadoFinanceiro` é a variante que retorna resultado.
- **Exclusão:** `excluirMovimentacao` **recusa** apagar movimentações que já
  afetaram o saldo real — entrada recebida ou conta com qualquer `valorPago` — para
  não apagar dinheiro que já entrou/saiu. Só movimentações sem efeito (entrada
  prevista, conta pendente sem pagamento) podem ser excluídas.
- **Edição:** `editarMovimentacao` **preserva** `valorPago` e o histórico; não
  permite reduzir `valor` abaixo do já pago; recalcula `status` a partir de
  `valorPago` vs `valor` (coerência); e **bloqueia** trocar a reserva vinculada de
  uma conta que já recebeu pagamento.

---

## 3. Regra inegociável do dinheiro

**O tipo de dinheiro precisa ser comunicado sem depender só de cor.** Vale em
TODAS as telas, cartões, gráficos, relatórios e componentes.

| Estado | Significado | Forma (não-cor) | Cor (reforço) | Em texto |
|---|---|---|---|---|
| **Saldo real** | já é seu, já aconteceu | preenchimento **sólido**, peso cheio, ponto sólido ● | `--ink` / `--credit` | número normal |
| **Comprometido** | está na conta, mas já tem dono | **hachura** 45° (`pattern-committed`), ícone de cadeado | `--committed` | rótulo "comprometido/guardado" |
| **Previsto** | ainda não entrou | **vazado/tracejado** (contorno, sem preenchimento), ponto oco ◌ | `--forecast` | etiqueta "previsto" + itálico leve |
| **Risco** | projeção encosta na reserva+margem | **faixa listrada** + **ícone ⚠ triângulo** + **frase explicativa** | `--risk` | sempre uma frase, nunca só a cor |

**Implementação.** Um componente único `<Money>` carrega essa semântica (§15), e as
hachuras/pontilhados vêm de `<pattern>`/`stroke-dasharray` SVG reutilizáveis.
Risco **sempre** acompanha texto — "Por volta do dia 20 seu caixa encosta na
reserva" — e nunca é só um ponto vermelho.

**Legenda.** Toda superfície que mistura estados (Pulso, Previsão, relatórios)
mostra uma legenda com as quatro formas, pois a forma — não a cor — é a chave.

---

## 4. Cor — tokens e temas

Paleta de **livro-caixa**: papel, tinta, e o par histórico débito/crédito. Cor tem
função (vermelho = saída/débito, verde = entrada/crédito, azul = previsto); nunca é
enfeite. Dois temas obrigatórios: **claro** (padrão, "papel") e **escuro**
("razão noturno").

### 4.1 Tokens semânticos

Definir como CSS custom properties em `:root`; o tema escuro redefine os mesmos
tokens (ver §17 para o padrão de três estados exigido pelo artefato/host).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--paper` | `#F4F0E6` | `#16150F` | fundo do app |
| `--surface` | `#FBF9F2` | `#201E16` | superfícies elevadas: folhas, tabelas, cartões de relatório |
| `--surface-2` | `#ECE7D9` | `#100F0A` | poços, zebra de tabela, fundo de input |
| `--ink` | `#1A1A17` | `#ECE7D6` | texto primário, saldo real |
| `--ink-2` | `#4A4842` | `#B8B2A0` | texto secundário |
| `--ink-3` | `#6E6B61` | `#8A8574` | legendas/mudo (ver limite de contraste §12) |
| `--ink-inverse` | `#F7F4EC` | `#17160F` | texto sobre preenchimento forte |
| `--line` | `#DAD4C4` | `#35322A` | filete/hairline |
| `--line-2` | `#C4BCA6` | `#4A463B` | filete forte, divisão de seção |
| `--credit` | `#2F6B4F` | `#6FB58A` | entradas / positivo |
| `--debit` | `#9E2B25` | `#E06A5E` | saídas / negativo |
| `--committed` | `#8A8778` | `#9A978A` | comprometido (base da hachura) |
| `--forecast` | `#2E5E8F` | `#7FA8D8` | previsto (sempre tracejado/vazado) |
| `--ok` | `#2F6B4F` | `#6FB58A` | status saudável |
| `--attention` | `#9A6300` | `#D9A441` | status atenção (usar com texto escuro ou ícone) |
| `--risk` | `#BC2E2E` | `#E5604D` | status crítico/risco |
| `--ok-bg` | `#E7EEE6` | `#1E2A20` | fundo de aviso saudável |
| `--attention-bg` | `#F3EAD4` | `#2C2614` | fundo de aviso atenção |
| `--risk-bg` | `#F4E1DD` | `#2E1A17` | fundo de aviso risco |
| `--focus` | `#2E5E8F` | `#7FA8D8` | anel de foco |
| `--rule-margin` | `#9E2B25` @50% | `#E06A5E` @45% | filete de margem (assinatura do razão) |
| `--overlay` | `rgba(26,26,23,.45)` | `rgba(0,0,0,.6)` | scrim de modal |

Regra: **azul = previsto** em todo o sistema. Filetes estruturais usam `--line`,
nunca azul, para não competir com o significado "previsto".

### 4.2 Paleta categórica de relatórios (validada por script)

Usada **só** em gráficos de categoria (ex.: "maiores despesas"). Ordem **fixa** por
entidade (cor segue a categoria, nunca o ranking). Nunca usar estas cores para
estado do dinheiro. Sempre com rótulo direto + legenda (codificação secundária
obrigatória — a separação CVD de alguns pares fica na banda 6–8).

| Slot | Categoria padrão | Claro | Escuro |
|---|---|---|---|
| 1 | Materiais | `#B3412C` | `#D9705C` |
| 2 | Deslocamento/combustível | `#0E7D50` | `#3FA886` |
| 3 | Ferramentas | `#2F5EA0` | `#5A8FD6` |
| 4 | Impostos | `#9E6B00` | `#B88A2E` |
| 5 | Retirada pessoal | `#7A4E86` | `#B07BC8` |
| 6 | Outros | `#4E7A2E` | `#78A24F` |

> Validado em `--mode light` e `--mode dark` com `scripts/validate_palette.js`:
> banda de luminosidade, piso de chroma, piso de visão normal e contraste ≥3:1
> passaram; separação CVD na banda 6–8 **exige** rótulo/legenda (já mandatório).
> Uma 7ª categoria **não** ganha cor nova: vira "Outros" (slot 6) ou vai para
> small multiples.

### 4.3 Padrões SVG (estado do dinheiro)

```html
<defs>
  <!-- comprometido: hachura 45° -->
  <pattern id="pattern-committed" width="6" height="6" patternTransform="rotate(45)"
           patternUnits="userSpaceOnUse">
    <rect width="6" height="6" fill="var(--committed)" fill-opacity=".14"/>
    <line x1="0" y1="0" x2="0" y2="6" stroke="var(--committed)" stroke-width="1.4"/>
  </pattern>
</defs>
<!-- previsto: contorno tracejado, sem preenchimento -->
stroke="var(--forecast)" stroke-dasharray="5 4" fill="none"
```

---

## 5. Tipografia e hierarquia

Três famílias, papéis distintos (Google Fonts). Nunca usar Inter ou Arial.

| Família | Papel |
|---|---|
| **Fraunces** (serif ótica, variável) | Títulos de página, números-herói (Disponível, saldo), marcas editoriais. Peso 500–600, `opsz` alto para dar contraste editorial. |
| **Spectral** (serif de leitura) | Texto longo/explicativo (metodologia, acolhimento) e **colunas numéricas do razão** com `tabular-nums` + `lining-nums`. Dá o ritmo de página contábil. |
| **Hanken Grotesk** (sans humanista) | UI utilitária: rótulos, botões, inputs, navegação, chips, captions. Clareza para o leigo, sobretudo no mobile. |

```
--font-display: "Fraunces", Georgia, "Times New Roman", serif;
--font-text:    "Spectral", Georgia, serif;
--font-ui:      "Hanken Grotesk", system-ui, -apple-system, sans-serif;
```

### 5.1 Escala tipográfica (base 16px, razão ~1.2)

| Token | px / line-height | Família | Uso |
|---|---|---|---|
| `display-xl` | clamp(40–56) / 1.0 | Fraunces 600 | número-herói (Disponível) |
| `display-l` | 32 / 1.05 | Fraunces 600 | título de tela |
| `h1` | 26 / 1.15 | Fraunces 600 | seções maiores |
| `h2` | 21 / 1.2 | Fraunces 600 | blocos |
| `h3` | 17 / 1.3 | Hanken 600 | rótulos de grupo / cartões |
| `body` | 16 / 1.6 | Spectral 400 | leitura/explicação |
| `body-ui` | 15 / 1.5 | Hanken 400 | textos de interface |
| `num` | 16–20 / 1.2 | Spectral 500 `tabular-nums` | valores em listas/tabelas |
| `label` | 14 / 1.4 | Hanken 500 | rótulos de campo, botões |
| `caption` | 12.5 / 1.4 | Hanken 400 | apoio, metadados |
| `overline` | 11 / 1.4, `+.10em`, versalete | Hanken 600 | sobrelinha — **uso contido** (ver §16) |

### 5.2 Regras

- Títulos: `text-wrap: balance`. Texto de leitura: largura máx. **≤ 68 ch**.
- **Números são protagonistas**: todo valor monetário em `tabular-nums`,
  alinhado à direita em colunas. Hero em Fraunces; linhas em Spectral.
- Não destacar uma única palavra do título em cor/itálico (tell de template, §16).
- Sentença normal (sentence case) por padrão; versalete/overline só como eyebrow de
  seção, com parcimônia — nunca caixa-alta cheia em rótulo de dado.
- Formatação de moeda: `Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})`.

---

## 6. Espaçamento, grid, bordas, elevação

### 6.1 Espaçamento (base 4px)

`--space-1:4 · -2:8 · -3:12 · -4:16 · -5:20 · -6:24 · -8:32 · -10:40 · -12:48 · -16:64`
Compor layout com `gap` em flex/grid; evitar margens soltas. Gutter lateral mínimo
16px em qualquer largura (`max(16px, env(safe-area-inset-*))`).

### 6.2 Grid

- **Desktop:** conteúdo máx. **1200px**, 12 colunas, gutter 24px. Shell = masthead
  superior + conteúdo. Coluna de leitura de textos explicativos máx. 68ch.
- **Mobile (≤640px):** 1 coluna, gutter 16px, barra inferior de navegação.
- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1200`.

### 6.3 Bordas e raio (contenção editorial)

| Token | Valor | Uso |
|---|---|---|
| `--radius-0` | 0 | tabelas, filetes, blocos de razão |
| `--radius-1` | 2px | **padrão** (botões, inputs, cartões) |
| `--radius-2` | 4px | folhas/sheets, modais |
| `--radius-pill` | 999px | **só** chips/filtros e toggles |

Raio é **discreto e proposital** — nada de "tudo arredondado". A divisão primária é
por **filete** (`--line`), não por caixa.

### 6.4 Elevação (quase plana)

- **Cartões/linhas:** sem sombra. Separação por `--line` e por `--surface`.
- **Overlays** (menu, sheet, modal, toast): única sombra permitida.

```
--shadow-overlay: 0 6px 24px -8px rgba(26,26,23,.28), 0 1px 0 rgba(26,26,23,.06);
```

Sombra decorativa em cartão é proibida (§16).

---

## 7. Navegação

Mesma arquitetura de informação nos dois tamanhos; muda só a forma.

**Áreas (ordem fixa):** `Visão geral · Movimentações · Previsão · Reservas · Relatórios`
Ação global sempre a 1 toque: **`+ Lançar`**.

### 7.1 Desktop — masthead editorial

```
┌───────────────────────────────────────────────────────────────┐
│  Fôlego      Visão geral  Movimentações  Previsão  Reservas  …  │  ← filete inferior
│                                               [ + Lançar ]  (⚙) │
└───────────────────────────────────────────────────────────────┘
```
- Marca "Fôlego" em Fraunces. Item ativo marcado por **filete inferior espesso**
  (não por pílula/fundo). `+ Lançar` é botão primário fixo à direita.

### 7.2 Mobile — barra inferior + ação central

```
┌───────────────────────────────┐
│          (conteúdo)           │
├───────────────────────────────┤
│  Visão  Movim.  ＋  Prev.  Mais │  ← "＋ Lançar" central, destaque
└───────────────────────────────┘
```
- 4 itens + **＋ central** para `Lançar` (abre bottom-sheet). "Mais" agrupa
  Reservas, Relatórios, Config. Ícone + rótulo curto; alvo ≥44px.
- Barra respeita `env(safe-area-inset-bottom)`.

---

## 8. Componentes

Base: shadcn/ui **reestilizado** pelos tokens. Especificação resumida; estados
sempre: `default · hover · active · focus · disabled · loading`.

### 8.1 Botões

| Variante | Visual | Uso |
|---|---|---|
| `primary` | fundo `--ink`, texto `--ink-inverse`, radius-1 | ação principal (Lançar, Salvar) |
| `secondary` | contorno `--line-2`, texto `--ink` | ações de apoio |
| `ghost` | sem borda, texto `--ink-2`, hover `--surface-2` | ações terciárias |
| `danger` | contorno `--risk`, texto `--risk`; sólido só em exclusão confirmada | excluir |

Altura 44px (mobile) / 40px (desktop). Label em Hanken 500. Foco: anel `--focus`
2px + offset 2px. `loading`: spinner + rótulo mantém largura. Sem "→" no texto (§16).

### 8.2 Campos (input, select, data, valor)

- Rótulo **acima**, sempre visível (nunca só placeholder). Fundo `--surface-2`,
  borda inferior `--line-2` (estilo ficha de razão) ou borda completa radius-1.
- **Campo de valor:** teclado numérico no mobile (`inputmode="decimal"`), máscara
  R$ pt-BR, alinhado à direita, Spectral tabular.
- Erro: borda `--risk` + mensagem abaixo (texto, não só cor) + `aria-describedby`.
- `segmented control` para tipo de lançamento (Entrada / Saída / Retirada) e para
  período do Pulso (7 / 15 / 30).

### 8.3 Linha de razão (ledger row) — componente central

Lista de movimentações como **livro-caixa**, não como pilha de cartões.

```
│ 14 nov  Serviço — instalação             entrada   + R$ 1.200,00 │  (crédito, verde, sólido)
│ 15 nov  Material — fornecedor   ⟂pendente  saída     − R$ 1.150,00 │  (débito, vermelho; "pendente" = tratamento previsto se entrada / hachura se compromisso)
│ 16 nov  Retirada pessoal                  retirada  − R$   300,00 │
```
- Colunas: data · descrição/categoria · etiquetas (status, forma de pagamento) ·
  valor (direita, tabular). Zebra com `--surface-2`. Divisão por `--line`.
- Sinais: `+` crédito `--credit`, `−` débito `--debit`. Status pendente recebe o
  tratamento de forma da §3.

### 8.4 Bloco-herói (Disponível)

Número grande (Fraunces `display-xl`) + rótulo-voz ("Livre pra usar") + subtítulo
("sem comprometer o futuro") + **detalhamento aberto** (saldo − comprometido −
margem) logo abaixo, com cada linha no seu estado de forma. Ver tela Visão geral.

### 8.5 Cartão de reserva (envelope)

Nome · guardado / alvo · barra de progresso (preenchida = guardado, trilho =
restante) · rótulo "comprometido" com hachura. Barra em `--credit`/`--committed`;
nunca sugerir que reservar foi gasto.

### 8.6 Faixa de alerta / risco

Fundo `--risk-bg` (ou `--attention-bg`), ícone ⚠ à esquerda, **frase explicativa**
+ ação sugerida ("Revisar contas a vencer"). Nunca só cor. Variantes: atenção,
risco. Fecha com texto, não com X solto.

### 8.7 Folha de lançamento (quick-add)

Bottom-sheet (mobile) / modal lateral (desktop). Meta: **registrar em segundos**.
Ordem: segmented (Entrada/Saída/Retirada) → **valor** (foco automático, teclado
numérico) → categoria → data (padrão hoje) → "já foi pago/recebido?" (toggle) →
Salvar. Campos avançados (forma de pagamento, reserva, descrição) recolhidos.

### 8.8 Tabela de relatório

Cabeçalho fixo, zebra, totais em rodapé (Spectral tabular). Gráfico de categoria
usa a paleta §4.2 com rótulo direto + legenda. Exportar CSV no topo.

### 8.9 Toast / confirmação

Canto inferior (desktop) / acima da barra (mobile). Verbo espelha a ação
("Lançamento salvo", "Reserva criada"). Some em ~4s; ação "Desfazer" quando aplicável.

### 8.10 Legenda de estados

Componente reutilizável mostrando as 4 formas (sólido/hachura/tracejado/alerta).
Aparece em Pulso, Previsão e relatórios que misturam estados.

---

## 9. Pulso do Caixa (especificação)

Elemento proprietário. **Rigor de instrumento (direção B), leitura de leigo.**
Mostra, ao longo do tempo, como o dinheiro entra, sai e fica comprometido —
separando o **confirmado** do **previsto**. Construir como **componente SVG
próprio** (não Recharts).

### 9.1 O que mostra

- **Eixo X:** tempo, de *hoje* até +7 / +15 / +30 dias (segmented control; padrão 15).
- **Eixo Y:** reais, com escala e ticks (ex.: 0 · 2k · 4k) — rigor de instrumento.
- **Linha confirmada** (sólida, `--ink`): saldo considerando só o que está
  confirmado (entradas realizadas, todas as saídas a vencer). É o **piso honesto**.
- **Linha projetada** (tracejada/fantasma, `--forecast`): mesma linha incluindo os
  **recebimentos previstos**. Só existe à frente de *hoje*.
- **Faixa de reserva** (base, hachura `--committed`): piso que não se deve tocar.
- **Linha de segurança** (tracejada `--risk`): reserva + margem.
- **Cursor "hoje"** (vertical, `--ink`, rótulo "hoje").
- **Batimentos**: entradas = tique para cima (`--credit`); saídas = tique para
  baixo (`--debit`); recebimento previsto = marcador **oco** (`--forecast`).
- **Zona de risco**: onde a linha **confirmada** cruza abaixo da linha de
  segurança — trecho realçado em `--risk` + legenda inline.

### 9.2 Leitura para leigo

Acima/abaixo do desenho, **uma frase em linguagem simples** resume o instrumento:

> "Hoje você tem fôlego. O aperto aparece **por volta do dia 20**, quando vence o
> material — a não ser que os R$ 2.400 previstos entrem antes."

Rigor no desenho + frase no rodapé = "rigoroso, mas fácil de entender".

### 9.3 Modelo de dados do componente

```ts
interface PulsoDia {
  data: string;              // ISO
  saldoConfirmado: number;   // linha sólida
  saldoProjetado: number;    // linha tracejada (confirmado + previstos do dia)
  entradasRealizadas: number;
  saidasAVencer: number;
  recebimentosPrevistos: number;
  emRisco: boolean;          // saldoConfirmado < linhaSeguranca
}
interface PulsoProps {
  dias: PulsoDia[];
  reserva: number;
  margem: number;            // linhaSeguranca = reserva + margem
  horizonte: 7 | 15 | 30;
  onHorizonteChange(h): void;
}
```

### 9.4 Escala e desenho (referência)

- `linhaSeguranca = reserva + margem`.
- `yMax = max(saldoProjetado, saldoConfirmado, linhaSeguranca) * 1.15` (folga topo).
- `x(i) = padL + (i/(n-1)) * (W - padL - padR)`
- `y(v) = H - padB - (v / yMax) * (H - padT - padB)`
- Linha confirmada: `polyline` sólida 2.4px. Projetada: `polyline`
  `stroke-dasharray="5 4"`, 1.6px, só índices ≥ hoje. Reserva: `rect` hachurado na
  base. Segurança: linha tracejada `--risk`. Trecho em risco: sobre-desenhar a
  confirmada em `--risk` 3px onde `emRisco`.
- `viewBox` responsivo; reservar margem para rótulos dos ticks e do cursor.

### 9.5 Interação

- **Hover/toque**: crosshair vertical + tooltip do dia (confirmado, projetado,
  o que vence/entra naquele dia). Alvo de toque maior que o marcador.
- **Teclado**: componente focável; ←/→ movem o cursor dia a dia, lendo o tooltip
  via `aria-live`.
- **Alternativa em tabela**: botão "Ver como tabela" expande a projeção dia a dia
  (acessibilidade e impressão) — não depende de cor nem de visão do gráfico.

### 9.6 Estados

- **Sem dados suficientes**: desenho neutro + "Registre contas a vencer e
  recebimentos para ver seu Pulso." (convite, não erro).
- **Carregando**: skeleton da área do gráfico (sem números falsos).
- **Tudo tranquilo**: sem zona de risco; frase "Nenhum aperto à vista nos próximos
  15 dias."

### 9.7 Responsivo

- **Desktop**: largo, 30 dias confortável.
- **Mobile**: padrão **7 dias**; 15/30 com rolagem horizontal **dentro** do
  componente (nunca empurra a página). Cursor, frase-resumo e segmented sempre
  visíveis. Ticks reduzidos.

### 9.8 Proibições específicas do Pulso

Sem neon, sem glow, sem estética gamer, sem gradiente, sem animação contínua. Uma
única animação permitida: traçado da linha **uma vez** no carregamento
(desabilitada com `prefers-reduced-motion`).

---

## 10. Telas do MVP

Para cada tela: objetivo, desktop, mobile, componentes, estados, microcopy.
**A tela mais importante é a Visão geral** — ela faz entender a situação em segundos.

### 10.0 Onboarding (curto)

- **Objetivo:** começar a funcionar sem banco, sem fricção.
- **Passos:** (1) "Quanto você tem hoje na conta/caixa?" → saldo inicial.
  (2) opcional: criar 1ª reserva. (3) opcional: margem de segurança (**não
  obrigar**; explicar em 1 linha que é "uma folga pra emergências").
- Linguagem de boas-vindas, sem jargão. Botão "Começar". Margem e reserva podem
  ficar para depois ("Você configura isso quando quiser").

### 10.1 Visão geral (dashboard)

- **Objetivo:** responder em segundos *quanto posso usar* e *tem aperto chegando?*
- **Hierarquia (topo → base):**
  1. **Bloco-herói** "Livre pra usar" — `display-xl` (`disponivelRetirada`), subtítulo
     "sem comprometer o futuro".
  2. **Detalhamento aberto** (metodologia transparente, §3 de forma):
     `Na conta hoje` (saldo real, sólido) − `Já tem dono` (comprometido, hachura) −
     `Folga de segurança` (margem) = destaque do disponível. Link "Como calculamos".
  3. **Ainda vai entrar** (previsto, tracejado, **separado** — nunca somado).
  4. **Pulso do Caixa** (15 dias) + frase-resumo.
  5. Faixa de risco (se houver) com frase + ação.
- **Desktop:** herói + detalhamento à esquerda, Pulso à direita (ou herói em faixa
  superior, Pulso largo abaixo). **Mobile:** ordem vertical acima; Pulso 7 dias.
- **Estados:** vazio (pós-onboarding sem lançamentos) → "Lance sua primeira entrada
  ou conta para ver quanto pode usar." + CTA `+ Lançar`.

### 10.2 Movimentações

- **Objetivo:** registrar e revisar entradas, saídas e retiradas.
- Lista em **linhas de razão** (§8.3), agrupadas por dia, com filtros (período,
  categoria, tipo, status) numa linha acima. `+ Lançar` sempre acessível.
- Editar/excluir por linha (excluir pede confirmação, componente da §11).
- **Mobile:** linhas condensadas (descrição + valor em destaque; data/categoria como
  apoio); filtros em sheet.
- **Vazio:** "Nada lançado ainda. Comece registrando o que entrou ou saiu."

### 10.3 Previsão

- **Objetivo:** ver os próximos 7/15/30 dias com clareza do que é certo × previsto.
- Pulso do Caixa em destaque + **lista de contas a vencer** e **recebimentos
  previstos** em blocos separados e rotulados. Sinalização de dias de risco.
- Nunca somar previsto ao saldo/disponível. Legenda de estados presente.
- **Vazio:** "Cadastre contas a vencer e recebimentos previstos para projetar seu
  caixa."

### 10.4 Reservas

- **Objetivo:** separar dinheiro por finalidade (envelopes) sem gastá-lo.
- Grade de **cartões de envelope** (§8.5): guardado/alvo, progresso. Criar, editar,
  resgatar. Deixar explícito: "reservar não é gastar; é dar destino ao dinheiro".
- Total reservado aparece como **comprometido** (hachura) na Visão geral.
- **Vazio:** "Crie uma reserva para impostos, materiais ou emergências."

### 10.5 Relatórios

- **Objetivo:** fechamento semanal/mensal e para onde o dinheiro vai.
- Resumo do período (entradas, saídas, retiradas, saldo), evolução do caixa,
  **maiores despesas por categoria** (paleta §4.2, Recharts), comparação de
  períodos. Exportar CSV.
- Gráficos só com função (§16). Retiradas sempre destacadas como categoria própria.
- **Vazio:** "Ainda não há dados suficientes para um relatório deste período."

### 10.6 Configurações

Margem de segurança (com explicação simples), categorias (criar/editar/remover),
conta/perfil, exportação, tema. Mudança de margem recalcula o disponível ao vivo.

---

## 11. Estados: vazio, carregando, erro, sucesso, alerta

Princípios: **vazio é convite**, **erro orienta sem culpar**, **sucesso confirma com
o mesmo verbo da ação**.

| Estado | Regra | Exemplo de copy |
|---|---|---|
| **Vazio** | diz o que aparecerá + ação para começar; nunca tela morta | "Lance sua primeira entrada para ver quanto pode usar." + `+ Lançar` |
| **Carregando** | skeleton da estrutura real; **nunca** números/placeholders falsos | blocos cinza no formato do herói/linhas |
| **Erro** | o que aconteceu + como resolver, na voz do sistema, sem desculpa nem jargão | "Não deu para salvar o lançamento. Verifique sua conexão e tente de novo." |
| **Sucesso** | toast com o verbo da ação; "Desfazer" quando fizer sentido | "Lançamento salvo." · "Reserva criada." |
| **Atenção** | faixa `--attention-bg` + ícone + frase; ação sugerida | "Uma conta vence amanhã: Material – fornecedor (R$ 1.150)." |
| **Risco** | faixa `--risk-bg` + ⚠ + frase + ação; nunca só cor | "Por volta do dia 20 seu caixa encosta na reserva. Veja as contas a vencer." |

Validação de formulário: mensagem abaixo do campo (texto), borda `--risk`, foco no
primeiro erro, `aria-describedby`. Nada de "Ops!" ou tom jocoso em dinheiro.

---

## 12. Acessibilidade e contraste

- **Contraste (WCAG AA):** texto normal ≥ 4.5:1; texto grande (≥ 18.66px/700 ou
  24px) e elementos de UI ≥ 3:1. `--ink`/`--ink-2` sobre `--paper`/`--surface`
  atendem a texto normal. **`--ink-3` só para texto ≥ 16px ou não essencial** —
  verificar antes de usar em corpo pequeno.
- **Cor nunca é o único sinal** (§3): estado do dinheiro por forma; status por
  ícone + texto; séries de gráfico por rótulo direto + legenda.
- **Foco visível** em tudo que é focável: anel `--focus` 2px + offset 2px. Nunca
  remover outline sem substituto.
- **Alvos de toque** ≥ 44×44px no mobile.
- **Teclado:** toda ação alcançável e operável; ordem lógica; Pulso navegável (§9.5);
  sheets/modais com foco preso e Esc para fechar.
- **Leitores de tela:** rótulos em todos os campos; valores monetários com
  `aria-label` legível ("mil trezentos e trinta reais" não é exigido, mas o número
  formatado sim); regiões com landmarks; `aria-live` para toasts e cursor do Pulso.
- **Gráficos** têm alternativa em tabela e `role="img"` + `aria-label` descritivo.
- **Movimento:** respeitar `prefers-reduced-motion` (desliga traçado/transições
  não essenciais).
- **Zoom/reflow:** usável a 200% e a 320px CSS sem rolagem horizontal da página.
- **Idioma:** `lang="pt-BR"`; moeda e datas em pt-BR; `tabular-nums` em colunas.

---

## 13. Microinterações e animação

Contenção é identidade. Movimento serve à compreensão, não ao espetáculo.

- **Durações:** 120–180ms (hover/press/toggle), 200–260ms (sheet/modal). Easing
  padrão `cubic-bezier(.2,.0,.2,1)`.
- **Um momento orquestrado:** o **Pulso traça a linha uma vez** ao abrir a Visão
  geral. Nada mais anima sozinho.
- **Feedback de ação:** ao salvar um lançamento, o número do **Disponível**
  transiciona suavemente para o novo valor (count-up curto ou crossfade, ~240ms) —
  mostra o efeito da decisão.
- **Sheets:** deslizam de baixo (mobile) / lateral (desktop).
- **Proibido:** fade-and-slide em cada seção no scroll, hover animado em todo
  cartão, parallax, confete, qualquer brilho/glow. Tudo desliga com reduced-motion.

---

## 14. Linguagem e microcopy

**Voz (direção C):** português brasileiro natural, simples, acolhedor sem ser
infantil. Transmite calma, clareza e controle. **Nunca culpa** o usuário. Sem termos
contábeis desnecessários. Voz ativa; o verbo do botão reaparece no sucesso.

### 14.1 Vocabulário (interno → interface → explicação)

| Interno | Rótulo na interface | Explicação curta (tooltip/ajuda) |
|---|---|---|
| Disponível para retirada | **Livre pra usar** | "O que dá pra tirar hoje sem mexer no que já tem destino." |
| Saldo em conta | **Na conta hoje** | "Dinheiro que já entrou de verdade." |
| Comprometido | **Já tem dono** | "Está na conta, mas reservado para contas e metas." |
| Recebimentos previstos | **Ainda vai entrar** | "Esperado, mas que ainda não caiu. Não conte com ele como se já fosse seu." |
| Reserva | **Guardado** | "Dinheiro separado para uma finalidade." |
| Retirada pessoal | **Retirada** | "O que você tira do caixa para você." |
| Margem de segurança | **Folga de segurança** | "Uma reserva mínima que o app mantém de lado nas contas." |
| Contas a vencer | **A pagar** | "Contas registradas que ainda não foram pagas." |
| Pulso do Caixa | **Pulso do Caixa** | "Como seu dinheiro entra, sai e fica comprometido nos próximos dias." |

### 14.2 Explicação da metodologia (acessível, sempre disponível)

Texto do "Como calculamos" (link no detalhamento):

> "A gente parte do que você tem na conta hoje. Tira o que já tem dono — contas a
> pagar e o que você guardou em reservas — e a sua folga de segurança. O que sobra é
> o que dá pra usar sem apertar o caixa. O que você ainda vai receber aparece à
> parte, porque ainda não é seu."

### 14.3 Amostras

- **Botões:** `+ Lançar` · `Salvar lançamento` · `Criar reserva` · `Guardar` ·
  `Exportar CSV`. (Verbos diretos, sem "→".)
- **Toasts:** "Lançamento salvo." · "Reserva criada." · "Lançamento excluído." +
  "Desfazer".
- **Vazios/erros/risco:** ver §11.
- **Confirmação de exclusão:** "Excluir este lançamento? Isso recalcula seu saldo."
  → `Excluir` (danger) / `Cancelar`.

### 14.4 Regras de escrita

Sentence case. Sem jargão ("conciliação", "fluxo projetado líquido"). Sem tom
jocoso em dinheiro. Sem emoji como ícone. Datas por extenso curtas ("14 nov").
Valores sempre com R$ e duas casas.

---

## 15. Padrões reutilizáveis

Reutilizar sempre; não recriar.

| Padrão | O que é | Onde |
|---|---|---|
| `<Money value state>` | valor monetário com forma por estado (`real`/`committed`/`forecast`), sinal e `tabular-nums` | todo o app |
| `LegendaEstados` | legenda das 4 formas do dinheiro | Pulso, Previsão, relatórios |
| `LinhaRazao` | linha de movimentação estilo livro-caixa | Movimentações, extratos |
| `BlocoHeroi` | número-herói + rótulo-voz + detalhamento aberto | Visão geral |
| `CartaoReserva` | envelope com progresso guardado/alvo | Reservas, Visão geral |
| `FaixaAlerta` | atenção/risco com ícone + frase + ação | todas |
| `FolhaLancamento` | quick-add em segundos | global |
| `TogglePeriodo` | segmented 7/15/30 | Pulso, Previsão |
| `PulsoCaixa` | o instrumento (§9) | Visão geral, Previsão |
| `TabelaRelatorio` | tabela + export + gráfico de categoria | Relatórios |

Princípios transversais: filete antes de caixa; número protagonista e alinhado;
estado por forma; voz acolhedora; o previsto sempre separado.

---

## 16. O que evitar

Para **não descaracterizar** o Fôlego:

- ❌ Dashboard/painel administrativo com cara de template SaaS comprado.
- ❌ Visual de banco digital tradicional.
- ❌ Gradientes roxos (ou gradientes como solução estética padrão).
- ❌ Inter ou Arial como fonte.
- ❌ Cartões repetitivos, tudo com o mesmo raio; "sopa de cards".
- ❌ Sombras excessivas/decorativas (sombra só em overlay).
- ❌ Excesso de bordas arredondadas.
- ❌ Gráficos sem função ou só para preencher espaço.
- ❌ Emoji no lugar de ícone.
- ❌ Chatbot sem necessidade funcional.
- ❌ Tratar recebimento previsto como dinheiro disponível.
- ❌ Comunicar estado do dinheiro **só por cor**.
- ❌ Jargão contábil; tom que culpa o usuário; "Ops!" em contexto de dinheiro.
- ❌ Destacar uma palavra do título em cor/itálico; caixa-alta em rótulos de dado;
  sobrelinha em tudo; "→" no texto de botões/links; pontos médios "A · B · C" como
  enfeite; mono como fonte de rótulo (mono só em contexto de instrumento, se usado).
- ❌ No Pulso: neon, glow, estética gamer, animação contínua.
- ❌ Animação de entrada por scroll em cada seção; hover animado em todo cartão.

---

## 17. Notas de implementação

**Fontes (Google Fonts):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spectral:ital,wght@0,400;0,500;1,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap">
```

**Tokens → Tailwind/shadcn.** Declarar os tokens da §4 como CSS variables em
`globals.css`, com o padrão de três estados de tema exigido pelo host:

```css
:root { /* valores CLAROS de todos os tokens */ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ /* valores ESCUROS + color-scheme: dark */ } }
:root[data-theme="dark"]{ /* mesmos valores ESCUROS */ }
```
Mapear no `tailwind.config` (`colors.paper`, `colors.ink`, `credit`, `debit`,
`forecast`, `committed`, status, `cat.1..6`) e nos tokens do shadcn
(`--background`→`--surface`, `--foreground`→`--ink`, `--primary`→`--ink`,
`--destructive`→`--risk`, `--border`→`--line`, `--ring`→`--focus`, `--radius`→2px).
Reestilizar os componentes shadcn — não usar o visual de fábrica.

**Moeda/números:** domínio em centavos inteiros; apresentar com
`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`; colunas com
`font-variant-numeric: tabular-nums`.

**Pulso:** componente SVG próprio (`components/pulso/`), não Recharts. Recharts só
nos relatórios, com a paleta §4.2 e rótulos diretos. Validar qualquer paleta
categórica nova com `scripts/validate_palette.js` antes de usar.

**Decisões menores não especificadas:** tomar a opção mais coerente com este
documento e registrá-la aqui. Só escalar ao time de produto se a decisão for
crítica (muda produto, custo, segurança ou escopo).
