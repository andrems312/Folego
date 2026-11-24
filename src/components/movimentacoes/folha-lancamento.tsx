"use client";

import { Sheet } from "@/components/ui/sheet";
import { FormularioLancamento } from "./formulario-lancamento";

/** Folha "Novo lançamento": Sheet acessível + formulário de criação. */
export function FolhaLancamento({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Novo lançamento">
      <FormularioLancamento onSucesso={onFechar} />
    </Sheet>
  );
}
