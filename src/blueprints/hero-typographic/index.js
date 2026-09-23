import { escapeHtml, escapeAttr, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('hero-typographic');
  const name = escapeHtml(briefing.name);
  const kueche = escapeHtml(briefing.kueche);
  const ort = escapeHtml(briefing.ort);
  const lead = briefing.usp?.status === 'confirmed' ? briefing.usp.value : (briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : null);
  const cta = ctx.cta ? `<a class="bp-cta" href="${escapeAttr(ctx.cta.href)}">${escapeHtml(ctx.cta.label)}</a>` : '';
  const html = `
<section class="${scope}" aria-label="${escapeAttr(name)}">
  <p class="bp-meta">${kueche} &middot; ${ort}</p>
  <h1>${name}</h1>
  ${lead ? `<p>${escapeHtml(lead)}</p>` : ''}
  ${cta}
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
