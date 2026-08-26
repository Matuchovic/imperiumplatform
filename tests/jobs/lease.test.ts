import { describe, it, expect } from "vitest";
import { decide, isExpired, leaseExpiry, DEFAULT_LEASE_MINUTES, type Lease } from "@/lib/jobs/lease";

const NOW = new Date("2026-08-26T18:00:00Z");
const lease = (minutesLeft: number, holder = "run-a"): Lease => ({
  jobKey: "settle", holder,
  acquiredAt: NOW.toISOString(),
  expiresAt: new Date(NOW.getTime() + minutesLeft * 60000).toISOString(),
});

describe("zámek úlohy", () => {
  it("volnou úlohu lze převzít", () => {
    expect(decide(null, NOW)).toEqual({ acquire: true, reason: "free" });
  });

  it("drženou úlohu převzít nelze", () => {
    const d = decide(lease(5), NOW);
    expect(d.acquire).toBe(false);
    expect(d.acquire === false && d.heldBy).toBe("run-a");
  });

  it("vypršelý zámek lze převzít", () => {
    // Bez toho by pád běhu zablokoval úlohu napořád.
    const d = decide(lease(-1), NOW);
    expect(d.acquire).toBe(true);
    expect(d.acquire === true && d.reason).toBe("expired");
  });

  it("zámek vypršelý přesně teď se považuje za volný", () => {
    expect(isExpired(lease(0), NOW)).toBe(true);
  });

  it("zbývající čas se hlásí v sekundách", () => {
    const d = decide(lease(3), NOW);
    expect(d.acquire === false && d.expiresIn).toBe(180);
  });

  it("výchozí platnost je deset minut", () => {
    const exp = leaseExpiry(NOW);
    const diff = (new Date(exp).getTime() - NOW.getTime()) / 60000;
    expect(diff).toBe(DEFAULT_LEASE_MINUTES);
  });

  it("dva souběžné běhy získají zámek jen jednou", () => {
    let held: Lease | null = null;
    let acquired = 0;
    for (const holder of ["run-a", "run-b"]) {
      const d = decide(held, NOW);
      if (d.acquire) {
        acquired++;
        held = { jobKey: "settle", holder, acquiredAt: NOW.toISOString(), expiresAt: leaseExpiry(NOW) };
      }
    }
    expect(acquired).toBe(1);
  });
});
