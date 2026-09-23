# gastro-v3

Kompositionsbasierter Website-Generator für Gastronomiebetriebe. Er erzeugt statische, individuell komponierte Kundensites in `docs/<slug>/`; Dashboard und Wirt-Portal laufen bewusst getrennt als kleine Express-Server.

## Voraussetzungen

- Node.js 22 oder neuer
- `npm install`
- `.env.example` nach `.env` kopieren und `DASHBOARD_TOKEN` setzen

## Befehle

```bash
npm run dev       # Agentur-Dashboard auf 127.0.0.1:3000
npm run build     # alle JSON-Briefings in data/ zu docs/<slug>/ bauen
npm test          # node:test
npm run publish   # validiert vor GitHub-Pages-Publish
npm run migrate:v1
```

## Architektur

- `src/briefing`: Draft-07-Schema, Normalisierung und Validierung
- `src/tokens`: regelbasierte Gestaltungs-Tokens in JSON
- `src/blueprints`: isolierte Content- und Layoutbausteine
- `src/composer`: deterministische Auswahl und Dramaturgie
- `src/renderer`: vollständiges zugängliches HTML mit Inline-CSS
- `src/judge`: harte Anti-Slop- und Kontrast-Gates
- `dashboard`: lokale Agentur-UI
- `wirt`: öffentliches Betriebsportal inklusive SSE und Telegram-Fallback

Die Engine erfindet keine bestätigten Betriebsdaten. Fehlende Inhalte bleiben als Draft sichtbar und werden nicht als Fakten veröffentlicht.
