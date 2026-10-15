// Continuous Sagan convention: P in watts. K is not a linear energy percentage.
export const HUMAN_POWER=2e13; // Rounded teaching reference, not a live statistic.
export const SOLAR_POWER=3.828e26;
export const SCENE_SAMPLES=Object.freeze({collectors:1728,systems:20000});
export const MIN_K=(Math.log10(HUMAN_POWER)-6)/10,MAX_K=3;
export const powerAt=k=>{if(typeof k!=='number'||!Number.isFinite(k))throw new RangeError('Finite K required');const power=10**(10*k+6);if(!Number.isFinite(power)||power<=0)throw new RangeError('Representable positive power required');return power;};
export function indexAt(power){if(!(power>0&&Number.isFinite(power)))throw new RangeError('Power must be positive and finite');return (Math.log10(power)-6)/10;}
export const multiplier=(from,to)=>{if(!Number.isFinite(from)||!Number.isFinite(to))throw new RangeError('Finite indices required');const result=10**(10*(to-from));if(!Number.isFinite(result)||result<=0)throw new RangeError('Representable positive multiplier required');return result;};
export function createState(){return {k:MIN_K,playing:false,motion:0};}
export function tick(s,dt){if(s.playing&&Number.isFinite(dt)&&dt>0){s.k=Math.min(MAX_K,s.k+dt*.035);s.motion+=dt;if(s.k>=MAX_K)s.playing=false;}return s;}
export function snapshot(s){if(!s||!Number.isFinite(s.k))throw new RangeError('Finite state index required');const k=Math.max(MIN_K,Math.min(MAX_K,s.k)),power=powerAt(k),next=k<1?1:k<2?2:3;return {k,power,next,remainingFactor:powerAt(next)/power,vsHuman:power/HUMAN_POWER,solarEquivalent:power/SOLAR_POWER,fractionOfNext:power/powerAt(next),view:k<1.35?'planet':k<2.35?'star':'galaxy'};}
export function yearsAtGrowth(from,to,annualPercent){if(![from,to,annualPercent].every(Number.isFinite))throw new RangeError('Finite growth inputs required');if(to<=from)return 0;if(annualPercent<=0)return Infinity;return Math.log(multiplier(from,to))/Math.log1p(annualPercent/100);}
