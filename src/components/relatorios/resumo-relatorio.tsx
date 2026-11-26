"use client";

import { useMemo, useState } from "react";
import { RecuperacaoDados } from "@/components/financeiro/recuperacao-dados";
import { LegendaEstados } from "@/components/ui/legenda-estados";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/domain";
import { formatarDataCurta } from "@/lib/formato-data";
import {
  hojeISO,
  periodoMesAnterior,
  periodoMesAtual,
  periodoValido,
} from "@/lib/periodo-relatorio";
import { relatorioDoPeriodo } from "@/lib/relatorio";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { SeletorPeriodo, type ModoPeriodo } from "./seletor-periodo";

/**
 * Resumo dos Relatórios (Entrega 2.8 / Etapa B): seleção de período + indicadores
 * financeiros do período. NENHUM cálculo aqui — tudo vem de `relatorioDoPeriodo`
 * (helper puro da Etapa A). Base de competência (a `data` do lançamento), deixada
 * explícita na interface. Gráfico, tabela e CSV chegam nas etapas seguintes.
 */
export function ResumoRelatorio() {
  const { status, estado, aviso, recomecar, persistenciaDisponivel } =
    useFinanceiro();

  const hoje = useMemo(() => hojeISO(), []);
  const inicialMes = useMemo(() => periodoMesAtual(hoje), [hoje]);

  const [modo, setModo] = useState<ModoPeriodo>("este-mes");
  const [customInicio, setCustomInicio] = useState(inicialMes.inicio);
  const [customFim, setCustomFim] = useState(inicialMes.fim);

  const periodo = useMemo(() => {
    if (modo === "este-mes") return periodoMesAtual(hoje);
    if (modo === "mes-passado") return periodoMesAnterior(hoje);
    return { inicio: customInicio, fim: customFim };
  }, [modo, hoje, customInicio, customFim]);

  const valido = periodoValido(periodo);

  const relatorio = useMemo(
    () => relatorioDoPeriodo(estado.movimentacoes, periodo),
    [estado.movimentacoes, periodo],
  );

  if (status === "carregando") return <EsqueletoRelatorio />;
  if (status === "dados-invalidos") {
    return <RecuperacaoDados aviso={aviso} onRecomecar={recomecar} />;
  }

  const semMovimentos = relatorio.contagem.total === 0;
  const resultadoNegativo = relatorio.resultado < 0;

  return (
    <section className="space-y-8">
      {!persistenciaDisponivel && aviso && (
        <p className="rounded-sm border border-attention bg-attention-bg px-3 py-2 font-ui text-xs text-ink-2">
          {aviso}
        </p>
      )}

      <div className="space-y-3">
        <SeletorPeriodo
          modo={modo}
          onModo={setModo}
          inicio={customInicio}
          fim={customFim}
          onInicio={setCustomInicio}
          onFim={setCustomFim}
          invalido={!valido}
        />
        {valido && (
          <p className="font-ui text-xs text-ink-3">
            {formatarDataCurta(periodo.inicio)} a {formatarDataCurta(periodo.fim)}
            {!semMovimentos && (
              <> · {relatorio.contagem.total} movimentações no período</>
            )}
          </p>
        )}
      </div>

      {!valido ? (
        <p className="max-w-reading font-text text-ink-2">
          Ajuste as datas para ver o relatório: o início precisa ser igual ou
          anterior ao fim.
        </p>
      ) : semMovimentos ? (
        <VazioPeriodo />
      ) : (
        <>
          {/* Resultado do período — destaque editorial (livro-caixa). */}
          <div className="max-w-reading border-t-2 border-ink pt-5">
            <p className="font-ui text-sm text-ink-2">Resultado do período</p>
            <p
              className={cnResultado(resultadoNegativo)}
              aria-label={`Resultado do período: ${
                resultadoNegativo ? "menos " : ""
              }${formatBRL(Math.abs(relatorio.resultado))}`}
            >
              {resultadoNegativo ? "− " : ""}
              {formatBRL(Math.abs(relatorio.resultado))}
            </p>
            <p className="mt-2 font-text text-ink-3">
              só o que já foi realizado: recebidas − pagas − retiradas.
            </p>
          </div>

          {/* Transparência da base temporal (competência) — discreta, inequívoca. */}
          <div className="max-w-reading rounded-sm border border-line bg-surface px-4 py-3">
            <p className="font-ui text-xs text-ink-2">
              <span className="font-medium text-ink">
                Por data de lançamento (competência).
              </span>{" "}
              Considera a data registrada em cada movimentação, não o dia em que o
              dinheiro de fato entrou ou saiu.
            </p>
            <details className="mt-2 font-ui text-xs text-ink-2">
              <summary className="cursor-pointer text-forecast">
                O que cada número considera
              </summary>
              <dl className="mt-2 space-y-1.5 font-text text-ink-2">
                <Termo termo="Recebidas">
                  entradas já contabilizadas como realizadas pelo domínio.
                </Termo>
                <Termo termo="A receber">
                  entradas ainda pendentes (previstas) — nunca entram no resultado.
                </Termo>
                <Termo termo="Pagas">
                  saídas já contabilizadas como pagas (inclui a parte paga de contas
                  parciais).
                </Termo>
                <Termo termo="A pagar">saídas ainda pendentes.</Termo>
                <Termo termo="Resultado">
                  recebidas − pagas − retiradas realizadas; só valores já realizados.
                </Termo>
              </dl>
            </details>
          </div>

          {/* Entradas e saídas, em colunas (débito/crédito). */}
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <Coluna titulo="Entradas">
              <LinhaValor rotulo="Recebidas">
                <Money value={relatorio.entradasRecebidas} estado="real" />
              </LinhaValor>
              <LinhaValor rotulo="A receber">
                <Money value={relatorio.entradasAReceber} estado="forecast" />
              </LinhaValor>
            </Coluna>
            <Coluna titulo="Saídas">
              <LinhaValor rotulo="Pagas">
                <Money value={relatorio.saidasPagas} estado="real" />
              </LinhaValor>
              <LinhaValor rotulo="A pagar">
                <Money value={relatorio.saidasAPagar} estado="committed" />
              </LinhaValor>
            </Coluna>
          </div>

          {/* Retiradas — sempre destacadas (DESIGN.md §10.5). */}
          <div className="flex max-w-reading items-baseline justify-between gap-4 border-t border-line pt-4">
            <div>
              <p className="font-ui text-sm text-ink-2">Retiradas realizadas</p>
              <p className="font-ui text-xs text-ink-3">
                o que você tirou para si no período
              </p>
            </div>
            <Money value={relatorio.retiradasRealizadas} estado="real" />
          </div>

          <LegendaEstados />
        </>
      )}

      <p className="max-w-reading font-ui text-xs text-ink-3">
        Este relatório usa só o que você registrou aqui — não é uma consulta ao seu
        banco em tempo real.
      </p>
    </section>
  );
}

