export function motion() {
  // The video itself carries the motion; no additional CSS motion is
  // layered on top, and autoplay is muted+loop so prefers-reduced-motion
  // users are handled at the markup level (see index.js), not here.
  return '';
}
