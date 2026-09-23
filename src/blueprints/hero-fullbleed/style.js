import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{position:relative;min-height:88vh;display:flex;align-items:flex-end;padding:${tokens.spacing['3xl']}px ${tokens.spacing.md}px ${tokens.spacing.xl}px;background-size:cover;background-position:center;isolation:isolate;}
.${scope}::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.15) 55%);z-index:0;}
.${scope}.${scope}--flat{background-color:${tokens.color.base};}
.${scope} .bp-inner{position:relative;z-index:1;max-width:44rem;}
.${scope} h1{font-size:${tokens.typography.scale[4]}px;line-height:${tokens.typography.lineHeights[4]};margin:0 0 ${tokens.spacing.sm}px;color:#fff;letter-spacing:${tokens.typography.tracking};}
.${scope} p{font-size:${tokens.typography.scale[1]}px;color:#f4f1ec;margin:0 0 ${tokens.spacing.md}px;}
.${scope} .bp-cta{display:inline-block;background:${tokens.color.accent};color:${tokens.color.ctaText};padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;text-decoration:none;font-weight:600;border-radius:2px;}
.${scope} .bp-cta:hover{background:${tokens.color.hover};}
`;
}
