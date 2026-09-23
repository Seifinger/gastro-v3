// Per-betrieb (tenant) JSON persistence: table plan, reservations, orders,
// push subscriptions and no-show configuration. Every exported function
// takes an explicit `slug` and only ever touches that one betrieb's file —
// this is the mechanism that enforces tenant separation at the data layer,
// independent of whatever route-level auth calls it.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const BELEGDAUER_MINUTEN = 120;
export const RESERVIERUNG_STATUS = ['neu', 'bestaetigt', 'abgesagt'];
export const BESTELLUNG_STATUS = ['neu', 'zubereitung', 'bereit', 'abgeholt', 'abgelehnt', 'storniert'];
export const NO_SHOW_STORNOFENSTER_MINUTEN_DEFAULT = 30;
export const NO_SHOW_WARN_SCHWELLE_DEFAULT = 2;

let runtimeDir = path.join(process.cwd(), 'data', 'runtime', 'wirt');

export function setRuntimeDir(dir) {
  runtimeDir = dir;
}

function slugPattern(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug ?? ''))) {
    throw new Error('Ungültiger Betriebs-Slug.');
  }
}

function dateiPfad(slug) {
  slugPattern(slug);
  return path.join(runtimeDir, `${slug}.json`);
}

function leererBetrieb() {
  return {
    tische: [],
    reservierungen: [],
    bestellungen: [],
    zusaetzlicheWartezeitMinuten: 0,
    pushSubscriptions: [],
    telegramChatId: '',
    noShowSchutzAktiv: false,
    noShowGebuehrBetrag: 0,
    noShowStornofensterMinuten: NO_SHOW_STORNOFENSTER_MINUTEN_DEFAULT,
    noShowWarnSchwelle: NO_SHOW_WARN_SCHWELLE_DEFAULT,
    oeffnungszeiten: {},
    zuverlaessigkeit: {}, // telefonnummer -> { noShowCount, gesamtCount }
  };
}

export function ladeBetrieb(slug) {
  try {
    const daten = JSON.parse(readFileSync(dateiPfad(slug), 'utf-8'));
    return { ...leererBetrieb(), ...daten };
  } catch {
    return leererBetrieb();
  }
}

export function betriebExistiert(slug) {
  return existsSync(dateiPfad(slug));
}

// Atomic-ish write (write to tmp file, then rename) so a crash mid-write
// never leaves a corrupted JSON file behind for the next read.
export function speichereBetrieb(slug, daten) {
  mkdirSync(runtimeDir, { recursive: true });
  const zielPfad = dateiPfad(slug);
  const tmpPfad = `${zielPfad}.${process.pid}.tmp`;
  writeFileSync(tmpPfad, `${JSON.stringify(daten, null, 2)}\n`, 'utf-8');
  renameSync(tmpPfad, zielPfad);
  return daten;
}

function aendere(slug, fn) {
  const daten = ladeBetrieb(slug);
  const ergebnis = fn(daten);
  speichereBetrieb(slug, daten);
  return ergebnis;
}

/* ---------- Tischplan & Kapazität ---------- */

function zuMinuten(uhrzeit) {
  const [h, m] = String(uhrzeit ?? '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

export function ueberschneidetSich(a, b) {
  const ma = zuMinuten(a);
  const mb = zuMinuten(b);
  if (ma === null || mb === null) return false;
  return Math.abs(ma - mb) < BELEGDAUER_MINUTEN;
}

export function gesamtPlaetze(daten) {
  return daten.tische.reduce((sum, t) => sum + t.plaetze, 0);
}

export function freiePlaetze(daten, datum, uhrzeit, { ignoriereId } = {}) {
  const belegt = daten.reservierungen
    .filter((r) => r.id !== ignoriereId && r.status !== 'abgesagt' && r.datum === datum && ueberschneidetSich(r.uhrzeit, uhrzeit))
    .reduce((sum, r) => sum + Number(r.personen || 0), 0);
  return gesamtPlaetze(daten) - belegt;
}

export function legeTischAn(slug, { name, plaetze }) {
  const sauber = String(name ?? '').trim();
  const anzahl = Number(plaetze);
  if (!sauber) throw new Error('Der Tisch braucht eine Bezeichnung.');
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 40) throw new Error('Die Platzzahl muss zwischen 1 und 40 liegen.');
  return aendere(slug, (daten) => {
    if (daten.tische.some((t) => t.name.toLowerCase() === sauber.toLowerCase())) {
      throw new Error(`Es gibt bereits einen Tisch "${sauber}".`);
    }
    const tisch = { id: randomUUID(), name: sauber, plaetze: anzahl };
    daten.tische.push(tisch);
    return tisch;
  });
}

/* ---------- Reservierungen ---------- */

function pruefeReservierung(daten, eingabe, { ignoriereId, quelle } = {}) {
  const personen = Number(eingabe.personen);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eingabe.datum ?? ''))) throw new Error('Bitte ein Datum im Format JJJJ-MM-TT angeben.');
  if (zuMinuten(eingabe.uhrzeit) === null) throw new Error('Bitte eine Uhrzeit im Format HH:MM angeben.');
  if (!Number.isInteger(personen) || personen < 1 || personen > 40) throw new Error('Die Personenzahl muss zwischen 1 und 40 liegen.');
  if (!String(eingabe.name ?? '').trim()) throw new Error('Bitte einen Namen angeben.');
  const frei = freiePlaetze(daten, eingabe.datum, eingabe.uhrzeit, { ignoriereId });
  if (daten.tische.length > 0 && personen > frei) {
    throw new Error(`Zu dieser Zeit sind nur noch ${Math.max(0, frei)} Plätze frei (angefragt: ${personen}).`);
  }
  return { personen };
}

