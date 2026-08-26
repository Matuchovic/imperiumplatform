import { serviceClient } from "@/lib/supabase/server";
import { BANDS, bandFor, type Band } from "./bands";
import { composeMessage, sendBatch, type TipLine } from "@/lib/notify/telegram";
import { addEntry } from "@/lib/bankroll/ledger";
import { keys } from "@/lib/bankroll/math";
import { log } from "@/lib/log";
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
  notified: number;
  notifyFailed: number;
  staked: number;
  skipped: { reason: string; count: number }[];
  /** Nasucho: co by se stalo, kdyby se běh pustil naostro. */
  dryRun: boolean;
  plan?: { userId: string; event: string; stake: number; band: string }[];
};

type Profile = {
  id: string;
  name: string | null;
  bankroll: number;
  unit_pct: number;
  subscribed_bands: string[] | null;
  telegram_chat_id: string | null;
  role: string;
};

/**
 * Rozeslání schválených nálezů.
 *
 * Nasucho spočítá všechno a vrátí plán, ale nic nezapíše ani neodešle.
 * U operace, která hýbe cizími penězi, je jeden běh navíc levnější
 * než jedna oprava.
 */
export async function dispatchCandidates(
  cands: Candidate[],
  opts: { dryRun?: boolean } = {}
): Promise<DispatchResult> {
  const dryRun = opts.dryRun ?? false;
  const db = serviceClient();
  const skipped = new Map<string, number>();
  const note = (r: string) => skipped.set(r, (skipped.get(r) ?? 0) + 1);

  const { data: profiles } = await db
    .from("profiles")
    .select("id, name, bankroll, unit_pct, subscribed_bands, telegram_chat_id, role")
    .eq("role", "client")
    .gt("bankroll", 0);

  const clients = (profiles ?? []) as Profile[];
  if (clients.length === 0 || cands.length === 0) {
    return {
      candidates: cands.length, clients: clients.length,
      tickets: 0, notified: 0, notifyFailed: 0, staked: 0,
      skipped: [], dryRun,
    };
  }

  const rows: Record<string, unknown>[] = [];
  // Tipy se sbírají po klientech, ať dostane jednu zprávu za běh
  // místo jedné za každý tip.
  const perClient = new Map<string, { profile: Profile; tips: TipLine[] }>();

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

      if (p.telegram_chat_id) {
        const entry = perClient.get(p.id) ?? { profile: p, tips: [] };
        entry.tips.push({
          event: c.event,
          market: c.market,
          selection: c.selection,
          odds: c.offeredOdds,
          thresholdOdds: c.thresholdOdds,
          stake,
          units: c.units,
          band: band.key,
        });
        perClient.set(p.id, entry);
      } else {
        note("bez napojeného Telegramu");
      }
    }
  }

  const plan = rows.map((r) => ({
    userId: String(r.user_id),
    event: String(r.event_name),
    stake: Number(r.stake),
    band: String(r.band),
  }));

  if (dryRun) {
    log("info", "dispatch", "běh nasucho — nic se nezapsalo", {
      wouldCreate: rows.length,
      wouldStake: plan.reduce((s, p) => s + p.stake, 0),
    });
    return {
      candidates: cands.length, clients: clients.length,
      tickets: 0, notified: 0, notifyFailed: 0,
      staked: 0, dryRun: true, plan,
      skipped: [...skipped].map(([reason, count]) => ({ reason, count })),
    };
  }

  let tickets = 0;
  let created: { id: string; user_id: string; stake: number }[] = [];

  if (rows.length > 0) {
    // upsert místo insert: dvojí běh cronu nesmí vytvořit klientovi
    // tentýž tiket dvakrát. Unique index to hlídá i při souběhu.
    const { data, error } = await db
      .from("tickets")
      .upsert(rows, { onConflict: "user_id,candidate_id", ignoreDuplicates: true })
      .select("id, user_id, stake");

    if (error) log("error", "dispatch", "zápis tiketů selhal", { error: error.message });
    else {
      created = (data ?? []) as typeof created;
      tickets = created.length;
    }
  }

  // Vklad se odečte při vsazení, výplata přijde až při zúčtování.
  // Klíč je odvozený od tiketu, takže opakovaný běh nic nepřipíše.
  let staked = 0;
  for (const t of created) {
    const res = await addEntry({
      userId: t.user_id,
      kind: "stake",
      amount: -Math.abs(Number(t.stake)),
      ticketId: t.id,
      idempotencyKey: keys.stake(t.id),
      note: "Vsazeno podle doporučení",
    });
    if (res.ok && res.created) staked += Number(t.stake);
  }

  // Zprávy odcházejí až po zápisu. Kdyby to bylo obráceně a zápis
  // selhal, klient by dostal tip, který v systému neexistuje.
  let notified = 0;
  let notifyFailed = 0;

  if (tickets > 0 && perClient.size > 0) {
    const batch = [...perClient.values()].map(({ profile, tips }) => ({
      chatId: profile.telegram_chat_id!,
      text: composeMessage(profile.name ?? "", tips),
    }));
    const res = await sendBatch(batch);
    notified = res.sent;
    notifyFailed = res.failed;
    if (res.skipped > 0) note("Telegram není nastavený");
  }

  return {
    candidates: cands.length,
    clients: clients.length,
    tickets,
    notified,
    notifyFailed,
    staked,
    dryRun: false,
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
