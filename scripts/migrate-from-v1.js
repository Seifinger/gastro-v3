#!/usr/bin/env node
// Reads v1 (Seifinger/gastro-webagentur) briefing data READ-ONLY and writes
// v3-shaped briefings to data/migrated/ (never into data/ directly, and
// never back into the v1 checkout). See DECISIONS.md "v1 data source
// finding": v1 has no data/betriebe.json — the actual migratable source is
// v2/briefings/*.json, using a { wert, status, quelle } shape per nested
// section with statuses uebernommen/bestaetigt/vorschlag/unbekannt.
//
// Per the migration brief, every migrated OPTIONAL value starts as `draft`
// regardless of its v1 status — migration only ever proposes content for a
// human to confirm, it never grants `confirmed` on its own authority. A
// migration report lists what was taken over and what needs a manual look.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBriefing } from '../src/briefing/validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const KUECHE_KEYWORDS = {
  deutsch: /deutsch/i, bayerisch: /bayer/i, italienisch: /italien/i, franzoesisch: /franz|français/i,
  spanisch: /spanisch/i, griechisch: /griech/i, tuerkisch: /türk|tuerk/i, indisch: /indisch/i,
  chinesisch: /chines/i, japanisch: /japan/i, vietnamesisch: /vietnam/i,
};

const PREISKLASSE_KEYWORDS = {
  'fine-dining': /fine.?dining|sterne|gehobenste/i,
  gehoben: /gehoben|hochwertig/i,
  mittel: /mittel/i,
  'günstig': /günstig|preiswert|budget/i,
};

function coerceKueche(text, notes) {
  for (const [key, pattern] of Object.entries(KUECHE_KEYWORDS)) {
    if (pattern.test(text ?? '')) return key;
  }
  notes.push(`Küche "${text}" konnte keinem Schema-Wert zugeordnet werden – auf "international" gesetzt, bitte prüfen.`);
  return 'international';
}

function coercePreisklasse(text, notes) {
  if (!text) return null;
  for (const [key, pattern] of Object.entries(PREISKLASSE_KEYWORDS)) {
    if (pattern.test(text)) return key;
  }
  notes.push(`Preisklasse "${text}" konnte keinem Schema-Wert zugeordnet werden – manuell prüfen.`);
  return null;
}

function draftField(value) {
  return { status: 'draft', value: value === undefined ? null : value };
}

