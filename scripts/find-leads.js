#!/usr/bin/env node
// CLI: search Google Places for prospects across one or more regions, score
// each one by how urgently it needs a new website, persist the results into
// the same store dashboard/prospect-server.js's /prospects UI reads, and
// generate a local demo-preview HTML file for every prospect found.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  searchGooglePlaces,
  analyzeWebsite,
  scoreProspect,
  renderDemoPreview,
  loadProspects,
  saveProspects,
  setProspectStoreFile,
  createLimiter,
  ANALYSIS_CONCURRENCY,
} from '../dashboard/prospect-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const defaultPreviewsDir = path.join(root, 'data', 'runtime', 'previews');

// Runs every query, merges the hits (a place can legitimately turn up under
// more than one region query) and dedupes by placeId, analyzes each site,
// scores it, writes a demo-preview file, and upserts everything into the
// persisted prospect store so a later /prospects dashboard visit sees the
// same data. Returns just this run's prospects, scored and sorted.
export async function findLeads(queries, { key, request, storeFile, previewsDir = defaultPreviewsDir } = {}) {
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('Mindestens eine Region/Suchanfrage angeben, z. B. "Restaurants in Rosenheim".');
  }
  if (storeFile) setProspectStoreFile(storeFile);

  const found = new Map();
  for (const query of queries) {
    const results = await searchGooglePlaces(query, { key, request });
    for (const place of results) if (!found.has(place.placeId)) found.set(place.placeId, place);
  }

  const existing = await loadProspects();
  const existingById = new Map(existing.map((p) => [p.placeId, p]));

  const limitAnalysis = createLimiter(ANALYSIS_CONCURRENCY);
  const analyzed = await Promise.all([...found.values()].map((place) => limitAnalysis(async () => {
    const prior = existingById.get(place.placeId);
    const analysis = await analyzeWebsite(place.website, { request });
    return {
      ...place,
      importedAt: prior?.importedAt ?? new Date().toISOString(),
      analysis,
      analyzedAt: new Date().toISOString(),
    };
  })));

  await mkdir(previewsDir, { recursive: true });
  const scored = [];
  for (const prospect of analyzed) {
    const scoring = scoreProspect(prospect);
    const previewPath = path.join(previewsDir, `${prospect.placeId}.html`);
    await writeFile(previewPath, renderDemoPreview(prospect), 'utf-8');
    scored.push({ ...prospect, scoring, previewPath });
  }
  scored.sort((a, b) => (b.scoring.score ?? -1) - (a.scoring.score ?? -1));

  const analyzedById = new Map(scored.map((p) => [p.placeId, p]));
  const merged = existing.map((p) => analyzedById.get(p.placeId) ?? p);
  for (const p of scored) if (!existingById.has(p.placeId)) merged.push(p);
  await saveProspects(merged.map(({ scoring, previewPath, ...rest }) => rest));

  return scored;
}

function formatLine(prospect, rank) {
  const { scoring } = prospect;
  const scoreLabel = scoring.score === null ? '' : ` (${scoring.score} Punkte)`;
  const lines = [
    `${rank}. ${scoring.priority}${scoreLabel} — ${prospect.name}`,
    `   Adresse: ${prospect.adresse || '(unbekannt)'}`,
    `   Telefon: ${prospect.telefon || '(unbekannt)'}`,
    `   Website: ${prospect.website || '(keine)'}`,
    `   Gründe: ${scoring.reasons.join(', ') || '(keine)'}`,
    `   Demo:    ${path.relative(root, prospect.previewPath)}`,
  ];
  return lines.join('\n');
}

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length === 0) {
    console.error('Nutzung: npm run leads -- "Restaurants in Rosenheim" ["weitere Region" ...]');
    process.exitCode = 1;
    return;
  }
  try {
    const results = await findLeads(queries);
    console.log(`${results.length} Treffer aus ${queries.length} Region(en):\n`);
    results.forEach((p, i) => console.log(`${formatLine(p, i + 1)}\n`));
    console.log(`Gespeichert in data/runtime/prospects.json, Demo-Entwürfe in data/runtime/previews/.`);
  } catch (err) {
    console.error(`✘ ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
