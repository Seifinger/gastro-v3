import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

process.env.DASHBOARD_TOKEN = 'test-dashboard-token-1234567890';
process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dataDir = path.join(rootDir, 'data');
const backupDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-data-backup-'));

// The dashboard server module reads from the real data/ directory (its
// paths aren't parameterized like buildAll's), so this test writes into
// data/ directly and always restores it afterwards.
const { cp } = await import('node:fs/promises');
await cp(dataDir, backupDir, { recursive: true });

const { createDashboardApp } = await import('../dashboard/server.js');

const app = createDashboardApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

test.after(async () => {
  server.close();
  await rm(dataDir, { recursive: true, force: true });
  await cp(backupDir, dataDir, { recursive: true });
  await rm(backupDir, { recursive: true, force: true });
});

test('creating a lead without a Bearer token is rejected', async () => {
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'no-token-lead', name: 'X', kueche: 'international', ort: 'Y', hauptaktion: 'informieren' }),
  });
  assert.equal(res.status, 401);
});

test('creating a lead with the correct Bearer token succeeds and it appears in the list', async () => {
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    body: JSON.stringify({ id: 'dashboard-test-lead', name: 'Dashboard Test', kueche: 'international', ort: 'Testort', hauptaktion: 'informieren' }),
  });
  assert.equal(res.status, 201);
  const list = await (await fetch(`${base}/api/leads`)).json();
  assert.ok(list.some((l) => l.id === 'dashboard-test-lead'));
});

test('an invalid briefing is rejected on create, with structured errors, and not written to disk', async () => {
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    body: JSON.stringify({ id: 'Invalid ID', name: '', kueche: 'nicht-real' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(Array.isArray(body.errors));
});

test('the settings endpoint reports booleans only and never the actual token/secret values', async () => {
  const res = await fetch(`${base}/api/einstellungen`);
  const body = await res.json();
  assert.equal(body.dashboardTokenConfigured, true);
  const text = JSON.stringify(body);
  assert.doesNotMatch(text, new RegExp(process.env.DASHBOARD_TOKEN));
  assert.doesNotMatch(text, new RegExp(process.env.WIRT_SESSION_SECRET));
});

test('a lead detail view composes a preview for a valid briefing', async () => {
  const res = await fetch(`${base}/api/leads/dashboard-test-lead`);
  const body = await res.json();
  assert.equal(body.valid, true);
  assert.ok(body.composedPreview);
  assert.ok(body.composedPreview.archetype);
});

test('editing a lead requires the token and persists changes', async () => {
  const unauth = await fetch(`${base}/api/leads/dashboard-test-lead`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'dashboard-test-lead', name: 'Hacked', kueche: 'international', ort: 'Testort', hauptaktion: 'informieren' }),
  });
  assert.equal(unauth.status, 401);

  const authed = await fetch(`${base}/api/leads/dashboard-test-lead`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    body: JSON.stringify({ id: 'dashboard-test-lead', name: 'Dashboard Test Aktualisiert', kueche: 'international', ort: 'Testort', hauptaktion: 'informieren' }),
  });
  assert.equal(authed.status, 200);
  const updated = await (await fetch(`${base}/api/leads/dashboard-test-lead`)).json();
  assert.equal(updated.input.name, 'Dashboard Test Aktualisiert');
});
