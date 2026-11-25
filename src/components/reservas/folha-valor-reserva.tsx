"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatBRL, formatNumero, validarValorMonetario } from "@/domain";
import type { Reserva } from "@/domain";
import { cn } from "@/lib/cn";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes, useFinanceiro } from "@/state/estado-financeiro-provider";

export type ModoValor = "guardar" | "resgatar";

/**
 * Folha de guardar/resgatar dinheiro de uma reserva.
 *
 * `guardar`: consome `acoes.guardarEmReserva`. Como o domínio NÃO limita ao livre
 * disponível, esta folha aplica uma GUARDA DE UI (não recalcula nada): bloqueia valor
 * acima de `resumo.livreParaUsar`. `resgatar`: consome `acoes.resgatarDeReserva`; o
 * teto pelo saldo da reserva é decidido pelo domínio (`VALOR_ACIMA_DO_SALDO_RESERVA`).
 */
export function FolhaValorReserva({
  reserva,
  modo,
  onFechar,
}: {
  reserva: Reserva | null;
  modo: ModoValor;
  onFechar: () => void;
}) {
  return (
    <Sheet
      aberto={reserva != null}
      onFechar={onFechar}
      titulo={modo === "guardar" ? "Guardar dinheiro" : "Resgatar dinheiro"}
    >
      {reserva && (
        <FormularioValor reserva={reserva} modo={modo} onSucesso={onFechar} />
      )}
    </Sheet>
  );
}

function FormularioValor({
  reserva,
  modo,
  onSucesso,
}: {
  reserva: Reserva;
  modo: ModoValor;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();
  const { resumo } = useFinanceiro();

  const disponivel = resumo.livreParaUsar; // só usado no modo "guardar"
  const [valor, setValor] = useState(
    modo === "resgatar" ? formatNumero(reserva.saldoAtual) : "",
  );
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  function preencherTudo() {
    setErroValor(null);
    setValor(formatNumero(modo === "resgatar" ? reserva.saldoAtual : disponivel));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardaRef.current!.emAndamento()) return;
    setErroValor(null);
    setErroGeral(null);

    const parsed = validarValorMonetario(valor);
    if (!parsed.ok) {
      setErroValor(parsed.erro);
      return;
    }
    // Guarda de UI: não deixar comprometer mais do que o livre pra usar.
    if (modo === "guardar" && parsed.centavos > disponivel) {
      setErroValor(
        `Você só pode guardar até ${formatBRL(disponivel)} agora — é o seu livre pra usar hoje.`,
      );
      return;
    }

    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r =
        modo === "guardar"
          ? acoes.guardarEmReserva(reserva.id, parsed.centavos)
          : acoes.resgatarDeReserva(reserva.id, parsed.centavos);
      if (r.ok) {
        toast(modo === "guardar" ? "Dinheiro guardado." : "Dinheiro resgatado.");
        onSucesso();
        return true;
      }
      setErroGeral(mensagemDeErro(r.codigo));
      return false;
    });
    if (resultado === "erro") setEnviando(false);
  }

  const contextoRotulo = modo === "guardar" ? "Disponível pra guardar" : "Guardado nesta reserva";
  const contextoValor = modo === "guardar" ? disponivel : reserva.saldoAtual;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1">
        <p className="font-ui text-ink">{reserva.nome}</p>
        <div className="flex items-baseline justify-between border-y border-line py-3">
          <span className="font-ui text-sm text-ink-2">{contextoRotulo}</span>
          <span className="tabular font-text text-ink">
            {formatBRL(contextoValor)}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="valor-reserva" className="block font-ui text-sm text-ink-2">
            {modo === "guardar" ? "Quanto guardar" : "Quanto resgatar"}
          </label>
          <button
            type="button"
            onClick={preencherTudo}
            className="rounded-sm font-ui text-xs text-forecast hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {modo === "guardar" ? "Guardar tudo" : "Resgatar tudo"}
          </button>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-focus",
            erroValor && "border-risk",
          )}
        >
          <span className="font-text text-ink-3">R$</span>
          <input
            id="valor-reserva"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            aria-invalid={erroValor ? true : undefined}
            aria-describedby={erroValor ? "erro-valor-reserva" : undefined}
            className="w-full bg-transparent py-2 font-text tabular text-ink focus-visible:outline-none"
          />
        </div>
        {erroValor && (
          <p id="erro-valor-reserva" className="mt-1 font-ui text-xs text-risk">
            {erroValor}
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
          {modo === "guardar" ? "Guardar" : "Resgatar"}
        </Button>
      </div>
    </form>
  );
}
