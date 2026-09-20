import assert from 'node:assert/strict';
import {tokenize,softmax,attention,createRun,advance,tick,nextCandidates,pendingToken,trainStep,trainingStats} from './site-src/llms/model.js';
for(const text of ['¿Qué significa «banco»?','Pregunta  con\n espacios.','👋 Transformers!',''])assert.equal(tokenize(text).join(''),text);
for(const temperature of [0,.1,.7,2]){const ps=softmax([1000,999,-1000],temperature);assert(Math.abs(ps.reduce((a,b)=>a+b,0)-1)<1e-10);assert(ps.every(p=>p>=0&&p<=1));}
assert.deepEqual(softmax([1,4,2],0),[0,1,0]);assert.throws(()=>softmax([NaN]));
assert(softmax([3,1],.1)[0]>softmax([3,1],2)[0]);
const a=attention(['el','banco','del','río'],1);assert.equal(a.weights[2],0);assert.equal(a.weights[3],0);assert(Math.abs(a.weights.reduce((x,y)=>x+y,0)-1)<1e-10);
for(const language of ['es','en'])for(const scenario of ['capital','bank','museum'])for(const retrieval of [false,true])for(const source of ['current','archive']){
  const r=createRun(language,{scenario,retrieval,source});
  assert(r.tokens.length>0);assert.equal(r.tokens.join(''),r.prompt);
  r.tokens.forEach((token,i)=>assert.equal(r.tokenIds[i],r.tokenIds[r.tokens.indexOf(token)]));
  const frozenOptions=JSON.stringify(r.options);let steps=0;
  while(!r.done&&steps++<1000)advance(r);
  assert(r.done,'Every guided continuation must terminate with EOS');assert.equal(r.generated.join(''),r.data.completions[r.chosen]);assert.equal(JSON.stringify(r.options),frozenOptions);
  if(scenario==='museum'){assert.equal(Boolean(r.data.source),retrieval);assert.equal(r.chosen,retrieval&&source==='current'?1:0);}
}
const paused=createRun();tick(paused,10);assert.equal(paused.phase,0);paused.playing=true;tick(paused,-1);assert.equal(paused.phase,0);
const x=createRun('es',{decoding:'sample',seed:73,temperature:2}),y=createRun('es',{decoding:'sample',seed:73,temperature:2});for(let i=0;i<7;i++){advance(x);advance(y);}assert.equal(x.chosen,y.chosen);
const b1=createRun('es',{scenario:'bank',context:false}),b2=createRun('es',{scenario:'bank',context:true});assert.notEqual(b1.prompt,b2.prompt);assert.notDeepEqual(b1.data.logits,b2.data.logits);
let w=-1.2;for(let i=0;i<80;i++){const next=trainStep(w);assert(trainingStats(next).loss<trainingStats(w).loss);w=next;}assert(trainingStats(w).probability>.97);
assert.equal(nextCandidates(createRun('en',{scenario:'bank'})).pieces[0],tokenize('Financial')[0]);
for(const decoding of ['greedy','sample'])for(const seed of [42,73,9942]){
  const r=createRun('es',{scenario:'museum',decoding,seed,temperature:2});r.phase=6;
  while(!r.done){const before=r.generated.length,next=pendingToken(r),state=JSON.stringify(r);assert.equal(JSON.stringify(r),state);advance(r);assert.equal(r.generated.length,before+(next==='<EOS>'?0:1));assert.equal(next,next==='<EOS>'?'<EOS>':r.generated.at(-1));r.phase=6;}
}
console.log('LLMs: reversible tokens and IDs, stable softmax, causal masking, source/context effects, deterministic sampling, full generation and training loss: OK');
