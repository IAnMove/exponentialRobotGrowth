import assert from 'node:assert/strict';
import * as M from './site-src/mente/model.js';

// Published architecture/census estimates are separate from the toy tensors.
assert.deepEqual([M.GROK1.parameters,M.GROK1.experts,M.GROK1.activeExperts,M.GROK1.layers,M.GROK1.queryHeads,M.GROK1.kvHeads,M.GROK1.embedding,M.GROK1.vocab,M.GROK1.context],[314e9,8,2,64,48,8,6144,131072,8192]);
assert.deepEqual([M.NEURONS,M.NONNEURONAL,M.CORTICAL,M.CEREBELLAR,M.WORKING_CHUNKS,M.BRAIN_WATTS],[86.1e9,84.6e9,16.3e9,69e9,4,20]);
assert(M.NEURONS-M.CORTICAL-M.CEREBELLAR>.5e9&&M.NEURONS-M.CORTICAL-M.CEREBELLAR<1e9);
assert(M.CEREBELLAR/M.NEURONS>.75&&M.CEREBELLAR/M.NEURONS<.85);assert(M.NONNEURONAL/M.NEURONS>.8&&M.NONNEURONAL/M.NEURONS<1.2,'the census does not imply ten glial cells per neuron');
assert.equal(M.GROK1.queryHeads/M.GROK1.kvHeads,6);assert.equal(M.GROK1.activeExperts/M.GROK1.experts,.25);
assert(M.SYNAPSE_ORDER/M.GROK1.parameters>100&&M.SYNAPSE_ORDER/M.GROK1.parameters<1000,'a synapse estimate and a parameter count are different quantities');
assert(Math.abs(M.VISUAL.cerebellar/(M.VISUAL.cerebellar+M.VISUAL.cortical)-M.CEREBELLAR/M.NEURONS)<.03);assert(M.VISUAL.layers<M.GROK1.layers);

const near=(actual,expected,message,tolerance=1e-10)=>assert(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),message||`${actual} != ${expected}`);
const add=(a,b)=>a.map((value,i)=>value+b[i]),scale=(a,k)=>a.map(value=>value*k),dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const project=(row,matrix)=>matrix[0].map((_,column)=>row.reduce((sum,value,i)=>sum+value*matrix[i][column],0));
const softmax=values=>{const top=Math.max(...values),numerators=values.map(value=>Math.exp(value-top)),denominator=numerators.reduce((a,b)=>a+b,0);return numerators.map(value=>value/denominator);};
function nearArray(actual,expected,message){assert.equal(actual.length,expected.length,message);actual.forEach((value,i)=>Array.isArray(value)?nearArray(value,expected[i],message):near(value,expected[i],message));}
function toyOracle(embeddings,weights){
 const query=project(embeddings.at(-1),weights.query),keys=embeddings.map(row=>project(row,weights.key)),values=embeddings.map(row=>project(row,weights.value));
 const scores=keys.map(key=>dot(query,key)/Math.sqrt(query.length)),attentionWeights=softmax(scores),mixed=values.reduce((sum,row,i)=>add(sum,scale(row,attentionWeights[i])),Array(query.length).fill(0));
 const routerInput=add(embeddings.at(-1),project(mixed,weights.output)),routerScores=add(project(routerInput,weights.router),weights.routerBias),selected=routerScores.map((score,id)=>({id,score})).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,2).map(expert=>expert.id),routerWeights=softmax(selected.map(id=>routerScores[id]));
 const expertOutputs=selected.map(id=>{const expert=weights.experts[id],hidden=add(project(routerInput,expert.in),expert.inBias).map(Math.tanh);return add(project(hidden,expert.out),expert.outBias);});
 const expertMix=expertOutputs.reduce((sum,row,i)=>add(sum,scale(row,routerWeights[i])),Array(query.length).fill(0)),hidden=add(routerInput,expertMix),logits=add(project(hidden,weights.vocabularyProjection),weights.vocabularyBias),probabilities=softmax(logits);
 return {query,keys,values,scores,attentionWeights,mixed,routerInput,routerScores,selected,routerWeights,expertOutputs,expertMix,hidden,logits,probabilities,tokenId:logits.indexOf(Math.max(...logits))};
}
// Closed-form counts independently separate triangular causal prefill from
// one new decode row per generated token already processed into the KV cache.
const prefillCount=p=>48*p*(p+1)/2,decodeCount=(p,n)=>48*((n-1)*p+n*(n-1)/2);
const sigmoid=w=>1/(1+Math.exp(-w)),bce=(w,label)=>Math.max(0,w)+Math.log1p(Math.exp(-Math.abs(w)))-label*w;

