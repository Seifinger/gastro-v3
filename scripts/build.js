#!/usr/bin/env node
// Builds every briefing JSON file in data/*.json into docs/<slug>/index.html.
// Each briefing is independently validated, composed, rendered and judged;
// a judge failure or validation error blocks only that one site and is
// reported clearly, it never produces a half-built or fabricated page.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBriefing } from '../src/briefing/validator.js';
import { compose } from '../src/composer/index.js';
import { renderSite } from '../src/renderer/index.js';
import { judge } from '../src/judge/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const defaultDataDir = path.join(root, 'data');
const defaultDocsDir = path.join(root, 'docs');

export async function buildAll({ publicBaseUrl, filter, dataDir = defaultDataDir, docsDir = defaultDocsDir } = {}) {
  const entries = await readdir(dataDir, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name);

  const results = [];
  for (const file of files) {
    const raw = await readFile(path.join(dataDir, file), 'utf-8');
    let input;
    try {
      input = JSON.parse(raw);
    } catch (err) {
      results.push({ file, ok: false, stage: 'parse', message: err.message });
      continue;
    }

    const { valid, briefing, errors } = validateBriefing(input);
    if (!valid) {
      results.push({ file, ok: false, stage: 'validate', errors });
      continue;
    }
    if (filter && !filter(briefing)) {
      results.push({ file, slug: briefing.id, ok: false, stage: 'filtered', message: 'Nicht für diesen Lauf ausgewählt (z. B. keine Freigabe).' });
      continue;
    }

    const composed = compose(briefing);
    const canonicalUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}/${briefing.id}/` : null;
    const rendered = renderSite(briefing, composed, { canonicalUrl });
    const verdict = judge(briefing, composed, rendered);

    if (!verdict.pass) {
      results.push({ file, slug: briefing.id, ok: false, stage: 'judge', findings: verdict.findings });
      continue;
    }

    const outDir = path.join(docsDir, briefing.id);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'index.html'), rendered.html, 'utf-8');
    results.push({ file, slug: briefing.id, ok: true, archetype: composed.archetype, buildStatus: composed.buildStatus, path: `docs/${briefing.id}/index.html` });
  }
  return results;
}

async function main() {
  const results = await buildAll({ publicBaseUrl: process.env.PUBLIC_BASE_URL });
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const r of ok) console.log(`✔ ${r.file} -> ${r.path} (${r.archetype})`);
  for (const r of failed) {
    console.error(`✘ ${r.file} [${r.stage}]`);
    if (r.errors) for (const e of r.errors) console.error(`   ${e.path}: ${e.message}`);
    if (r.findings) for (const f of r.findings) console.error(`   [${f.code}] ${f.message}`);
    if (r.message) console.error(`   ${r.message}`);
  }

  console.log(`\n${ok.length} gebaut, ${failed.length} fehlgeschlagen, ${results.length} gesamt.`);
  if (results.length === 0) {
    console.log('Keine Briefings in data/*.json gefunden. Nichts zu bauen.');
  }
  if (failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
