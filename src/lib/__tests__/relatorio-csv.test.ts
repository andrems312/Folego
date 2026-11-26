import { describe, expect, it } from "vitest";
import type { Movimentacao, MovimentacaoTipo } from "@/domain";
import { BOM_UTF8 } from "../csv";
import type { PeriodoRelatorio } from "../relatorio";
import {
  CABECALHO_CSV,
  centavosParaNumeroBR,
  dataParaBR,
  nomeArquivoCSV,
  relatorioParaCSV,
} from "../relatorio-csv";
import { linhasDoPeriodo, type LinhaRelatorio } from "../relatorio-tabela";

const PERIODO: PeriodoRelatorio = { inicio: "2026-03-01", fim: "2026-03-31" };

function linha(p: Partial<LinhaRelatorio> = {}): LinhaRelatorio {
  return {
    id: "x",
    data: "2026-03-10",
    descricao: "Lançamento",
    tipo: "saida",
    tipoLabel: "Saída",
    sinal: "−",
    cor: "debit",
    categoria: "Materiais",
    status: "pago",
    statusLabel: "Pago",
    realizado: 0,
    pendente: 0,
    ...p,
  };
}

/** Divide o CSV em linhas, sem o BOM. */
function linhasCSV(csv: string): string[] {
  const semBom = csv.startsWith(BOM_UTF8) ? csv.slice(BOM_UTF8.length) : csv;
  return semBom.replace(/\r\n$/, "").split("\r\n");
}

describe("dataParaBR", () => {
  it("converte ISO para DD/MM/AAAA", () => {
    expect(dataParaBR("2026-03-05")).toBe("05/03/2026");
    expect(dataParaBR("2026-12-31")).toBe("31/12/2026");
  });
});

describe("centavosParaNumeroBR — sem perda de centavos, sem milhar", () => {
  it("formata com vírgula decimal e duas casas", () => {
    expect(centavosParaNumeroBR(123_456)).toBe("1234,56");
    expect(centavosParaNumeroBR(50_000)).toBe("500,00");
    expect(centavosParaNumeroBR(5)).toBe("0,05");
    expect(centavosParaNumeroBR(0)).toBe("0,00");
    expect(centavosParaNumeroBR(1_000_000)).toBe("10000,00");
  });

  it("não usa símbolo de moeda", () => {
    expect(centavosParaNumeroBR(199_90)).not.toContain("R$");
  });
});

describe("relatorioParaCSV — cabeçalho e valores", () => {
  it("cabeçalho na ordem definida", () => {
    const csv = relatorioParaCSV([]);
    expect(linhasCSV(csv)[0]).toBe("Data;Descrição;Tipo;Categoria;Realizado;Pendente;Status");
    expect(CABECALHO_CSV).toEqual([
      "Data",
      "Descrição",
      "Tipo",
      "Categoria",
      "Realizado",
      "Pendente",
      "Status",
    ]);
  });

  it("entrada recebida: realizado com centavos, pendente 0, status Recebido", () => {
    const csv = relatorioParaCSV([
      linha({
        data: "2026-03-10",
        descricao: "Instalação",
        tipo: "entrada",
        tipoLabel: "Entrada",
        categoria: "Serviços prestados",
        status: "recebido",
        statusLabel: "Recebido",
        realizado: 420_000,
        pendente: 0,
      }),
    ]);
    expect(linhasCSV(csv)[1]).toBe(
      "10/03/2026;Instalação;Entrada;Serviços prestados;4200,00;0,00;Recebido",
    );
  });

  it("entrada prevista: realizado 0, pendente com valor, status Previsto", () => {
    const csv = relatorioParaCSV([
      linha({
        descricao: "A receber",
        tipo: "entrada",
        tipoLabel: "Entrada",
        categoria: "Serviços prestados",
        status: "previsto",
        statusLabel: "Previsto",
        realizado: 0,
        pendente: 200_000,
      }),
    ]);
    expect(linhasCSV(csv)[1]).toContain(";0,00;2000,00;Previsto");
  });

  it("parcial: realizado e pendente separados; retirada identificada", () => {
    const csv = relatorioParaCSV([
      linha({
        descricao: "Furadeira",
        tipoLabel: "Saída",
        status: "parcial",
        statusLabel: "Parcial",
        realizado: 40_000,
        pendente: 60_000,
      }),
      linha({
        descricao: "Pró-labore",
        tipo: "retirada",
        tipoLabel: "Retirada",
        categoria: "Retirada pessoal",
        status: "pago",
        statusLabel: "Pago",
        realizado: 50_000,
        pendente: 0,
      }),
    ]);
    const l = linhasCSV(csv);
    expect(l[1]).toContain("Furadeira;Saída;Materiais;400,00;600,00;Parcial");
    expect(l[2]).toContain("Pró-labore;Retirada;Retirada pessoal;500,00;0,00;Pago");
  });

  it("preserva acentos e cai para 'Outros' quando a categoria vem assim", () => {
    const csv = relatorioParaCSV([
      linha({ descricao: "Manutenção — serviço nº 3", categoria: "Outros" }),
    ]);
    expect(csv).toContain("Manutenção — serviço nº 3");
    expect(csv).toContain(";Outros;");
  });
});

describe("relatorioParaCSV — escape e injeção", () => {
  it("envolve em aspas descrição com separador, aspas e quebra de linha", () => {
    const csv = relatorioParaCSV([
      linha({ descricao: 'Compra; "especial"\nparcelada' }),
    ]);
    expect(csv).toContain('"Compra; ""especial""\nparcelada"');
  });

  it("neutraliza fórmula na descrição (CSV Injection)", () => {
    const csv = relatorioParaCSV([linha({ descricao: "=HYPERLINK(123)" })]);
    expect(csv).toContain(";'=HYPERLINK(123);");
  });
});

describe("relatorioParaCSV — respeita o período (integração com a tabela)", () => {
  it("inclui só o que está no período; exclui o de fora", () => {
    let i = 0;
    const mov = (p: Partial<Movimentacao> & { tipo: MovimentacaoTipo }): Movimentacao => ({
      id: p.id ?? `m${i++}`,
      tipo: p.tipo,
      valor: p.valor ?? 10_000,
      data: p.data ?? "2026-03-10",
      categoriaId: p.categoriaId ?? "materiais",
      status: p.status ?? "realizado",
      descricao: p.descricao ?? "Dentro",
    });
    const linhas = linhasDoPeriodo(
      [
        mov({ id: "in", tipo: "saida", data: "2026-03-10", descricao: "Dentro" }),
        mov({ id: "out", tipo: "saida", data: "2026-04-10", descricao: "Fora" }),
      ],
      PERIODO,
    );
    const csv = relatorioParaCSV(linhas);
    expect(csv).toContain("Dentro");
    expect(csv).not.toContain("Fora");
    expect(linhasCSV(csv)).toHaveLength(2); // cabeçalho + 1 linha
  });
});

describe("nomeArquivoCSV", () => {
  it("usa as datas do período no nome", () => {
    expect(nomeArquivoCSV({ inicio: "2026-11-01", fim: "2026-11-30" })).toBe(
      "folego-relatorio-2026-11-01-2026-11-30.csv",
    );
  });

  it("protege contra datas inválidas", () => {
    expect(nomeArquivoCSV({ inicio: "x", fim: "2026-11-30" })).toBe(
      "folego-relatorio-periodo-2026-11-30.csv",
    );
  });
});
