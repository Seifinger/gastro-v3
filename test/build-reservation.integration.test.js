import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { buildAll } from '../scripts/build.js';

process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const { setRuntimeDir } = await import('../src/wirt/store.js');
const { createWirtApp } = await import('../src/wirt/server.js');

// End-to-end: a briefing is built into a static site whose reservation-form
// points at a real wirt-portal origin, and that exact route actually
// accepts a reservation and stores it for the right betrieb.
test('a built site\'s reservation-form endpoint matches a running wirt-portal, and posting to it creates a real reservation', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-data-'));
  const docsDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-docs-'));
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-wirt-runtime-'));
  setRuntimeDir(runtimeDir);

  const wirtApp = createWirtApp();
  const server = http.createServer(wirtApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const apiBase = `http://127.0.0.1:${port}`;

  try {
    await writeFile(path.join(dataDir, 'e2e-lokal.json'), JSON.stringify({
      id: 'e2e-lokal', name: 'E2E Lokal', kueche: 'international', ort: 'Testhausen', hauptaktion: 'reservieren',
      konzept: { status: 'confirmed', value: 'Ein Testbetrieb für den Integrationstest.' },
      fotos: { status: 'confirmed', value: [
        { url: 'https://example.org/1.jpg', caption: 'Hero', confirmed: true },
        { url: 'https://example.org/2.jpg', caption: 'Raum', confirmed: true },
        { url: 'https://example.org/3.jpg', caption: 'Team', confirmed: true },
      ] },
      speisekarte: { status: 'confirmed', value: [
        { name: 'Suppe', description: 'Tagessuppe', price: '5,00 €' },
        { name: 'Hauptgang', description: 'Wechselnd', price: '12,00 €' },
        { name: 'Dessert', description: 'Hausgemacht', price: '4,50 €' },
      ] },
      testimonials: { status: 'confirmed', value: [
        { text: 'Sehr freundlich.', name: 'Google' },
        { text: 'Gerne wieder.', name: 'TripAdvisor' },
      ] },
    }, null, 2));

    const results = await buildAll({ dataDir, docsDir, apiBase });
    const result = results.find((r) => r.slug === 'e2e-lokal');
    assert.ok(result?.ok, JSON.stringify(results));

    const { readFile } = await import('node:fs/promises');
    const html = await readFile(path.join(docsDir, 'e2e-lokal', 'index.html'), 'utf-8');
    const match = html.match(/data-endpoint="([^"]+)"/);
    assert.ok(match, 'reservation-form should render a data-endpoint attribute');
    const endpoint = match[1].replace(/&#39;|&amp;/g, (s) => (s === '&amp;' ? '&' : "'"));
    assert.equal(endpoint, `${apiBase}/betrieb/e2e-lokal/reservierung`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Herr Tester', datum: '2026-11-01', uhrzeit: '19:30', personen: 3 }),
    });
    assert.equal(res.status, 201);

    const { ladeBetrieb } = await import('../src/wirt/store.js');
    const daten = ladeBetrieb('e2e-lokal');
    assert.equal(daten.reservierungen.length, 1);
    assert.equal(daten.reservierungen[0].name, 'Herr Tester');
  } finally {
    server.close();
    await rm(dataDir, { recursive: true, force: true });
    await rm(docsDir, { recursive: true, force: true });
    await rm(runtimeDir, { recursive: true, force: true });
  }
});
