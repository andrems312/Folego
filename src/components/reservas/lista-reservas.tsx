"use client";

import { useState } from "react";
import { RecuperacaoDados } from "@/components/financeiro/recuperacao-dados";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/domain";
import type { Reserva } from "@/domain";
import { useFinanceiro } from "@/state/estado-financeiro-provider";
import { FolhaDetalheReserva } from "./folha-detalhe-reserva";
import { FolhaExcluirReserva } from "./folha-excluir-reserva";
import { FolhaReserva } from "./folha-reserva";
import { FolhaValorReserva } from "./folha-valor-reserva";
import { LinhaReserva } from "./linha-reserva";
import { SemReservas } from "./sem-reservas";

/**
 * Tela de Reservas (Entrega 2.7). Consome o store: total guardado
 * (`resumo.totalReservas`, derivado pelo domínio), quantidade e a lista. A linha abre
 * a folha de detalhe (Guardar/Resgatar/Editar/Excluir); o topo oferece "Nova reserva".
 * Trata carregamento, recuperação e indisponibilidade de persistência. Gating: as
 * ações só aparecem no estado "pronto".
 */
export function ListaReservas() {
  const { status, estado, resumo, aviso, recomecar, persistenciaDisponivel } =
    useFinanceiro();

  const [criando, setCriando] = useState(false);
  const [detalhe, setDetalhe] = useState<Reserva | null>(null);
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [guardando, setGuardando] = useState<Reserva | null>(null);
  const [resgatando, setResgatando] = useState<Reserva | null>(null);
  const [excluindo, setExcluindo] = useState<Reserva | null>(null);

  if (status === "carregando") return <EsqueletoReservas />;
  if (status === "dados-invalidos") {
    return <RecuperacaoDados aviso={aviso} onRecomecar={recomecar} />;
  }

  const reservas = estado.reservas;
  const n = reservas.length;
  const pronto = status === "pronto";
  const onAbrir = pronto ? setDetalhe : undefined;

  return (
    <section className="space-y-8">
      {!persistenciaDisponivel && aviso && (
        <p className="rounded-sm border border-attention bg-attention-bg px-3 py-2 font-ui text-xs text-ink-2">
          {aviso}
        </p>
      )}

      {n === 0 ? (
        <SemReservas onCriar={pronto ? () => setCriando(true) : undefined} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-ui text-sm text-ink-2">Guardado em reservas</p>
              <p className="mt-1 font-display text-4xl font-semibold tabular leading-none text-ink sm:text-5xl">
                {formatBRL(resumo.totalReservas)}
              </p>
              <p className="mt-2 font-text text-ink-3">
                {n === 1 ? "1 reserva" : `${n} reservas`} · separado do seu “Livre
                pra usar”, mas continua seu
              </p>
            </div>
            {pronto && (
              <Button
                tamanho="sm"
                variante="secondary"
                onClick={() => setCriando(true)}
              >
                Nova reserva
              </Button>
            )}
          </div>

          <ul className="border-t border-line-2">
            {reservas.map((r) => (
              <LinhaReserva key={r.id} reserva={r} onAbrir={onAbrir} />
            ))}
          </ul>
        </>
      )}

      <FolhaReserva
        aberto={criando}
        reserva={null}
        onFechar={() => setCriando(false)}
      />
      <FolhaReserva
        aberto={editando != null}
        reserva={editando}
        onFechar={() => setEditando(null)}
      />
      <FolhaDetalheReserva
        reserva={detalhe}
        onFechar={() => setDetalhe(null)}
        onGuardar={(r) => {
          setDetalhe(null);
          setGuardando(r);
        }}
        onResgatar={(r) => {
          setDetalhe(null);
          setResgatando(r);
        }}
        onEditar={(r) => {
          setDetalhe(null);
          setEditando(r);
        }}
        onExcluir={(r) => {
          setDetalhe(null);
          setExcluindo(r);
        }}
      />
      <FolhaValorReserva
        reserva={guardando}
        modo="guardar"
        onFechar={() => setGuardando(null)}
      />
      <FolhaValorReserva
        reserva={resgatando}
        modo="resgatar"
        onFechar={() => setResgatando(null)}
      />
      <FolhaExcluirReserva
        reserva={excluindo}
        onFechar={() => setExcluindo(null)}
      />
    </section>
  );
}

function EsqueletoReservas() {
  return (
    <section
      aria-busy="true"
      aria-label="Carregando suas reservas"
      className="space-y-8"
    >
      <div>
        <div className="h-4 w-40 rounded-sm bg-surface-2" />
        <div className="mt-2 h-12 w-56 max-w-full rounded-sm bg-surface-2" />
      </div>
      <div className="space-y-4 border-t border-line-2 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-32 rounded-sm bg-surface-2" />
              <div className="h-4 w-20 rounded-sm bg-surface-2" />
            </div>
            <div className="h-1 w-full rounded-pill bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
