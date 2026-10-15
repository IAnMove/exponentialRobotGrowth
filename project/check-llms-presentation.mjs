import assert from 'node:assert/strict';
import {createRun,advance,transformerTrace,pendingToken,TOY_WEIGHTS,matmul} from './site-src/llms/model.js';
import {llmFrameAt,phaseIndexInCycle} from './site-src/llms/presentation.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
let frames=0;
for(const language of ['es','en'])for(const scenario of ['capital','bank','museum'])for(const decoding of ['greedy','sample'])for(const seed of [1,2,73]){
 const run=createRun(language,{scenario,decoding,seed,retrieval:scenario==='museum'}),timeline=[];
 while(!run.done){
  for(const progress of [0,.37,1]){
   const before=JSON.stringify(run),f=llmFrameAt(run,{progress,queryIndex:1});
   assert.equal(JSON.stringify(run),before);assert.equal(Object.isFrozen(run),false);
   assert(Object.isFrozen(f)&&Object.isFrozen(f.trace.Y[0])&&Object.isFrozen(f.run.options));
   assert.deepEqual(f.trace,transformerTrace(f.window.tokens,f.window.offset));
   assert.deepEqual(f.shapes.X,[f.window.tokens.length,6]);assert.deepEqual(f.shapes.hidden,[f.window.tokens.length,12]);
   near(f.queryWeights.reduce((a,b)=>a+b),1);f.queryWeights.forEach((p,i)=>{if(i>1)assert.equal(p,0);});
   assert.equal(f.decoder.choice,pendingToken(run));assert.equal(f.decoder.selectionVisible,run.phase===6&&progress===1);
   assert.equal(f.blockCount,1);assert.equal(f.headCount,1);assert.equal(f.trained,false);assert.equal(f.outputCurated,true);
   assert.equal(f.signals.appendedToken,run.phase===7?run.generated.at(-1):null);
   assert.deepEqual(llmFrameAt(run,{progress,queryIndex:1}),f,'paused or backward rendering consumes no state or random draw');frames++;
  }
  timeline.push({snapshot:JSON.parse(JSON.stringify(run))});advance(run);
 }
 const end=llmFrameAt(run,{progress:1});assert.equal(end.signals.path,'eos');assert.equal(end.signals.appendedToken,null);assert.equal(end.decoder.choice,'<EOS>');assert.equal(end.generatedCount,run.outputTokens.length);
 const cycleIndex=timeline.findIndex(c=>c.snapshot.phase===4&&c.snapshot.loops===5);
 assert(cycleIndex>0);assert.equal(phaseIndexInCycle(timeline,cycleIndex,4),cycleIndex);
 assert.equal(phaseIndexInCycle(timeline,cycleIndex,0),null);
 const phase6=phaseIndexInCycle(timeline,cycleIndex,6);assert.equal(timeline[phase6].snapshot.loops,5);assert.equal(timeline[phase6].snapshot.generated.length,5);
}
const run=createRun('es',{decoding:'sample',seed:1});run.phase=6;
const one=llmFrameAt(run,{progress:.5});run.seed=2;const two=llmFrameAt(run,{progress:.5});assert.notEqual(one.decoder.randomValue,two.decoder.randomValue);
const early=llmFrameAt(run,{progress:0});const late=llmFrameAt(run,{progress:1});assert.equal(early.decoder.choice,late.decoder.choice);assert.equal(early.decoder.selectionVisible,false);assert.equal(late.decoder.selectionVisible,true);
run.phase=4;
for(let index=0;index<5;index++){const f=llmFrameAt(run,{progress:.4,operationIndex:index,operationProgress:.7});assert.equal(f.flow.index,index);near(f.signals.progress,.7);assert.deepEqual(llmFrameAt(run,{progress:.4,operationIndex:index,operationProgress:.7}),f);}
const original=llmFrameAt(run);run.generated.push('new');const changed=llmFrameAt(run);assert.notDeepEqual(original.trace,changed.trace);assert.equal(original.generatedCount,0);assert.equal(changed.generatedCount,1);
assert.throws(()=>TOY_WEIGHTS.Q[0][0]=4,TypeError);
for(const [a,b] of [[[],[[1]]],[[[1,2],[3]],[[1],[2]]],[[[1]],[[NaN]]],[[[1,2]],[[1,2]]]])assert.throws(()=>matmul(a,b),RangeError);
for(const value of [NaN,Infinity,'0'])assert.throws(()=>llmFrameAt(run,{progress:value}),RangeError);
for(const value of [-1,5,.5])assert.throws(()=>llmFrameAt(run,{operationIndex:value}),RangeError);
for(const value of [-1,.5,NaN])assert.throws(()=>transformerTrace(['a'],value),RangeError);
assert.throws(()=>transformerTrace([2]),RangeError);assert.throws(()=>phaseIndexInCycle([],0,4),RangeError);
console.log(`LLM presentation: ${frames} reversible frozen frames, calculated causal tensors, real seeded draws, curated continuation/EOS, current-cycle rails and immutable weights: OK`);
