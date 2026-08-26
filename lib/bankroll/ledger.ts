import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { type EntryKind, keys, round2 } from "./math";

export { keys, round2, payoutFor, profitFor, sumEntries } from "./math";
export type { EntryKind, BetState } from "./math";

/**
 * Bankroll jako účetní kniha, ne měnitelné číslo.
 *
 * Jedno pole, do kterého se přičítá a odečítá, je konstrukce, ze které
 * vznikne stav, co se nedá odsouhlasit — když se jednou připíše špatně,
 * nikdo nedohledá kdy a proč.
 *
 * Tady je každý pohyb samostatný řádek s klíčem idempotence. Zůstatek
 * je součet, ne uložená hodnota. Dvojí zúčtování je proto nemožné,
 * každá koruna má původ a oprava se dělá protizápisem.
 */

export type LedgerEntry = {
  userId: string;
  kind: EntryKind;
  /** Znaménko nese směr: sázka záporně, výplata kladně. */
  amount: number;
  ticketId?: string | null;
  /** Bez klíče se zápis neprovede. Idempotence stojí na něm. */
  idempotencyKey: string;
  note?: string | null;
  createdBy?: string | null;
};

export type WriteResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: string };

/**
 * Zapíše pohyb. Když klíč už existuje, nic se nestane a vrátí se
 * created: false — to je správné chování, ne chyba.
 */
export async function addEntry(entry: LedgerEntry): Promise<WriteResult> {
  if (!isFinite(entry.amount) || entry.amount === 0) {
    return { ok: false, reason: "Nulová nebo neplatná částka." };
  }
  if (!entry.idempotencyKey) {
    return { ok: false, reason: "Chybí klíč idempotence." };
  }

  try {
    const db = serviceClient();
    const { error } = await db.from("bankroll_entries").insert({
      user_id: entry.userId,
      kind: entry.kind,
      amount: entry.amount,
      ticket_id: entry.ticketId ?? null,
      idempotency_key: entry.idempotencyKey,
      note: entry.note ?? null,
      created_by: entry.createdBy ?? null,
    });

    // 23505 = porušení unique. Znamená, že pohyb už je zapsaný.
    if (error && (error as { code?: string }).code === "23505") {
      return { ok: true, created: false };
    }
    if (error) throw error;

    return { ok: true, created: true };
  } catch (err) {
    log("error", "bankroll", "zápis pohybu selhal", {
      userId: entry.userId,
      kind: entry.kind,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "Zápis selhal." };
  }
}

/** Zůstatek je součet knihy, ne uložená hodnota. */
export async function balance(userId: string): Promise<number> {
  const db = serviceClient();
  const { data, error } = await db
    .from("bankroll_entries")
    .select("amount")
    .eq("user_id", userId);

  if (error) throw error;
  return round2((data ?? []).reduce((s, r) => s + Number(r.amount), 0));
}

/** Kontrola: součet knihy proti hodnotě v profilu. */
export async function reconcile(userId: string, profileValue: number) {
  const ledger = await balance(userId);
  return { ledger, profileValue, matches: Math.abs(ledger - profileValue) < 0.01 };
}
