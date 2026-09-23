// Optional Telegram fallback notifications + a tiny command bot. Everything
// here is a no-op when TELEGRAM_BOT_TOKEN is unset, per the requirement
// that the portal works fully without Telegram configured.
import { ladeBetrieb, setzeReservierungStatus, setzeBestellungStatus, bestaetigeBestellung } from './store.js';

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export async function sendTelegramMessage(chatId, text) {
  const token = botToken();
  if (!token || !chatId) return { sent: false };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return { sent: res.ok };
}

export async function notifyBetrieb(slug, daten, text) {
  if (!daten.telegramChatId) return { sent: false, reason: 'not-configured' };
  return sendTelegramMessage(daten.telegramChatId, text);
}

// Commands: /bestätigen <id>, /absagen <id>, /bereit <id>, /heute.
// The chat id is checked against the betrieb's own stored telegramChatId
// before any command runs, so one betrieb's chat can never act on another
// betrieb's reservations/orders even if it somehow guesses an id.
export async function handleCommand(slug, chatId, text) {
  const daten = ladeBetrieb(slug);
  if (String(daten.telegramChatId) !== String(chatId)) {
    return 'Dieser Chat ist für keinen Betrieb freigeschaltet.';
  }
  const [command, arg] = String(text ?? '').trim().split(/\s+/);
  switch (command) {
    case '/bestätigen':
    case '/bestaetigen':
      if (!arg) return 'Bitte eine Reservierungs-ID angeben: /bestätigen <id>';
      setzeReservierungStatus(slug, arg, 'bestaetigt');
      return `Reservierung ${arg} bestätigt.`;
    case '/absagen':
      if (!arg) return 'Bitte eine ID angeben: /absagen <id>';
      setzeReservierungStatus(slug, arg, 'abgesagt');
      return `Reservierung ${arg} abgesagt.`;
    case '/bereit':
      if (!arg) return 'Bitte eine Bestell-ID angeben: /bereit <id>';
      setzeBestellungStatus(slug, arg, 'bereit');
      return `Bestellung ${arg} als bereit markiert.`;
    case '/heute': {
      const heute = new Date().toISOString().slice(0, 10);
      const reservierungen = daten.reservierungen.filter((r) => r.datum === heute && r.status !== 'abgesagt');
      const bestellungen = daten.bestellungen.filter((b) => b.eingegangen.slice(0, 10) === heute && b.status !== 'storniert');
      return `Heute: ${reservierungen.length} Reservierung(en), ${bestellungen.length} Bestellung(en).`;
    }
    default:
      return 'Befehle: /bestätigen <id>, /absagen <id>, /bereit <id>, /heute';
  }
}

// A single long-poll loop; only starts if a bot token is configured.
// Kept intentionally simple (getUpdates long polling, no webhook server)
// since the wirt-portal already owns the public HTTP surface on 3001 and a
// webhook would need its own public HTTPS endpoint and secret verification.
export function startTelegramPolling({ resolveSlugForChat }) {
  const token = botToken();
  if (!token) return { started: false };
  let offset = 0;
  let stopped = false;

  async function poll() {
    while (!stopped) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?timeout=25&offset=${offset}`);
        const body = await res.json();
        for (const update of body.result ?? []) {
          offset = update.update_id + 1;
          const message = update.message;
          if (!message?.text) continue;
          const chatId = message.chat.id;
          const slug = resolveSlugForChat(chatId);
          if (!slug) continue;
          const reply = await handleCommand(slug, chatId, message.text);
          await sendTelegramMessage(chatId, reply);
        }
      } catch {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  poll();
  return { started: true, stop: () => { stopped = true; } };
}
