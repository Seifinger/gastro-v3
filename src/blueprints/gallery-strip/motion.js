import { reducedMotionGuard } from '../_shared/util.js';

export function motion(tokens, scope) {
  return reducedMotionGuard(`.${scope} .bp-strip{scroll-behavior:smooth;}`);
}
