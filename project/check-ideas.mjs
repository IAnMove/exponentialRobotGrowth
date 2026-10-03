import assert from 'node:assert/strict';
import {cascade,edgeCoin,atRound,storyBounds,storyRound,socialEdges} from './site-src/journeys/ideas-model.js';
const p={contacts:2,probability:100,bridges:true,seed:731};
const run=(edges,population,extra={})=>cascade({...p,...extra},{edges,population,horizon:population});
const chain=run([[0,1],[1,2],[2,3]],4);
assert.deepEqual(chain.first,[0,1,2,3]);assert.deepEqual(chain.history,[1,2,3,4,4]);assert.deepEqual(chain.activeHistory,[1,1,1,1,0]);
const edges=[[0,1],[0,2],[1,3],[2,3]],diamond=run(edges,4),reordered=run(edges.toReversed().map(([a,b])=>[b,a]),4);
assert.deepEqual(diamond.first,reordered.first);assert.deepEqual(diamond.history,reordered.history);
const incoming=diamond.eventsByRound[2].filter(e=>e.to===3);assert.equal(incoming.length,2);assert.equal(incoming.filter(e=>e.newReach).length,1);assert.equal(incoming.filter(e=>e.duplicate).length,1);assert.deepEqual(diamond.snapshots[2].active,[3]);
assert(!atRound(diamond,1.999).known.has(3));assert(atRound(diamond,2).known.has(3));
const duplicate=run([[0,1],[1,0]],2);assert.equal(duplicate.eventsByRound[1].filter(e=>e.attempted).length,1);
assert.notEqual(edgeCoin(731,0,1),edgeCoin(731,1,0));assert.equal(run([[0,1]],2,{probability:20}).history[1],1);assert.equal(run([[0,1]],2,{probability:22}).history[1],2);
for(const contacts of [1,2,3,4])for(const bridges of [false,true]){
 let previous=cascade({...p,contacts,bridges,probability:0});assert.equal(previous.history.at(-1),1);assert.equal(previous.endRound,1);
 for(let probability=1;probability<=100;probability++){
  const current=cascade({...p,contacts,bridges,probability});
  for(let round=0;round<=64;round++)for(const person of previous.snapshots[round].known)assert(current.snapshots[round].known.has(person),`p monotonicity: ${contacts}/${bridges}/${probability}/${round}`);
  const attempted=current.eventsByRound.flat().filter(e=>e.attempted).map(e=>`${e.from}:${e.to}`);assert.equal(new Set(attempted).size,attempted.length,'one attempt per directed contact');
  previous=current;
 }
 assert.equal(previous.history.at(-1),bridges?64:16);assert(previous.endRound<=64);
}
for(const probability of [25,55,85,100])for(const seed of [1,731,999]){
 const a=cascade({...p,probability,seed,contacts:1,bridges:false}),b=cascade({...p,probability,seed,contacts:4,bridges:true});
 for(let r=0;r<=64;r++)for(const person of a.snapshots[r].known)assert(b.snapshots[r].known.has(person),'adding edges preserves original opportunities');
}
const long=cascade({...p,contacts:1});assert.equal(long.endRound,36);assert.equal(long.history.at(-1),64);assert.equal(long.snapshots[24].known.size,45);assert.equal(long.snapshots[24].active.length,2);
for(const probability of [0,55,85,100])for(const bridges of [false,true]){
 const trace=cascade({...p,probability,bridges}),bounds=storyBounds(trace);let prev=0;
 for(let chapter=0;chapter<4;chapter++)for(let j=0;j<=100;j++){const n=storyRound(trace,chapter,j/100);assert(n>=prev);assert(n<=trace.endRound);prev=n;}
 assert.equal(bounds[0][0],0);assert.equal(prev,trace.endRound);
}
assert(socialEdges(p).some(([a,b])=>a===8&&b===16));
console.log('Ideas: stable directed opportunities, 800 probability comparisons, complete finite cascades, simultaneous receivers, edge order, monotonic graph changes and narration round bounds: OK');
