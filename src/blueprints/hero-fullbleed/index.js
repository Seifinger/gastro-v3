import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('hero-fullbleed');
  const photos = confirmedPhotos(briefing);
  const hero = photos.find((p) => p.caption?.toLowerCase().includes('hero')) || photos[0] || null;
  const name = escapeHtml(briefing.name);
  const kicker = ctx.signature ? '<p class="bp-kicker">Willkommen</p>' : '';
  const lead = briefing.usp?.status === 'confirmed' ? briefing.usp.value : (briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : null);
  const cta = ctx.cta ? `<a class="bp-cta" href="${escapeAttr(ctx.cta.href)}">${escapeHtml(ctx.cta.label)}</a>` : '';
  const style = hero
    ? ` style="background-image:url('${escapeAttr(hero.url)}')"`
    : '';
  const flatClass = hero ? '' : ` ${scope}--flat`;
  const html = `
<section class="${scope}${flatClass}" aria-label="${escapeAttr(name)}"${style}>
  <div class="bp-inner">
    ${kicker}
    <h1>${name}</h1>
    ${lead ? `<p>${escapeHtml(lead)}</p>` : ''}
    ${cta}
  </div>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope), altText: hero?.caption ? escapeHtml(hero.caption) : null };
}

export { css } from './style.js';
export { motion } from './motion.js';
