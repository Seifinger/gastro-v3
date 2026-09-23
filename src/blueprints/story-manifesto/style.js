import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{background:${tokens.color.base};color:#fff;text-align:center;padding:${tokens.spacing['2xl']}px ${tokens.spacing.md}px;}
.${scope} p{font-size:${tokens.typography.scale[3]}px;line-height:${tokens.typography.lineHeights[2]};max-width:34ch;margin:0 auto;letter-spacing:${tokens.typography.tracking};}
`;
}
