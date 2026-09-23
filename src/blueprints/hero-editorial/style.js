import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{position:relative;padding-top:${tokens.spacing['3xl']}px;padding-bottom:${tokens.spacing['3xl']}px;}
.${scope} .bp-grid{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.lg}px;}
@media(min-width:768px){.${scope} .bp-grid{grid-template-columns:38fr 62fr;align-items:start;}}
.${scope} .bp-portrait{position:relative;aspect-ratio:3/4;overflow:hidden;border-radius:2px;}
@media(min-width:768px){.${scope} .bp-portrait{margin-top:${tokens.spacing['2xl']}px;margin-left:-${tokens.spacing.lg}px;box-shadow:0 24px 48px -24px rgba(0,0,0,.35);}}
.${scope} .bp-portrait img{width:100%;height:100%;object-fit:cover;display:block;}
.${scope} h1{font-size:${tokens.typography.scale[4]}px;line-height:${tokens.typography.lineHeights[4]};margin:0 0 ${tokens.spacing.sm}px;letter-spacing:${tokens.typography.tracking};}
.${scope} p{font-size:${tokens.typography.scale[1]}px;max-width:44ch;}
.${scope} .bp-caption{font-family:${tokens.accentTypography.fontFamily};font-size:${tokens.typography.scale[0]}px;margin-top:${tokens.spacing.xs}px;opacity:.75;}
.${scope} .bp-cta{display:inline-block;margin-top:${tokens.spacing.sm}px;background:${tokens.color.accent};color:${tokens.color.ctaText};padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;text-decoration:none;font-weight:600;border-radius:2px;}
.${scope} .bp-cta:hover{background:${tokens.color.hover};}
`;
}
