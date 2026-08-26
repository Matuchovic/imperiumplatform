import { describe, it, expect } from "vitest";
import { evaluate, readField, isValidNode, type Node } from "@/lib/automations/conditions";

const ctx = {
  profit: -1500,
  state: "lost",
  bands: ["zaklad", "standard"],
  ticket: { odds: 1.92, clv: 0.021 },
  client: { name: "Petr", telegram: null },
};

describe("čtení polí", () => {
  it("čte mělké i vnořené pole", () => {
    expect(readField(ctx, "state")).toBe("lost");
    expect(readField(ctx, "ticket.odds")).toBe(1.92);
  });

  it("neexistující cesta vrátí undefined, nespadne", () => {
    expect(readField(ctx, "neexistuje.hluboko.uplne")).toBeUndefined();
  });
});

describe("porovnání", () => {
  it("rovnost a nerovnost", () => {
    expect(evaluate({ field: "state", op: "eq", value: "lost" }, ctx)).toBe(true);
    expect(evaluate({ field: "state", op: "ne", value: "won" }, ctx)).toBe(true);
  });

  it("číselné porovnání", () => {
    expect(evaluate({ field: "profit", op: "lt", value: 0 }, ctx)).toBe(true);
    expect(evaluate({ field: "ticket.odds", op: "gte", value: 1.9 }, ctx)).toBe(true);
    expect(evaluate({ field: "ticket.odds", op: "gt", value: 2.5 }, ctx)).toBe(false);
  });

  it("chybějící hodnota nikdy neprojde porovnáním", () => {
    // Kdyby undefined prošlo jako nula, spustila by se automatizace
    // na klientovi, o kterém nic nevíme.
    expect(evaluate({ field: "neexistuje", op: "lt", value: 100 }, ctx)).toBe(false);
    expect(evaluate({ field: "neexistuje", op: "gt", value: -100 }, ctx)).toBe(false);
  });

  it("existence rozliší null od chybějícího i od hodnoty", () => {
    expect(evaluate({ field: "client.name", op: "exists" }, ctx)).toBe(true);
    expect(evaluate({ field: "client.telegram", op: "exists" }, ctx)).toBe(false);
    expect(evaluate({ field: "nic", op: "exists" }, ctx)).toBe(false);
  });

  it("obsahuje funguje na poli i řetězci", () => {
    expect(evaluate({ field: "bands", op: "contains", value: "zaklad" }, ctx)).toBe(true);
    expect(evaluate({ field: "bands", op: "contains", value: "odvazny" }, ctx)).toBe(false);
    expect(evaluate({ field: "state", op: "contains", value: "os" }, ctx)).toBe(true);
  });

  it("in hledá ve výčtu", () => {
    expect(evaluate({ field: "state", op: "in", value: ["lost", "void"] }, ctx)).toBe(true);
  });
});

describe("skládání podmínek", () => {
  it("all vyžaduje všechny", () => {
    const n: Node = { all: [
      { field: "profit", op: "lt", value: 0 },
      { field: "state", op: "eq", value: "lost" },
    ]};
    expect(evaluate(n, ctx)).toBe(true);
  });

  it("all selže, když jedna část neplatí", () => {
    const n: Node = { all: [
      { field: "profit", op: "lt", value: 0 },
      { field: "state", op: "eq", value: "won" },
    ]};
    expect(evaluate(n, ctx)).toBe(false);
  });

  it("any stačí jedna", () => {
    const n: Node = { any: [
      { field: "state", op: "eq", value: "won" },
      { field: "profit", op: "lt", value: 0 },
    ]};
    expect(evaluate(n, ctx)).toBe(true);
  });

  it("not obrací výsledek", () => {
    expect(evaluate({ not: { field: "state", op: "eq", value: "won" } }, ctx)).toBe(true);
  });

  it("bez podmínky automatizace běží — trigger je podmínka sám", () => {
    expect(evaluate(null, ctx)).toBe(true);
    expect(evaluate(undefined, ctx)).toBe(true);
  });
});

describe("ověření tvaru z databáze", () => {
  it("platné uzly projdou", () => {
    expect(isValidNode({ field: "profit", op: "lt", value: 0 })).toBe(true);
    expect(isValidNode({ all: [{ field: "a", op: "eq", value: 1 }] })).toBe(true);
  });

  it("nesmysly neprojdou", () => {
    expect(isValidNode(null)).toBe(false);
    expect(isValidNode("profit < 0")).toBe(false);
    expect(isValidNode({ field: "a", op: "eval" })).toBe(false);
    expect(isValidNode({ all: [] })).toBe(false);
  });
});
