import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ladeBetrieb, speichereBetrieb, betriebExistiert,
  legeReservierungAn, setzeReservierungStatus,
  legeBestellungAn, setzeBestellungStatus, bestaetigeBestellung,
  noShowZustimmungstext, setzeNoShowSchutz, bestaetigeNoShow, zuverlaessigkeitsWarnung,
  setzeWartezeit, setzeOeffnungszeiten, setzeTelegramChatId,
  fuegePushSubscriptionHinzu,
} from './store.js';
import { pruefeBetriebLogin, signSession, verifySession, newCsrfToken } from './auth.js';
import { sendPushToBetrieb, vapidPublicKey } from './push.js';
import { notifyBetrieb } from './telegram.js';
import { buildNoShowReceipt } from './pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCookies(header) {
  const out = {};
  String(header ?? '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

// SSE subscribers, in-memory, keyed by betrieb slug. This intentionally
// lives outside any store: it is transient connection state, never
// persisted, and never crosses tenants (a client is only ever registered
// under its own authenticated slug).
const sseClients = new Map(); // slug -> Set<res>

function pushEvent(slug, event) {
  const set = sseClients.get(slug);
  if (!set) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of set) res.write(payload);
}

export function createWirtApp() {
  const app = express();
  app.use(express.json());

  // --- Public, cross-origin API used by static customer sites ---
  const publicRouter = express.Router();
  publicRouter.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  publicRouter.get('/betrieb/:slug/konfiguration', (req, res) => {
    if (!betriebExistiert(req.params.slug)) return res.status(404).json({ error: 'Betrieb nicht gefunden.' });
    const daten = ladeBetrieb(req.params.slug);
    res.json({
      noShowSchutzAktiv: daten.noShowSchutzAktiv,
      noShowZustimmungstext: daten.noShowSchutzAktiv ? noShowZustimmungstext(daten) : null,
      noShowStornofensterMinuten: daten.noShowStornofensterMinuten,
      noShowGebuehrBetrag: daten.noShowGebuehrBetrag,
      oeffnungszeiten: daten.oeffnungszeiten,
    });
  });

  publicRouter.post('/betrieb/:slug/reservierung', async (req, res) => {
    try {
      const reservierung = legeReservierungAn(req.params.slug, req.body, 'online');
      const daten = ladeBetrieb(req.params.slug);
      pushEvent(req.params.slug, { type: 'reservierung', reservierung });
      await sendPushToBetrieb(req.params.slug, daten, { title: 'Neue Reservierung', body: `${reservierung.name}, ${reservierung.personen} Pers., ${reservierung.datum} ${reservierung.uhrzeit}` });
      await notifyBetrieb(req.params.slug, daten, `Neue Reservierung: ${reservierung.name}, ${reservierung.personen} Pers., ${reservierung.datum} ${reservierung.uhrzeit}`);
      res.status(201).json(reservierung);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  publicRouter.post('/betrieb/:slug/bestellung', async (req, res) => {
    try {
      const bestellung = legeBestellungAn(req.params.slug, req.body);
      const daten = ladeBetrieb(req.params.slug);
      const warnung = zuverlaessigkeitsWarnung(daten, bestellung.telefon);
      pushEvent(req.params.slug, { type: 'bestellung', bestellung, warnung });
      await sendPushToBetrieb(req.params.slug, daten, { title: 'Neue Bestellung', body: `${bestellung.nummer} – ${bestellung.name}, ${bestellung.gesamt.toFixed(2)} €` });
      await notifyBetrieb(req.params.slug, daten, `Neue Bestellung ${bestellung.nummer}: ${bestellung.name}, ${bestellung.gesamt.toFixed(2)} €`);
      res.status(201).json(bestellung);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.use(publicRouter);

  // --- Auth ---
  app.post('/login', (req, res) => {
    const { slug, passwort } = req.body ?? {};
    if (!slug || !passwort || !pruefeBetriebLogin(slug, passwort)) {
      return res.status(401).json({ error: 'Login fehlgeschlagen.' });
    }
    const session = signSession(slug);
    const csrf = newCsrfToken();
    res.setHeader('Set-Cookie', [
      `wirt_session=${session}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200`,
      `wirt_csrf=${csrf}; Path=/; SameSite=Strict; Max-Age=43200`,
    ]);
    res.json({ ok: true, slug });
  });

  app.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', [
      'wirt_session=; HttpOnly; Path=/; Max-Age=0',
      'wirt_csrf=; Path=/; Max-Age=0',
    ]);
    res.json({ ok: true });
  });

  // --- Authenticated router: every route below is scoped to req.slug,
  // which comes only from the verified session cookie, never from a URL
  // or body parameter — this is what keeps betriebe from reading or
  // writing each other's data even if a client tampers with a request.
  const authRouter = express.Router();
  authRouter.use((req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const slug = verifySession(cookies.wirt_session);
    if (!slug) return res.status(401).json({ error: 'Nicht angemeldet.' });
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const header = req.headers['x-csrf-token'];
      if (!header || header !== cookies.wirt_csrf) return res.status(403).json({ error: 'Ungültiges CSRF-Token.' });
    }
    req.slug = slug;
    next();
  });

  authRouter.get('/uebersicht', (req, res) => {
    const daten = ladeBetrieb(req.slug);
    const heute = new Date().toISOString().slice(0, 10);
    res.json({
      reservierungenHeute: daten.reservierungen.filter((r) => r.datum === heute && r.status !== 'abgesagt').length,
      reservierungenOffen: daten.reservierungen.filter((r) => r.status === 'neu').length,
      bestellungenOffen: daten.bestellungen.filter((b) => ['neu', 'zubereitung'].includes(b.status)).length,
      tischeGesamt: daten.tische.length,
    });
  });

  authRouter.get('/reservierungen', (req, res) => {
    const daten = ladeBetrieb(req.slug);
    const sortKey = req.query.sort === 'name' ? 'name' : 'datum';
    const sorted = [...daten.reservierungen].sort((a, b) => `${a[sortKey]}${a.uhrzeit || ''}`.localeCompare(`${b[sortKey]}${b.uhrzeit || ''}`));
    res.json(sorted);
  });

  authRouter.post('/reservierungen/:id/status', (req, res) => {
    try {
      const r = setzeReservierungStatus(req.slug, req.params.id, req.body.status);
      pushEvent(req.slug, { type: 'reservierung', reservierung: r });
      res.json(r);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.get('/bestellungen', (req, res) => {
    const daten = ladeBetrieb(req.slug);
    res.json(daten.bestellungen);
  });

  authRouter.post('/bestellungen/:id/status', (req, res) => {
    try {
      const b = setzeBestellungStatus(req.slug, req.params.id, req.body.status);
      pushEvent(req.slug, { type: 'bestellung', bestellung: b });
      res.json(b);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.post('/bestellungen/:id/bestaetigen', (req, res) => {
    try {
      const b = bestaetigeBestellung(req.slug, req.params.id, req.body.abholzeit);
      pushEvent(req.slug, { type: 'bestellung', bestellung: b });
      res.json(b);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.post('/bestellungen/:id/no-show', (req, res) => {
    try {
      const b = bestaetigeNoShow(req.slug, req.params.id, req.body.betrag);
      res.json(b);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.get('/bestellungen/:id/quittung.pdf', async (req, res) => {
    const daten = ladeBetrieb(req.slug);
    const bestellung = daten.bestellungen.find((b) => b.id === req.params.id);
    if (!bestellung || !bestellung.noShowBestaetigtAm) return res.status(404).json({ error: 'Keine Quittung verfügbar.' });
    const pdf = await buildNoShowReceipt(req.slug, bestellung);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quittung-${bestellung.nummer}.pdf"`);
    res.send(pdf);
  });

  authRouter.post('/einstellungen/oeffnungszeiten', (req, res) => {
    try { res.json(setzeOeffnungszeiten(req.slug, req.body)); } catch (err) { res.status(400).json({ error: err.message }); }
  });
  authRouter.post('/einstellungen/wartezeit', (req, res) => {
    try { res.json({ zusaetzlicheWartezeitMinuten: setzeWartezeit(req.slug, req.body.minuten) }); } catch (err) { res.status(400).json({ error: err.message }); }
  });
  authRouter.post('/einstellungen/telegram', (req, res) => {
    try { res.json({ telegramChatId: setzeTelegramChatId(req.slug, req.body.chatId) }); } catch (err) { res.status(400).json({ error: err.message }); }
  });
  authRouter.post('/einstellungen/no-show', (req, res) => {
    try { res.json(setzeNoShowSchutz(req.slug, req.body)); } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.get('/push/public-key', (req, res) => res.json({ publicKey: vapidPublicKey() }));
  authRouter.post('/push/subscribe', (req, res) => {
    try { res.json(fuegePushSubscriptionHinzu(req.slug, req.body)); } catch (err) { res.status(400).json({ error: err.message }); }
  });

  authRouter.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    if (!sseClients.has(req.slug)) sseClients.set(req.slug, new Set());
    sseClients.get(req.slug).add(res);
    res.write('event: verbunden\ndata: {}\n\n');
    req.on('close', () => sseClients.get(req.slug)?.delete(res));
  });

  app.use('/api', authRouter);

  app.use(express.static(path.join(__dirname, 'public')));

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createWirtApp();
  const port = Number(process.env.WIRT_PORT) || 3001;
  const host = process.env.HOST_WIRT || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Wirt-Portal läuft auf http://${host}:${port}`);
  });
}