assert.equal(M.MAX_TICK,48);assert.equal(M.TOKEN_STEPS,6);assert.deepEqual(M.STAGES,['query','scores','values','route','logits','emit']);
let frames=0,mathSteps=0,learningCases=0;const routerChoices=new Set(),weightsBefore=JSON.stringify(M.TOY_WEIGHTS);
const promptCases=[0,1,2,3,4,6,11,12,13,48,100,8184,8185,8190,8191,8192,8193,12000];
const times=[0,.25,.999999,1,1.999999,2,2.5,2.999999,3,3.999999,4,4.999999,5,5.999999,6,6.25,6.999999,7,7.999999,8,11.999999,12,13,14,23.5,30,41.999999,42,47.999999,48];
for(const promptTokens of promptCases)for(const humanGrouping of [false,true]){
 const params={promptTokens,humanGrouping,mode:'reply',seconds:8},trace=M.makeTrace(params),before=JSON.stringify(trace),p=promptTokens||1,valid=p<=8192,limit=valid?Math.min(8,8192-p+1):0;
 assert.equal(trace.valid,valid);assert.equal(trace.bos,promptTokens===0);assert.equal(trace.promptPositions,p);assert.equal(trace.outputLimit,limit);assert.equal(trace.stopTick,limit*6);assert.equal(trace.steps.length,limit);
 if(!valid){assert.equal(trace.reason,'prompt-exceeds-8192-positions');assert.equal(trace.params.promptTokens,promptTokens,'an overlong input is preserved for a visible error, rather than silently cropped');assert.deepEqual(trace.outputs,[]);}
 for(const step of trace.steps){
  const {attention,router}=step,oracle=toyOracle(attention.embeddings,M.TOY_WEIGHTS);mathSteps++;
  assert.equal(attention.fullPositionCount,p+step.index);assert.equal(attention.queryPosition,p+step.index-1);assert.equal(attention.displayCount,Math.min(12,attention.fullPositionCount));assert.equal(attention.sampled,attention.fullPositionCount>12);assert.equal(attention.heads,1);assert.equal(attention.layers,1);
  assert.deepEqual(attention.keyPositions,step.prefix.map(row=>row.position));assert(attention.keyPositions.every(position=>position<=attention.queryPosition),'the toy query cannot see a future token');assert(attention.causalMask.every(Boolean));
  assert.equal(step.prefix.at(-1).position,attention.queryPosition);assert.equal(new Set(attention.keyPositions).size,attention.keyPositions.length);
  if(attention.sampled){assert.equal(attention.scope,'representative-toy-positions');assert.deepEqual(attention.keyPositions.slice(0,2),[0,1],'oldest reference positions remain represented; this is not an eviction policy');}
  for(const row of step.prefix){
   const position=[.12*Math.sin(row.position*.7),.12*Math.cos(row.position*.7),.12*Math.sin(row.position*.31+.4)];nearArray(row.positionEmbedding,position);nearArray(row.tokenEmbedding,M.TOY_WEIGHTS.embeddings[row.tokenId]);nearArray(row.embedding,add(row.tokenEmbedding,position));assert.equal(row.label,M.TOY_VOCAB[row.tokenId]);
   if(row.source==='output'){const index=row.position-p;assert(index<step.index,'a decoded prefix contains only earlier emitted outputs');assert.equal(row.tokenId,trace.outputs[index]);}
  }
  nearArray(attention.query,oracle.query,'Q is a projection of the final known embedding');nearArray(attention.keys,oracle.keys);nearArray(attention.values,oracle.values);nearArray(attention.scores,oracle.scores,'scaled QK scores');nearArray(attention.weights,oracle.attentionWeights);near(attention.weights.reduce((a,b)=>a+b,0),1);assert(attention.weights.every(value=>value>=0&&value<=1));nearArray(attention.mixed,oracle.mixed,'AV is a weighted value mixture');
  nearArray(router.input,oracle.routerInput);nearArray(router.scores,oracle.routerScores);nearArray(router.probabilities,softmax(oracle.routerScores));assert.deepEqual(router.selected,oracle.selected,'the two experts are chosen by router values, not their physical order');routerChoices.add(router.selected.join(','));assert.equal(router.selected.length,2);assert.notEqual(router.selected[0],router.selected[1]);nearArray(router.weights,oracle.routerWeights);nearArray(router.outputs,oracle.expertOutputs);nearArray(router.mixed,oracle.expertMix);nearArray(router.finalHidden,oracle.hidden);near(router.weights.reduce((a,b)=>a+b,0),1);
  router.experts.forEach((expert,i)=>{assert.equal(expert.id,oracle.selected[i]);near(expert.weight,oracle.routerWeights[i]);nearArray(expert.input,oracle.routerInput);nearArray(expert.output,oracle.expertOutputs[i]);});
  nearArray(step.logits,oracle.logits);nearArray(step.probabilities,oracle.probabilities);near(step.probabilities.reduce((a,b)=>a+b,0),1);assert.equal(step.prediction.tokenId,oracle.tokenId);assert.equal(step.prediction.label,M.TOY_VOCAB[oracle.tokenId]);
 }
 for(const time of times){
  const frame=M.frameAt(trace,time),t=Math.min(time,limit*6),generated=valid?Math.min(limit,Math.floor(t/6)):0,cachedRows=valid&&t>=1?Math.min(limit-1,Math.max(0,Math.floor((t-1)/6))):0,scoreRows=valid&&t>=2?Math.min(limit-1,Math.max(0,Math.floor((t-2)/6))):0;frames++;
  near(frame.time,time);assert.equal(frame.completed,Math.floor(time));assert.equal(frame.generated,generated);assert.equal(frame.mode,'reply');assert.equal(frame.inferenceWeightsFrozen,true);assert.equal(frame.training.delta,null);assert.equal(frame.training.weight,-1.2,'replying never applies the separate supervised weight update');
  assert.deepEqual(frame.emittedIds,trace.outputs.slice(0,generated));assert.equal(frame.emitted.length,generated);assert.equal(frame.cache.positions,valid&&t>=1?p+cachedRows:0);assert.equal(frame.cache.processedGenerated,cachedRows);assert.equal(frame.cache.knownSequence,valid?p+generated:0);assert.equal(frame.cache.pendingOutput,generated-cachedRows);assert(frame.cache.positions<=8192);assert.equal(frame.cache.capacity,8192);
  assert.equal(frame.counts.prefillPerLayer,valid&&t>=2?prefillCount(p):0);assert.equal(frame.counts.decodePerLayer,48*(scoreRows*p+scoreRows*(scoreRows+1)/2));assert.equal(frame.counts.totalPerLayer,frame.counts.prefillPerLayer+frame.counts.decodePerLayer);assert.equal(frame.counts.allLayers,frame.counts.totalPerLayer*64);assert.equal(frame.counts.decodeQueries,scoreRows);assert.equal(frame.counts.scope,'analytical-grok1-unmasked-qk-scores-not-executed-flops-or-joules');
  near(frame.brain.elapsedSeconds,8*time/48);near(frame.brain.energyJoules,20*8*time/48);assert.equal(frame.brain.watts,20);assert.equal(frame.brain.estimated,true);assert.equal(frame.brain.estimatedIntervalEnergy,160);assert.equal(frame.brain.human.referenceCapacity.mean,4);assert.deepEqual(frame.brain.human.referenceCapacity.approximateRange,[3,5]);assert.equal(frame.brain.human.illustratedChunks,humanGrouping?4:8);assert.deepEqual(frame.brain.human.groups.flat(),['A','B','C','D','E','F','G','H']);assert.equal(frame.brain.human.scope,'illustrative-grouping-not-memory-performance');assert(!('trace' in frame.brain),'no arbitrary neuronal plasticity counter is presented as a measurement');
  if(valid){
   const local=t-frame.tokenIndex*6;assert.deepEqual(frame.attention.ready,{query:local>=1,keys:local>=1,values:local>=1,scores:local>=2,weights:local>=2,mixed:local>=3});assert.equal(frame.router.ready,local>=4);assert.equal(frame.logitsReady,local>=5);assert.equal(frame.output.ready,local>=5);assert.equal(frame.output.emitted,local>=6);assert.equal(frame.output.tokenId,local>=5?trace.steps[frame.tokenIndex].prediction.tokenId:null);
   const activePackets=frame.packets.filter(packet=>packet.active);assert.equal(activePackets.length,generated<limit?1:0);if(activePackets.length){assert.equal(activePackets[0].stage,M.STAGES[Math.floor(local)]);near(activePackets[0].progress,local-Math.floor(local));}
   assert.equal(frame.contextFull,generated===limit&&limit<8);if(generated===limit){assert.equal(frame.active,false);assert.equal(frame.counts.nextPerLayer,null);assert.equal(frame.cache.canQuery,false);assert.equal(frame.phase,limit<8?'context-full':'complete');}
  }else{assert.equal(frame.phase,'invalid');assert.equal(frame.active,false);assert.equal(frame.attention,null);assert.equal(frame.output.tokenId,null);assert.equal(frame.counts.nextPerLayer,null);}
  const repeated=M.frameAt(trace,time);assert.deepEqual(repeated,frame,'same fractional time yields the same causal state');M.frameAt(trace,48);assert.deepEqual(M.frameAt(trace,time),frame,'rewinding cannot retain future outputs or training state');
 }
 assert.equal(JSON.stringify(trace),before,'sampling never rewrites the immutable inference history');
 const final=M.frameAt(trace,48);if(valid){assert.equal(final.counts.totalPerLayer,prefillCount(p)+decodeCount(p,limit));assert.equal(final.cache.positions,p+limit-1);assert.equal(final.cache.knownSequence,p+limit);assert.equal(final.cache.pendingOutput,1,'the last output is known but has not been processed into KV');}
}
assert(routerChoices.size>=4,'different prefix values activate different pairs of experts');
const defaultTrace=M.makeTrace();assert.equal(M.frameAt(defaultTrace,2).counts.prefillPerLayer,1008,'six prompt positions have a triangular prefill; the first token is not an extra 7-position decode');assert.equal(M.frameAt(defaultTrace,6).cache.positions,6);assert.equal(M.frameAt(defaultTrace,6).generated,1);assert.equal(M.frameAt(defaultTrace,7).cache.positions,7);assert.equal(M.frameAt(defaultTrace,8).counts.decodePerLayer,336);
assert.equal(M.frameAt(M.makeTrace({promptTokens:8192}),6).generated,1);assert.equal(M.frameAt(M.makeTrace({promptTokens:8192}),48).cache.positions,8192);assert.equal(M.frameAt(M.makeTrace({promptTokens:8190}),48).generated,3);assert.equal(M.frameAt(M.makeTrace({promptTokens:0}),2).counts.prefillPerLayer,48,'an empty prompt is represented by explicit BOS, not zero-length attention');
assert.equal(M.frameAt(defaultTrace,-4).time,0);assert.equal(M.frameAt(defaultTrace,NaN).time,0);assert.equal(M.frameAt(defaultTrace,Infinity).time,48);
const incoming={promptTokens:6,weight:-1.2},old=M.makeTrace(incoming),oldHistory=JSON.stringify(old);incoming.promptTokens=48;incoming.weight=4;const changed=M.makeTrace(incoming);assert.equal(old.params.promptTokens,6);assert.equal(changed.params.promptTokens,48);assert.equal(M.frameAt(changed,0).generated,0);assert.equal(JSON.stringify(old),oldHistory,'a new experiment does not alter the previous trace');

