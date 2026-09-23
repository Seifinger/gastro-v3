import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{min-height:70vh;display:flex;flex-direction:column;justify-content:center;background:${tokens.color.base};color:#fff;}
.${scope} h1{font-size:${tokens.typography.scale[4]}px;line-height:${tokens.typography.lineHeights[4]};margin:0 0 ${tokens.spacing.sm}px;letter-spacing:${tokens.typography.tracking};max-width:20ch;}
.${scope} p{font-size:${tokens.typography.scale[1]}px;max-width:38ch;margin:0 0 ${tokens.spacing.md}px;color:#f0ede6;}
.${scope} .bp-meta{font-family:${tokens.accentTypography.fontFamily};font-size:${tokens.typography.scale[0]}px;text-transform:uppercase;letter-spacing:.12em;opacity:.85;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} .bp-cta{display:inline-block;background:${tokens.color.accent};color:${tokens.color.ctaText};padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;text-decoration:none;font-weight:600;border-radius:2px;align-self:flex-start;}
.${scope} .bp-cta:hover{background:${tokens.color.hover};}
`;
}
