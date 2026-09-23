import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { migrate } from '../scripts/migrate-from-v1.js';
import { validateBriefing } from '../src/briefing/validator.js';

function fixtureBriefing(overrides = {}) {
  return {
    version: 1,
    slug: 'pilot-fixture-haus',
    kueche: 'italienisch',
    felder: {
      betrieb: {
        name: { wert: 'Fixture Haus', status: 'bestaetigt' },
        ort: { wert: 'Musterstadt', status: 'bestaetigt' },
        kueche: { wert: 'Italienisch', status: 'bestaetigt' },
        telefon: { wert: '0800 123456', status: 'bestaetigt' },
        adresse: { wert: 'Musterweg 1', status: 'bestaetigt' },
        oeffnungszeiten: { wert: [{ tage: 'Mo-Fr', zeiten: '11-22' }], status: 'bestaetigt' },
      },
      konzept: { kurz: { wert: 'Ein Testkonzept.', status: 'bestaetigt' }, usp: { wert: null, status: 'unbekannt' } },
      gaeste: { zielgruppen: { wert: ['Familien', 'Touristen'], status: 'bestaetigt' } },
      positionierung: { preis: { wert: 'mittel', status: 'vorschlag' }, atmosphaere: { wert: null, status: 'unbekannt' } },
      karte: {
        signaturgerichte: { wert: ['Pizza Margherita'], status: 'bestaetigt' },
        speisekarte: { wert: { katalog: 'italienisch' }, status: 'bestaetigt' },
      },
      aktion: { haupt: { wert: 'reservieren', status: 'bestaetigt' } },
      marke: { farben: { wert: null, status: 'unbekannt' }, schriften: { wert: null, status: 'unbekannt' }, logo: { wert: null, status: 'unbekannt' } },
      stil: { noGos: { wert: ['Kitsch'], status: 'bestaetigt' }, referenzen: { wert: ['https://example.org/referenz'], status: 'bestaetigt' } },
      belege: { stimmen: { wert: null, status: 'unbekannt' }, googleBewertung: { wert: { note: 4.5, anzahl: 10 }, status: 'bestaetigt' } },
      medien: { fotos: { wert: [{ stock: 'photo-abc', herkunft: 'stock', motiv: 'Außenansicht', rolle: 'hero' }], status: 'vorschlag' } },
      freigabe: { veroeffentlichung: { wert: null, status: 'unbekannt' } },
    },
    ...overrides,
  };
}

test('migrate() fails clearly when V1_REPO_PATH is not provided', async () => {
  await assert.rejects(() => migrate({}), /V1_REPO_PATH/);
});

test('migrate() fails clearly when the v1 repo path has no v2/briefings directory (no fabricated success)', async () => {
  const emptyRepo = await mkdtemp(path.join(tmpdir(), 'gastro-v3-v1-empty-'));
  try {
    await assert.rejects(() => migrate({ v1RepoPath: emptyRepo }), /v2[\\/]briefings/);
  } finally {
    await rm(emptyRepo, { recursive: true, force: true });
  }
});

test('migrate() reads v1 briefings read-only and writes v3-shaped output to data/migrated with everything optional as draft', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'gastro-v3-v1-repo-'));
  const briefingsDir = path.join(repo, 'v2', 'briefings');
  await mkdir(briefingsDir, { recursive: true });
  await writeFile(path.join(briefingsDir, 'pilot-fixture-haus.json'), JSON.stringify(fixtureBriefing()));

  try {
    const { report, reportPath } = await migrate({ v1RepoPath: repo });
    assert.equal(report.length, 1);
    const entry = report[0];
    assert.equal(entry.valid, true, JSON.stringify(entry.schemaErrors));

    const outPath = path.join(path.dirname(new URL('../package.json', import.meta.url).pathname), entry.out);
    const migrated = JSON.parse(await readFile(outPath, 'utf-8'));

    assert.equal(migrated.id, 'fixture-haus');
    assert.equal(migrated.name, 'Fixture Haus');
    assert.equal(migrated.kueche, 'italienisch');
    assert.equal(migrated.hauptaktion, 'reservieren');

    // Every optional field must be draft, even though the v1 source said
    // "bestaetigt" for several of them — migration never self-grants
    // "confirmed", a human has to.
    for (const key of ['konzept', 'usp', 'zielgaeste', 'preisklasse', 'signaturgericht', 'ambienteCharakter', 'fotos', 'wunschschrift', 'goNos', 'oeffnungszeiten', 'telefon', 'adresse']) {
      assert.equal(migrated[key].status, 'draft', `${key} should be draft`);
    }
    assert.equal(migrated.freigabe.status, 'draft');
    assert.equal(migrated.freigabe.value, false);

    // The v1 "katalog" reference must never become fabricated dish data.
    assert.equal(migrated.speisekarte.value, null);
    assert.ok(entry.manualReview.some((n) => /Katalog-Verweis/.test(n)));

    // Migrated stock photos are never pre-confirmed.
    assert.equal(migrated.fotos.value[0].confirmed, false);

    const { valid } = validateBriefing(migrated);
    assert.equal(valid, true);

    const reportMd = await readFile(path.join(path.dirname(outPath), 'MIGRATION_REPORT.md'), 'utf-8');
    assert.match(reportMd, /Manuell zu prüfen/);
  } finally {
    await rm(repo, { recursive: true, force: true });
    await rm(path.join(path.dirname(new URL('../package.json', import.meta.url).pathname), 'data', 'migrated'), { recursive: true, force: true });
  }
});

test('migrate() never writes into the v1 source repository (read-only)', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'gastro-v3-v1-repo-readonly-'));
  const briefingsDir = path.join(repo, 'v2', 'briefings');
  await mkdir(briefingsDir, { recursive: true });
  await writeFile(path.join(briefingsDir, 'pilot-fixture-haus.json'), JSON.stringify(fixtureBriefing()));
  const before = await readFile(path.join(briefingsDir, 'pilot-fixture-haus.json'), 'utf-8');

  try {
    await migrate({ v1RepoPath: repo });
    const after = await readFile(path.join(briefingsDir, 'pilot-fixture-haus.json'), 'utf-8');
    assert.equal(before, after);
    const { readdir } = await import('node:fs/promises');
    const repoContents = await readdir(repo, { recursive: true });
    assert.ok(!repoContents.some((f) => f.includes('migrated')));
  } finally {
    await rm(repo, { recursive: true, force: true });
    await rm(path.join(path.dirname(new URL('../package.json', import.meta.url).pathname), 'data', 'migrated'), { recursive: true, force: true });
  }
});
