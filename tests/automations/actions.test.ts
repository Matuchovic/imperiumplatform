import { describe, it, expect } from "vitest";
import { gate, riskOf, ACTIONS, type Action } from "@/lib/automations/actions";

const opts = (over: Partial<{ enabled: boolean; allowRisky: boolean; hasConsent: boolean }> = {}) => ({
  enabled: true, allowRisky: false, hasConsent: true, ...over,
});

describe("rizikovost sady akcí", () => {
  it("samé bezpečné akce jsou bezpečné", () => {
    expect(riskOf([{ type: "create_task" }, { type: "create_notification" }])).toBe("safe");
  });

  it("nejvyšší riziko určuje celek", () => {
    const set: Action[] = [{ type: "create_task" }, { type: "send_telegram" }];
    expect(riskOf(set)).toBe("betting");
  });

  it("změna stavu je riziko peněz", () => {
    expect(riskOf([{ type: "change_status" }])).toBe("money");
  });
});

describe("brána před provedením", () => {
  it("bezpečná akce projde", () => {
    expect(gate({ type: "create_task" }, opts()).run).toBe(true);
  });

  it("vypnuté automatizace zastaví všechno", () => {
    expect(gate({ type: "create_task" }, opts({ enabled: false })).run).toBe(false);
  });

  it("odeslání tipu bez povolení čeká na schválení", () => {
    const g = gate({ type: "send_telegram" }, opts());
    expect(g.run).toBe(false);
    expect(g.run === false && g.needsApproval).toBe(true);
  });

  it("s povolením riziková akce projde", () => {
    expect(gate({ type: "send_telegram" }, opts({ allowRisky: true })).run).toBe(true);
  });

  it("neznámá akce neprojde nikdy", () => {
    expect(gate({ type: "smaz_vsechno" as never }, opts({ allowRisky: true })).run).toBe(false);
  });

  it("každá akce má klasifikaci rizika", () => {
    for (const spec of Object.values(ACTIONS)) {
      expect(["safe", "money", "betting"]).toContain(spec.risk);
    }
  });
});
