import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { validateBriefing } from '../src/briefing/validator.js';
import { compose } from '../src/composer/index.js';
import { buildAll } from '../scripts/build.js';
import { requireDashboardToken } from './auth.js';
import { setzeBetriebPasswort } from '../src/wirt/auth.js';
import { vapidPublicKey } from '../src/wirt/push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const docsDir = path.join(root, 'docs');

async function listLeadFiles() {
  const entries = await readdir(dataDir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name);
}

async function readLead(file) {
  const raw = await readFile(path.join(dataDir, file), 'utf-8');
  const input = JSON.parse(raw);
  const { valid, briefing, errors } = validateBriefing(input);
  return { file, input, valid, briefing, errors };
}

function completeness(briefing) {
  const keys = Object.keys(briefing).filter((k) => briefing[k] && typeof briefing[k] === 'object' && 'status' in briefing[k]);
  const confirmed = keys.filter((k) => briefing[k].status === 'confirmed').length;
  return { total: keys.length, confirmed, percent: keys.length ? Math.round((confirmed / keys.length) * 100) : 0 };
}

export function createDashboardApp() {
  const app = express();
  app.use(express.json());

  const api = express.Router();

  api.get('/leads', async (req, res) => {
    const files = await listLeadFiles();
    const leads = await Promise.all(files.map(async (file) => {
      const { input, valid, briefing, errors } = await readLead(file);
      return {
        file,
        id: input.id ?? null,
        name: input.name ?? '(ungültig)',
        hauptaktion: input.hauptaktion ?? null,
        valid,
        errorCount: errors?.length ?? 0,
        completeness: valid ? completeness(briefing) : null,
        freigegeben: briefing?.freigabe?.status === 'confirmed' && briefing.freigabe.value === true,
      };
    }));
    res.json(leads);
  });

  api.get('/leads/:id', async (req, res) => {
    const files = await listLeadFiles();
    const file = files.find((f) => f === `${req.params.id}.json`);
    if (!file) return res.status(404).json({ error: 'Lead nicht gefunden.' });
    const lead = await readLead(file);
    let composedPreview = null;
    if (lead.valid) {
      const composed = compose(lead.briefing);
      composedPreview = { archetype: composed.archetype, buildStatus: composed.buildStatus, reasons: composed.reasons, sectionCount: composed.sections.length, sections: composed.sections.map((s) => s.blueprint) };
    }
    const builtPath = path.join(docsDir, req.params.id, 'index.html');
    res.json({ ...lead, composedPreview, built: existsSync(builtPath) });
  });

  api.post('/leads', requireDashboardToken, async (req, res) => {
    const input = req.body;
    if (!input?.id) return res.status(400).json({ error: 'Feld "id" ist erforderlich.' });
    const file = `${input.id}.json`;
    if (existsSync(path.join(dataDir, file))) return res.status(409).json({ error: 'Ein Lead mit dieser ID existiert bereits.' });
    const { valid, errors } = validateBriefing(input);
    if (!valid) return res.status(400).json({ error: 'Briefing ungültig.', errors });
    await mkdir(dataDir, { recursive: true });
    await writeFile(path.join(dataDir, file), `${JSON.stringify(input, null, 2)}\n`, 'utf-8');
    res.status(201).json({ file });
  });

  api.put('/leads/:id', requireDashboardToken, async (req, res) => {
    const file = `${req.params.id}.json`;
    if (!existsSync(path.join(dataDir, file))) return res.status(404).json({ error: 'Lead nicht gefunden.' });
    const input = req.body;
    const { valid, errors } = validateBriefing(input);
    if (!valid) return res.status(400).json({ error: 'Briefing ungültig.', errors });
    await writeFile(path.join(dataDir, file), `${JSON.stringify(input, null, 2)}\n`, 'utf-8');
    res.json({ file });
  });

  api.post('/leads/:id/build', requireDashboardToken, async (req, res) => {
    const results = await buildAll({
      publicBaseUrl: process.env.PUBLIC_BASE_URL,
      apiBase: process.env.WIRT_API_BASE_URL,
      filter: (briefing) => briefing.id === req.params.id,
    });
    const result = results.find((r) => r.slug === req.params.id || r.file === `${req.params.id}.json`);
    if (!result) return res.status(404).json({ error: 'Lead nicht gefunden.' });
    res.json(result);
  });

  api.get('/einstellungen', (req, res) => {
    res.json({
      dashboardTokenConfigured: Boolean(process.env.DASHBOARD_TOKEN),
      wirtSessionSecretConfigured: Boolean(process.env.WIRT_SESSION_SECRET),
      vapidConfigured: Boolean(vapidPublicKey()),
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
      wirtApiBaseUrl: process.env.WIRT_API_BASE_URL || null,
    });
  });

  api.post('/einstellungen/wirt-passwort', requireDashboardToken, (req, res) => {
    try {
      setzeBetriebPasswort(req.body.slug, req.body.password);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.use('/api', api);
  app.use('/preview', express.static(docsDir));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get(['/', '/leads', '/lead/:id', '/lead/:id/edit', '/lead/:id/build', '/neu', '/einstellungen'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createDashboardApp();
  const port = Number(process.env.DASHBOARD_PORT) || 3000;
  const host = process.env.HOST_DASHBOARD || '127.0.0.1';
  app.listen(port, host, () => {
    console.log(`Agentur-Dashboard läuft auf http://${host}:${port}`);
  });
}
