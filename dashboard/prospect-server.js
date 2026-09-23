// Prospect workflow: Google Places search -> import -> heuristic website
// scoring -> optional local concept-demo preview. This file only wires
// Express routes to data access, the Google Places call, website analysis
// and scoring — the interactive UI itself lives in
// dashboard/public/prospect.{html,js} (plain DOM code, no inline handlers,
// no template-string JavaScript) per DECISIONS.md.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createDashboardApp } from './server.js';
import { requireDashboardToken } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
let storeFile = path.join(root, 'data', 'runtime', 'prospects.json');

// Test-only seam (mirrors src/wirt/store.js's setRuntimeDir): lets tests
// point the prospect store at a throwaway file instead of the real
// data/runtime/prospects.json.
export function setProspectStoreFile(file) {
  storeFile = file;
}

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount';
const MAX_RESULTS = 20;
const ANALYSIS_TIMEOUT_MS = 8000;
const ANALYSIS_CONCURRENCY = 5;
const OUTDATED_YEARS = 3;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function loadProspects() {
  try {
    return JSON.parse(await readFile(storeFile, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function saveProspects(list) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  await writeFile(storeFile, `${JSON.stringify(list, null, 2)}\n`, 'utf-8');
}

// Exact rules from the brief: no website is the strongest signal (100,
// "Sehr hoch"); an unreachable/unanalyzed website is never scored high or
// low by guessing, it is reported as "Zu prüfen" instead; a reachable site
// accumulates points for each missing capability.
export function scoreProspect(prospect) {
  if (!prospect.website) {
    return { score: 100, priority: 'Sehr hoch – keine Website', reasons: ['Keine Website hinterlegt'] };
  }
  const analysis = prospect.analysis;
  if (!analysis?.reachable) {
    return { score: null, priority: 'Zu prüfen', reasons: ['Website nicht erreichbar oder Analyse fehlgeschlagen'] };
  }

  const checks = [
    [analysis.order, 25, 'Keine Bestellfunktion erkannt'],
    [analysis.reserve, 20, 'Keine Reservierungsfunktion erkannt'],
    [analysis.mobile, 25, 'Kein mobiler Viewport erkannt'],
    [!analysis.outdated, 20, 'Veralteter Copyright-Footer (3+ Jahre)'],
    [analysis.https, 10, 'Kein HTTPS'],
  ];
  let score = 0;
  const reasons = [];
  for (const [ok, points, reason] of checks) {
    if (!ok) { score += points; reasons.push(reason); }
  }
  const priority = score >= 80 ? 'Sehr hoch' : score >= 50 ? 'Hoch' : score >= 25 ? 'Mittel' : 'Niedrig';
  return { score, priority, reasons };
}

const ORDER_KEYWORDS = ['online bestellen', 'jetzt bestellen', 'lieferando', 'gloriafood', 'wolt', 'ubereats'];
const RESERVE_KEYWORDS = ['tisch reservieren', 'jetzt reservieren', 'reservierung online', 'opentable', 'quandoo', 'resmio', 'aleno'];

// Plain, honest GET request only: no login/paywall bypass, no robots.txt
// bypass, no headless-browser scraping. Findings are heuristic keyword/meta
// checks on the fetched HTML, never presented as verified facts by the
// caller (the UI labels this explicitly).
export async function analyzeWebsite(url, { request = fetch } = {}) {
  if (!url) return null;
  try {
    const res = await request(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
      headers: { 'User-Agent': 'gastro-v3-prospect-review/1.0 (+https://github.com/Seifinger/gastro-v3)' },
    });
    if (!res.ok) return { reachable: false };
    const html = (await res.text()).toLowerCase();
    const hasAny = (keywords) => keywords.some((k) => html.includes(k));
    const yearMatch = /(?:©|&copy;|copyright)\s*(\d{4})/i.exec(html);
    const outdated = yearMatch ? new Date().getFullYear() - Number(yearMatch[1]) >= OUTDATED_YEARS : false;
    return {
      reachable: true,
      https: (res.url || url).startsWith('https:'),
      mobile: /<meta[^>]+name=["']viewport/i.test(html),
      order: hasAny(ORDER_KEYWORDS),
      reserve: hasAny(RESERVE_KEYWORDS),
      outdated,
    };
  } catch {
    return { reachable: false };
  }
}

// A small semaphore so that even if several analyze requests land at once
// (multiple browser tabs, fast double-clicks before the button disables),
// at most ANALYSIS_CONCURRENCY website fetches run concurrently.
function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];
  const runNext = () => {
    if (active >= maxConcurrent || queue.length === 0) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active -= 1; runNext(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); runNext(); });
}
const limitAnalysis = createLimiter(ANALYSIS_CONCURRENCY);

