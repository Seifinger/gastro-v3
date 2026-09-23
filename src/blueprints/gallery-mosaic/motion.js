import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  if (tokens.motion.hover !== 'image-zoom') return reducedMotionGuard(`.${scope} figure img{transition:none;}`);
  return `.${scope} figure{overflow:hidden;}.${scope} figure img{transition:transform .35s ease;}` +
    reducedMotionGuard(`.${scope} figure:hover img{transform:scale(1.06);}`);
}
