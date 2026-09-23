import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.hero === 'none') return '';
  if (tokens.motion.hero === 'gentle-parallax') {
    return reducedMotionGuard(`@media (min-width:768px){.${scope}{background-attachment:fixed;}}`);
  }
  if (tokens.motion.hero === 'signature-animation') {
    return reducedMotionGuard(`.${scope} h1{animation:${scope}-rise .7s ease-out both;}@keyframes ${scope}-rise{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}`);
  }
  return '';
}
