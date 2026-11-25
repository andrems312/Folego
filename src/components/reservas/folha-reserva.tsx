"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatNumero } from "@/domain";
import type { Reserva } from "@/domain";
import { cn } from "@/lib/cn";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { construirCamposReserva } from "@/lib/reserva";
import { useAcoes } from "@/state/estado-financeiro-provider";

const campoClasse =
  "w-full rounded-sm border border-line-2 bg-surface-2 px-3 py-2 font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

/**
 * Folha de criar/editar reserva. `reserva = null` cria; `reserva` definido edita.
 * Consome `acoes.criarReserva`/`acoes.editarReserva` (regra no domínio). Meta vazia
 * remove a meta. Nunca altera o saldo. Reusa Sheet/Toast/Button + guarda anti-duplo.
 */
export function FolhaReserva({
  aberto,
  reserva,
  onFechar,
}: {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
}) {
  return (
    <Sheet
      aberto={aberto}
      onFechar={onFechar}
      titulo={reserva ? "Editar reserva" : "Nova reserva"}
    >
      {aberto && (
        <FormularioReserva
          key={reserva?.id ?? "nova"}
          reserva={reserva}
          onSucesso={onFechar}
        />
      )}
    </Sheet>
  );
}

function FormularioReserva({
  reserva,
  onSucesso,
}: {
  reserva: Reserva | null;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();

  const [nome, setNome] = useState(reserva?.nome ?? "");
  const [meta, setMeta] = useState(
    reserva?.alvo != null ? formatNumero(reserva.alvo) : "",
  );
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroMeta, setErroMeta] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardaRef.current!.emAndamento()) return;
    setErroNome(null);
    setErroMeta(null);
    setErroGeral(null);

    const campos = construirCamposReserva(nome, meta);
    if (!campos.ok) {
      if (campos.campo === "nome") setErroNome(campos.erro);
      else setErroMeta(campos.erro);
      return;
    }

    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = reserva
        ? acoes.editarReserva(reserva.id, { nome: campos.nome, alvo: campos.alvo })
        : acoes.criarReserva({ nome: campos.nome, alvo: campos.alvo });
      if (r.ok) {
        toast(reserva ? "Reserva atualizada." : "Reserva criada.");
        onSucesso();
        return true;
      }
      setErroGeral(mensagemDeErro(r.codigo));
      return false;
    });
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="reserva-nome" className="mb-1 block font-ui text-sm text-ink-2">
          Nome
        </label>
        <input
          id="reserva-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Impostos, Férias, Ferramenta nova"
          aria-invalid={erroNome ? true : undefined}
          aria-describedby={erroNome ? "erro-reserva-nome" : undefined}
          className={cn(campoClasse, erroNome && "border-risk")}
        />
        {erroNome && (
          <p id="erro-reserva-nome" className="mt-1 font-ui text-xs text-risk">
            {erroNome}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reserva-meta" className="mb-1 block font-ui text-sm text-ink-2">
          Meta (opcional)
        </label>
        <div
          className={cn(
            "flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-focus",
            erroMeta && "border-risk",
          )}
        >
          <span className="font-text text-ink-3">R$</span>
          <input
            id="reserva-meta"
            inputMode="decimal"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="0,00"
            aria-invalid={erroMeta ? true : undefined}
            aria-describedby={erroMeta ? "erro-reserva-meta" : undefined}
            className="w-full bg-transparent py-2 font-text tabular text-ink focus-visible:outline-none"
          />
        </div>
        {erroMeta ? (
          <p id="erro-reserva-meta" className="mt-1 font-ui text-xs text-risk">
            {erroMeta}
          </p>
        ) : (
          <p className="mt-1 font-ui text-xs text-ink-3">
            Deixe em branco para uma reserva sem meta.
          </p>
        )}
      </div>

      {erroGeral && (
        <p role="alert" className="font-ui text-sm text-risk">
          {erroGeral}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secondary" type="button" onClick={onSucesso}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {reserva ? "Salvar alterações" : "Criar reserva"}
        </Button>
      </div>
    </form>
  );
}
