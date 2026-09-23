import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const { setRuntimeDir, ladeBetrieb, speichereBetrieb } = await import('../src/wirt/store.js');
const { setCredentialsPath, setzeBetriebPasswort } = await import('../src/wirt/auth.js');
const { createWirtApp } = await import('../src/wirt/server.js');

const runtimeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-wirt-'));
setRuntimeDir(runtimeDir);
setCredentialsPath(path.join(runtimeDir, 'credentials.json'));

setzeBetriebPasswort('trattoria-a', 'sicheres-passwort-a1');
setzeBetriebPasswort('trattoria-b', 'sicheres-passwort-b1');
speichereBetrieb('trattoria-a', { ...ladeBetrieb('trattoria-a'), tische: [{ id: 't1', name: 'Tisch 1', plaetze: 4 }] });
speichereBetrieb('trattoria-b', { ...ladeBetrieb('trattoria-b'), tische: [{ id: 't2', name: 'Tisch 2', plaetze: 4 }] });

const app = createWirtApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

test.after(async () => {
  server.close();
  await rm(runtimeDir, { recursive: true, force: true });
});

async function login(slug, passwort) {
  const res = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, passwort }) });
  const setCookie = res.headers.get('set-cookie');
  // undici exposes multiple Set-Cookie headers via getSetCookie()
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [setCookie];
  const session = cookies.map((c) => c.match(/wirt_session=([^;]+)/)?.[1]).find(Boolean);
  const csrf = cookies.map((c) => c.match(/wirt_csrf=([^;]+)/)?.[1]).find(Boolean);
  return { ok: res.ok, session, csrf };
}

test('public config endpoint reports no-show config for an existing betrieb and 404s for an unknown one', async () => {
  const res = await fetch(`${base}/betrieb/trattoria-a/konfiguration`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.noShowSchutzAktiv, false);

  const missing = await fetch(`${base}/betrieb/does-not-exist/konfiguration`);
  assert.equal(missing.status, 404);
});

test('a guest can create a reservation without authentication, and it lands in the right betrieb only', async () => {
  const res = await fetch(`${base}/betrieb/trattoria-a/reservierung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Frau Meier', datum: '2026-10-01', uhrzeit: '19:00', personen: 2 }),
  });
  assert.equal(res.status, 201);
  const daten = ladeBetrieb('trattoria-a');
  assert.equal(daten.reservierungen.length, 1);
  const other = ladeBetrieb('trattoria-b');
  assert.equal(other.reservierungen.length, 0);
});

test('authenticated routes reject requests without a session', async () => {
  const res = await fetch(`${base}/api/reservierungen`);
  assert.equal(res.status, 401);
});

test('login succeeds with correct credentials and fails with wrong ones', async () => {
  const good = await login('trattoria-a', 'sicheres-passwort-a1');
  assert.equal(good.ok, true);
  assert.ok(good.session);
  const bad = await login('trattoria-a', 'falsches-passwort');
  assert.equal(bad.ok, false);
});

test('a logged-in betrieb can only see its own reservations, never another betrieb\'s (tenant isolation)', async () => {
  const a = await login('trattoria-a', 'sicheres-passwort-a1');
  const res = await fetch(`${base}/api/reservierungen`, { headers: { cookie: `wirt_session=${a.session}` } });
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Frau Meier');

  const b = await login('trattoria-b', 'sicheres-passwort-b1');
  const resB = await fetch(`${base}/api/reservierungen`, { headers: { cookie: `wirt_session=${b.session}` } });
  const listB = await resB.json();
  assert.equal(listB.length, 0);
});

test('state-changing authenticated requests are rejected without a matching CSRF token', async () => {
  const a = await login('trattoria-a', 'sicheres-passwort-a1');
  const daten = ladeBetrieb('trattoria-a');
  const id = daten.reservierungen[0].id;
  const res = await fetch(`${base}/api/reservierungen/${id}/status`, {
    method: 'POST',
    headers: { cookie: `wirt_session=${a.session}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'bestaetigt' }),
  });
  assert.equal(res.status, 403);
});

test('state-changing authenticated requests succeed with a matching CSRF token and stay tenant-scoped', async () => {
  const a = await login('trattoria-a', 'sicheres-passwort-a1');
  const daten = ladeBetrieb('trattoria-a');
  const id = daten.reservierungen[0].id;
  const res = await fetch(`${base}/api/reservierungen/${id}/status`, {
    method: 'POST',
    headers: { cookie: `wirt_session=${a.session}; wirt_csrf=${a.csrf}`, 'Content-Type': 'application/json', 'X-CSRF-Token': a.csrf },
    body: JSON.stringify({ status: 'bestaetigt' }),
  });
  assert.equal(res.status, 200);
  const updated = await res.json();
  assert.equal(updated.status, 'bestaetigt');
});

test('an order with no-show protection active requires explicit consent, and rejects submission without it', async () => {
  const a = await login('trattoria-a', 'sicheres-passwort-a1');
  await fetch(`${base}/api/einstellungen/no-show`, {
    method: 'POST',
    headers: { cookie: `wirt_session=${a.session}; wirt_csrf=${a.csrf}`, 'Content-Type': 'application/json', 'X-CSRF-Token': a.csrf },
    body: JSON.stringify({ aktiv: true, gebuehrBetrag: 10, stornofensterMinuten: 30, warnSchwelle: 2 }),
  });

  const withoutConsent = await fetch(`${base}/betrieb/trattoria-a/bestellung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Herr Klein', abholzeit: '18:30', positionen: [{ name: 'Pizza', menge: 1, preis: 9 }] }),
  });
  assert.equal(withoutConsent.status, 400);

  const withConsent = await fetch(`${base}/betrieb/trattoria-a/bestellung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Herr Klein', abholzeit: '18:30', positionen: [{ name: 'Pizza', menge: 1, preis: 9 }], noShowZustimmung: true }),
  });
  assert.equal(withConsent.status, 201);
  const bestellung = await withConsent.json();
  assert.ok(bestellung.noShowZustimmung.text.includes('Ausfallpauschale'));
});
