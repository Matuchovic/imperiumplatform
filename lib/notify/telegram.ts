/**
 * Doručení tipů přes Telegram.
 *
 * Kurz se mění v řádu minut, takže kanál musí být okamžitý. E-mail
 * na tohle nestačí — než ho klient otevře, práh už nemusí platit.
 */

const API = "https://api.telegram.org";

export function telegramReady(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export type SendResult = { sent: number; failed: number; skipped: number };

async function sendOne(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram]", chatId, res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] výpadek:", err);
    return false;
  }
}

export type TipLine = {
  event: string;
  market: string;
  selection: string;
  odds: number;
  thresholdOdds: number;
  stake: number;
  units: number;
  band: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const czk = (n: number) => n.toLocaleString("cs-CZ");

/**
 * Jedna zpráva na klienta za běh, ne jedna na tip.
 * Tři tipy krát čtyřicet klientů by jinak bylo 120 zpráv.
 */
export function composeMessage(name: string, tips: TipLine[]): string {
  const head =
    tips.length === 1
      ? `<b>Nový tip</b>`
      : `<b>${tips.length} nové tipy</b>`;

  const body = tips
    .map(
      (t) =>
        `\n\n<b>${esc(t.event)}</b>\n` +
        `${esc(t.market)}: ${esc(t.selection)}\n` +
        `Kurz <b>${t.odds.toFixed(2)}</b> · sázka <b>${czk(t.stake)} Kč</b> (${t.units} jed.)\n` +
        `<i>Vsaď jen nad kurz ${t.thresholdOdds.toFixed(2)} — pod ním hodnota mizí.</i>`
    )
    .join("");

  return (
    `${head}, ${esc(name.split(" ")[0])}.` +
    body +
    `\n\n<i>Sázení nese riziko ztráty. Žádné doporučení negarantuje zisk.</i>`
  );
}

/**
 * Telegram pouští zhruba jednu zprávu za vteřinu do jednoho chatu
 * a asi třicet celkově. Posíláme postupně s malou pauzou — rychlejší
 * odesílání skončí u chyby 429 a část klientů tip nedostane.
 */
export async function sendBatch(
  items: { chatId: string; text: string }[]
): Promise<SendResult> {
  if (!telegramReady()) {
    return { sent: 0, failed: 0, skipped: items.length };
  }

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    const ok = await sendOne(item.chatId, item.text);
    ok ? sent++ : failed++;
    await new Promise((r) => setTimeout(r, 40));
  }

  return { sent, failed, skipped: 0 };
}
