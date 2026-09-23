import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

process.env.DASHBOARD_TOKEN = 'test-prospect-dashboard-token-12345';
process.env.WIRT_SESSION_SECRET = 'test-secret-not-for-production-use-only';

const {
  createProspectApp,
  setProspectStoreFile,
  scoreProspect,
  analyzeWebsite,
  searchGooglePlaces,
} = await import('../dashboard/prospect-server.js');

test('searchGooglePlaces fails clearly when GOOGLE_PLACES_API_KEY is missing, before any network access', async () => {
  let called = false;
  await assert.rejects(
    () => searchGooglePlaces('Restaurants in Musterstadt', { key: '', request: () => { called = true; } }),
    /GOOGLE_PLACES_API_KEY/,
  );
  assert.equal(called, false);
});

test('searchGooglePlaces rejects a too-short query before any network access', async () => {
  let called = false;
  await assert.rejects(
    () => searchGooglePlaces('ab', { key: 'fake-key', request: () => { called = true; } }),
    /zu kurz/,
  );
  assert.equal(called, false);
});

test('searchGooglePlaces caps pageSize at 20 in the request body', async () => {
  let sentBody;
  await searchGooglePlaces('Restaurants in Musterstadt', {
    key: 'fake-key',
    request: async (url, options) => {
      sentBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ places: [] }) };
    },
  });
  assert.equal(sentBody.pageSize, 20);
});

test('searchGooglePlaces surfaces a clear message for HTTP 403 and 429', async () => {
  await assert.rejects(
    () => searchGooglePlaces('Restaurants in X', { key: 'k', request: async () => ({ ok: false, status: 403 }) }),
    /403/,
  );
  await assert.rejects(
    () => searchGooglePlaces('Restaurants in X', { key: 'k', request: async () => ({ ok: false, status: 429 }) }),
    /429|Quota|Kontingent/,
  );
});

test('searchGooglePlaces surfaces a network/timeout error without crashing', async () => {
  await assert.rejects(
    () => searchGooglePlaces('Restaurants in X', { key: 'k', request: async () => { throw new Error('timeout'); } }),
    /Netzwerk|Timeout|timeout/,
  );
});

test('searchGooglePlaces deduplicates by place id and never returns more than the requested page size', async () => {
  const places = Array.from({ length: 3 }, (_, i) => ({ id: 'p1', displayName: { text: `Dup ${i}` } }));
  const result = await searchGooglePlaces('Restaurants in X', {
    key: 'k',
    request: async () => ({ ok: true, json: async () => ({ places }) }),
  });
  assert.equal(result.length, 1);
});

test('scoreProspect: no website is scored 100 with the highest priority', () => {
  const result = scoreProspect({ website: '' });
  assert.equal(result.score, 100);
  assert.equal(result.priority, 'Sehr hoch – keine Website');
  assert.deepEqual(result.reasons, ['Keine Website hinterlegt']);
});

test('scoreProspect: an unreachable or unanalyzed website is "Zu prüfen", never guessed high or low', () => {
  const unanalyzed = scoreProspect({ website: 'https://example.org', analysis: null });
  assert.equal(unanalyzed.score, null);
  assert.equal(unanalyzed.priority, 'Zu prüfen');

  const unreachable = scoreProspect({ website: 'https://example.org', analysis: { reachable: false } });
  assert.equal(unreachable.score, null);
  assert.equal(unreachable.priority, 'Zu prüfen');
  assert.deepEqual(unreachable.reasons, ['Website nicht erreichbar oder Analyse fehlgeschlagen']);
});

test('scoreProspect: every individual weight is applied exactly as specified', () => {
  const fullyGood = { website: 'https://x.org', analysis: { reachable: true, order: true, reserve: true, mobile: true, outdated: false, https: true } };
  assert.equal(scoreProspect(fullyGood).score, 0);

  const noOrder = scoreProspect({ website: 'https://x.org', analysis: { ...fullyGood.analysis, order: false } });
  assert.equal(noOrder.score, 25);

  const noReserve = scoreProspect({ website: 'https://x.org', analysis: { ...fullyGood.analysis, reserve: false } });
  assert.equal(noReserve.score, 20);

  const noMobile = scoreProspect({ website: 'https://x.org', analysis: { ...fullyGood.analysis, mobile: false } });
  assert.equal(noMobile.score, 25);

  const outdated = scoreProspect({ website: 'https://x.org', analysis: { ...fullyGood.analysis, outdated: true } });
  assert.equal(outdated.score, 20);

  const noHttps = scoreProspect({ website: 'https://x.org', analysis: { ...fullyGood.analysis, https: false } });
  assert.equal(noHttps.score, 10);

  const worst = { website: 'https://x.org', analysis: { reachable: true, order: false, reserve: false, mobile: false, outdated: true, https: false } };
  assert.equal(scoreProspect(worst).score, 100);
  assert.equal(scoreProspect(worst).priority, 'Sehr hoch');
});

