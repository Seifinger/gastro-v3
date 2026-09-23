# Decisions

## 2026-09-23 — Architecture baseline
- Node 22 ESM, framework-free browser code; Express for servers only. Generated sites are static.
- AJV Draft-07 and ajv-formats validate source values without inventing confirmed facts.
- Optional fields use `{ value, status }`; absent fields become `{ value: null, status: 'draft' }` without modifying input.
- Supplemental optional schema fields `video`, `speisekarte`, `testimonials`, and `historie` enable the requested rule-based section selection; they obey the same provenance contract.
- A photo collection cannot be confirmed while containing unconfirmed images; empty values cannot be confirmed. A user may still explicitly mark a non-empty value confirmed, because the briefing itself is the provenance source.
- Public repo contains no secrets or customer data; generated docs content and runtime files are ignored. Public publishing must use reviewed, confirmed facts and a separate deliberate deployment step.
- Scripts start only after dependencies are installed; no build framework, CSS framework, icon library, or build-time AI call.

## Component commit plan
1. Foundation
2. Briefing
3. Tokens
4. Blueprints and composer
5. Renderer and judge
6. Dashboard
7. Wirt portal and Telegram
8. Migration and tests

## 2026-09-23 — Baseline repair and token completion
- `npm test` initially failed: `ajv`/`ajv-formats`/`express`/`pdfkit` were declared in `package.json` but never installed, and no lockfile existed. Ran `npm install` and committed the resulting `package-lock.json` so `npm ci` is reproducible.
- `archetypes.json` only referenced 4 of the 6 typography profiles (`display-script` and `monospace-accent` were defined but unused). Both are flagged `accentOnly` in `typography.json`, so they are not fit for full-length body copy. Added an `accentFont` per archetype (used for signature-moment accents, not body text) so all six font profiles are genuinely exercised while every archetype's primary body font still stays at 17px+/AA contrast. Exposed `accentTypography` from `deriveTokens`.
- Added token tests: WCAG AA body-text contrast against the shared background/text pair, full archetype/typography/motion coverage, arbitrary confirmed primary colors (including light ones) still clearing 7:1 CTA contrast, unjustified purple/indigo overriding to the archetype fallback, and archetype selection determinism.

## 2026-09-23 — v1 data source finding
- `Seifinger/gastro-webagentur` has no `data/betriebe.json` and no committed database of confirmed restaurant facts. Real per-restaurant data in v1 is either (a) fetched live from the Google Places API at runtime (not stored in the repo), or (b) the four fictional pilot briefings under `v2/briefings/*.json` (each explicitly marked `"fiktiv": true`), which use a different nested `{ wert, status, quelle }` shape per section (`betrieb`, `konzept`, `karte`, `medien`, ...) with statuses `uebernommen` (taken from Google Places — i.e. confirmed) / `vorschlag` (agency suggestion, e.g. stock menu/photos) / `unbekannt` (unknown).
- `scripts/migrate-from-v1.js` therefore treats `<v1 repo>/v2/briefings/*.json` as the actual migratable data source, maps `uebernommen` → `confirmed`, `vorschlag`/`unbekannt` → `draft`/`unknown`, and never invents `betriebe.json`. If the v1 repo path or its `v2/briefings` directory is missing, it fails with a clear, actionable error instead of fabricating output. It reads only from the v1 path and writes only under `data/migrated/` in this repo.
