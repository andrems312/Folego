import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Padrão de recuperação de dados inválidos, compartilhado entre telas que
 * consomem o store (Visão geral, Movimentações). Não contorna o mecanismo de
 * recuperação: só oferece a ação explícita de recomeçar.
 */
export function RecuperacaoDados({
  aviso,
  onRecomecar,
}: {
  aviso: string | null;
  onRecomecar: () => void;
}) {
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
            {aviso ?? "Os dados guardados neste navegador não puderam ser lidos."}{" "}
            Para sua segurança, não mexemos neles. Você pode recomeçar do zero
            (isso substitui os dados salvos) ou sair e verificar este navegador.
          </p>
          <div className="mt-4">
            <Button variante="danger" onClick={onRecomecar}>
              Recomeçar do zero
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
