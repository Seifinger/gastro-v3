import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.lg}px;align-items:center;}
@media(min-width:768px){.${scope}{grid-template-columns:57fr 43fr;}}
.${scope} .bp-text{padding:${tokens.spacing.sm}px 0;}
.${scope} h1{font-size:${tokens.typography.scale[3]}px;line-height:${tokens.typography.lineHeights[3]};margin:0 0 ${tokens.spacing.sm}px;letter-spacing:${tokens.typography.tracking};}
.${scope} p{font-size:${tokens.typography.scale[1]}px;margin:0 0 ${tokens.spacing.md}px;}
.${scope} .bp-media{position:relative;overflow:hidden;border-radius:2px;aspect-ratio:4/5;background:${tokens.color.base};}
.${scope} .bp-media img{width:100%;height:100%;object-fit:cover;display:block;}
.${scope} .bp-cta{display:inline-block;background:${tokens.color.accent};color:${tokens.color.ctaText};padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;text-decoration:none;font-weight:600;border-radius:2px;}
.${scope} .bp-cta:hover{background:${tokens.color.hover};}
`;
}
