import {clamp} from './common.js';
export const POPULATION=64;
export function socialEdges(p){
 const edges=[],seen=new Set();const add=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(!seen.has(key)){seen.add(key);edges.push([a,b]);}};
 for(let i=0;i<POPULATION;i++)for(let j=1;j<=p.contacts;j++)add(i,Math.floor(i/16)*16+(i+j)%16);
 if(p.bridges)for(let j=0;j<3;j++)add(j*16+8,(j+1)*16);
 return edges;
}
// A stable pseudo-random opportunity per directed edge. Changing p never reshuffles it.
export function edgeCoin(seed,from,to){
 let x=((seed>>>0)^Math.imul(from+1,0x9e3779b1)^Math.imul(to+1,0x85ebca6b))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
}
export function cascade(p,{edges=socialEdges(p),population=POPULATION,seedNode=0,horizon=population}={}){
 const adjacency=Array.from({length:population},()=>[]);
 for(const [a,b] of edges){adjacency[a].push(b);adjacency[b].push(a);}for(let i=0;i<adjacency.length;i++)adjacency[i]=[...new Set(adjacency[i])].sort((a,b)=>a-b);
 const known=new Set([seedNode]),first=Array(population).fill(Infinity),snapshots=[],eventsByRound=[[]];first[seedNode]=0;
 let active=[seedNode],endRound=null;const snapshot=round=>({round,known:new Set(known),active:[...active]});snapshots.push(snapshot(0));
 for(let round=1;round<=horizon;round++){
  const events=[],next=new Set();
  for(const from of active)for(const to of adjacency[from]){
   const alreadyKnown=known.has(to),roll=edgeCoin(p.seed??731,from,to),success=!alreadyKnown&&roll<p.probability/100;
   const newReach=success&&!next.has(to);if(success)next.add(to);
   events.push({round,from,to,bridge:Math.floor(from/16)!==Math.floor(to/16),alreadyKnown,attempted:!alreadyKnown,roll,success,newReach,duplicate:success&&!newReach});
  }
  active=[...next].sort((a,b)=>a-b);for(const i of active){known.add(i);first[i]=round;}
  eventsByRound.push(events);snapshots.push(snapshot(round));if(!active.length&&endRound===null)endRound=round;
 }
 return {edges,first,snapshots,eventsByRound,endRound,history:snapshots.map(s=>s.known.size),activeHistory:snapshots.map(s=>s.active.length),population};
}
export function spread(p,t){
 const turn=Math.max(0,Math.floor(t)),trace=cascade(p,{horizon:turn}),s=trace.snapshots[turn];
 return {...s,edges:trace.edges,first:trace.first,history:trace.history,activeHistory:trace.activeHistory,events:trace.eventsByRound[turn],eventsByRound:trace.eventsByRound,ended:!s.active.length};
}
export function storyBounds(trace){
 const end=trace.endRound??trace.snapshots.length-1,bridge=trace.eventsByRound.findIndex(events=>events.some(e=>e.bridge&&e.newReach));
 const a=Math.min(1,end),b=Math.min(end,bridge>0?Math.max(a,bridge-1):Math.max(a,Math.floor(end*.4))),c=Math.min(end,bridge>0?Math.max(b+1,Math.floor(end*.7)):b);
 return [[0,a],[a,b],[b,c],[c,end]];
}
export function storyRound(trace,chapter,progress){const [a,b]=storyBounds(trace)[chapter];return a+(b-a)*clamp(progress,0,1);}
export function atRound(trace,continuous){
 const round=clamp(continuous,0,trace.snapshots.length-1),turn=Math.floor(round),progress=round-turn,s=trace.snapshots[turn];
 return {...s,t:turn,continuous:round,progress,edges:trace.edges,first:trace.first,events:trace.eventsByRound[turn+1]||[],ended:!s.active.length,history:trace.history.slice(0,turn+1),activeHistory:trace.activeHistory.slice(0,turn+1)};
}
export function personPosition(i){const c=Math.floor(i/16),a=(i%16)/16*Math.PI*2;return [(c%2)*8-4+Math.cos(a)*2.5,.65,Math.floor(c/2)*8-4+Math.sin(a)*2.5];}
