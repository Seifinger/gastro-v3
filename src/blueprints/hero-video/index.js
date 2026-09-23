import { escapeHtml, escapeAttr, confirmedPhotos, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('hero-video');
  const videoUrl = briefing.video?.status === 'confirmed' ? briefing.video.value : null;
  const photos = confirmedPhotos(briefing);
  const poster = photos[0] || null;
  const name = escapeHtml(briefing.name);
  const lead = briefing.usp?.status === 'confirmed' ? briefing.usp.value : null;
  const cta = ctx.cta ? `<a class="bp-cta" href="${escapeAttr(ctx.cta.href)}">${escapeHtml(ctx.cta.label)}</a>` : '';
  const posterAttr = poster ? ` poster="${escapeAttr(poster.url)}"` : '';
  const html = `
<section class="${scope}" aria-label="${escapeAttr(name)}">
  <video autoplay muted loop playsinline${posterAttr} aria-hidden="true">
    <source src="${escapeAttr(videoUrl)}" type="video/mp4">
  </video>
  <button type="button" class="bp-mute-toggle" data-video-mute-toggle aria-pressed="true">Ton an</button>
  <div class="bp-inner">
    <h1>${name}</h1>
    ${lead ? `<p>${escapeHtml(lead)}</p>` : ''}
    ${cta}
  </div>
</section>
<script>
(function(){
  document.querySelectorAll('[data-video-mute-toggle]').forEach(function(btn){
    var section = btn.closest('.${scope}');
    var video = section && section.querySelector('video');
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { video.pause(); video.removeAttribute('autoplay'); }
    btn.addEventListener('click', function(){
      video.muted = !video.muted;
      btn.textContent = video.muted ? 'Ton an' : 'Ton aus';
      btn.setAttribute('aria-pressed', String(video.muted));
    });
  });
})();
</script>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
