// Web Push is the default notification channel (PWA-first); Telegram is an
// optional fallback (see telegram.js). Requires VAPID_PUBLIC_KEY and
// VAPID_PRIVATE_KEY env vars — without them, sendPush() is a no-op so the
// rest of the portal keeps working (per the brief: everything must work
// without Telegram configured, and push likewise degrades gracefully
// without VAPID keys rather than crashing the request that triggered it).
import webpush from 'web-push';
import { entfernePushSubscription } from './store.js';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:kontakt@example.invalid';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToBetrieb(slug, daten, payload) {
  if (!ensureConfigured()) return { sent: 0, skipped: 'no-vapid-keys' };
  let sent = 0;
  for (const sub of daten.pushSubscriptions ?? []) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        entfernePushSubscription(slug, sub.endpoint);
      }
    }
  }
  return { sent };
}

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}