test('analyzeWebsite detects order/reserve/mobile/https/outdated signals from fetched HTML', async () => {
  const html = '<html><head><meta name="viewport" content="width=device-width"></head><body>Jetzt bestellen! Tisch reservieren. &copy; 2015</body></html>';
  const result = await analyzeWebsite('https://example.org', {
    request: async () => ({ ok: true, url: 'https://example.org', text: async () => html }),
  });
  assert.equal(result.reachable, true);
  assert.equal(result.https, true);
  assert.equal(result.mobile, true);
  assert.equal(result.order, true);
  assert.equal(result.reserve, true);
  assert.equal(result.outdated, true);
});

test('analyzeWebsite reports unreachable on network failure or non-OK response, never throws', async () => {
  const timedOut = await analyzeWebsite('https://example.org', { request: async () => { throw new Error('timeout'); } });
  assert.deepEqual(timedOut, { reachable: false });

  const notFound = await analyzeWebsite('https://example.org', { request: async () => ({ ok: false }) });
  assert.deepEqual(notFound, { reachable: false });
});

test('analyzeWebsite returns null for a prospect with no website, without making a request', async () => {
  let called = false;
  const result = await analyzeWebsite('', { request: () => { called = true; } });
  assert.equal(result, null);
  assert.equal(called, false);
});

// --- HTTP-level tests against the real Express app ---

test('prospect HTTP API', async (t) => {
  const storeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-prospects-'));
  const storeFile = path.join(storeDir, 'prospects.json');
  setProspectStoreFile(storeFile);

  const app = createProspectApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` };

  t.after(async () => {
    server.close();
    await rm(storeDir, { recursive: true, force: true });
  });

  await t.test('GET /prospects serves the prospect.html page', async () => {
    const res = await fetch(`${base}/prospects`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /Prospect-Workflow/);
    assert.match(body, /prospect\.js/);
  });

  await t.test('GET /prospect.js serves the dedicated frontend script', async () => {
    const res = await fetch(`${base}/prospect.js`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /addEventListener/);
    assert.doesNotMatch(body, /onclick=/);
  });

  await t.test('prospect API routes require the Bearer token', async () => {
    const list = await fetch(`${base}/api/prospects`);
    assert.equal(list.status, 401);
    const search = await fetch(`${base}/api/prospects/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(search.status, 401);
  });

  await t.test('importing a prospect twice with the same placeId is rejected with 409', async () => {
    const prospect = { placeId: 'place-1', name: 'Testhaus', adresse: 'Musterweg 1, 12345 Musterstadt', website: '' };
    const first = await fetch(`${base}/api/prospects`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ prospect }) });
    assert.equal(first.status, 201);
    const second = await fetch(`${base}/api/prospects`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ prospect }) });
    assert.equal(second.status, 409);

    const list = await fetch(`${base}/api/prospects`, { headers: authHeaders });
    const prospects = await list.json();
    assert.equal(prospects.length, 1);
    assert.equal(prospects[0].scoring.priority, 'Sehr hoch – keine Website');
  });

  await t.test('the local demo preview carries the mandatory concept-draft notice and no Google/business facts', async () => {
    const withFacts = {
      placeId: 'place-with-facts', name: 'Faktenhaus', adresse: 'Marktplatz 2, 54321 Beispielort',
      website: '', telefon: '0800 9999999', rating: 4.7, bewertungen: 312,
    };
    await fetch(`${base}/api/prospects`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ prospect: withFacts }) });

    const res = await fetch(`${base}/prospect-preview/place-with-facts`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /UNVERBINDLICHER KONZEPTENTWURF/);
    assert.match(html, /NICHT DIE OFFIZIELLE WEBSITE/);
    // Only name and the region (derived from the address) are ever
    // interpolated into the demo; the raw Google facts themselves — phone,
    // rating, review count — must never appear on the page.
    assert.doesNotMatch(html, /0800 9999999/);
    assert.doesNotMatch(html, /4\.7/);
    assert.doesNotMatch(html, /312/);
  });

  await t.test('demo preview 404s for an unknown place id', async () => {
    const res = await fetch(`${base}/prospect-preview/does-not-exist`);
    assert.equal(res.status, 404);
  });
});
