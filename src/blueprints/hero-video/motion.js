export function motion() {
  // The video itself carries the motion; no additional CSS motion is
  // layered on top. prefers-reduced-motion users get the video paused and
  // hidden behind its poster at the markup/JS level (see index.js). The
  // mobile nav panel's own open/close transition (style.js) is a plain CSS
  // transition already neutralized by the renderer's global
  // prefers-reduced-motion reset, so it needs no separate guard here.
  return '';
}
