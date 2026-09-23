import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

process.env.DASHBOARD_TOKEN = 'test-dashboard-token-1234567890';
process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const storePath = path.join(rootDir, 'data', 'runtime', 'prospects.json');
const existingStore = await readFile(storePath, 'utf-8').catch(() => null);

const prospect = {
  placeId: 'place-test-1',
  name: 'Trattoria Prova',
  adresse: 'Musterstraße 1, 12345 Testhausen',
  telefon: '',
  website: '',
  rating: null,
  bewertungen: null,
  importedAt: new Date().toISOString(),
  analysis: null,
};

await mkdir(path.dirname(storePath), { recursive: true });
await writeFile(storePath, JSON.stringify([prospect], null, 2));

const { createProspectApp } = await import('../dashboard/prospect-server.js');
const { PROSPECT_DEMO_VIDEO_URL } = await import('../src/blueprints/_shared/util.js');

const app = createProspectApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

test.after(async () => {
  server.close();
  if (existingStore === null) {
    await rm(storePath, { force: true });
  } else {
    await writeFile(storePath, existingStore);
  }
});

test('the local prospect-concept-demo hero uses the demo video only together with the unambiguous concept-draft marker', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(PROSPECT_DEMO_VIDEO_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /UNVERBINDLICHER KONZEPTENTWURF – NICHT DIE OFFIZIELLE WEBSITE/);
});

test('the prospect-demo hero renders semantic, self-recovering video markup (autoplay/muted/loop/playsinline + poster fallback + error handling)', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  const html = await res.text();
  assert.match(html, /<video[^>]*\bautoplay\b[^>]*\bmuted\b[^>]*\bloop\b[^>]*\bplaysinline\b[^>]*>/);
  assert.match(html, /class="gv-poster"/);
  assert.match(html, /addEventListener\('error'/);
  assert.match(html, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
});

test('the prospect-demo hero never fabricates confirmed-looking facts about the prospect (no invented USP/menu/reviews)', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  const html = await res.text();
  assert.doesNotMatch(html, /Kulinarische Reise/);
  assert.doesNotMatch(html, new RegExp(`Willkommen bei ${prospect.name}`));
  assert.match(html, /Diese lokale Demo verwendet keine übernommenen Fotos, Rezensionen, Preise oder Betriebsbehauptungen\./);
});

test('the prospect-demo hero has no multi-hue decorative gradient and no generic icon-font markup', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  const html = await res.text();
  assert.doesNotMatch(html, /\b(fa-|fas |far |fab |material-icons|bi-icon|glyphicon)/);
  const gradients = html.match(/linear-gradient\([^)]*\)/g) || [];
  assert.ok(gradients.length > 0);
  for (const gradient of gradients) {
    const colors = gradient.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/g) || [];
    for (const color of colors) {
      assert.match(color.replace(/\s+/g, ''), /^rgba?\(0,0,0|^#(1b1a17|332d26)/i, `expected only neutral/near-black stops, found ${color}`);
    }
  }
});
