import { env } from "@/lib/env";

type Lead = { name: string; phone: string; message: string };

const TIMEOUT_MS = 4_000;
const MAX_MESSAGE = 600;

/** Plain text, no markup mode: nothing a visitor typed can become formatting or a link target. */
export function leadText(lead: Lead): string {
  const message = lead.message.length > MAX_MESSAGE ? `${lead.message.slice(0, MAX_MESSAGE)}…` : lead.message;
  return `درخواست مشاوره‌ی جدید\nنام: ${lead.name}\nتلفن: ${lead.phone}\nپیام: ${message}`;
}

async function send(url: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/**
 * Tells the team about a new lead on Telegram and/or Bale, whichever has a token and chat id in the environment
 * (both unset = nothing happens). Failures are logged without the token and never reach the visitor: the lead is already stored.
 */
export async function notifyLead(lead: Lead): Promise<void> {
  const e = env();
  const text = leadText(lead);
  const targets: Array<[string, string, string | undefined, string | undefined]> = [
    ["telegram", "https://api.telegram.org", e.TELEGRAM_BOT_TOKEN, e.TELEGRAM_CHAT_ID],
    ["bale", "https://tapi.bale.ai", e.BALE_BOT_TOKEN, e.BALE_CHAT_ID],
  ];
  await Promise.all(
    targets.map(async ([name, base, token, chat]) => {
      if (!token || !chat) return;
      try {
        await send(`${base}/bot${token}/sendMessage`, chat, text);
      } catch (err) {
        console.error(`lead notification (${name}) failed:`, err instanceof Error ? err.message : err);
      }
    }),
  );
}
