import { describe, it, expect } from "vitest";
import { BANDS, bandFor, bandByKey } from "@/lib/engine/bands";

describe("pásma kurzů", () => {
  it("pokrývají celý rozsah bez mezery", () => {
    for (let i = 1; i < BANDS.length; i++) {
      expect(BANDS[i].min).toBe(BANDS[i - 1].max);
    }
  });

  it("hraniční kurz patří do vyššího pásma", () => {
    expect(bandFor(1.70).key).toBe("standard");
    expect(bandFor(2.20).key).toBe("rozsireny");
    expect(bandFor(3.00).key).toBe("odvazny");
  });

  it("kurz těsně pod hranicí zůstává v nižším pásmu", () => {
    expect(bandFor(1.699).key).toBe("zaklad");
    expect(bandFor(2.199).key).toBe("standard");
  });

  it("velmi vysoký kurz spadne do odvážného", () => {
    expect(bandFor(50).key).toBe("odvazny");
  });

  it("čím vyšší pásmo, tím nižší sázka a delší série proher", () => {
    for (let i = 1; i < BANDS.length; i++) {
      expect(BANDS[i].stakePct[1]).toBeLessThan(BANDS[i - 1].stakePct[1]);
      expect(BANDS[i].losingRun[1]).toBeGreaterThan(BANDS[i - 1].losingRun[1]);
      expect(BANDS[i].proofN).toBeGreaterThan(BANDS[i - 1].proofN);
    }
  });

  it("automaticky odcházejí jen nízká pásma", () => {
    expect(bandByKey("zaklad")?.autoApprove).toBe(true);
    expect(bandByKey("odvazny")?.autoApprove).toBe(false);
  });
});
