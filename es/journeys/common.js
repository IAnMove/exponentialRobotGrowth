export const L=(es,en)=>[es,en];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const defaults=lesson=>Object.fromEntries(lesson.controls.map(c=>[c.id,c.value]));
export function rng(seed=41){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export const metric=(label,value,unit='')=>({label,value,unit});
export function poseAt(i){return {x:6.5,z:-i*16+2,yaw:Math.atan2(6.5,2),pitch:.06};}
export function walk(p,f,s,dt){const n=Math.max(1,Math.hypot(f,s)),v=3.5*Math.min(.05,dt);return {...p,x:clamp(p.x+(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)/n*v,4.6,10),z:clamp(p.z+(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)/n*v,-56,9)};}
export const control=(id,label,value,min,max,step=1)=>({id,label,value,min,max,step,type:'range'});
export const toggle=(id,label,value=false)=>({id,label,value,type:'toggle'});
export const chapter=(title,text)=>({title,text});
