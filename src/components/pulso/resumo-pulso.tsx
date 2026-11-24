"use client";

import { useMemo, useState } from "react";
import { RecuperacaoDados } from "@/components/financeiro/recuperacao-dados";
import { LegendaEstados } from "@/components/ui/legenda-estados";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/domain";
import type { HorizontePulso } from "@/domain";
import { formatarDataLonga } from "@/lib/formato-data";
import { recortarHorizonte, resumirPulso } from "@/lib/pulso";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { GraficoPulso } from "./grafico-pulso";
import { SeletorHorizonte } from "./seletor-horizonte";

/**
 * Resumo textual do Pulso do Caixa (Etapa 2): responde "como estará meu caixa
 * nos próximos dias?" consumindo a projeção do Provider recortada por horizonte.
 * Nenhum cálculo financeiro aqui — os indicadores vêm de `resumirPulso` (helper
 * puro). O gráfico SVG virá na Etapa 3.
 */
export function ResumoPulso() {
  const { status, projecao, aviso, recomecar, persistenciaDisponivel } =
    useFinanceiro();
  const [horizonte, setHorizonte] = useState<HorizontePulso>(7);

  const recorte = useMemo(
    () => recortarHorizonte(projecao, horizonte),
    [projecao, horizonte],
  );
  const indicadores = useMemo(() => resumirPulso(recorte), [recorte]);

  if (status === "carregando") return <EsqueletoPulso />;
  if (status === "dados-invalidos") {
    return <RecuperacaoDados aviso={aviso} onRecomecar={recomecar} />;
  }

  const semMovimentos =
    indicadores.totalAPagar === 0 && indicadores.totalPrevisto === 0;

  // Descrição acessível do gráfico (role="img"): carrega os números-chave para
  // quem não enxerga o traçado.
  const descricaoGrafico =
    indicadores.emRisco && indicadores.primeiroDiaDeRisco
      ? `Projeção do caixa para ${indicadores.horizonteDias} dias. O saldo garantido parte de ${formatBRL(indicadores.saldoAtual)} e chega ao menor ponto, ${formatBRL(indicadores.menorConfirmado)}, com aperto previsto em ${formatarDataLonga(indicadores.primeiroDiaDeRisco.data)}.`
      : `Projeção do caixa para ${indicadores.horizonteDias} dias. O saldo garantido parte de ${formatBRL(indicadores.saldoAtual)}, tem menor ponto de ${formatBRL(indicadores.menorConfirmado)} e não cruza a folga de segurança no período.`;

  return (
    <section className="space-y-8">
      {!persistenciaDisponivel && aviso && (
        <p className="rounded-sm border border-attention bg-attention-bg px-3 py-2 font-ui text-xs text-ink-2">
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
          Pulso do caixa
        </p>
        <SeletorHorizonte valor={horizonte} onChange={setHorizonte} />
      </div>

      {indicadores.emRisco && indicadores.primeiroDiaDeRisco ? (
        <div className="max-w-reading">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            Seu caixa aperta em{" "}
            {formatarDataLonga(indicadores.primeiroDiaDeRisco.data)}.
          </h1>
          <p className="mt-2 font-text text-ink-2">
            Nesse dia, o que é certo no seu caixa fica abaixo da sua folga de
            segurança. Vale olhar o que vence antes disso e segurar gastos que
            dá pra adiar.
          </p>
        </div>
      ) : (
        <div className="max-w-reading">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            Sem apertos à vista nos próximos {indicadores.horizonteDias} dias.
          </h1>
          <p className="mt-2 font-text text-ink-2">
            O que é certo no seu caixa se mantém acima da sua folga de segurança
            no período.
          </p>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <p className="font-ui text-sm text-ink-2">Na conta hoje</p>
        <Money
          value={indicadores.saldoAtual}
          estado="real"
          className="mt-1 text-2xl"
        />
      </div>

      {semMovimentos ? (
        <p className="max-w-reading font-text text-ink-2">
          Nenhuma conta ou recebimento previsto nos próximos{" "}
          {indicadores.horizonteDias} dias. Seu caixa segue estável conforme o
          que você registrou.
        </p>
      ) : (
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Indicador
            rotulo="Menor saldo garantido no período"
            sub={`em ${formatarDataLonga(indicadores.diaMenorConfirmado.data)}`}
          >
            <Money value={indicadores.menorConfirmado} estado="real" />
          </Indicador>
          <Indicador rotulo="Contas a pagar no período">
            <Money value={indicadores.totalAPagar} estado="committed" />
          </Indicador>
          <Indicador rotulo="Ainda pode entrar, se o previsto entrar">
            <Money value={indicadores.aEntrar} estado="forecast" />
          </Indicador>
          <Indicador
            rotulo={`Projeção ao fim dos ${indicadores.horizonteDias} dias`}
            sub="se tudo que você espera entrar, entrar"
          >
            <Money value={indicadores.projetadoFinal} estado="forecast" />
          </Indicador>
        </dl>
      )}

      <GraficoPulso
        dias={recorte.dias}
        horizonteDias={indicadores.horizonteDias}
        primeiroDiaDeRisco={recorte.primeiroDiaDeRisco}
        descricao={descricaoGrafico}
      />

      <LegendaEstados />

      <p className="max-w-reading font-ui text-xs text-ink-3">
        Esta previsão usa só o que você registrou aqui — não é uma consulta ao
        seu banco em tempo real.
      </p>
    </section>
  );
}

function Indicador({
  rotulo,
  sub,
  children,
}: {
  rotulo: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
      <dt className="min-w-0">
        <span className="block font-ui text-sm text-ink-2">{rotulo}</span>
        {sub && <span className="block font-ui text-xs text-ink-3">{sub}</span>}
      </dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

function EsqueletoPulso() {
  return (
    <section aria-busy="true" aria-label="Carregando a previsão" className="space-y-8">
      <div className="h-8 w-56 rounded-sm bg-surface-2" />
      <div className="h-12 w-72 max-w-full rounded-sm bg-surface-2" />
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-4 w-40 rounded-sm bg-surface-2" />
            <div className="h-4 w-20 rounded-sm bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
