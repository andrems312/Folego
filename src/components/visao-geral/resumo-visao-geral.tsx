"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { formatBRL } from "@/domain";

/**
 * Bloco-herói "Livre pra usar" conectado ao store (dados derivados de
 * `resumoFinanceiro`, reativos). Trata os estados de carregamento e de
 * recuperação (dados salvos inválidos), sem sobrescrever nada silenciosamente.
 */
export function ResumoVisaoGeral() {
  const { status, resumo, aviso, recomecar, persistenciaDisponivel } = useFinanceiro();

  if (status === "carregando") {
    return <EsqueletoResumo />;
  }

  if (status === "dados-invalidos") {
    return (
      <section
        className="max-w-reading rounded-md border border-risk bg-risk-bg p-5"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-risk">
            <Icon name="alerta" size={20} />
          </span>
          <div>
            <h2 className="font-display text-lg text-ink">
              Encontramos dados salvos com problema
            </h2>
            <p className="mt-1 font-text text-sm text-ink-2">
              {aviso ??
                "Os dados guardados neste navegador não puderam ser lidos."}{" "}
              Para sua segurança, não mexemos neles. Você pode recomeçar do zero
              (isso substitui os dados salvos) ou sair e verificar este navegador.
            </p>
            <div className="mt-4">
              <Button variante="danger" onClick={recomecar}>
                Recomeçar do zero
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      {!persistenciaDisponivel && aviso && (
        <p className="mb-4 rounded-sm border border-attention bg-attention-bg px-3 py-2 font-ui text-xs text-ink-2">
          {aviso}
        </p>
      )}

      <p className="font-ui text-sm text-ink-2">Livre pra usar</p>
      <p className="mt-1 font-display text-5xl font-semibold tabular leading-none text-ink sm:text-6xl">
        {formatBRL(resumo.livreParaUsar)}
      </p>
      <p className="mt-2 font-text text-ink-3">sem comprometer o futuro</p>

      <div className="mt-8 max-w-reading border-t border-line pt-4">
        <dl className="space-y-3">
          <LinhaCalculo rotulo="Na conta hoje">
            <Money value={resumo.saldoReal} estado="real" />
          </LinhaCalculo>
          <LinhaCalculo rotulo="− Já tem dono">
            <Money value={resumo.comprometido} estado="committed" />
          </LinhaCalculo>
          <LinhaCalculo rotulo="− Folga de segurança">
            <Money value={resumo.margemSeguranca} estado="real" />
          </LinhaCalculo>
          <div className="flex items-center justify-between border-t border-line-2 pt-3">
            <dt className="font-ui font-medium text-ink">= Livre pra usar</dt>
            <dd className="font-text text-lg font-medium tabular text-ink">
              {formatBRL(resumo.livreParaUsar)}
            </dd>
          </div>
        </dl>

        <details className="mt-4 font-ui text-sm text-ink-2">
          <summary className="cursor-pointer text-forecast">Como calculamos</summary>
          <p className="mt-2 max-w-reading font-text text-ink-2">
            A gente parte do que você tem na conta hoje. Tira o que já tem dono —
            contas a pagar e o que você guardou em reservas — e a sua folga de
            segurança. O que sobra é o que dá pra usar sem apertar o caixa. O que
            você ainda vai receber aparece à parte, porque ainda não é seu.
          </p>
        </details>
      </div>

      <div className="mt-6 flex max-w-reading items-center justify-between border-t border-dashed border-forecast pt-4">
        <div>
          <p className="font-ui text-sm text-ink-2">Ainda vai entrar</p>
          <p className="font-ui text-xs text-ink-3">
            não entra no que você pode usar hoje
          </p>
        </div>
        <Money value={resumo.entradasPrevistas} estado="forecast" />
      </div>
    </section>
  );
}

function LinhaCalculo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="font-ui text-sm text-ink-2">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function EsqueletoResumo() {
  return (
    <section aria-busy="true" aria-label="Carregando seu resumo">
      <div className="h-4 w-28 rounded-sm bg-surface-2" />
      <div className="mt-2 h-14 w-64 rounded-sm bg-surface-2" />
      <div className="mt-8 max-w-reading space-y-3 border-t border-line pt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-32 rounded-sm bg-surface-2" />
            <div className="h-3 w-20 rounded-sm bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