export function legeReservierungAn(slug, eingabe, quelle = 'online') {
  return aendere(slug, (daten) => {
    const { personen } = pruefeReservierung(daten, eingabe, { quelle });
    const reservierung = {
      id: randomUUID(),
      datum: eingabe.datum,
      uhrzeit: eingabe.uhrzeit,
      personen,
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? '').trim(),
      email: String(eingabe.email ?? '').trim(),
      wunsch: String(eingabe.wunsch ?? '').trim(),
      quelle,
      status: quelle === 'manuell' ? 'bestaetigt' : 'neu',
      eingegangen: new Date().toISOString(),
    };
    daten.reservierungen.push(reservierung);
    return reservierung;
  });
}

export function setzeReservierungStatus(slug, id, status) {
  if (!RESERVIERUNG_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}".`);
  return aendere(slug, (daten) => {
    const r = daten.reservierungen.find((x) => x.id === id);
    if (!r) throw new Error('Reservierung nicht gefunden.');
    r.status = status;
    return r;
  });
}

/* ---------- Bestellungen ---------- */

export function noShowZustimmungstext({ noShowStornofensterMinuten, noShowGebuehrBetrag }) {
  const betrag = Number(noShowGebuehrBetrag || 0).toFixed(2).replace('.', ',');
  return `Ich stimme zu: Bei Nichtabholung ohne Stornierung bis ${noShowStornofensterMinuten} Minuten vor der Abholzeit wird eine Ausfallpauschale von ${betrag} € in Rechnung gestellt.`;
}

export function legeBestellungAn(slug, eingabe) {
  const positionen = Array.isArray(eingabe.positionen) ? eingabe.positionen : [];
  if (positionen.length === 0) throw new Error('Die Bestellung ist leer.');
  if (!String(eingabe.name ?? '').trim()) throw new Error('Bitte einen Namen angeben.');
  if (!String(eingabe.abholzeit ?? '').trim()) throw new Error('Bitte eine Abholzeit angeben.');
  const sauber = positionen.map((p) => ({
    name: String(p.name ?? '').trim(),
    menge: Math.max(1, Math.min(99, Number(p.menge) || 1)),
    preis: Number(p.preis) || 0,
  }));

  return aendere(slug, (daten) => {
    let noShowZustimmung = null;
    let noShowGebuehrBetragVereinbart = null;
    if (daten.noShowSchutzAktiv) {
      if (eingabe.noShowZustimmung !== true) throw new Error('Bitte stimmen Sie der Ausfallpauschale zu, um fortzufahren.');
      noShowZustimmung = { text: noShowZustimmungstext(daten), zeitpunkt: new Date().toISOString() };
      noShowGebuehrBetragVereinbart = daten.noShowGebuehrBetrag;
    }
    const telefon = String(eingabe.telefon ?? '').trim();
    const bestellung = {
      id: randomUUID(),
      nummer: `AB-${String(Math.floor(1000 + Math.random() * 9000))}`,
      positionen: sauber,
      gesamt: sauber.reduce((sum, p) => sum + p.preis * p.menge, 0),
      abholzeit: String(eingabe.abholzeit).trim(),
      bestaetigteAbholzeit: '',
      name: String(eingabe.name).trim(),
      telefon,
      email: String(eingabe.email ?? '').trim(),
      hinweis: String(eingabe.hinweis ?? '').trim(),
      status: 'neu',
      eingegangen: new Date().toISOString(),
      noShowZustimmung,
      noShowGebuehrBetragVereinbart,
      storniertAm: '',
      noShowBestaetigtAm: '',
      noShowBetrag: null,
    };
    daten.bestellungen.push(bestellung);
    if (telefon) {
      daten.zuverlaessigkeit[telefon] ??= { gesamtCount: 0, noShowCount: 0 };
      daten.zuverlaessigkeit[telefon].gesamtCount += 1;
    }
    return bestellung;
  });
}

export function setzeBestellungStatus(slug, id, status) {
  if (!BESTELLUNG_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}".`);
  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error('Bestellung nicht gefunden.');
    b.status = status;
    return b;
  });
}

