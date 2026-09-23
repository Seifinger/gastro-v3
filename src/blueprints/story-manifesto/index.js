import { escapeHtml, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens) {
  const scope = scopeClass('story-manifesto');
  const text = briefing.usp?.status === 'confirmed' ? briefing.usp.value
    : (briefing.konzept?.status === 'confirmed' ? briefing.konzept.value : `${briefing.name} in ${briefing.ort}.`);
  const html = `
<section class="${scope}" aria-label="Haltung" id="ueber-uns">
  <p>${escapeHtml(text)}</p>
</section>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
