import { serviceClient } from "@/lib/supabase/server";
import { generateClients, sanityCheck, DEMO_TAG } from "./generate";
import { keys } from "@/lib/bankroll/math";
import { log } from "@/lib/log";

/**
 * Zápis ukázkových dat.
 *
 * Klienti dostávají SKUTEČNÉ účty přes Supabase Auth. Původně vznikaly
 * jen řádky v `profiles` s vlastním id a bylo kvůli tomu potřeba rušit
 * cizí klíče — jenže tikety i účetní kniha odkazují na `auth.users`
 * taky, takže by padaly dál. Skutečný účet ten problém nemá vůbec:
 * všechny vazby, RLS i mazání fungují stejně jako u živého klienta.
 */

export type SeedResult = {
  clients: number;
  tickets: number;
  entries: number;
  candidates: number;
  summary: ReturnType<typeof sanityCheck>;
  errors: string[];
};

const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export async function seedDemo(count = 12, seed = 42): Promise<SeedResult> {
  const db = serviceClient();
  const data = generateClients(count, seed);

  let clients = 0, tickets = 0, entries = 0, candidates = 0;
  const errors: string[] = [];
  const note = (m: string) => { if (!errors.includes(m)) errors.push(m); };

  for (const [i, c] of data.entries()) {
    // 1. Skutečný účet. Trigger k němu sám založí profil.
    const email = `ukazka.${i}.${Date.now().toString(36)}@betimperium.local`;
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name: c.name },
    });

    if (authErr || !created?.user) {
      note(`Účet: ${authErr?.message ?? "nevznikl"}`);
      continue;
    }
    const userId = created.user.id;

    // 2. Profil už existuje z triggeru — doplní se, nezakládá znovu.
    const { error: pErr } = await db.from("profiles").update({
      name: c.name,
      plan: c.plan,
      bankroll: c.startBankroll,
      goal: Math.round(c.startBankroll * 1.5),
      unit_pct: c.unitPct,
      subscribed_bands: c.bands,
      telegram_chat_id: c.telegram ? `demo-${i}` : null,
      role: "klient",
      is_demo: true,
      created_at: ago(c.tenureDays),
    }).eq("id", userId);

    if (pErr) { note(`Profil: ${pErr.message}`); continue; }
    clients++;

    // 3. Počáteční vklad do knihy.
    const { error: dErr } = await db.from("bankroll_entries").insert({
      user_id: userId, kind: "deposit", amount: c.startBankroll,
      idempotency_key: `demo:deposit:${userId}`,
      note: "Počáteční vklad (ukázka)", is_demo: true,
    });
    if (dErr) note(`Vklad: ${dErr.message}`);
    else entries++;

    if (c.tickets.length === 0) continue;

    // 4. Tikety.
    const { data: made, error: tErr } = await db.from("tickets").insert(
      c.tickets.map((t) => ({
        user_id: userId,
        event_name: t.event,
        market: t.market,
        selection: t.selection,
        odds: t.odds,
        units: 1,
        stake: t.stake,
        state: t.state,
        profit: t.profit,
        clv: t.clv,
        band: t.band,
        placed_at: ago(t.daysAgo),
        settled_at: t.state === "open" ? null : ago(Math.max(0, t.daysAgo - 1)),
        is_demo: true,
      }))
    ).select("id, stake, profit, state");

    if (tErr) { note(`Tikety: ${tErr.message}`); continue; }

    const rows = (made ?? []) as { id: string; stake: number; profit: number; state: string }[];
    tickets += rows.length;

    // 5. Pohyby v knize: vklad při vsazení, výplata při zúčtování.
    const moves = rows.flatMap((r) => {
      const out: Record<string, unknown>[] = [{
        user_id: userId, kind: "stake", amount: -Number(r.stake),
        ticket_id: r.id, idempotency_key: keys.stake(r.id),
        note: "Vsazeno (ukázka)", is_demo: true,
      }];
      if (r.state !== "open") {
        const payout = Number(r.stake) + Number(r.profit);
        if (payout > 0) {
          out.push({
            user_id: userId, kind: r.state === "won" ? "payout" : "refund",
            amount: payout, ticket_id: r.id, idempotency_key: keys.payout(r.id),
            note: "Zúčtování (ukázka)", is_demo: true,
          });
        }
      }
      return out;
    });

    const { error: mErr } = await db.from("bankroll_entries").insert(moves);
    if (mErr) note(`Pohyby: ${mErr.message}`);
    else entries += moves.length;
  }

  // 6. Kandidáti čekající na schválení, ať není sekce Tipy prázdná.
  const pending = data.slice(0, 4).map((c, i) => {
    const t = c.tickets[c.tickets.length - 1];
    if (!t) return null;
    return {
      event_id: `demo-${i}-${Date.now().toString(36)}`,
      league: "ukázka", event_name: t.event,
      market: t.market, selection: t.selection,
      sharp_odds: Math.round(t.odds * 0.97 * 100) / 100,
      fair_prob: Math.round((1 / (t.odds * 0.97)) * 1e5) / 1e5,
      offered_odds: t.odds, offered_by: "Tipsport",
      threshold_odds: Math.round(t.odds * 0.98 * 100) / 100,
      ev: 0.03, units: 1.5,
      commence_at: new Date(Date.now() + (i + 2) * 3600000).toISOString(),
      status: "pending", band: t.band, is_demo: true,
    };
  }).filter(Boolean) as Record<string, unknown>[];

  if (pending.length) {
    const { data: cands, error: cErr } = await db.from("candidates").insert(pending).select("id");
    if (cErr) note(`Kandidáti: ${cErr.message}`);
    candidates = (cands ?? []).length;
  }

  await db.from("engine_runs").insert({
    scanned: 342, found: candidates, auto_sent: 0, awaiting: candidates, tickets: 0,
  });

  const summary = sanityCheck(data);
  log("info", "seed", "ukázková data zapsána", {
    clients, tickets, entries, candidates, summary, errors,
  });

  return { clients, tickets, entries, candidates, summary, errors };
}

/** Smaže všechno označené jako ukázka. Skutečných dat se nedotkne. */
export async function wipeDemo(): Promise<{ deleted: Record<string, number> }> {
  const db = serviceClient();
  const deleted: Record<string, number> = {};

  const { data: profiles } = await db
    .from("profiles").select("id").eq("is_demo", true);
  const ids = ((profiles ?? []) as { id: string }[]).map((p) => p.id);

  for (const table of ["bankroll_entries", "tickets", "candidates"]) {
    const { count } = await db.from(table).delete({ count: "exact" }).eq("is_demo", true);
    deleted[table] = count ?? 0;
  }

  // Smazání účtu odstraní profil kaskádou.
  let users = 0;
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (!error) users++;
  }
  deleted.klienti = users;

  log("info", "seed", "ukázková data smazána", deleted);
  return { deleted };
}

export async function demoCount(): Promise<number> {
  const db = serviceClient();
  const { count } = await db
    .from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", true);
  return count ?? 0;
}

export { DEMO_TAG };