function cnResultado(negativo: boolean): string {
  return [
    "tabular mt-1 font-display text-4xl font-semibold leading-none sm:text-5xl",
    negativo ? "text-risk" : "text-ink",
  ].join(" ");
}

function Coluna({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        {titulo}
      </p>
      <dl className="mt-3 space-y-3">{children}</dl>
    </div>
  );
}

function LinhaValor({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className="font-ui text-sm text-ink-2">{rotulo}</dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

function Termo({ termo, children }: { termo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="inline font-medium text-ink">{termo}:</dt>{" "}
      <dd className="inline">{children}</dd>
    </div>
  );
}

function VazioPeriodo() {
  return (
    <div className="max-w-reading border-t-2 border-ink pt-6">
      <h2 className="font-display text-2xl text-ink">
        Ainda não há dados suficientes para um relatório deste período
      </h2>
      <p className="mt-2 font-text text-ink-2">
        Nenhuma movimentação com data dentro do período selecionado. Troque o
        período ou registre lançamentos para ver o fechamento aqui.
      </p>
    </div>
  );
}

function EsqueletoRelatorio() {
  return (
    <section
      aria-busy="true"
      aria-label="Carregando o relatório"
      className="space-y-8"
    >
      <div className="h-9 w-72 max-w-full rounded-sm bg-surface-2" />
      <div className="h-12 w-60 max-w-full rounded-sm bg-surface-2" />
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-3">
            <div className="h-3 w-20 rounded-sm bg-surface-2" />
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-4 w-24 rounded-sm bg-surface-2" />
                <div className="h-4 w-20 rounded-sm bg-surface-2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
