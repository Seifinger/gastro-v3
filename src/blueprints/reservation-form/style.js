import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{max-width:36rem;margin:0 auto;}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.sm}px;}
.${scope} p.bp-intro{font-size:${tokens.typography.scale[0]}px;opacity:.8;margin:0 0 ${tokens.spacing.md}px;}
.${scope} form{display:grid;gap:${tokens.spacing.sm}px;grid-template-columns:1fr 1fr;}
.${scope} .bp-field{display:flex;flex-direction:column;gap:4px;}
.${scope} .bp-field.bp-span2{grid-column:1/-1;}
.${scope} label{font-size:14px;font-weight:600;}
.${scope} input,.${scope} textarea{font:inherit;font-size:16px;padding:10px 12px;border:1px solid rgba(0,0,0,.25);border-radius:2px;background:#fff;color:${tokens.color.text};}
.${scope} button{grid-column:1/-1;background:${tokens.color.accent};color:${tokens.color.ctaText};border:0;padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;font-size:16px;font-weight:600;border-radius:2px;cursor:pointer;}
.${scope} button:hover{background:${tokens.color.hover};}
.${scope} button:disabled{opacity:.6;cursor:wait;}
.${scope} .bp-status{grid-column:1/-1;font-size:14px;padding:${tokens.spacing.sm}px;border-radius:2px;}
.${scope} .bp-status[data-state="ok"]{background:#eaf5ea;color:#1e4620;}
.${scope} .bp-status[data-state="error"]{background:#fbe9e7;color:#7f1d10;}
.${scope} .bp-status:empty{display:none;}
@media(max-width:520px){.${scope} form{grid-template-columns:1fr;}.${scope} .bp-field{grid-column:1/-1;}}
`;
}
