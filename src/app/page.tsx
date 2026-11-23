import { LegendaEstados } from "@/components/ui/legenda-estados";
import { Money } from "@/components/ui/money";
import { estadoDemo } from "@/demo/fixtures";
import { formatBRL, resumoFinanceiro } from "@/domain";

/**
 * Visão geral — prévia de fundação. O número-herói é o "Livre pra usar", com o
 * cálculo aberto logo abaixo (metodologia transparente, DESIGN.md §10.1).
 * O Pulso do Caixa e o dashboard completo chegam em checkpoints seguintes.
 */
export default function VisaoGeralPage() {
  const r = resumoFinanceiro(estadoDemo);

  return (
    <div className="space-y-10">
      <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        Visão geral
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* Herói + detalhamento */}
        <section>
          <p className="font-ui text-sm text-ink-2">Livre pra usar</p>
          <p className="mt-1 font-display text-5xl font-semibold tabular leading-none text-ink sm:text-6xl">
            {formatBRL(r.livreParaUsar)}
          </p>
          <p className="mt-2 font-text text-ink-3">sem comprometer o futuro</p>

          <div className="mt-8 max-w-reading border-t border-line pt-4">
            <dl className="space-y-3">
              <LinhaCalculo rotulo="Na conta hoje">
                <Money value={r.saldoReal} estado="real" />
              </LinhaCalculo>
              <LinhaCalculo rotulo="− Já tem dono">
                <Money value={r.comprometido} estado="committed" />
              </LinhaCalculo>
              <LinhaCalculo rotulo="− Folga de segurança">
                <Money value={r.margemSeguranca} estado="real" />
              </LinhaCalculo>
              <div className="flex items-center justify-between border-t border-line-2 pt-3">
                <dt className="font-ui font-medium text-ink">= Livre pra usar</dt>
                <dd className="font-text text-lg font-medium tabular text-ink">
                  {formatBRL(r.livreParaUsar)}
                </dd>
              </div>
            </dl>

            <details className="mt-4 font-ui text-sm text-ink-2">
              <summary className="cursor-pointer text-forecast">
                Como calculamos
              </summary>
              <p className="mt-2 max-w-reading font-text text-ink-2">
                A gente parte do que você tem na conta hoje. Tira o que já tem
                dono — contas a pagar e o que você guardou em reservas — e a sua
                folga de segurança. O que sobra é o que dá pra usar sem apertar o
                caixa. O que você ainda vai receber aparece à parte, porque ainda
                não é seu.
              </p>
            </details>
          </div>

          {/* Previsto, sempre separado */}
          <div className="mt-6 flex max-w-reading items-center justify-between border-t border-dashed border-forecast pt-4">
            <div>
              <p className="font-ui text-sm text-ink-2">Ainda vai entrar</p>
              <p className="font-ui text-xs text-ink-3">
                não entra no que você pode usar hoje
              </p>
            </div>
            <Money value={r.entradasPrevistas} estado="forecast" />
          </div>
        </section>

        {/* Pulso do Caixa — placeholder honesto */}
        <section>
          <p className="font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
            Pulso do Caixa
          </p>
          <div className="mt-3 flex h-48 items-center justify-center rounded-md border border-dashed border-line-2 bg-surface px-6 text-center">
            <p className="font-text text-sm text-ink-3">
              O instrumento que mostra seu caixa dia a dia chega no próximo
              checkpoint.
            </p>
          </div>
          <LegendaEstados className="mt-5" />
        </section>
      </div>

      <p className="max-w-reading font-ui text-xs text-ink-3">
        Fundação do produto. Os valores acima vêm de um exemplo coerente com um
        prestador de serviço (DESIGN.md §2.5) e comprovam que a interface consome
        o motor financeiro — nenhuma fórmula vive aqui dentro.
      </p>
    </div>
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