// Costs money per call, so it fails fast (missing key, too-short query)
// before ever touching the network, and never leaks the key to the client.
export async function searchGooglePlaces(query, { key = process.env.GOOGLE_PLACES_API_KEY, request = fetch } = {}) {
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY fehlt. Trage ihn in .env ein und starte den Server neu.');
  if (typeof query !== 'string' || query.trim().length < 3) {
    throw new Error('Suchbegriff ist zu kurz (mindestens 3 Zeichen).');
  }

  let res;
  try {
    res = await request('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: query.trim(), pageSize: MAX_RESULTS }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(`Netzwerk- oder Timeoutfehler bei der Google-Places-Anfrage: ${err.message}`);
  }

  // Google returns JSON error bodies ({"error":{"code","message","status"}})
  // on both success and failure responses, but a proxy/gateway in front of
  // the API can return a non-JSON body (HTML error page, empty body) on
  // failure. Parse defensively either way rather than letting a raw
  // SyntaxError from res.json() surface as the user-facing message.
  const rawText = await res.text();
  let body = {};
  if (rawText) {
    try { body = JSON.parse(rawText); } catch { body = {}; }
  }

  if (!res.ok) {
    const googleMessage = body?.error?.message;
    if (res.status === 403) {
      throw new Error(`HTTP 403: Google-Places-API-Zugriff verweigert. API-Key, API-Freigabe und Abrechnung prüfen.${googleMessage ? ` (${googleMessage})` : ''}`);
    }
    if (res.status === 429) {
      throw new Error(`HTTP 429: Google-Places-Kontingent (Quota) erreicht. Später erneut versuchen.${googleMessage ? ` (${googleMessage})` : ''}`);
    }
    throw new Error(`Google Places antwortet mit HTTP ${res.status}.${googleMessage ? ` ${googleMessage}` : ''}`);
  }

  const seen = new Set();
  return (Array.isArray(body.places) ? body.places : [])
    .filter((p) => p && typeof p.id === 'string' && p.id && !seen.has(p.id) && seen.add(p.id))
    .slice(0, MAX_RESULTS)
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text || '',
      adresse: p.formattedAddress || '',
      telefon: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
      rating: typeof p.rating === 'number' ? p.rating : null,
      bewertungen: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    }));
}

