# gastro-v3

Kompositionsbasierter Website-Generator für Gastronomiebetriebe. Er erzeugt statische, individuell komponierte Kundensites in `docs/<slug>/`; Dashboard und Wirt-Portal laufen bewusst getrennt als kleine Express-Server.

## Voraussetzungen

- Node.js 22 oder neuer
- `npm ci`
- `.env.example` nach `.env` kopieren und mindestens `DASHBOARD_TOKEN` und `WIRT_SESSION_SECRET` setzen (lange, zufällige Werte)
- Optional für den Prospect-Workflow (`/prospects`): `GOOGLE_PLACES_API_KEY` in `.env` setzen (Places API (New) + Abrechnung in Google Cloud aktivieren). Ohne Key liefert die Suche einen klaren Fehler, bevor eine Anfrage rausgeht.

## Befehle

```bash
npm run dev       # Agentur-Dashboard (inkl. Prospect-Workflow unter /prospects) auf 127.0.0.1:3000
npm run build     # alle JSON-Briefings in data/ zu docs/<slug>/ bauen (validiert + judge-geprüft)
npm test          # node:test
npm run publish   # baut nur freigegebene, judge-geprüfte Sites; Trockenlauf ohne --push
npm run migrate:v1  # liest V1_REPO_PATH lesend, schreibt nach data/migrated/
npm run wirt      # Wirt-Portal auf Port 3001 (WIRT_PORT/HOST_WIRT)
npm run check:google-places -- "Suchbegriff"  # manueller Live-Check gegen die echte Google-Places-API (nicht Teil von npm test)
```

CI (`.github/workflows/test.yml`) führt `npm ci && npm test && npm run build` bei jedem Push/PR auf `ubuntu-latest` und `windows-latest` aus.

## Architektur

- `src/briefing`: Draft-07-Schema, Normalisierung und Validierung (`{value,status}`-Provenienzmodell)
- `src/tokens`: regelbasierte Gestaltungs-Tokens (Schriften, Archetypen, Abstände, Motion, Farbe/Kontrast)
- `src/blueprints`: 20 isolierte Content- und Layoutbausteine (je `index.js`/`style.js`/`motion.js`/`meta.json`)
- `src/composer`: deterministische Sektionsauswahl und Dramaturgie (seed-basiert, nie `Math.random()`)
- `src/renderer`: vollständiges, zugängliches HTML mit Inline-CSS, Fonts, OG/JSON-LD
- `src/judge`: harter Build-Gate (Kontrast, verbotene Muster, Asymmetrie, Signature Moment)
- `src/wirt`: Wirt-Portal-Backend (Store, Auth, Push, Telegram, PDF) — von `wirt/server.js` und `dashboard/server.js` genutzt
- `scripts/build.js`, `scripts/publish.js`, `scripts/migrate-from-v1.js`: CLI-Einstiegspunkte
- `dashboard/`: lokale, tokenbasierte Agentur-UI (127.0.0.1)
- `wirt/`: öffentlich erreichbares Betriebsportal (Reservierungen/Bestellungen, SSE, PWA/Web Push, Telegram-Fallback)

Die Engine erfindet keine bestätigten Betriebsdaten. Fehlende Inhalte bleiben als Draft sichtbar und werden nicht als Fakten veröffentlicht — siehe `DECISIONS.md` für alle nicht-trivialen Entscheidungen und bekannten Einschränkungen.