export function bestaetigeBestellung(slug, id, abholzeit) {
  const zeit = String(abholzeit ?? '').trim();
  if (!zeit) throw new Error('Bitte eine Abholzeit bestätigen.');
  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error('Bestellung nicht gefunden.');
    b.bestaetigteAbholzeit = zeit;
    b.status = 'zubereitung';
    return b;
  });
}

/* ---------- No-Show-Schutz ---------- */

export function setzeNoShowSchutz(slug, { aktiv, gebuehrBetrag, stornofensterMinuten, warnSchwelle } = {}) {
  const betrag = Number(gebuehrBetrag);
  const fenster = Number(stornofensterMinuten);
  const schwelle = Number(warnSchwelle);
  if (!Number.isFinite(betrag) || betrag < 0) throw new Error('Die Ausfallpauschale muss ein Betrag ab 0 € sein.');
  if (!Number.isInteger(fenster) || fenster < 0 || fenster > 1440) throw new Error('Das Stornofenster muss zwischen 0 und 1440 Minuten liegen.');
  if (!Number.isInteger(schwelle) || schwelle < 1) throw new Error('Die Warn-Schwelle muss mindestens 1 sein.');
  return aendere(slug, (daten) => {
    daten.noShowSchutzAktiv = Boolean(aktiv);
    daten.noShowGebuehrBetrag = betrag;
    daten.noShowStornofensterMinuten = fenster;
    daten.noShowWarnSchwelle = schwelle;
    return { noShowSchutzAktiv: daten.noShowSchutzAktiv, noShowGebuehrBetrag: betrag, noShowStornofensterMinuten: fenster, noShowWarnSchwelle: schwelle };
  });
}

export function bestaetigeNoShow(slug, id, betrag, jetzt = new Date()) {
  const wert = Number(betrag);
  if (!Number.isFinite(wert) || wert < 0) throw new Error('Der Betrag muss eine Zahl ab 0 € sein.');
  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error('Bestellung nicht gefunden.');
    if (b.storniertAm) throw new Error('Diese Bestellung wurde vom Gast storniert – keine Ausfallpauschale möglich.');
    if (b.noShowBestaetigtAm) throw new Error('Für diese Bestellung wurde bereits eine Ausfallpauschale bestätigt.');
    if (!b.noShowZustimmung) throw new Error('Für diese Bestellung liegt keine Zustimmung zur Ausfallpauschale vor.');
    if (wert > Number(b.noShowGebuehrBetragVereinbart ?? 0)) {
      throw new Error(`Der Betrag darf höchstens ${Number(b.noShowGebuehrBetragVereinbart).toFixed(2)} € betragen.`);
    }
    b.noShowBestaetigtAm = jetzt.toISOString();
    b.noShowBetrag = wert;
    if (b.telefon) {
      daten.zuverlaessigkeit[b.telefon] ??= { gesamtCount: 0, noShowCount: 0 };
      daten.zuverlaessigkeit[b.telefon].noShowCount += 1;
    }
    return b;
  });
}

export function zuverlaessigkeitsWarnung(daten, telefon) {
  if (!telefon) return null;
  const eintrag = daten.zuverlaessigkeit[telefon];
  if (!eintrag || eintrag.noShowCount < daten.noShowWarnSchwelle) return null;
  return { noShowCount: eintrag.noShowCount, gesamtCount: eintrag.gesamtCount, schwelle: daten.noShowWarnSchwelle };
}

/* ---------- Einstellungen ---------- */

export function setzeWartezeit(slug, minuten) {
  const wert = Number(minuten);
  if (!Number.isInteger(wert) || wert < 0 || wert > 180) throw new Error('Die Zusatz-Wartezeit muss zwischen 0 und 180 Minuten liegen.');
  return aendere(slug, (daten) => { daten.zusaetzlicheWartezeitMinuten = wert; return wert; });
}

export function setzeOeffnungszeiten(slug, oeffnungszeiten) {
  return aendere(slug, (daten) => { daten.oeffnungszeiten = oeffnungszeiten && typeof oeffnungszeiten === 'object' ? oeffnungszeiten : {}; return daten.oeffnungszeiten; });
}

export function setzeTelegramChatId(slug, chatId) {
  const sauber = String(chatId ?? '').trim();
  if (sauber && !/^-?\d+$/.test(sauber)) throw new Error('Die Telegram-Chat-ID besteht nur aus Ziffern.');
  return aendere(slug, (daten) => { daten.telegramChatId = sauber; return sauber; });
}

/* ---------- Push-Subscriptions ---------- */

export function fuegePushSubscriptionHinzu(slug, subscription) {
  const endpoint = String(subscription?.endpoint ?? '').trim();
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Ungültige Push-Subscription.');
  return aendere(slug, (daten) => {
    daten.pushSubscriptions = daten.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    daten.pushSubscriptions.push({ endpoint, keys: { p256dh, auth } });
    return { endpoint };
  });
}

export function entfernePushSubscription(slug, endpoint) {
  return aendere(slug, (daten) => {
    daten.pushSubscriptions = daten.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    return true;
  });
}
