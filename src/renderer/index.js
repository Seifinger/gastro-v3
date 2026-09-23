import pkg from '../../package.json' with { type: 'json' };
import { blueprints } from '../blueprints/index.js';
import { render as renderTelCta } from '../composer/telCta.js';
import { escapeAttr, escapeHtml } from '../blueprints/_shared/util.js';
import { googleFontsHref } from './fonts.js';
import { buildLocalBusinessJsonLd } from './jsonld.js';

function renderSection(briefing, tokens, section) {
  if (section.blueprint === 'tel-cta') return renderTelCta(briefing, tokens, section.ctx);
  const bp = blueprints[section.blueprint];
  if (!bp) throw new Error(`Renderer: unbekannter Blueprint "${section.blueprint}"`);
  return bp.render(briefing, tokens, section.ctx);
}

const BASE_CSS = `
*{margin:0;box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{font-size:17px;line-height:1.5;}
img{max-width:100%;}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}}
`;

// Composed briefing + composer output -> a complete, self-contained HTML
// document: inline CSS, Google Fonts preconnect/display=swap, OG/Twitter
// tags, and LocalBusiness JSON-LD built only from confirmed facts.
export function renderSite(briefing, composed, options = {}) {
  const { tokens, sections, archetype } = composed;
  const canonicalUrl = options.canonicalUrl || null;
  const rendered = sections.map((section) => renderSection(briefing, tokens, section)).filter((r) => r.html);
  const bodyHtml = rendered.map((r) => r.html).join('\n');
  const css = BASE_CSS + rendered.map((r) => r.css).join('\n');
  const fontsHref = googleFontsHref(tokens.typography, tokens.accentTypography);
  const jsonLd = buildLocalBusinessJsonLd(briefing, canonicalUrl);
  const description = briefing.usp?.status === 'confirmed' ? briefing.usp.value
    : (briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : `${briefing.name} – ${briefing.kueche} in ${briefing.ort}`);
  const heroPhoto = briefing.fotos?.status === 'confirmed' ? briefing.fotos.value.find((p) => p.confirmed) : null;

  const html = `<!doctype html>
<!-- gastro-v3 engine v${pkg.version} · archetype: ${archetype} · buildStatus: ${composed.buildStatus} -->
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(briefing.name)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${escapeAttr(fontsHref)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeAttr(briefing.name)}">
<meta property="og:description" content="${escapeAttr(description)}">
${canonicalUrl ? `<meta property="og:url" content="${escapeAttr(canonicalUrl)}">\n<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ''}
${heroPhoto ? `<meta property="og:image" content="${escapeAttr(heroPhoto.url)}">` : ''}
<meta name="twitter:card" content="${heroPhoto ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escapeAttr(briefing.name)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${css}</style>
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>`;

  return { html, engineVersion: pkg.version, archetype };
}
