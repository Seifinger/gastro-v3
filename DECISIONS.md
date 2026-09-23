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
