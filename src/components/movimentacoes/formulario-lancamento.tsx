"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CATEGORIAS_PADRAO } from "@/lib/categorias";
import { cn } from "@/lib/cn";
import {
  construirNovaMovimentacao,
  criarGuardaEnvio,
  mensagemDeErro,
  type GuardaEnvio,
} from "@/lib/lancamento";
import { useAcoes, useFinanceiro } from "@/state/estado-financeiro-provider";
import type {
  FormaPagamento,
  MovimentacaoStatus,
  MovimentacaoTipo,
} from "@/domain";

function hojeLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const CATEGORIA_PADRAO: Record<MovimentacaoTipo, string> = {
  entrada: "servicos",
  saida: "materiais",
  retirada: "retirada",
};

const TIPOS: { valor: MovimentacaoTipo; rotulo: string }[] = [
  { valor: "entrada", rotulo: "Entrada" },
  { valor: "saida", rotulo: "Saída" },
  { valor: "retirada", rotulo: "Retirada" },
];

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "outro", rotulo: "Outro" },
];

function rotulosSituacao(
  tipo: MovimentacaoTipo,
): Record<MovimentacaoStatus, string> {
  if (tipo === "entrada") return { realizado: "Já recebi", pendente: "Ainda vou receber" };
  if (tipo === "saida") return { realizado: "Já paguei", pendente: "Ainda vou pagar" };
  return { realizado: "Já retirei", pendente: "Vou retirar" };
}

const campoClasse =
  "w-full rounded-sm border border-line-2 bg-surface-2 px-3 py-2 font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

export function FormularioLancamento({ onSucesso }: { onSucesso: () => void }) {
  const acoes = useAcoes();
  const { status } = useFinanceiro();
  const toast = useToast();

  const [tipo, setTipo] = useState<MovimentacaoTipo>("entrada");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeLocal);
  const [categoriaId, setCategoriaId] = useState(CATEGORIA_PADRAO.entrada);
  const [situacao, setSituacao] = useState<MovimentacaoStatus>("realizado");
  const [descricao, setDescricao] = useState("");
  const [forma, setForma] = useState<FormaPagamento | "">("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Guarda síncrona contra duplo envio: persiste entre renders via ref e trava
  // já no primeiro clique, antes de qualquer re-render.
  const guardaRef = useRef<GuardaEnvio | null>(null);
  if (!guardaRef.current) guardaRef.current = criarGuardaEnvio();

  const pronto = status === "pronto";
  const situacaoLabels = rotulosSituacao(tipo);

  function mudarTipo(novo: MovimentacaoTipo) {
    setTipo(novo);
    setCategoriaId(CATEGORIA_PADRAO[novo]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Se um envio já está em andamento, ignora o clique repetido de imediato.
    if (guardaRef.current!.emAndamento()) return;
    setErroValor(null);
    setErroGeral(null);

    const construido = construirNovaMovimentacao({
      tipo,
      valorTexto: valor,
      data,
      categoriaId,
      status: situacao,
      descricao,
      formaPagamento: forma,
    });
    if (!construido.ok) {
      setErroValor(construido.erro);
      return;
    }

    setEnviando(true);
    const resultado = guardaRef.current!.tentar(() => {
      const r = acoes.adicionar(construido.dados);
      if (r.ok) {
        toast("Lançamento salvo.");
        onSucesso();
        return true;
      }
      setErroGeral(mensagemDeErro(r.codigo));
      return false;
    });
    // Em erro, libera a guarda e o botão para nova tentativa. Em sucesso a folha
    // fecha/desmonta, então a guarda permanece travada de propósito.
    if (resultado === "erro") setEnviando(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Segmented
        legenda="Tipo"
        opcoes={TIPOS}
        valor={tipo}
        onChange={mudarTipo}
      />

      <div>
        <label htmlFor="valor" className="mb-1 block font-ui text-sm text-ink-2">
          Valor
        </label>
        <div
          className={cn(
            "flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-focus",
            erroValor && "border-risk",
          )}
        >
          <span className="font-text text-ink-3">R$</span>
          <input
            id="valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            aria-invalid={erroValor ? true : undefined}
            aria-describedby={erroValor ? "erro-valor" : undefined}
            className="w-full bg-transparent py-2 font-text tabular text-ink focus-visible:outline-none"
          />
        </div>
        {erroValor && (
          <p id="erro-valor" className="mt-1 font-ui text-xs text-risk">
            {erroValor}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="data" className="mb-1 block font-ui text-sm text-ink-2">
          Data
        </label>
        <input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={campoClasse}
        />
      </div>

      <div>
        <label htmlFor="categoria" className="mb-1 block font-ui text-sm text-ink-2">
          Categoria
        </label>
        <select
          id="categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={campoClasse}
        >
          {CATEGORIAS_PADRAO.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <Segmented
        legenda="Situação"
        opcoes={[
          { valor: "realizado", rotulo: situacaoLabels.realizado },
          { valor: "pendente", rotulo: situacaoLabels.pendente },
        ]}
        valor={situacao}
        onChange={setSituacao}
      />

      <div>
        <label htmlFor="forma" className="mb-1 block font-ui text-sm text-ink-2">
          Forma de pagamento (opcional)
        </label>
        <select
          id="forma"
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
        <label htmlFor="descricao" className="mb-1 block font-ui text-sm text-ink-2">
          Descrição (opcional)
        </label>
        <input
          id="descricao"
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
      {!pronto && (
        <p className="font-ui text-sm text-ink-3">Carregando seus dados…</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secondary" type="button" onClick={onSucesso}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!pronto || enviando}>
          Salvar lançamento
        </Button>
      </div>
    </form>
  );
}

function Segmented<T extends string>({
  legenda,
  opcoes,
  valor,
  onChange,
}: {
  legenda: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 font-ui text-sm text-ink-2">{legenda}</legend>
      <div
        role="group"
        className="inline-flex flex-wrap gap-1 rounded-sm border border-line p-1"
      >
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(o.valor)}
              className={cn(
                "rounded-sm px-3 py-1.5 font-ui text-sm transition-colors",
                ativo
                  ? "bg-ink text-ink-inverse"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
