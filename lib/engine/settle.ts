import { serviceClient } from "@/lib/supabase/server";
import { getResultsProvider } from "@/lib/results/provider";
import { buildPlan, type OpenTicket, type SettlementPlan } from "./settle-plan";
import { addEntry } from "@/lib/bankroll/ledger";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/events/bus";
import { isEnabled } from "@/lib/flags";
import { log } from "@/lib/log";

/**
 * Zúčtování tiketů.
 *
 * Nejnebezpečnější operace v systému — hýbe cizími penězi. Proto:
 * vypínač, běh nasucho, klíč idempotence na každý pohyb, audit
 * u každé změny a žádné zúčtování bez definitivního výsledku.
 */

export type SettleResult = {
  ok: boolean;
  dryRun: boolean;
  provider: string;
  live: boolean;
  plan: SettlementPlan | null;
  settled: number;
  paidOut: number;
  reason?: string;
};

export async function settleOpenTickets(
  opts: { dryRun?: boolean; runId?: string } = {}
): Promise<SettleResult> {
  const dryRun = opts.dryRun ?? false;
  const provider = getResultsProvider();

  const base = {
    dryRun, provider: provider.name, live: provider.live,
    plan: null, settled: 0, paidOut: 0,
  };

  if (!dryRun && !(await isEnabled("settlement_enabled"))) {
    return { ...base, ok: true, reason: "Zúčtování je vypnuté." };
  }

  // Bez skutečného poskytovatele se naostro nezúčtovává. Nasucho ano —
  // právě proto, aby šel řetězec ověřit dřív, než přijdou reálná data.
  if (!dryRun && !provider.live) {
    return { ...base, ok: true, reason: "Poskytovatel výsledků není zapojený." };
  }

  const db = serviceClient();

  const { data, error } = await db
    .from("tickets")
    .select("id, user_id, candidate_id, market, selection, odds, stake, state, candidates(event_id)")
    .eq("state", "open")
    .limit(200);

  if (error) {
    log("error", "settle", "načtení tiketů selhalo", { error: error.message });
    return { ...base, ok: false, reason: "Načtení tiketů selhalo." };
  }

  type Row = {
    id: string; user_id: string; market: string; selection: string;
    odds: number; stake: number; state: string;
    candidates: { event_id: string } | { event_id: string }[] | null;
  };

  const tickets: OpenTicket[] = ((data ?? []) as Row[]).map((r) => {
    const c = Array.isArray(r.candidates) ? r.candidates[0] : r.candidates;
    return {
      id: r.id, userId: r.user_id, eventId: c?.event_id ?? "",
      market: r.market, selection: r.selection,
      odds: Number(r.odds), stake: Number(r.stake), state: r.state,
    };
  });

  if (tickets.length === 0) {
    return { ...base, ok: true, plan: buildPlan([], []), reason: "Žádné otevřené tikety." };
  }

  const eventIds = [...new Set(tickets.map((t) => t.eventId).filter(Boolean))];
  const results = await provider.getResults(eventIds);
  const plan = buildPlan(tickets, results);

  if (dryRun) {
    log("info", "settle", "běh nasucho — nic se nezapsalo", {
      runId: opts.runId,
      wouldSettle: plan.settle.length,
      wouldPay: plan.totalPayout,
      undecided: plan.undecided.length,
    });
    return { ...base, ok: true, plan };
  }

  let settled = 0;
  let paidOut = 0;

  for (const item of plan.settle) {
    // Nejdřív pohyb v knize. Kdyby se zapsal stav tiketu a pak selhala
    // výplata, klient by měl vyhraný tiket bez peněz.
    if (item.payout > 0) {
      const res = await addEntry({
        userId: item.userId,
        kind: item.state === "won" ? "payout" : "refund",
        amount: item.payout,
        ticketId: item.ticketId,
        idempotencyKey: item.ledgerKey,
        note: `Zúčtování tiketu (${item.state})`,
      });
      if (!res.ok) {
        log("error", "settle", "výplata selhala, tiket zůstává otevřený", {
          ticketId: item.ticketId, reason: res.reason,
        });
        continue;
      }
      if (res.created) paidOut += item.payout;
    }

    const { error: upErr } = await db
      .from("tickets")
      .update({
        state: item.state === "push" ? "void" : item.state,
        profit: item.profit,
        settled_at: new Date().toISOString(),
      })
      .eq("id", item.ticketId)
      .eq("state", "open"); // podmínka brání přepsání už zúčtovaného

    if (upErr) {
      log("error", "settle", "zápis stavu tiketu selhal", {
        ticketId: item.ticketId, error: upErr.message,
      });
      continue;
    }

    settled++;

    await audit({
      action: "ticket.settled",
      entity: "tickets",
      entityId: item.ticketId,
      source: "settle",
      next: { state: item.state, profit: item.profit, payout: item.payout },
      runId: opts.runId,
    });

    await emit("ticket.settled", "tickets", item.ticketId, {
      state: item.state, profit: item.profit,
    });
  }

  log("info", "settle", "zúčtování dokončeno", {
    runId: opts.runId, settled, paidOut,
    undecided: plan.undecided.length, missing: plan.missingResult.length,
  });

  return { ...base, ok: true, plan, settled, paidOut };
}
