import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{display:grid;grid-template-columns:1fr;gap:${tokens.spacing.lg}px;max-width:64rem;margin:0 auto;}
@media(min-width:768px){.${scope}{grid-template-columns:auto 1fr;align-items:center;}}
.${scope} .bp-portrait{width:100%;max-width:220px;aspect-ratio:1;border-radius:50%;overflow:hidden;background:${tokens.color.base};}
.${scope} .bp-portrait img{width:100%;height:100%;object-fit:cover;display:block;}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} p{font-size:${tokens.typography.scale[1]}px;line-height:${tokens.typography.lineHeights[1]};margin:0 0 ${tokens.spacing.sm}px;}
.${scope} .bp-usp{font-family:${tokens.accentTypography.fontFamily};color:${tokens.color.accent};font-size:${tokens.typography.scale[1]}px;}
`;
}
