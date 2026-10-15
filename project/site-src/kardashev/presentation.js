import {snapshot,SCENE_SAMPLES} from './model.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
// Scope changes are viewing choices; illustrative object counts are not energy
// percentages. P and all ratios below use the continuous convention in watts.
export function kardashevFrameAt(state,{chapter=0,progress=0,source='narration',inspect=false,highlight='all'}={}){
 if(!state||!Number.isFinite(state.k)||!Number.isFinite(state.motion??0)||(state.motion??0)<0||!Number.isInteger(chapter)||chapter<0||chapter>4||!Number.isFinite(progress)||!['narration','manual','growth'].includes(source)||!['all','body','panels','antenna'].includes(highlight))throw new RangeError('Valid finite Kardashev presentation required');
 const values=snapshot(state),tier=Math.floor(values.k),view=inspect?'satellite':values.view;
 const samples={collectors:Math.max(8,Math.round(SCENE_SAMPLES.collectors*clamp((values.k-1.35)/.65))),collectorCapacity:SCENE_SAMPLES.collectors,systems:Math.round(SCENE_SAMPLES.systems*clamp((values.k-2.35)/.65)),systemCapacity:SCENE_SAMPLES.systems,illustrative:true,representsPowerFraction:false};
 return freeze({...values,phase:chapter,progress:clamp(progress),source,motion:state.motion??0,playing:!!state.playing,inspect:!!inspect,highlight,view,tier,nextTargetReached:tier===3,targetPower:10**(10*values.next+6),solarFraction:Math.min(1,values.solarEquivalent),samples,convention:'continuous',humanReferenceIsRounded:true});
}
