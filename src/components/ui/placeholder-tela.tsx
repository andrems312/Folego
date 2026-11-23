import { Icon } from "./icon";
import type { IconName } from "./icon";

/**
 * Estado "chega no próximo checkpoint" para as áreas ainda não construídas.
 * Convite, não tela morta (DESIGN.md §11) — sem fingir funcionalidade.
 */
export function PlaceholderTela({
  icone,
  titulo,
  descricao,
}: {
  icone: IconName;
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="mx-auto max-w-reading py-10">
      <p className="mb-6 font-ui text-xs uppercase tracking-[0.12em] text-ink-3">
        {titulo}
      </p>
      <div className="flex items-start gap-4 border-t-2 border-ink pt-6">
        <span className="mt-0.5 text-ink-2">
          <Icon name={icone} size={24} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-ink">
            Em construção
          </h1>
          <p className="mt-2 font-text text-ink-2">{descricao}</p>
          <p className="mt-4 font-ui text-sm text-ink-3">
            A fundação e o motor financeiro já estão prontos. Esta área chega em
            um próximo checkpoint.
          </p>
        </div>
      </div>
    </section>
  );
}
