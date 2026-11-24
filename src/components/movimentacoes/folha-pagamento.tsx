"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import {
  estaQuitada,
  formatBRL,
  formatNumero,
  saldoPendente,
  validarValorMonetario,
  valorPago,
} from "@/domain";
import type { Movimentacao } from "@/domain";
import { nomeCategoria } from "@/lib/categorias";
import { cn } from "@/lib/cn";
import { formatarDataLonga } from "@/lib/formato-data";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes } from "@/state/estado-financeiro-provider";

/**
 * Folha de registro de pagamento de uma conta (saída/retirada) com saldo pendente.
 *
 * Consome EXCLUSIVAMENTE `acoes.registrarPagamento` — a regra financeira (limite
 * do valor, quita total/parcial, baixa de reserva) vive no domínio. A UI não
 * recalcula saldo: usa `saldoPendente`/`valorPago` do domínio para exibir. Reusa
 * Sheet, Toast, Button, a validação monetária e a guarda anti-duplo-envio. O
 * conteúdo desmonta ao fechar (Sheet retorna null), reiniciando a guarda.
 */
export function FolhaPagamento({
  movimentacao,
  onFechar,
}: {
  movimentacao: Movimentacao | null;
  onFechar: () => void;
}) {
  return (
    <Sheet
      aberto={movimentacao != null}
      onFechar={onFechar}
      titulo="Registrar pagamento"
    >
      {movimentacao && (
        <FormularioPagamento movimentacao={movimentacao} onSucesso={onFechar} />
      )}
    </Sheet>
  );
}

function FormularioPagamento({
  movimentacao,
  onSucesso,
}: {
  movimentacao: Movimentacao;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();

  // Valores de EXIBIÇÃO vindos do domínio — a UI não recalcula saldo pendente.
  const pendente = saldoPendente(movimentacao);
  const pago = valorPago(movimentacao);

  const [valor, setValor] = useState(() => formatNumero(pendente)); // inicia no pendente
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  function quitarTudo() {
    setErroValor(null);
    setValor(formatNumero(pendente));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardaRef.current!.emAndamento()) return;
    setErroValor(null);
    setErroGeral(null);

    // Validação de FORMATO (positividade), não de regra financeira. O limite
    // "≤ saldo pendente" é decidido pelo domínio em `registrarPagamento`.
    const parsed = validarValorMonetario(valor);
    if (!parsed.ok) {
      setErroValor(parsed.erro);
      return;
    }

    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.registrarPagamento(movimentacao.id, parsed.centavos);
      if (r.ok) {
        const atualizada = r.estado.movimentacoes.find(
          (x) => x.id === movimentacao.id,
        );
        const quitou = atualizada ? estaQuitada(atualizada) : false;
        toast(quitou ? "Conta quitada." : "Pagamento registrado.");
        onSucesso();
        return true;
      }
      setErroGeral(mensagemDeErro(r.codigo));
      return false;
    });
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1">
        <p className="font-ui text-ink">{movimentacao.descricao ?? "Conta"}</p>
        <p className="font-ui text-xs text-ink-3">
          <span className="text-ink-2">
            {nomeCategoria(movimentacao.categoriaId)}
          </span>
          {" · "}
          {formatarDataLonga(movimentacao.data)}
        </p>
      </div>

      <dl className="space-y-2 border-y border-line py-3 font-ui text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-ink-2">Valor total</dt>
          <dd className="tabular font-text text-ink">
            {formatBRL(movimentacao.valor)}
          </dd>
        </div>
        {pago > 0 && (
          <div className="flex items-baseline justify-between">
            <dt className="text-ink-2">Já pago</dt>
            <dd className="tabular font-text text-ink">{formatBRL(pago)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <dt className="font-medium text-ink">Falta pagar</dt>
          <dd className="tabular font-text font-medium text-ink">
            {formatBRL(pendente)}
          </dd>
        </div>
      </dl>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="valor-pagamento"
            className="block font-ui text-sm text-ink-2"
          >
            Valor do pagamento
          </label>
          <button
            type="button"
            onClick={quitarTudo}
            className="rounded-sm font-ui text-xs text-forecast hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Quitar tudo
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
            id="valor-pagamento"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            aria-invalid={erroValor ? true : undefined}
            aria-describedby={erroValor ? "erro-valor-pagamento" : undefined}
            className="w-full bg-transparent py-2 font-text tabular text-ink focus-visible:outline-none"
          />
        </div>
        {erroValor && (
          <p
            id="erro-valor-pagamento"
            className="mt-1 font-ui text-xs text-risk"
          >
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
          Registrar pagamento
        </Button>
      </div>
    </form>
  );
}
