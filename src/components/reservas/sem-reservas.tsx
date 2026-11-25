/**
 * Estado vazio de Reservas — explica a finalidade no tom do Fôlego e prepara
 * visualmente a área para a futura criação, SEM botão que ainda não funciona.
 */
export function SemReservas() {
  return (
    <div className="max-w-reading border-t-2 border-ink pt-6">
      <h2 className="font-display text-2xl text-ink">
        Separe dinheiro sem tirar do caixa
      </h2>
      <p className="mt-2 font-text text-ink-2">
        Reservas são envelopes dentro do seu caixa: você separa uma parte para uma
        finalidade — impostos, uma folga, uma ferramenta — sem tirá-la da conta. O
        que está reservado sai do “Livre pra usar”, mas continua sendo seu.
      </p>
      <p className="mt-4 font-ui text-sm text-ink-3">
        Em breve você vai poder criar e abastecer reservas por aqui.
      </p>
    </div>
  );
}
