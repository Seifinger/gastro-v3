import { baseSectionCss } from '../_shared/util.js';

export function css(tokens, scope) {
  const t = tokens;
  return baseSectionCss(scope, t) + `
.${scope}{position:relative;min-height:100vh;min-height:100svh;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;color:#fff;background:${t.color.base};}
.${scope} .bp-media{position:absolute;inset:0;z-index:-2;}
.${scope} .bp-poster{position:absolute;inset:0;background-size:cover;background-position:center;background-color:${t.color.base};}
.${scope} .bp-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.${scope}::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.34) 0%,rgba(0,0,0,.1) 30%,rgba(0,0,0,.42) 68%,rgba(0,0,0,.8) 100%);}

.gv-glass{background:rgba(18,16,14,.42);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){.gv-glass{background:rgba(16,14,12,.8);}}

.${scope} .bp-nav{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:${t.spacing.md}px;padding:${t.spacing.sm}px ${t.spacing.md}px;margin:${t.spacing.sm}px;border-radius:999px;}
.${scope} .bp-brand{font-family:${t.accentTypography.fontFamily};font-size:${t.typography.scale[1]}px;color:#fff;margin:0;letter-spacing:.02em;white-space:nowrap;}
.${scope} .bp-nav-toggle{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:transparent;border:0;cursor:pointer;padding:0;}
.${scope} .bp-burger,.${scope} .bp-burger::before,.${scope} .bp-burger::after{content:"";display:block;width:22px;height:2px;background:#fff;border-radius:2px;transition:transform .2s ease;}
.${scope} .bp-burger{position:relative;}
.${scope} .bp-burger::before{position:absolute;top:-7px;left:0;}
.${scope} .bp-burger::after{position:absolute;top:7px;left:0;}
.${scope} .bp-nav-toggle[aria-expanded="true"] .bp-burger{background:transparent;}
.${scope} .bp-nav-toggle[aria-expanded="true"] .bp-burger::before{transform:translateY(7px) rotate(45deg);}
.${scope} .bp-nav-toggle[aria-expanded="true"] .bp-burger::after{transform:translateY(-7px) rotate(-45deg);}
.${scope} .bp-nav-links{position:absolute;top:calc(100% + ${t.spacing.xs}px);left:${t.spacing.sm}px;right:${t.spacing.sm}px;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease,visibility .2s;}
.${scope} .bp-nav-links.is-open{opacity:1;visibility:visible;transform:translateY(0);}
.${scope} .bp-nav-list{list-style:none;margin:0;padding:${t.spacing.sm}px;display:flex;flex-direction:column;gap:${t.spacing.xs}px;border-radius:16px;background:rgba(16,14,12,.86);border:1px solid rgba(255,255,255,.16);}
.${scope} .bp-nav-list a{display:block;color:#fff;text-decoration:none;font-size:${t.typography.scale[0]}px;padding:${t.spacing.xs}px ${t.spacing.sm}px;border-radius:8px;}
.${scope} .bp-nav-list a:hover{background:rgba(255,255,255,.1);}
.${scope} .bp-nav-cta{background:${t.color.accent};color:${t.color.ctaText};font-weight:600;}
.${scope} .bp-nav-cta:hover{background:${t.color.hover};}

@media(min-width:860px){
  .${scope} .bp-nav-toggle{display:none;}
  .${scope} .bp-nav-links{position:static;opacity:1;visibility:visible;transform:none;}
  .${scope} .bp-nav-list{flex-direction:row;align-items:center;padding:0;border-radius:0;background:none;border:0;gap:${t.spacing.lg}px;}
  .${scope} .bp-nav-list a{padding:${t.spacing.xs}px 0;}
  .${scope} .bp-nav-cta{padding:${t.spacing.xs}px ${t.spacing.md}px !important;border-radius:999px;}
}

.${scope} .bp-inner{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding:${t.spacing['3xl']}px ${t.spacing.md}px ${t.spacing.xl}px;}
.${scope} .bp-content{max-width:34rem;}
.${scope} h1{font-size:${t.typography.scale[3]}px;line-height:${t.typography.lineHeights[3]};margin:0 0 ${t.spacing.sm}px;letter-spacing:${t.typography.tracking};}
@media(min-width:600px){.${scope} h1{font-size:${t.typography.scale[4]}px;line-height:${t.typography.lineHeights[4]};}}
@media(min-width:1100px){.${scope} h1{font-size:${Math.round(t.typography.scale[4] * 1.25)}px;}}
.${scope} .bp-lead{font-size:${t.typography.scale[1]}px;color:#f2efe8;max-width:42ch;margin:0 0 ${t.spacing.md}px;}
.${scope} .bp-actions{display:flex;flex-wrap:wrap;gap:${t.spacing.sm}px;align-items:center;}
.${scope} .bp-cta{display:inline-block;background:${t.color.accent};color:${t.color.ctaText};padding:${t.spacing.sm}px ${t.spacing.lg}px;text-decoration:none;font-weight:600;border-radius:2px;}
.${scope} .bp-cta:hover{background:${t.color.hover};}
.${scope} .bp-cta-secondary{display:inline-block;color:#fff;padding:${t.spacing.sm}px ${t.spacing.lg}px;text-decoration:none;font-weight:600;border-radius:999px;}

.${scope} .bp-vertical-mark{position:absolute;z-index:2;right:${t.spacing.md}px;bottom:${t.spacing.xl}px;margin:0;writing-mode:vertical-rl;text-orientation:mixed;font-family:${t.accentTypography.fontFamily};font-size:${t.typography.scale[1]}px;letter-spacing:.3em;text-transform:uppercase;opacity:.5;display:none;}
@media(min-width:860px){.${scope} .bp-vertical-mark{display:block;}}

.${scope} .bp-mute-toggle{position:absolute;z-index:3;bottom:${t.spacing.md}px;left:${t.spacing.md}px;background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:999px;padding:6px 14px;font-size:14px;cursor:pointer;}
.${scope} .bp-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
`;
}
