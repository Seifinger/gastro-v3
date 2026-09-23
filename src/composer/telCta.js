// tel-cta is intentionally not one of the 20 named blueprints: it is a
// single call-to-action sentence with no independent layout, assembled
// directly by the composer/renderer for the "anrufen" main action.
import { escapeHtml, escapeAttr, scopeClass } from '../blueprints/_shared/util.js';

export const meta = { id: 'tel-cta', category: 'conversion', asymmetric: false, signatureCapable: false };

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('tel-cta');
  const tel = ctx.tel;
  if (!tel) return { html: '', css: '' };
  const telHref = `tel:${tel.replace(/[^+\d]/g, '')}`;
  const css = `
.${scope}{text-align:center;padding:${tokens.spacing['2xl']}px ${tokens.spacing.md}px;background:${tokens.color.base};color:#fff;}
.${scope} p{font-size:${tokens.typography.scale[2]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} a{display:inline-block;background:${tokens.color.accent};color:${tokens.color.ctaText};padding:${tokens.spacing.sm}px ${tokens.spacing.lg}px;text-decoration:none;font-weight:600;font-size:${tokens.typography.scale[1]}px;border-radius:2px;}
.${scope} a:hover{background:${tokens.color.hover};}
.${scope} a:focus-visible{outline:3px solid #fff;outline-offset:3px;}
`;
  const html = `
<section class="${scope}" aria-label="Anrufen">
  <p>Am liebsten sprechen wir direkt mit Ihnen.</p>
  <a href="${escapeAttr(telHref)}">${escapeHtml(tel)} anrufen</a>
</section>`.trim();
  return { html, css };
}
