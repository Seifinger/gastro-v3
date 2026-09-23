import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  return baseSectionCss(scope, tokens) + `
.${scope}{max-width:40rem;margin:0 auto;}
.${scope} h2{font-size:${tokens.typography.scale[3]}px;margin:0 0 ${tokens.spacing.md}px;}
.${scope} .bp-item{display:flex;align-items:center;justify-content:space-between;gap:${tokens.spacing.sm}px;padding:${tokens.spacing.sm}px 0;border-bottom:1px solid rgba(0,0,0,.1);}
.${scope} .bp-item-name{font-size:${tokens.typography.scale[0]}px;}
.${scope} .bp-item-price{font-family:${tokens.accentTypography.fontFamily};opacity:.75;font-size:14px;}
.${scope} .bp-stepper{display:flex;align-items:center;gap:8px;}
.${scope} .bp-stepper button{width:32px;height:32px;border-radius:50%;border:1px solid rgba(0,0,0,.25);background:#fff;font-size:18px;cursor:pointer;line-height:1;}
.${scope} .bp-stepper button:hover{background:${tokens.color.accent};color:${tokens.color.ctaText};border-color:${tokens.color.accent};}
.${scope} .bp-qty{min-width:1.5em;text-align:center;font-variant-numeric:tabular-nums;}
.${scope} .bp-summary{margin-top:${tokens.spacing.md}px;padding-top:${tokens.spacing.md}px;border-top:2px solid ${tokens.color.text};display:flex;justify-content:space-between;font-size:${tokens.typography.scale[1]}px;font-weight:600;}
.${scope} form.bp-checkout{display:grid;gap:${tokens.spacing.sm}px;margin-top:${tokens.spacing.md}px;}
.${scope} .bp-field{display:flex;flex-direction:column;gap:4px;}
.${scope} label{font-size:14px;font-weight:600;}
.${scope} input,.${scope} select{font:inherit;font-size:16px;padding:10px 12px;border:1px solid rgba(0,0,0,.25);border-radius:2px;}
.${scope} .bp-consent{display:flex;gap:8px;align-items:flex-start;font-size:14px;}
.${scope} button[type=submit]{background:${tokens.color.accent};color:${tokens.color.ctaText};border:0;padding:${tokens.spacing.sm}px ${tokens.spacing.md}px;font-size:16px;font-weight:600;border-radius:2px;cursor:pointer;}
.${scope} button[type=submit]:disabled{opacity:.5;cursor:not-allowed;}
.${scope} .bp-status{font-size:14px;padding:${tokens.spacing.sm}px;border-radius:2px;}
.${scope} .bp-status[data-state="ok"]{background:#eaf5ea;color:#1e4620;}
.${scope} .bp-status[data-state="error"]{background:#fbe9e7;color:#7f1d10;}
.${scope} .bp-status:empty{display:none;}
`;
}
