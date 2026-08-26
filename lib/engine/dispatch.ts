import { serviceClient } from "@/lib/supabase/server";
import { BANDS, bandFor, type Band } from "./bands";
import type { Candidate } from "./types";

/**
 * Rozeslání schválených nálezů klientům.
 *
 * Jeden nález, různé bankrolly a limity — jednotky se přepočítávají
 * na každého klienta zvlášť. Model do tohohle kroku nesahá.
 */

export type DispatchResult = {
  candidates: number;
  clients: number;
  tickets: number;
  skipped: { reason: string; count: number }[];
};

type Profile = {
  id: string;
  bankroll: number;
  unit_pct: number;
  subscribed_bands: string[] | null;
  role: string;
};

export async function dispatchCandidates(cands: Candidate[]): Promise<DispatchResult> {
  const db = serviceClient();
  const skipped = new Map<string, number>();
  const note = (r: string) => skipped.set(r, (skipped.get(r) ?? 0) + 1);

  const { data: profiles } = await db
    .from("profiles")
    .select("id, bankroll, unit_pct, subscribed_bands, role")
    .eq("role", "client")
    .gt("bankroll", 0);

  const clients = (profiles ?? []) as Profile[];
  if (clients.length === 0 || cands.length === 0) {
    return { candidates: cands.length, clients: clients.length, tickets: 0, skipped: [] };
  }

  const rows: Record<string, unknown>[] = [];

  for (const c of cands) {
    if (c.blocked) { note("blokovaný kandidát"); continue; }
    const band = bandFor(c.offeredOdds);

    for (const p of clients) {
      const bands = p.subscribed_bands ?? ["zaklad", "standard"];
      if (!bands.includes(band.key)) { note("pásmo neodebírá"); continue; }

      // Jednotka je procento bankrollu klienta, ne pevná částka.
      const unit = p.bankroll * (p.unit_pct / 100);
      const stake = Math.round(unit * c.units);
      if (stake < 20) { note("sázka pod 20 Kč"); continue; }

      rows.push({
        user_id: p.id,
        candidate_id: c.id,
        event_name: c.event,
        market: c.market,
        selection: c.selection,
        odds: c.offeredOdds,
        units: c.units,
        stake,
        state: "open",
        band: band.key,
      });
    }
  }

  let tickets = 0;
  if (rows.length > 0) {
    const { error, count } = await db.from("tickets").insert(rows, { count: "exact" });
    if (error) console.error("[dispatch]", error);
    else tickets = count ?? rows.length;
  }

  return {
    candidates: cands.length,
    clients: clients.length,
    tickets,
    skipped: [...skipped].map(([reason, count]) => ({ reason, count })),
  };
}

/** Pásma, která smí odejít bez schválení člověkem. */
export function autoApprovable(cands: Candidate[]): {
  auto: Candidate[];
  manual: Candidate[];
} {
  const auto: Candidate[] = [];
  const manual: Candidate[] = [];
  for (const c of cands) {
    if (c.blocked) continue;
    (bandFor(c.offeredOdds).autoApprove ? auto : manual).push(c);
  }
  return { auto, manual };
}

export function bandSummary(cands: Candidate[]): { band: Band; items: Candidate[] }[] {
  return BANDS.map((band) => ({
    band,
    // Prázdné pásmo zůstane prázdné. Doplňovat na počet je zakázané.
    items: cands.filter((c) => !c.blocked && bandFor(c.offeredOdds).key === band.key),
  }));
}