function renderDemoPreview(prospect) {
  const region = prospect.adresse.split(',').at(-1)?.trim() || 'Ihrer Region';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Konzeptentwurf · ${escapeHtml(prospect.name)}</title>
<style>
:root{--ink:#241d18;--bg:#f6f0e8;--accent:#8b432d;}
*{box-sizing:border-box;}
body{margin:0;font-family:Georgia,'Iowan Old Style',serif;color:var(--ink);background:var(--bg);font-size:18px;line-height:1.6;}
header{padding:14px 5%;background:var(--ink);color:#fff;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:.04em;text-align:center;}
main{padding:11vw 8% 8vw;max-width:52rem;margin:0 auto 0 6%;}
.kicker{font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:13px;color:var(--accent);}
h1{font-size:clamp(40px,8vw,96px);line-height:.98;margin:.15em 0 .3em;max-width:14ch;}
.lead{max-width:40ch;font-size:20px;}
.cta{display:inline-block;margin-top:32px;padding:14px 24px;background:var(--accent);color:#fff;text-decoration:none;font-family:system-ui,sans-serif;font-weight:600;border-radius:2px;}
.cta:hover{opacity:.9;}
.disclaimer{margin-top:64px;max-width:46rem;font-family:system-ui,sans-serif;font-size:14px;color:#5c5048;border-top:1px solid #ddd0bf;padding-top:20px;}
</style>
</head>
<body>
<header>UNVERBINDLICHER KONZEPTENTWURF · NICHT DIE OFFIZIELLE WEBSITE</header>
<main>
  <p class="kicker">Gastronomie in ${escapeHtml(region)}</p>
  <h1>${escapeHtml(prospect.name)}</h1>
  <p class="lead">Ein klarer digitaler Auftritt, der Gäste vom ersten Eindruck bis zur Anfrage führt.</p>
  <a class="cta" href="mailto:?subject=${encodeURIComponent(`Konzeptgespräch: ${prospect.name}`)}">Konzeptgespräch anfragen</a>
  <p class="disclaimer">Diese lokale Demo ist ein unverbindlicher Gestaltungsvorschlag der Agentur. Sie verwendet keine übernommenen Fotos, Rezensionen, Bewertungen, Preise, Öffnungszeiten oder sonstigen unbestätigten Betriebsfakten. Vor einer echten Veröffentlichung sind Inhalte, Bildrechte und Freigaben mit dem Betrieb zu klären. Diese Seite fließt nicht in den automatischen Website-Build oder die GitHub-Pages-Veröffentlichung ein.</p>
</main>
</body>
</html>`;
}

export function createProspectApp() {
  const app = createDashboardApp();

  app.get('/prospects', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'prospect.html'));
  });

  app.get('/prospect-preview/:placeId', async (req, res) => {
    const prospects = await loadProspects();
    const prospect = prospects.find((p) => p.placeId === req.params.placeId);
    if (!prospect) return res.status(404).send('Prospect nicht gefunden.');
    res.type('html').send(renderDemoPreview(prospect));
  });

  app.post('/api/prospects/search', requireDashboardToken, async (req, res) => {
    try {
      res.json(await searchGooglePlaces(req.body?.query));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/prospects', requireDashboardToken, async (req, res) => {
    const prospects = await loadProspects();
    const withScoring = prospects
      .map((p) => ({ ...p, scoring: scoreProspect(p) }))
      .sort((a, b) => (b.scoring.score ?? -1) - (a.scoring.score ?? -1));
    res.json(withScoring);
  });

  app.post('/api/prospects', requireDashboardToken, async (req, res) => {
    const candidate = req.body?.prospect;
    if (!candidate?.placeId || !candidate?.name) {
      return res.status(400).json({ error: 'Ungültiger Treffer (placeId und name erforderlich).' });
    }
    const prospects = await loadProspects();
    if (prospects.some((p) => p.placeId === candidate.placeId)) {
      return res.status(409).json({ error: 'Dieser Treffer wurde bereits importiert.' });
    }
    prospects.push({ ...candidate, importedAt: new Date().toISOString(), analysis: null, analyzedAt: null });
    await saveProspects(prospects);
    res.status(201).json({ ok: true });
  });

  app.post('/api/prospects/:placeId/analyze', requireDashboardToken, async (req, res) => {
    const prospects = await loadProspects();
    const prospect = prospects.find((p) => p.placeId === req.params.placeId);
    if (!prospect) return res.status(404).json({ error: 'Prospect nicht gefunden.' });
    prospect.analysis = await limitAnalysis(() => analyzeWebsite(prospect.website));
    prospect.analyzedAt = new Date().toISOString();
    await saveProspects(prospects);
    res.json({ scoring: scoreProspect(prospect) });
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.DASHBOARD_PORT) || 3000;
  const host = process.env.HOST_DASHBOARD || '127.0.0.1';
  createProspectApp().listen(port, host, () => {
    console.log(`Agentur-Dashboard läuft auf http://${host}:${port}/prospects`);
  });
}
