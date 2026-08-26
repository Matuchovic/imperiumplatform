import { describe, it, expect } from "vitest";
import { buildPlan, type OpenTicket } from "@/lib/engine/settle-plan";
import type { MatchResult } from "@/lib/results/base";

const t = (over: Partial<OpenTicket> = {}): OpenTicket => ({
  id: "t1", userId: "u1", eventId: "e1",
  market: "1X2", selection: "1", odds: 2.0, stake: 1000, state: "open",
  ...over,
});

const finished = (id: string, h: number, a: number): MatchResult => ({
  eventId: id, status: "finished", homeScore: h, awayScore: a,
  finishedAt: "2026-08-26T20:00:00Z",
});

describe("plán zúčtování", () => {
  it("z prázdného vstupu vrátí prázdný plán", () => {
    const p = buildPlan([], []);
    expect(p.settle).toHaveLength(0);
    expect(p.totalPayout).toBe(0);
  });

  it("výhra vyplácí celý obrat", () => {
    const p = buildPlan([t()], [finished("e1", 2, 1)]);
    expect(p.settle).toHaveLength(1);
    expect(p.settle[0].state).toBe("won");
    expect(p.settle[0].payout).toBe(2000);
    expect(p.settle[0].profit).toBe(1000);
  });

  it("prohra nevyplácí nic a zisk je záporný o vklad", () => {
    const p = buildPlan([t()], [finished("e1", 0, 1)]);
    expect(p.settle[0].state).toBe("lost");
    expect(p.settle[0].payout).toBe(0);
    expect(p.settle[0].profit).toBe(-1000);
  });

  it("už zúčtovaný tiket se nikdy nepřepočítává", () => {
    const p = buildPlan([t({ state: "won" })], [finished("e1", 2, 1)]);
    expect(p.settle).toHaveLength(0);
    expect(p.alreadySettled).toContain("t1");
  });

  it("bez výsledku tiket zůstává otevřený", () => {
    const p = buildPlan([t()], []);
    expect(p.settle).toHaveLength(0);
    expect(p.missingResult).toContain("t1");
  });

  it("neskončený zápas se nezúčtovává", () => {
    const running: MatchResult = {
      eventId: "e1", status: "in_progress", homeScore: 1, awayScore: 0, finishedAt: null,
    };
    const p = buildPlan([t()], [running]);
    expect(p.settle).toHaveLength(0);
    expect(p.undecided).toContain("t1");
  });

  it("zrušený zápas vrací vklad, ne zisk", () => {
    const cancelled: MatchResult = {
      eventId: "e1", status: "cancelled", homeScore: null, awayScore: null, finishedAt: null,
    };
    const p = buildPlan([t()], [cancelled]);
    expect(p.settle[0].state).toBe("void");
    expect(p.settle[0].payout).toBe(1000);
    expect(p.settle[0].profit).toBe(0);
  });

  it("klíč výplaty je odvozený od tiketu, takže se nezapíše dvakrát", () => {
    const p = buildPlan([t()], [finished("e1", 2, 1)]);
    expect(p.settle[0].ledgerKey).toBe("payout:t1");
    const p2 = buildPlan([t()], [finished("e1", 2, 1)]);
    expect(p2.settle[0].ledgerKey).toBe(p.settle[0].ledgerKey);
  });

  it("součet výplat sedí přes víc tiketů", () => {
    const p = buildPlan(
      [t({ id: "a" }), t({ id: "b", odds: 1.5 }), t({ id: "c", selection: "2" })],
      [finished("e1", 2, 1)]
    );
    expect(p.settle).toHaveLength(3);
    expect(p.totalPayout).toBe(2000 + 1500 + 0);
  });

  it("různé tikety na týž zápas se vyhodnotí každý zvlášť", () => {
    const p = buildPlan(
      [t({ id: "a", selection: "1" }), t({ id: "b", selection: "2" })],
      [finished("e1", 3, 0)]
    );
    expect(p.settle.find((x) => x.ticketId === "a")!.state).toBe("won");
    expect(p.settle.find((x) => x.ticketId === "b")!.state).toBe("lost");
  });
});
