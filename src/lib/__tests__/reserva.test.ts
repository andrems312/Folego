import { describe, expect, it } from "vitest";
import type { Reserva } from "@/domain";
import { resumoReserva } from "../reserva";

function reserva(extra: Partial<Reserva> = {}): Reserva {
  return { id: "r1", nome: "Impostos", saldoAtual: 0, ...extra };
}

describe("resumoReserva", () => {
  it("com meta: percentual, restante e não atingida", () => {
    const r = resumoReserva(reserva({ saldoAtual: 80_000, alvo: 120_000 }));
    expect(r.temMeta).toBe(true);
    if (r.temMeta) {
      expect(r.meta).toBe(120_000);
      expect(r.percentual).toBe(67); // round(80/120*100)
      expect(r.restante).toBe(40_000);
      expect(r.atingida).toBe(false);
    }
  });

  it("sem meta (alvo ausente ou nulo): temMeta false", () => {
    expect(resumoReserva(reserva({ saldoAtual: 50_000 })).temMeta).toBe(false);
    expect(resumoReserva(reserva({ saldoAtual: 50_000, alvo: null })).temMeta).toBe(
      false,
    );
  });

  it("meta atingida: percentual 100, restante 0, atingida true", () => {
    const r = resumoReserva(reserva({ saldoAtual: 120_000, alvo: 120_000 }));
    if (r.temMeta) {
      expect(r.percentual).toBe(100);
      expect(r.restante).toBe(0);
      expect(r.atingida).toBe(true);
    }
  });

  it("saldo acima da meta: percentual limitado a 100 e restante 0", () => {
    const r = resumoReserva(reserva({ saldoAtual: 150_000, alvo: 120_000 }));
    if (r.temMeta) {
      expect(r.percentual).toBe(100);
      expect(r.restante).toBe(0);
      expect(r.atingida).toBe(true);
    }
  });

  it("alvo não positivo é tratado como sem meta (sem percentual inventado)", () => {
    expect(resumoReserva(reserva({ saldoAtual: 10_000, alvo: 0 })).temMeta).toBe(
      false,
    );
  });
});
