# Decisions

## 2026-09-23 — Architecture baseline
- **Node 22 ESM without a frontend framework:** the generated customer sites remain static, portable HTML; Express is used only for local operational interfaces and public Wirt operations.
- **AJV Draft-07:** schema validation is explicit, testable, and does not invent confirmed restaurant facts.
- **Data provenance envelope:** optional briefing values use `{ value, status }` where status is `confirmed`, `draft`, or `unknown`; missing values are normalised to `draft` rather than guessed.
- **Static deployment target:** builds write only to `docs/<slug>/`; generated artifacts are excluded from Git except the directory marker, preventing accidental publication of client data.
- **No secret persistence:** `.env` and runtime state are ignored; neither server logs credentials.
- **Dependency minimalism:** `express`, `ajv`, and `pdfkit` are the only runtime packages. No CSS/UI framework, client framework, icon library, or build framework is used.

## Component commit plan
1. Foundation
2. Briefing and tokens
3. Blueprints and composer
4. Renderer and judge
5. Dashboard
6. Wirt portal and Telegram
7. Migration and tests