for(const label of [0,1])for(const weight of [-8,-1.2,0,3,8])for(const learningRate of [0,.05,.7,1,2]){
 const trace=M.makeTrace({mode:'learn',label,weight,learningRate}),probability=sigmoid(weight),gradient=probability-label,after=weight-learningRate*gradient;learningCases++;
 near(trace.learning.loss,bce(weight,label));near(trace.learning.gradient,gradient);near(trace.learning.after,after);near(trace.learning.afterLoss,bce(after,label));near(M.logisticLoss(weight,label),bce(weight,label));
 const numericalGradient=(bce(weight+1e-5,label)-bce(weight-1e-5,label))/2e-5;near(trace.learning.gradient,numericalGradient,'the displayed gradient differentiates the binary cross entropy',1e-6);
 if(learningRate>0)assert(trace.learning.afterLoss<trace.learning.loss,'a small step toward the labelled sample reduces its loss');else near(trace.learning.afterLoss,trace.learning.loss);
 for(const time of [0,11.999999,12,23.999999,24,35.999999,36,47.999999,48]){
  const frame=M.frameAt(trace,time),training=frame.training;frames++;assert.equal(frame.generated,0);assert.equal(frame.counts.totalPerLayer,0);assert.equal(frame.inferenceActive,false);assert(!frame.attention.ready.query&&!frame.router.ready&&!frame.output.ready,'the separate logistic lesson does not pretend to run decoder inference');
  assert.equal(training.probability,time>=12?trace.learning.probability:null);assert.equal(training.loss,time>=24?trace.learning.loss:null);assert.equal(training.gradient,time>=36?trace.learning.gradient:null);assert.equal(training.after,time>=48?after:null);assert.equal(training.delta,time>=48?after-weight:null);near(training.weight,time>=48?after:weight);assert.equal(frame.inferenceWeightsFrozen,true);
  M.frameAt(trace,48);assert.deepEqual(M.frameAt(trace,time),frame,'rewinding supervised training restores the pre-update weight');
 }
}
for(const label of [0,1]){let weight=-1.2;for(let iteration=0;iteration<30;iteration++){const trace=M.makeTrace({mode:'learn',weight,label}),after=trace.learning.after;assert(bce(after,label)<bce(weight,label));weight=after;}}
assert.equal(JSON.stringify(M.TOY_WEIGHTS),weightsBefore,'all decoder embedding, attention, router and expert weights stay constant during both lessons');
assert.equal(M.brainJoules(0),0);assert.equal(M.brainJoules(8),160);assert.throws(()=>M.brainJoules(-1));assert.throws(()=>M.brainJoules(NaN));assert.throws(()=>M.logisticLoss(NaN));assert.throws(()=>M.logisticLoss(0,2));
console.log(`Mind model: ${frames} causal/fractional/reversible frames, ${mathSteps} independent attention/router/expert/logit calculations, ${learningCases} separate labelled logistic updates, triangular prefill/decode/KV counts, 8192 capacity without eviction, fixed inference weights, independent chunks and estimated 20 W energy: OK`);
