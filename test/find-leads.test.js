import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

process.env.DASHBOARD_TOKEN = 'test-find-leads-dashboard-token-12345';
process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const { findLeads } = await import('../scripts/find-leads.js');

function fakePlacesResponse(places) {
  return { ok: true, text: async () => JSON.stringify({ places }) };
}

async function withTempDirs(fn) {
  const storeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-find-leads-store-'));
  const previewsDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-find-leads-previews-'));
  try {
    await fn({ storeFile: path.join(storeDir, 'prospects.json'), previewsDir });
  } finally {
    await rm(storeDir, { recursive: true, force: true });
    await rm(previewsDir, { recursive: true, force: true });
  }
}

test('findLeads requires at least one query', async () => {
  await assert.rejects(() => findLeads([]), /Mindestens eine Region/);
});

test('findLeads merges and dedupes hits across regions, scores them, writes demo previews and persists the store', async () => {
  await withTempDirs(async ({ storeFile, previewsDir }) => {
    const request = async (url) => {
      if (url === 'https://places.googleapis.com/v1/places:searchText') {
        return fakePlacesResponse([
          { id: 'no-website', displayName: { text: 'Ohne Website' }, formattedAddress: 'Hauptstr. 1, 12345 Musterstadt' },
          { id: 'shared', displayName: { text: 'Geteilt' }, formattedAddress: 'Nebenweg 2, 12345 Musterstadt', websiteUri: 'https://reachable.example' },
        ]);
      }
      if (url === 'https://reachable.example') {
        return { ok: true, url, text: async () => '<html><head><meta name="viewport" content="width=device-width"></head></html>' };
      }
      throw new Error(`unexpected request: ${url}`);
    };

    const results = await findLeads(['Restaurants in Musterstadt', 'Restaurants in Musterstadt Umgebung'], {
      key: 'fake-key',
      request,
      storeFile,
      previewsDir,
    });

    // Same two places turn up under both region queries; dedup keeps one each.
    assert.equal(results.length, 2);

    // No-website prospect scores highest and sorts first.
    assert.equal(results[0].placeId, 'no-website');
    assert.equal(results[0].scoring.score, 100);
    assert.equal(results[1].placeId, 'shared');
    assert.ok(results[1].scoring.score > 0);

    for (const prospect of results) {
      const html = await readFile(prospect.previewPath, 'utf-8');
      assert.match(html, /Konzeptentwurf/);
      assert.match(html, new RegExp(prospect.name));
    }

    const previewFiles = await readdir(previewsDir);
    assert.equal(previewFiles.length, 2);

    const stored = JSON.parse(await readFile(storeFile, 'utf-8'));
    assert.equal(stored.length, 2);
    assert.ok(stored.every((p) => p.importedAt && p.analyzedAt));
    assert.ok(!stored.some((p) => 'scoring' in p || 'previewPath' in p));
  });
});

test('findLeads keeps a previously imported prospect\'s importedAt but refreshes its analysis', async () => {
  await withTempDirs(async ({ storeFile, previewsDir }) => {
    const searchOnly = async () => fakePlacesResponse([
      { id: 'known', displayName: { text: 'Bekanntes Haus' }, formattedAddress: 'Altweg 3, 12345 Musterstadt' },
    ]);

    const first = await findLeads(['Restaurants in Musterstadt'], { key: 'fake-key', request: searchOnly, storeFile, previewsDir });
    const firstImportedAt = first[0].importedAt;

    const second = await findLeads(['Restaurants in Musterstadt'], { key: 'fake-key', request: searchOnly, storeFile, previewsDir });
    assert.equal(second[0].importedAt, firstImportedAt);
    assert.notEqual(second[0].analyzedAt, first[0].analyzedAt);

    const stored = JSON.parse(await readFile(storeFile, 'utf-8'));
    assert.equal(stored.length, 1);
  });
});
