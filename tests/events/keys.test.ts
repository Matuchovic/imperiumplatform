import { describe, it, expect } from "vitest";
import { eventKey, isStableKey } from "@/lib/events/keys";

describe("klíče událostí", () => {
  it("stejná událost dá stejný klíč", () => {
    expect(eventKey("ticket.settled", "t1")).toBe(eventKey("ticket.settled", "t1"));
  });

  it("rozlišovač oddělí opakované události téže entity", () => {
    expect(eventKey("odds.updated", "m1", "v2")).not.toBe(eventKey("odds.updated", "m1", "v1"));
  });

  it("různé typy na téže entitě se neslijí", () => {
    expect(eventKey("ticket.created", "t1")).not.toBe(eventKey("ticket.settled", "t1"));
  });
});

describe("stabilita klíče", () => {
  it("klíč bez času je stabilní", () => {
    expect(isStableKey("ticket.settled:t1")).toBe(true);
  });

  it("klíč s časovým razítkem stabilní není", () => {
    // Takový klíč by při každém běhu vypadal jinak a idempotence
    // by tiše přestala platit.
    expect(isStableKey(`ticket.settled:t1:${Date.now()}`)).toBe(false);
  });

  it("klíč s ISO časem stabilní není", () => {
    expect(isStableKey("odds.updated:m1:2026-08-26T18:00")).toBe(false);
  });
});
