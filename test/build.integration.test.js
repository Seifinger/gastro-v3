import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildAll } from '../scripts/build.js';

test('buildAll writes docs/<slug>/index.html for a valid, judge-passing briefing and skips an invalid one', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-data-'));
  const docsDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-docs-'));
  try {
    await writeFile(path.join(dataDir, 'gute-stube.json'), JSON.stringify({
      id: 'gute-stube', name: 'Gute Stube', kueche: 'deutsch', ort: 'Erfurt', hauptaktion: 'reservieren',
      konzept: { status: 'confirmed', value: 'Deutsche Hausmannskost, jeden Tag frisch.' },
      fotos: { status: 'confirmed', value: [
        { url: 'https://example.org/1.jpg', caption: 'Hero', confirmed: true },
        { url: 'https://example.org/2.jpg', caption: 'Raum', confirmed: true },
        { url: 'https://example.org/3.jpg', caption: 'Team', confirmed: true },
      ] },
      speisekarte: { status: 'confirmed', value: [
        { name: 'Rouladen', description: 'mit Rotkohl', price: '15,00 €' },
        { name: 'Sauerbraten', description: 'mit Klößen', price: '16,50 €' },
        { name: 'Apfelstrudel', description: 'mit Vanillesauce', price: '6,00 €' },
      ] },
      testimonials: { status: 'confirmed', value: [{ text: 'Wie bei Oma.', name: 'Google' }, { text: 'Sehr lecker.', name: 'TripAdvisor' }] },
    }, null, 2));
    await writeFile(path.join(dataDir, 'kaputt.json'), JSON.stringify({ id: 'Kaputt ID', name: '', kueche: 'nicht-existent' }));

    const results = await buildAll({ dataDir, docsDir });
    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    assert.equal(ok.length, 1);
    assert.equal(ok[0].slug, 'gute-stube');
    assert.equal(failed.length, 1);
    assert.equal(failed[0].stage, 'validate');

    const html = await readFile(path.join(docsDir, 'gute-stube', 'index.html'), 'utf-8');
    assert.match(html, /Gute Stube/);
    assert.match(html, /<!doctype html>/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(docsDir, { recursive: true, force: true });
  }
});

test('buildAll never writes output for a briefing that fails validation', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-data-'));
  const docsDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-docs-'));
  try {
    await writeFile(path.join(dataDir, 'leer.json'), JSON.stringify({}));
    const results = await buildAll({ dataDir, docsDir });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(docsDir, { recursive: true, force: true });
  }
});
