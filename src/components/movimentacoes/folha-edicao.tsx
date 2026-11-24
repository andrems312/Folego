"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { estaQuitada, formatBRL, formatNumero } from "@/domain";
import type { FormaPagamento, Movimentacao, MovimentacaoTipo } from "@/domain";
import { CATEGORIAS_PADRAO, nomeCategoria } from "@/lib/categorias";
import { cn } from "@/lib/cn";
import { construirAlteracoes, type CamposEdicao } from "@/lib/edicao";
import {
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes } from "@/state/estado-financeiro-provider";

const TIPO_LABEL: Record<MovimentacaoTipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  retirada: "Retirada",
};

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "outro", rotulo: "Outro" },
];

const campoClasse =
  "w-full rounded-sm border border-line-2 bg-surface-2 px-3 py-2 font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

/**
 * Folha de edição de uma movimentação.
 *
 * Consome EXCLUSIVAMENTE `acoes.editar` — as regras (valor ≥ já pago, data válida,
 * recálculo de status) vivem no domínio. Campos editáveis (D2): valor, data,
 * categoria, descrição, forma de pagamento. O `tipo` não é editável; o `status` é
 * derivado (não há controle na UI). O campo valor é bloqueado quando a movimentação
 * está totalmente realizada (`estaQuitada` — helper do domínio, D6). Reusa Sheet,
 * Toast, Button e a guarda anti-duplo-envio; o conteúdo desmonta ao fechar.
 */
export function FolhaEdicao({
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
      titulo="Editar lançamento"
    >
      {movimentacao && (
        <FormularioEdicao movimentacao={movimentacao} onSucesso={onFechar} />
      )}
    </Sheet>
  );
}

function FormularioEdicao({
  movimentacao,
  onSucesso,
}: {
  movimentacao: Movimentacao;
  onSucesso: () => void;
}) {
  const acoes = useAcoes();
  const toast = useToast();

  // D6: valor não editável quando totalmente realizada (helper do domínio).
  const valorBloqueado = estaQuitada(movimentacao);

  const [valor, setValor] = useState(() => formatNumero(movimentacao.valor));
  const [data, setData] = useState(movimentacao.data);
  const [categoriaId, setCategoriaId] = useState(movimentacao.categoriaId);
  const [forma, setForma] = useState<FormaPagamento | "">(
    movimentacao.formaPagamento ?? "",
  );
  const [descricao, setDescricao] = useState(movimentacao.descricao ?? "");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  // Garante que a categoria atual seja selecionável, mesmo se fora do catálogo.
  const categorias = CATEGORIAS_PADRAO.some((c) => c.id === movimentacao.categoriaId)
    ? CATEGORIAS_PADRAO
    : [
        { id: movimentacao.categoriaId, nome: nomeCategoria(movimentacao.categoriaId) },
        ...CATEGORIAS_PADRAO,
      ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardaRef.current!.emAndamento()) return;
    setErroValor(null);
    setErroGeral(null);

    const campos: CamposEdicao = {
      valorTexto: valorBloqueado ? undefined : valor,
      data,
      categoriaId,
      descricao,
      formaPagamento: forma,
    };
    const construido = construirAlteracoes(campos);
    if (!construido.ok) {
      setErroValor(construido.erro);
      return;
    }

    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.editar(movimentacao.id, construido.alteracoes);
      if (r.ok) {
        toast("Lançamento atualizado.");
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
      <div className="flex items-baseline justify-between">
        <span className="font-ui text-sm text-ink-2">Tipo</span>
        <span className="font-ui text-sm text-ink">
          {TIPO_LABEL[movimentacao.tipo]}
        </span>
      </div>

      <div>
        <label htmlFor="valor-edicao" className="mb-1 block font-ui text-sm text-ink-2">
          Valor
        </label>
        {valorBloqueado ? (
          <>
            <p className="tabular font-text text-lg text-ink">
              {formatBRL(movimentacao.valor)}
            </p>
            <p className="mt-1 font-ui text-xs text-ink-3">
              O valor não pode ser alterado porque esse lançamento já foi
              totalmente realizado.
            </p>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-focus",
                erroValor && "border-risk",
              )}
            >
              <span className="font-text text-ink-3">R$</span>
              <input
                id="valor-edicao"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                aria-invalid={erroValor ? true : undefined}
                aria-describedby={erroValor ? "erro-valor-edicao" : undefined}
                className="w-full bg-transparent py-2 font-text tabular text-ink focus-visible:outline-none"
              />
            </div>
            {erroValor && (
              <p id="erro-valor-edicao" className="mt-1 font-ui text-xs text-risk">
                {erroValor}
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="data-edicao" className="mb-1 block font-ui text-sm text-ink-2">
          Data
        </label>
        <input
          id="data-edicao"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={campoClasse}
        />
      </div>

      <div>
        <label htmlFor="categoria-edicao" className="mb-1 block font-ui text-sm text-ink-2">
          Categoria
        </label>
        <select
          id="categoria-edicao"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={campoClasse}
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="forma-edicao" className="mb-1 block font-ui text-sm text-ink-2">
          Forma de pagamento (opcional)
        </label>
        <select
          id="forma-edicao"
          value={forma}
          onChange={(e) => setForma(e.target.value as FormaPagamento | "")}
          className={campoClasse}
        >
          <option value="">—</option>
          {FORMAS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="descricao-edicao" className="mb-1 block font-ui text-sm text-ink-2">
          Descrição (opcional)
        </label>
        <input
          id="descricao-edicao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Instalação elétrica — cliente Marcos"
          className={campoClasse}
        />
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
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
