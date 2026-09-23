import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

process.env.DASHBOARD_TOKEN = 'test-prospect-demo-video-token-12345';
process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

// General "no fabricated facts", 404, marker-text and RESTful-route coverage
// already lives in test/prospect.test.js. This file only covers what's
// specific to the cinematic dark video-hero art direction layered onto
// renderDemoPreview(): the demo video itself, its accessible/self-recovering
// markup, and the shared judge-style visual constraints (no multi-hue
// gradient, no generic icon-font markup).
const { createProspectApp, setProspectStoreFile } = await import('../dashboard/prospect-server.js');
const { PROSPECT_DEMO_VIDEO_URL } = await import('../src/blueprints/_shared/util.js');

const storeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-prospect-demo-video-'));
const storeFile = path.join(storeDir, 'prospects.json');
setProspectStoreFile(storeFile);

const app = createProspectApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` };

const prospect = { placeId: 'place-video-demo-1', name: 'Trattoria Prova', adresse: 'Musterstraße 1, 12345 Testhausen', website: '' };
await fetch(`${base}/api/prospects`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ prospect }) });

test.after(async () => {
  server.close();
  await rm(storeDir, { recursive: true, force: true });
});

test('the local prospect-concept-demo hero uses the demo video only together with the unambiguous concept-draft marker', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(PROSPECT_DEMO_VIDEO_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /UNVERBINDLICHER KONZEPTENTWURF/);
  assert.match(html, /NICHT DIE OFFIZIELLE WEBSITE/);
});

test('the prospect-demo hero renders semantic, self-recovering video markup (autoplay/muted/loop/playsinline + poster fallback + error handling)', async () => {
  const res = await fetch(`${base}/prospect-preview/${prospect.placeId}`);
  const html = await res.text();
  assert.match(html, /<video[^>]*\bautoplay\b[^>]*\bmuted\b[^>]*\bloop\b[^>]*\bplaysinline\b[^>]*>/);
  assert.match(html, /class="gv-poster"/);
  assert.match(html, /addEventListener\('error'/);
  assert.match(html, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
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
