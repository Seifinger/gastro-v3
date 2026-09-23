import {
  escapeHtml, escapeAttr, confirmed, confirmedPhotos, confirmedVideoUrl,
  hasConfirmedMenu, hasConfirmedStory, hasConfirmedGallery, scopeClass,
} from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

// Secondary CTA is picked from confirmed data only, and only when it adds a
// distinct, sensible action next to the primary one (never a duplicate of it).
function pickSecondaryCta(briefing) {
  const menu = confirmed(briefing.speisekarte) || [];
  if (menu.length && briefing.hauptaktion !== 'bestellen') {
    return { label: 'Speisekarte ansehen', href: '#speisekarte' };
  }
  const tel = briefing.telefon?.status === 'confirmed' ? briefing.telefon.value : null;
  if (tel && briefing.hauptaktion !== 'anrufen') {
    return { label: 'Anrufen', href: `tel:${tel.replace(/[^+\d]/g, '')}` };
  }
  if (hasConfirmedGallery(briefing)) {
    return { label: 'Atmosphäre entdecken', href: '#atmosphaere' };
  }
  return null;
}

// Desktop nav is restricted to the four confirmed destinations the brief
// allows; any section that has no confirmed content behind it is left out
// instead of inventing a dummy link. "Reservieren"/"Bestellen" only appears
// when it's also the site's actual conversion action.
function buildNavItems(briefing, ctx) {
  const items = [];
  if (hasConfirmedMenu(briefing)) items.push({ label: 'Speisekarte', href: '#speisekarte' });
  if (hasConfirmedStory(briefing)) items.push({ label: 'Über uns', href: '#ueber-uns' });
  if (hasConfirmedGallery(briefing)) items.push({ label: 'Atmosphäre', href: '#atmosphaere' });
  if ((briefing.hauptaktion === 'reservieren' || briefing.hauptaktion === 'bestellen') && ctx.cta) {
    items.push({ label: briefing.hauptaktion === 'reservieren' ? 'Reservieren' : 'Bestellen', href: ctx.cta.href, isAction: true });
  }
  return items;
}

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('hero-video');
  const navId = `${scope}-menu`;
  const videoUrl = confirmedVideoUrl(briefing);
  const photos = confirmedPhotos(briefing);
  const poster = photos.find((p) => p.caption?.toLowerCase().includes('hero')) || photos[0] || null;
  const name = escapeHtml(briefing.name);
  const lead = briefing.usp?.status === 'confirmed' ? briefing.usp.value : null;

  const navItems = buildNavItems(briefing, ctx);
  const navHtml = navItems.length ? `
    <button type="button" class="bp-nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="${navId}">
      <span class="bp-burger" aria-hidden="true"></span>
      <span class="bp-sr">Menü öffnen</span>
    </button>
    <nav class="bp-nav-links" id="${navId}" aria-label="Hauptnavigation" data-nav-panel>
      <ul class="bp-nav-list">
        ${navItems.map((item) => `<li><a${item.isAction ? ' class="bp-nav-cta"' : ''} href="${escapeAttr(item.href)}">${escapeHtml(item.label)}</a></li>`).join('')}
      </ul>
    </nav>` : '';

  const primaryCta = ctx.cta ? `<a class="bp-cta" href="${escapeAttr(ctx.cta.href)}">${escapeHtml(ctx.cta.label)}</a>` : '';
  const secondary = pickSecondaryCta(briefing);
  const secondaryCta = secondary ? `<a class="bp-cta-secondary gv-glass" href="${escapeAttr(secondary.href)}">${escapeHtml(secondary.label)}</a>` : '';

  const posterStyle = poster ? ` style="background-image:url('${escapeAttr(poster.url)}')"` : '';
  const videoHtml = videoUrl ? `
    <video class="bp-video" autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${escapeAttr(poster.url)}"` : ''} aria-hidden="true" data-hero-video>
      <source src="${escapeAttr(videoUrl)}" type="video/mp4">
    </video>` : '';
  const muteToggle = videoUrl ? '<button type="button" class="bp-mute-toggle" data-video-mute-toggle aria-pressed="true">Ton an</button>' : '';
  const signatureMark = ctx.signature ? `<p class="bp-vertical-mark" aria-hidden="true">${name}</p>` : '';

  const html = `
<section class="${scope}" aria-label="${escapeAttr(name)}">
  <div class="bp-media">
    <div class="bp-poster"${posterStyle}></div>
    ${videoHtml}
  </div>
  <header class="bp-nav gv-glass">
    <p class="bp-brand">${name}</p>
    ${navHtml}
  </header>
  <div class="bp-inner">
    <div class="bp-content">
      <h1>${name}</h1>
      ${lead ? `<p class="bp-lead">${escapeHtml(lead)}</p>` : ''}
      <div class="bp-actions">
        ${primaryCta}
        ${secondaryCta}
      </div>
    </div>
  </div>
  ${signatureMark}
  ${muteToggle}
</section>
<script>
(function(){
  var root = document.querySelector('.${scope}');
  if (!root) return;
  var video = root.querySelector('[data-hero-video]');
  var muteBtn = root.querySelector('[data-video-mute-toggle]');
  function hideVideo(){
    if (video) video.style.display = 'none';
    if (muteBtn) muteBtn.hidden = true;
  }
  if (!video) {
    if (muteBtn) muteBtn.hidden = true;
  } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
    hideVideo();
  } else {
    video.addEventListener('error', hideVideo);
    if (muteBtn) {
      muteBtn.addEventListener('click', function(){
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? 'Ton an' : 'Ton aus';
        muteBtn.setAttribute('aria-pressed', String(video.muted));
      });
    }
  }
  var toggle = root.querySelector('[data-nav-toggle]');
  var panel = root.querySelector('[data-nav-panel]');
  if (toggle && panel) {
    var close = function(){ toggle.setAttribute('aria-expanded', 'false'); panel.classList.remove('is-open'); };
    var open = function(){ toggle.setAttribute('aria-expanded', 'true'); panel.classList.add('is-open'); };
    toggle.addEventListener('click', function(){
      if (toggle.getAttribute('aria-expanded') === 'true') { close(); } else { open(); }
    });
    root.querySelector('.bp-nav').addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { close(); toggle.focus(); }
    });
    panel.addEventListener('click', function(ev){
      if (ev.target.tagName === 'A') close();
    });
  }
})();
</script>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
