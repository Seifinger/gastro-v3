import typography from './typography.json' with { type: 'json' };
import archetypes from './archetypes.json' with { type: 'json' };
import color from './color.json' with { type: 'json' };
import spacing from './spacing.json' with { type: 'json' };
import motion from './motion.json' with { type: 'json' };
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const lum = h => rgb(h).map(n => { const x=n/255; return x<=.04045?x/12.92:((x+.055)/1.055)**2.4; }).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
export const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const shade=(h,n)=>'#'+rgb(h).map(v=>Math.round(v*n).toString(16).padStart(2,'0')).join('');
export function chooseArchetype(b){if(b.preisklasse?.value==='fine-dining')return 'editorial';if(/kneipe|wirtshaus/i.test(b.ambienteCharakter?.value||'')||b.kueche==='bayerisch')return 'traditionell';if(/abend|bar/i.test(b.ambienteCharakter?.value||''))return 'abendlich';if(/modern|urban|street/i.test(b.konzept?.value||''))return 'urban';if(/hell|café/i.test(b.ambienteCharakter?.value||''))return 'hell';return 'minimal';}
export function deriveTokens(b,choice){const name=archetypes[choice]?choice:chooseArchetype(b),a=archetypes[name];const supplied=b.primaerfarbe?.status==='confirmed'?b.primaerfarbe.value:null;const reason=[b.konzept,b.usp].some(f=>f?.status==='confirmed'&&/lila|violett|indigo|purple/i.test(f.value||''));const p=supplied||a.fallbackColor,rgbp=rgb(p),base=rgbp[2]>rgbp[1]*1.2&&rgbp[0]>rgbp[1]*1.1&&!reason?a.fallbackColor:p;let cta=base;for(let i=0;i<20&&contrast(cta,'#ffffff')<7;i++)cta=shade(cta,.92);return {archetype:name,typography:typography[a.font],accentTypography:typography[a.accentFont],color:{...color,base,accent:cta,hover:shade(cta,.8),ctaText:'#ffffff'},spacing,motion:motion[a.motion],signature:a.signature};}
