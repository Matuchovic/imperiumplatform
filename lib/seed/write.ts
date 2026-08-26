import { serviceClient } from "@/lib/supabase/server";
import { generateClients, sanityCheck, DEMO_TAG } from "./generate";
import { keys } from "@/lib/bankroll/math";
import { log } from "@/lib/log";

/**
 * Zápis ukázkových dat do databáze.
 *
 * Píše skutečné řádky do skutečných tabulek — projdou stejnou
 * matematikou i stejnými pravidly jako ostrý provoz. Každý řádek
 * nese příznak `is_demo`, takže jdou smazat jedním voláním
 * a nikdy se nesmíchají se skutečnými klienty.
 */

export type SeedResult = {
  clients: number;
  tickets: number;
  entries: number;
  candidates: number;
  summary: ReturnType<typeof sanityCheck>;
};

const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();

export async function seedDemo(count = 12, seed = 42): Promise<SeedResult> {
  const db = serviceClient();
  const data = generateClients(count, seed);

  let clients = 0, tickets = 0, entries = 0, candidates = 0;

  for (const c of data) {
    // Ukázkový klient nemá účet v auth.users — profil vzniká
    // s vlastním id a příznakem, aby ho šlo odlišit i smazat.
    const { data: prof, error } = await db
      .from("profiles")
      .insert({
        name: c.name,
        plan: c.plan,
        bankroll: c.startBankroll,
        unit_pct: c.unitPct,
        subscribed_bands: c.bands,
        telegram_chat_id: c.telegram ? `demo-${clients}` : null,
        role: "client",
        is_demo: true,
        created_at: ago(c.tenureDays),
      })
      .select("id")
      .single();

    if (error || !prof) {
      log("error", "seed", "zápis klienta selhal", { error: error?.message });
      continue;
    }
    clients++;

    // Počáteční vklad do účetní knihy.
    await db.from("bankroll_entries").insert({
      user_id: prof.id, kind: "deposit", amount: c.startBankroll,
      idempotency_key: `demo:deposit:${prof.id}`,
      note: "Počáteční vklad (ukázka)", is_demo: true,
    });
    entries++;

    const ticketRows = c.tickets.map((t) => ({
      user_id: prof.id,
      event_name: t.event,
      market: t.market,
      selection: t.selection,
      odds: t.odds,
      units: 1,
      stake: t.stake,
      state: t.state === "open" ? "open" : t.state,
      profit: t.profit,
      clv: t.clv,
      band: t.band,
      placed_at: ago(t.daysAgo),
      settled_at: t.state === "open" ? null : ago(Math.max(0, t.daysAgo - 1)),
      is_demo: true,
    }));

    if (ticketRows.length === 0) continue;

    const { data: created } = await db.from("tickets").insert(ticketRows).select("id, stake, profit, state");
    const rows = (created ?? []) as { id: string; stake: number; profit: number; state: string }[];
    tickets += rows.length;

    // Pohyby v knize: vklad při vsazení, výplata při zúčtování.
    const moves = rows.flatMap((r) => {
      const out = [{
        user_id: prof.id, kind: "stake", amount: -Number(r.stake),
        ticket_id: r.id, idempotency_key: keys.stake(r.id),
        note: "Vsazeno (ukázka)", is_demo: true,
      }];
      if (r.state !== "open") {
        const payout = Number(r.stake) + Number(r.profit);
        if (payout > 0) {
          out.push({
            user_id: prof.id, kind: r.state === "won" ? "payout" : "refund",
            amount: payout, ticket_id: r.id, idempotency_key: keys.payout(r.id),
            note: "Zúčtování (ukázka)", is_demo: true,
          });
        }
      }
      return out;
    });

    if (moves.length) {
      await db.from("bankroll_entries").insert(moves);
      entries += moves.length;
    }
  }

  // Pár kandidátů čekajících na schválení, ať není sekce Tipy prázdná.
  const pending = data.slice(0, 4).map((c, i) => {
    const t = c.tickets[c.tickets.length - 1];
    return {
      event_id: `demo-${i}`, league: "demo", event_name: t.event,
      market: t.market, selection: t.selection,
      sharp_odds: t.odds * 0.97, fair_prob: 1 / (t.odds * 0.97),
      offered_odds: t.odds, offered_by: "Tipsport",
      threshold_odds: t.odds * 0.98, ev: 0.03, units: 1.5,
      commence_at: new Date(Date.now() + (i + 2) * 3600000).toISOString(),
      status: "pending", band: t.band, is_demo: true,
    };
  });

  const { data: cands } = await db.from("candidates").insert(pending).select("id");
  candidates = (cands ?? []).length;

  await db.from("engine_runs").insert({
    scanned: 342, found: candidates, auto_sent: 0,
    awaiting: candidates, tickets: 0,
  });

  const summary = sanityCheck(data);
  log("info", "seed", "ukázková data zapsána", { clients, tickets, entries, candidates, ...summary });

  return { clients, tickets, entries, candidates, summary };
}

/** Smaže všechno označené jako ukázka. Skutečných dat se nedotkne. */
export async function wipeDemo(): Promise<{ deleted: Record<string, number> }> {
  const db = serviceClient();
  const deleted: Record<string, number> = {};

  // Pořadí podle závislostí — nejdřív potomci.
  for (const table of ["bankroll_entries", "tickets", "candidates", "profiles"]) {
    const { count } = await db
      .from(table)
      .delete({ count: "exact" })
      .eq("is_demo", true);
    deleted[table] = count ?? 0;
  }

  log("info", "seed", "ukázková data smazána", deleted);
  return { deleted };
}

export async function demoCount(): Promise<number> {
  const db = serviceClient();
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_demo", true);
  return count ?? 0;
}

export { DEMO_TAG };