function migrateBriefing(v1, notes) {
  const f = v1.felder ?? {};
  const betrieb = f.betrieb ?? {};
  const konzept = f.konzept ?? {};
  const gaeste = f.gaeste ?? {};
  const positionierung = f.positionierung ?? {};
  const karte = f.karte ?? {};
  const aktion = f.aktion ?? {};
  const marke = f.marke ?? {};
  const stil = f.stil ?? {};
  const belege = f.belege ?? {};
  const medien = f.medien ?? {};
  const freigabe = f.freigabe ?? {};

  const name = betrieb.name?.wert ?? v1.lead?.name ?? null;
  if (!name) notes.push('Kein Name gefunden (Pflichtfeld) – muss manuell ergänzt werden.');
  const ort = betrieb.ort?.wert ?? v1.lead?.ort ?? null;
  if (!ort) notes.push('Kein Ort gefunden (Pflichtfeld) – muss manuell ergänzt werden.');
  const kuecheRaw = betrieb.kueche?.wert ?? v1.kueche ?? '';
  const kueche = coerceKueche(kuecheRaw, notes);

  const hauptaktionRaw = aktion.haupt?.wert;
  const hauptaktionEnum = ['reservieren', 'bestellen', 'anrufen', 'informieren'];
  const hauptaktion = hauptaktionEnum.includes(hauptaktionRaw) ? hauptaktionRaw : 'informieren';
  if (!hauptaktionEnum.includes(hauptaktionRaw)) {
    notes.push(`Hauptaktion "${hauptaktionRaw}" ist kein gültiger Schema-Wert – auf "informieren" gesetzt, bitte prüfen.`);
  }

  const slug = v1.slug?.replace(/^pilot-/, '') ?? name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const oeffnungszeitenWert = betrieb.oeffnungszeiten?.wert;
  let oeffnungszeiten = null;
  if (Array.isArray(oeffnungszeitenWert)) {
    oeffnungszeiten = {};
    for (const eintrag of oeffnungszeitenWert) {
      if (eintrag?.tage && eintrag?.zeiten) oeffnungszeiten[eintrag.tage] = eintrag.zeiten;
    }
  }

  const speisekarteWert = karte.speisekarte?.wert;
  if (speisekarteWert && !Array.isArray(speisekarteWert)) {
    notes.push(`Speisekarte ist nur ein Katalog-Verweis (${JSON.stringify(speisekarteWert)}), keine echten Gerichte/Preise – Speisekarte bleibt leer, bitte echte Gerichte eintragen. Es werden keine Gerichte erfunden.`);
  }
  const signaturgerichteWert = karte.signaturgerichte?.wert;
  const signaturgericht = Array.isArray(signaturgerichteWert) && signaturgerichteWert.length ? signaturgerichteWert[0] : null;
  if (Array.isArray(signaturgerichteWert) && signaturgerichteWert.length > 1) {
    notes.push(`Weitere mögliche Signaturgerichte aus v1, nur das erste wurde übernommen: ${signaturgerichteWert.slice(1).join(', ')}`);
  }

  const farben = marke.farben?.wert;
  if (Array.isArray(farben) && farben.length) {
    notes.push(`Farbwunsch aus v1 als Text, kein Hex-Wert vorhanden: ${farben.join(', ')} – primaerfarbe bleibt leer, bitte Hex-Wert ergänzen.`);
  }

  const zielgruppenWert = gaeste.zielgruppen?.wert;
  const zielgaeste = Array.isArray(zielgruppenWert) ? zielgruppenWert.join(', ') : (zielgruppenWert ?? null);

  const referenzenWert = stil.referenzen?.wert;
  let referenzUrls = null;
  if (Array.isArray(referenzenWert)) {
    const urls = referenzenWert.filter((r) => /^https:\/\//.test(r));
    const nonUrls = referenzenWert.filter((r) => !/^https:\/\//.test(r));
    if (urls.length) referenzUrls = urls;
    if (nonUrls.length) notes.push(`Referenzen aus v1 ohne gültige https-URL, nicht migriert: ${nonUrls.join(', ')}`);
  }

  const goNos = stil.noGos?.wert;
  const fotosWert = medien.fotos?.wert;
  const fotos = Array.isArray(fotosWert) ? fotosWert.map((foto) => ({
    url: `https://images.unsplash.com/${foto.stock}`,
    caption: foto.motiv ?? '',
    confirmed: false, // stock placeholders from v1, never the betrieb's own confirmed photos
  })) : null;
  if (fotos?.length) notes.push(`${fotos.length} Stockfoto(s) aus v1 übernommen (Platzhalter, nicht bestätigt) – durch echte Fotos des Betriebs ersetzen, bevor Fotos bestätigt werden.`);

  if (belege.googleBewertung?.wert) {
    notes.push(`Google-Bewertung aus v1 nicht migriert (kein v3-Feld dafür): ${JSON.stringify(belege.googleBewertung.wert)}`);
  }

  const briefing = {
    id: slug,
    name: name ?? '(bitte ergänzen)',
    kueche,
    ort: ort ?? '(bitte ergänzen)',
    hauptaktion,
    konzept: draftField(konzept.kurz?.wert ?? null),
    usp: draftField(konzept.usp?.wert ?? null),
    zielgaeste: draftField(zielgaeste),
    preisklasse: draftField(coercePreisklasse(positionierung.preis?.wert, notes)),
    signaturgericht: draftField(signaturgericht),
    ambienteCharakter: draftField(positionierung.atmosphaere?.wert ?? null),
    fotos: draftField(fotos),
    logoUrl: draftField(marke.logo?.wert ?? null),
    primaerfarbe: draftField(null),
    wunschschrift: draftField(marke.schriften?.wert ?? null),
    referenzUrls: draftField(referenzUrls),
    goNos: draftField(Array.isArray(goNos) ? goNos : null),
    oeffnungszeiten: draftField(oeffnungszeiten),
    telefon: draftField(betrieb.telefon?.wert ?? v1.lead?.telefon ?? null),
    adresse: draftField(betrieb.adresse?.wert ?? v1.lead?.adresse ?? null),
    testimonials: draftField(null),
    historie: draftField(null),
    freigabe: { status: 'draft', value: false },
  };

  return { briefing, notes };
}

export async function migrate({ v1RepoPath } = {}) {
  const repoPath = v1RepoPath || process.env.V1_REPO_PATH;
  if (!repoPath) {
    throw new Error(
      'Kein v1-Repository-Pfad angegeben. Setze V1_REPO_PATH (in .env oder als Umgebungsvariable) auf den lokalen Checkout von Seifinger/gastro-webagentur, z. B. V1_REPO_PATH=../gastro-webagentur.',
    );
  }
  const briefingsDir = path.join(repoPath, 'v2', 'briefings');
  let files;
  try {
    files = (await readdir(briefingsDir)).filter((f) => f.endsWith('.json'));
  } catch {
    throw new Error(
      `Konnte "${briefingsDir}" nicht lesen. Erwartet wird ein Checkout von Seifinger/gastro-webagentur mit v2/briefings/*.json ` +
      '(das v1-Repository hat kein data/betriebe.json – siehe DECISIONS.md). Prüfe V1_REPO_PATH und ob das Repository dort geklont ist.',
    );
  }
  if (files.length === 0) {
    throw new Error(`Keine Briefing-Dateien in "${briefingsDir}" gefunden. Nichts zu migrieren.`);
  }

  const outDir = path.join(root, 'data', 'migrated');
  await mkdir(outDir, { recursive: true });

  const report = [];
  for (const file of files) {
    const raw = await readFile(path.join(briefingsDir, file), 'utf-8');
    const v1 = JSON.parse(raw);
    const notes = [];
    const { briefing } = migrateBriefing(v1, notes);
    const { valid, errors, briefing: normalized } = validateBriefing(briefing);

    const outFile = path.join(outDir, `${briefing.id || file.replace('.json', '')}.json`);
    await writeFile(outFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');

    report.push({ source: file, out: path.relative(root, outFile), valid, schemaErrors: errors, manualReview: notes });
  }

  const reportPath = path.join(outDir, 'MIGRATION_REPORT.md');
  const reportMd = [
    '# Migrationsbericht v1 → v3',
    '',
    `Quelle: \`${briefingsDir}\` (nur gelesen, nichts dort verändert).`,
    `Ziel: \`data/migrated/\` (separates Verzeichnis, nicht \`data/\` selbst – vor Build/Freigabe manuell prüfen und ggf. nach data/ verschieben).`,
    '',
    ...report.flatMap((r) => [
      `## ${r.source} → ${r.out}`,
      `Schema-gültig: ${r.valid ? 'ja' : 'NEIN – Pflichtfelder oder Typen fehlen noch'}`,
      r.schemaErrors?.length ? `Schema-Fehler:\n${r.schemaErrors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}` : '',
      r.manualReview.length ? `Manuell zu prüfen:\n${r.manualReview.map((n) => `- ${n}`).join('\n')}` : 'Manuell zu prüfen: -',
      '',
    ]),
  ].filter(Boolean).join('\n');
  await writeFile(reportPath, reportMd, 'utf-8');

  return { report, reportPath: path.relative(root, reportPath) };
}

async function main() {
  try {
    const { report, reportPath } = await migrate();
    for (const r of report) {
      console.log(`${r.valid ? '✔' : '⚠'} ${r.source} -> ${r.out}${r.valid ? '' : ' (Pflichtfelder fehlen)'}`);
    }
    console.log(`\n${report.length} Briefing(s) migriert. Bericht: ${reportPath}`);
    console.log('Alle optionalen Felder stehen auf "draft" und müssen vor einer Freigabe geprüft werden.');
  } catch (err) {
    console.error(`Migration fehlgeschlagen: ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
