import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.lg}px;}
.${scope} .bp-columns{column-count:1;column-gap:${tokens.spacing.md}px;}
@media(min-width:768px){.${scope} .bp-columns{column-count:3;}}
.${scope} blockquote{break-inside:avoid;margin:0 0 ${tokens.spacing.md}px;background:#fff;padding:${tokens.spacing.md}px;border-radius:2px;font-size:${tokens.typography.scale[0]}px;box-shadow:0 1px 3px rgba(0,0,0,.08);}
.${scope} blockquote:nth-child(3n+1){font-size:${tokens.typography.scale[1]}px;}
.${scope} cite{display:block;margin-top:${tokens.spacing.xs}px;font-style:normal;font-family:${tokens.accentTypography.fontFamily};opacity:.7;font-size:${tokens.typography.scale[0]}px;}
`;
}
