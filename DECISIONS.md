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

## 2026-09-23 — Section B: 20 blueprints
- Contract: every blueprint's `index.js` exports `render(briefing, tokens, ctx)` returning `{ html, css, altText? }`, plus re-exports `css` and `motion` from its own `style.js`/`motion.js` for introspection (used later by the judge). `ctx` optionally carries `cta` (label/href for the blueprint's own call-to-action) and `apiBase` (the wirt-portal origin used by `reservation-form`/`order-embed` to build their POST endpoints as `${apiBase}/betrieb/${slug}/...`).
- `src/blueprints/_shared/util.js` holds only escaping and the provenance gate (`confirmed()`/`confirmedPhotos()`) — not a shared template. Every blueprint still builds its own distinct HTML structure and CSS; nothing is a renamed copy of another.
- Asymmetry is real, not cosmetic: `gallery-mosaic` uses an irregular CSS grid (large/small cells via `nth-child` spans), `menu-cards` uses a 6-column dense grid with varying spans (not three equal tiles), `hero-editorial`/`hero-split` use unequal column ratios, `testimonial-grid` uses CSS columns (masonry-like) instead of a uniform grid.
- `reservation-form` and `order-embed` are functionally real, not decorative: both do client-side `fetch()` POSTs with inline vanilla JS (no framework), server-authoritative validation is expected on the wirt-portal side (Section F), and `order-embed` fetches the current no-show configuration and consent text from `${apiBase}/betrieb/:slug/konfiguration` at load time so the legally relevant consent text is never duplicated/hardcoded on the static page.
- Only `confirmed` status data is ever interpolated into markup (`confirmed()`/`confirmedPhotos()` in `_shared/util.js`); a blueprint whose required confirmed field is missing renders an empty string so the composer can skip it rather than showing a fabricated placeholder photo/price/quote.
- `tel-CTA` (mentioned in the brief for `hauptaktion: anrufen`) is not one of the 20 named blueprints; it is a one-line `tel:` call-to-action assembled directly by the composer/renderer (Section C/D), since it has no independent layout to speak of.

## 2026-09-23 — Section C: Composer
- `src/composer/index.js` is a pure, deterministic rule engine: `compose(briefing)` derives tokens, then independently picks a hero, an optional story section, 0-2 product sections, an optional gallery, an optional social-proof section, and the mandatory conversion element for `hauptaktion` (`reservieren`→`reservation-form`, `bestellen`→`order-embed` only if a confirmed menu exists, `anrufen`→`tel-cta` only if a confirmed phone number exists, `informieren`→none). Sections are pushed in that fixed dramaturgical order (Hook → Vertrauen → Produkt → Beweis(Ambiente+Social Proof) → Aktion).
- Any variety among equally valid choices (e.g. `hero-split` vs `hero-fullbleed` vs `hero-editorial` when ≥2 confirmed photos exist, or which of `menu-cards`/`menu-board`/`menu-list` for ≥3 menu items) is picked via `seedHash(briefing.id) % options.length` — a stable djb2-style hash, never `Math.random()`. The same briefing always composes to the same sections.
- `ensureAsymmetry()` guarantees at least one asymmetric desktop section by swapping in an asymmetric sibling blueprint (`menu-list/menu-board`→`menu-cards`, `gallery-single/strip`→`gallery-mosaic`, `testimonial-solo`→`testimonial-grid` when ≥2 quotes, or the hero to `hero-split`/`hero-editorial`) before falling through — this only ever swaps between blueprints whose required confirmed data is already present, never fabricates data to unlock one.
- `ensureSignatureMoment()` flags exactly one section `ctx.signature = true`, preferring the first `signatureCapable` blueprint in dramaturgical order (usually `dish-hero`, else the hero itself).
- When fewer than 6 sections can be built from confirmed content, or the mandatory conversion action can't be rendered (missing confirmed phone/menu), `compose()` returns `buildStatus: 'insufficient'` with human-readable `reasons` instead of forcing placeholder sections to hit the 6-9 range — the dashboard (Section E) surfaces this status directly rather than letting such a site publish.
- Tests (`test/composer.test.js`) cover five briefings across all four `hauptaktion` values, verifying build-readiness, exactly-one signature moment, deterministic re-composition, forced asymmetry, dramaturgical ordering, and the explicit-insufficiency path for missing confirmed contact data.
