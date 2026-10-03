import assert from 'node:assert/strict';
import {V2,JAMBA,MAMBA_STATE,DEEPSEEK,ANTHROPIC_RULE,TARIFFS,FAMILIES,CHAPTER_IDS,TOY_WEIGHTS,tariffById,softmax,attentionMask,moeActiveFraction,mhaElementsPerToken,mlaElementsPerToken,elementsToBytes,jambaAttentionLayers,contextMemory,serialRounds,jepaError,jevChoice,jevIndependent,requestCost,repeatedPrefix,requestsToBreakEven,createState,cleanState,snapshot,makeModelsTrace,modelsFrameAt} from './site-src/modelos/model.js';

const close=(actual,expected,label='numeric oracle')=>assert(Math.abs(actual-expected)<=1e-11*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);
const sum=values=>values.reduce((a,b)=>a+b,0);
let rejectedInputs=0,attentionRows=0,routerCases=0,ssmTransitions=0,frameCases=0,generatorStates=0,billingCases=0,ruleCases=0,frozenObjects=0;
function rejects(fn){assert.throws(fn,RangeError);rejectedInputs++;}
function immutableFinite(value,seen=new Set()){
  if(typeof value==='number'){assert(Number.isFinite(value),'Trace numbers must be JSON finite');return;}
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);assert(Object.isFrozen(value),'Nested model values must be immutable');frozenObjects++;
  for(const child of Object.values(value))immutableFinite(child,seen);
}
// Independent oracle data: an eight-position, untrained two-dimensional example.
const embeddings=[[1,0],[.6,.8],[-.3,.9],[-.8,.2],[.2,-.7],[.9,.4],[-.5,-.6],[.3,.5]];
const project=(x,matrix)=>matrix[0].map((_,j)=>sum(x.map((v,i)=>v*matrix[i][j])));
const q=embeddings.map(x=>project(x,[[1,.2],[-.1,.9]]));
const k=embeddings.map(x=>project(x,[[.8,-.3],[.4,1]]));
const v=embeddings.map(x=>project(x,[[.7,.1],[-.2,.8]]));
function weightsOracle(scores,allowed){
  const max=Math.max(...scores.filter((_,i)=>allowed[i]));
  const exponent=scores.map((x,i)=>allowed[i]?Math.exp(x-max):0),total=sum(exponent);
  return exponent.map(x=>x/total);
}
function attentionOracle(query,keys,values,allowed){
  const scores=keys.map(key=>sum(query.map((x,i)=>x*key[i]))/Math.sqrt(2));
  const weights=weightsOracle(scores,allowed),output=[0,1].map(d=>sum(weights.map((w,i)=>w*values[i][d])));
  return{scores,weights,output};
}

// Public reference dimensions and prices are distinct from the toy computation.
assert.equal(DEEPSEEK.checked,'2026-10-03');assert.equal(DEEPSEEK.date,'2026-10-03');
assert.equal(DEEPSEEK.flash.off.hit,.003);assert.equal(DEEPSEEK.flash.off.miss,.15);assert.equal(DEEPSEEK.flash.off.output,.6);
assert.equal(DEEPSEEK.pro.off.hit,.022);assert.equal(DEEPSEEK.pro.off.miss,.66);assert.equal(DEEPSEEK.pro.off.output,1.98);
for(const group of ['flash','pro'])for(const category of ['hit','miss','output'])close(DEEPSEEK[group].peak[category],2*DEEPSEEK[group].off[category]);
assert.equal(TARIFFS.length,4);close(DEEPSEEK.announced2024.hit/DEEPSEEK.announced2024.miss,.1);
assert.notEqual(DEEPSEEK.announced2024.hit,DEEPSEEK.flash.off.hit);
assert.equal(ANTHROPIC_RULE.read,.1);assert.deepEqual(ANTHROPIC_RULE.readExceptions,[.05,.025]);
assert.equal(MAMBA_STATE,16);assert.equal(jambaAttentionLayers(),4);assert.equal(JAMBA.layers,32);
assert.equal(mhaElementsPerToken(),1966080);assert.equal(mlaElementsPerToken(),34560);
close(mhaElementsPerToken()/mlaElementsPerToken(),56+8/9);
assert.equal(elementsToBytes(34560),69120);
for(const n of [0,1,8,4096,32000]){
  const memory=contextMemory(n);assert.equal(memory.tokens,n);assert.equal(memory.mha,n*1966080);assert.equal(memory.mla,n*34560);
  assert.equal(memory.ssmExample,3);assert.equal(memory.ssm,undefined,'A per-channel N cannot stand in for full Mamba memory');
}
assert.deepEqual(serialRounds('autoregressive',8,8),{rounds:8,positionsPerRound:1});
assert.deepEqual(serialRounds('diffusion',8,8),{rounds:8,positionsPerRound:8});
for(const bad of [-1,NaN,Infinity,.5,'8']){
  rejects(()=>contextMemory(bad));rejects(()=>moeActiveFraction(8,bad));rejects(()=>attentionMask('causal',bad,8));
}
rejects(()=>mhaElementsPerToken({...V2,heads:0}));rejects(()=>mlaElementsPerToken({...V2,kvLoraRank:Infinity}));
rejects(()=>elementsToBytes(-1));rejects(()=>contextMemory(Number.MAX_SAFE_INTEGER));rejects(()=>jambaAttentionLayers(1.5,8));
rejects(()=>serialRounds('bad',8,8));rejects(()=>serialRounds('diffusion',0,8));rejects(()=>moeActiveFraction(8,9));
rejects(()=>softmax([]));rejects(()=>softmax([Infinity]));rejects(()=>tariffById('unknown'));
close(softmax([10000,10000])[0],.5);close(softmax([-10000,0])[1],1);
for(const invalid of [{kind:'causal',query:8,count:8},{kind:'cross',query:8,count:8,source:5},{kind:'cross',query:0,count:8,source:0},{kind:'unknown',query:0,count:8}]){
  rejects(()=>attentionMask(invalid.kind,invalid.query,invalid.count,invalid.source));
}
assert.deepEqual(attentionMask('causal',2,8),[1,1,1,0,0,0,0,0]);
assert.deepEqual(attentionMask('bidirectional',0,8),Array(8).fill(1));
assert.deepEqual(attentionMask('cross',0,8,5),Array(5).fill(1));

// UI sanitization bounds and caller data are not mutated.
const raw={...createState(),tokens:Infinity,query:'3.9',prefix:-1,suffix:50000,output:'321',repeats:0,denoise:90,hitFraction:.375,baseInput:-7,readMultiplier:.025,alien:{keep:true}};
const rawBefore=JSON.stringify(raw),clean=cleanState(raw);
assert.equal(clean.tokens,4096);assert.equal(clean.query,3);assert.equal(clean.prefix,0);assert.equal(clean.suffix,20000);assert.equal(clean.output,321);
assert.equal(clean.repeats,1);assert.equal(clean.denoise,16);assert.equal(clean.baseInput,0);assert.equal(clean.readMultiplier,.025);assert.equal(clean.alien,undefined);
assert.equal(JSON.stringify(raw),rawBefore);
const limits=cleanState({tokens:99999,repeats:999,query:999,prefix:999999,output:999999,suffix:999999,hitFraction:2,baseInput:999});
assert.deepEqual([limits.tokens,limits.repeats,limits.query,limits.prefix,limits.output,limits.suffix,limits.hitFraction,limits.baseInput],[32000,200,7,200000,20000,20000,1,100]);
assert.equal(cleanState({tokens:0}).tokens,0);assert.equal(cleanState({tokens:-10}).tokens,0);
assert.equal(cleanState({readMultiplier:.2}).readMultiplier,.1);assert.equal(cleanState({family:'invented',tariff:'invented',writeRule:'bad'}).family,'cache');
assert.deepEqual(cleanState(null),cleanState(createState()));
assert.equal(cleanState({tokens:'   '}).tokens,4096);
const caller=createState(),callerBefore=JSON.stringify(caller),trace=makeModelsTrace(caller);
snapshot(caller);modelsFrameAt(trace,2,.42);assert.equal(JSON.stringify(caller),callerBefore);
caller.query=7;assert.equal(trace.params.query,4,'A later UI edit cannot rewrite a trace');
assert.equal(CHAPTER_IDS.length,12);assert.equal(FAMILIES.length,9);
immutableFinite(DEEPSEEK);immutableFinite(ANTHROPIC_RULE);immutableFinite(TARIFFS);immutableFinite(TOY_WEIGHTS);immutableFinite(trace);
// Actual attention: scores, causal exclusion and value mixing are independent oracles.
const encoderExpected=q.map(query=>attentionOracle(query,k,v,Array(8).fill(true)));
const crossK=encoderExpected.map(row=>project(row.output,[[.8,-.3],[.4,1]]));
const crossV=encoderExpected.map(row=>project(row.output,[[.7,.1],[-.2,.8]]));
assert.deepEqual(trace.attention.tokens,['t0','t1','t2','t3','t4','t5','t6','t7']);
assert.deepEqual(trace.attention.q,q);assert.deepEqual(trace.attention.k,k);assert.deepEqual(trace.attention.v,v);
close(trace.attention.causal[0].scores[0],.74/Math.sqrt(2));
close(trace.attention.causal[0].output[0],.7);close(trace.attention.causal[0].output[1],.1);
for(const kind of ['causal','encoder','cross'])for(let i=0;i<8;i++){
  const row=trace.attention[kind][i],allowed=Array.from({length:8},(_,j)=>kind==='causal'?j<=i:true);
  const expected=attentionOracle(q[i],kind==='cross'?crossK:k,kind==='cross'?crossV:v,allowed);
  assert.deepEqual(row.allowed,allowed);assert.equal(row.queryIndex,i);
  row.scores.forEach((x,j)=>close(x,expected.scores[j],`${kind} QK score`));
  row.weights.forEach((x,j)=>{close(x,expected.weights[j],`${kind} masked softmax`);assert(x>=0);if(!allowed[j])assert.equal(x,0);});
  row.output.forEach((x,d)=>close(x,expected.output[d],`${kind} weighted V`));close(sum(row.weights),1);
  assert.equal(row.sourceKind,kind==='cross'?'encoder-output':kind==='encoder'?'encoder':'decoder');attentionRows++;
}
assert(trace.attention.causal[4].weights.slice(0,5).some(x=>Math.abs(x-.2)>.001),'A permission mask is not uniform attention');
trace.attention.encoderStates.forEach((row,i)=>row.forEach((x,d)=>close(x,encoderExpected[i].output[d])));
trace.attention.crossK.forEach((row,i)=>row.forEach((x,d)=>close(x,crossK[i][d])));
trace.attention.crossV.forEach((row,i)=>row.forEach((x,d)=>close(x,crossV[i][d])));
assert.notDeepEqual(trace.attention.crossK,trace.attention.k,'Cross-attention reads encoder states, not a future decoder sequence');

// The router changes its selected experts when its input changes; it is not decorative.
const routerMatrix=[[.7,-.5,.2,1,-.7,.45,-.2,.6],[-.4,.8,.6,-.25,.9,-.6,.5,.1]],routerBias=[.05,-.1,.12,-.02,.08,.03,-.05,.01];
const selectedSets=new Set();
for(let query=0;query<8;query++){
  const t=makeModelsTrace({query}),m=t.moe,input=attentionOracle(q[query],k,v,Array.from({length:8},(_,j)=>j<=query)).output;
  const logits=project(input,routerMatrix).map((x,i)=>x+routerBias[i]);
  const ranked=Array.from({length:8},(_,i)=>i).sort((a,b)=>logits[b]-logits[a]||a-b),selected=ranked.slice(0,2);
  m.logits.forEach((x,i)=>close(x,logits[i]));assert.deepEqual(m.active,selected);selectedSets.add(selected.join(','));
  const topWeights=weightsOracle(selected.map(i=>logits[i]),[true,true]);
  for(let i=0;i<8;i++){
    if(!selected.includes(i))assert.equal(m.weights[i],0);else close(m.weights[i],topWeights[selected.indexOf(i)]);
    const matrix=[[.55+.08*i,.16-.04*i],[-.25+.06*i,.8-.05*i]],bias=[.025*(i-3),-.02*(i-4)];
    const expert=project(input,matrix).map((x,d)=>Math.tanh(x+bias[d]));
    m.expertOutputs[i].forEach((x,d)=>close(x,expert[d],'Expert transform'));
  }
  close(sum(m.weights),1);assert.equal(m.weights.filter(x=>x>0).length,2);
  m.output.forEach((x,d)=>close(x,sum(selected.map((id,j)=>topWeights[j]*m.expertOutputs[id][d])),'Top-2 weighted mixture'));
  const serialized=JSON.stringify(t.moe);for(const p of [0,.3,.8,1,.1])modelsFrameAt(t,4,p);assert.equal(JSON.stringify(t.moe),serialized);
  routerCases++;
}
assert(selectedSets.size>2);assert.deepEqual(makeModelsTrace({query:0}).moe.active,[3,0]);assert.deepEqual(makeModelsTrace({query:2}).moe.active,[4,2]);
close(moeActiveFraction(8,2),.25);

// Three scalar channels persist in a recurrence; there is no growing token archive.
let previous=[0,0,0];assert.deepEqual(trace.ssm.states[0],previous);
for(let i=0;i<8;i++){
  const input=[...embeddings[i],.6*Math.sin(i+1)],gate=input.map((x,j)=>1/(1+Math.exp(-(x*[.5,-.4,.3][j]+[.15,-.1,.2][j]))));
  const expected=input.map((x,j)=>gate[j]*previous[j]+(1-gate[j])*Math.tanh(x));
  trace.ssm.inputs[i].forEach((x,j)=>close(x,input[j]));trace.ssm.gates[i].forEach((x,j)=>{close(x,gate[j]);assert(x>0&&x<1);});
  trace.ssm.states[i+1].forEach((x,j)=>{close(x,expected[j],'Gated recurrent update');assert(Math.abs(x)<1);});
  previous=expected;ssmTransitions++;
}
assert(trace.ssm.states.every(x=>x.length===3));assert(trace.ssm.gates.some((row,i)=>i&&row.some((x,j)=>x!==trace.ssm.gates[0][j])));
for(let completed=0;completed<8;completed++){
  const before=modelsFrameAt(trace,5,(completed+.999)/8),at=modelsFrameAt(trace,5,(completed+1)/8);
  assert.deepEqual(before.ssm.state,trace.ssm.states[completed]);assert.deepEqual(at.ssm.state,trace.ssm.states[completed+1]);
}

// Same eight output positions: AR is serial; the masked schedule has K declared rounds.
const targetTokens=['t0','t1','t2','t3','t4','t5','t6','t7'];
for(let rounds=1;rounds<=16;rounds++){
  const t=makeModelsTrace({denoise:rounds});assert.equal(t.diffusion.states.length,rounds+1);assert.equal(t.autoregressive.states.length,9);
  assert.deepEqual(t.diffusion.states[0],Array(8).fill('·'));assert.deepEqual(t.diffusion.states[rounds],targetTokens);
  assert.deepEqual(t.autoregressive.states[0],Array(8).fill('·'));assert.deepEqual(t.autoregressive.states[8],targetTokens);
  assert.equal(t.diffusion.positionsPerRound,8);assert.equal(t.autoregressive.positionsPerRound,1);
  for(let r=0;r<=rounds;r++){
    const state=t.diffusion.states[r];assert.equal(state.length,8);assert.equal(state.filter(x=>x!=='·').length,Math.floor(r*8/rounds));
    for(let i=0;i<8;i++){assert(state[i]==='·'||state[i]===targetTokens[i]);if(r&&t.diffusion.states[r-1][i]!=='·')assert.equal(state[i],t.diffusion.states[r-1][i]);}
    assert.deepEqual(modelsFrameAt(t,6,r/rounds).diffusion.state,state);generatorStates++;
    if(r<rounds)assert.deepEqual(modelsFrameAt(t,6,(r+.999)/rounds).diffusion.state,state);
  }
  for(let r=0;r<=8;r++)assert.deepEqual(t.autoregressive.states[r],targetTokens.map((x,i)=>i<r?x:'·'));
}
// Eight masked rounds do not imply an eightfold speedup or eight rounds of actual LLaDA.
assert.match(trace.diffusion.scope,/no exact LLaDA/);assert.match(trace.ssm.scope,/not a Mamba implementation/);

// JEPA compares continuous targets; Jev is a constrained toy choice, not confidence in truth.
const squared=[.04,.09,.04,.04,.04,.09];trace.jepa.squared.forEach((x,i)=>close(x,squared[i]));close(trace.jepa.error,.34/6);
assert.equal(jepaError([0,0],[0,1]),.5);rejects(()=>jepaError([0],[0,1]));rejects(()=>jepaError([NaN],[0]));
const targetBefore=JSON.stringify(trace.jepa.target);for(const p of [1,.4,0,.9])modelsFrameAt(trace,7,p);assert.equal(JSON.stringify(trace.jepa.target),targetBefore);
assert.equal(trace.jev.length,2);assert.deepEqual(trace.jev[0].options,['yes','no']);assert.equal(trace.jev[0].choice,'yes');close(trace.jev[0].probabilities[0],.5);
close(trace.jev[1].probabilities[0],1/(1+Math.exp(-1.8)));assert.equal(trace.jev[1].choice,'yes');
for(const record of trace.jev){close(sum(record.probabilities),1);assert.equal(record.choice,record.options[record.index]);assert(record.probabilities.every(x=>x>0&&x<1));}
const choice=jevChoice(['wait','charge','refer'],[0,3,-1]);assert.equal(choice.choice,'charge');assert.equal(choice.index,1);
assert.equal(jevChoice(['charge','wait','refer'],[3,0,-1]).choice,'charge');assert.equal(jevChoice(['no','yes'],[0,0]).choice,'no');
assert.deepEqual(jevIndependent([{options:['a','b'],logits:[0,0]},{options:['a','b'],logits:[0,0]}]).map(x=>x.probabilities),[[.5,.5],[.5,.5]]);
rejects(()=>jevChoice(['yes','yes'],[0,1]));rejects(()=>jevChoice(['yes','no'],[0]));rejects(()=>jevChoice(['yes','no'],[0,NaN]));

// Cache accounts: cold first request, partial hits, aggregate input share and fresh output.
const prices=tariffById('flash-off'),fixture={prefix:8000,suffix:400,output:600,repeats:3,hitFraction:.375};
const bill=repeatedPrefix(prices,fixture);
close(bill.first.total,.00162);close(bill.later.total,.001179);close(bill.withCache,.003978);close(bill.noCache,.00486);close(bill.saved,.000882);
assert.deepEqual(bill.firstCounts,{hit:0,miss:8400,output:600});assert.deepEqual(bill.laterCounts,{hit:3000,miss:5400,output:600});
assert.equal(bill.hit,6000);assert.equal(bill.miss,19200);assert.equal(bill.output,1800);close(bill.hitRate,6000/25200);close(bill.laterHitShare,3000/8400);
assert.equal(bill.first.outputCost,bill.later.outputCost);assert.notEqual(bill.hitRate,bill.laterHitShare);
assert.equal(requestCost(prices,{output:1e6}).total,.6);
for(const tariff of TARIFFS)for(const repeats of [1,2,3,50,200])for(const hitFraction of [0,.375,1]){
  const b=repeatedPrefix(tariff,{...fixture,repeats,hitFraction});let total=0,hit=0,miss=0,output=0;
  for(let n=0;n<repeats;n++){
    const h=n?Math.floor(8000*hitFraction):0,m=8400-h;hit+=h;miss+=m;output+=600;
    total+=(h*tariff.hit+m*tariff.miss+600*tariff.output)/1e6;
  }
  close(b.withCache,total);close(b.noCache,repeats*(8400*tariff.miss+600*tariff.output)/1e6);
  assert.equal(b.hit,hit);assert.equal(b.miss,miss);assert.equal(b.output,output);close(b.hitRate,hit/(hit+miss));
  assert(b.saved>=-1e-12);if(repeats===1||hitFraction===0)close(b.saved,0);billingCases++;
}
assert.equal(repeatedPrefix(prices,{prefix:0,suffix:0,output:600,repeats:4}).hitRate,0);
assert.equal(repeatedPrefix(prices,{prefix:3,suffix:0,output:0,repeats:2,hitFraction:.5}).hit,1);
for(const settings of [{prefix:-1},{suffix:NaN},{output:.5},{repeats:0},{hitFraction:-.1},{hitFraction:1.01}])rejects(()=>repeatedPrefix(prices,{...fixture,...settings}));
rejects(()=>requestCost(prices,{hit:-1}));rejects(()=>requestCost({...prices,miss:-1},{miss:1}));
rejects(()=>requestCost(prices,{output:Infinity}));rejects(()=>requestsToBreakEven(.5,.1));rejects(()=>requestsToBreakEven(1,-1));
rejects(()=>repeatedPrefix(prices,{prefix:1,suffix:1,output:0,repeats:Number.MAX_SAFE_INTEGER,hitFraction:.5}));
rejects(()=>repeatedPrefix({hit:1e308,miss:1e308,output:1e308},{prefix:1,suffix:0,output:0,repeats:1e12}));
assert.equal(requestsToBreakEven(1,.02),1);assert.equal(requestsToBreakEven(2,1),Infinity);

// Write/read multipliers: compare prefix-only costs, with the writing call included.
for(const writeRule of ['5m','1h'])for(const readMultiplier of [.1,.05,.025]){
  const t=makeModelsTrace({prefix:100000,baseInput:3,repeats:10,writeRule,readMultiplier}),r=t.rule,write=writeRule==='5m'?1.25:2;
  close(r.breakEven,(write-readMultiplier)/(1-readMultiplier));assert.equal(r.firstCheaper,writeRule==='5m'?2:3);
  assert.equal(r.withCache.length,11);assert.equal(r.noCache.length,11);assert.equal(r.withCache[0],0);assert.equal(r.noCache[0],0);
  for(let n=1;n<=10;n++){close(r.withCache[n],.3*write+.3*(n-1)*readMultiplier);close(r.noCache[n],.3*n);assert.equal(r.withCache[n]<r.noCache[n],n>=r.firstCheaper);}
  const changed=makeModelsTrace({...t.params,suffix:19999,output:19999});assert.deepEqual(changed.rule,r,'Equal suffix/output charges are outside the prefix-only comparison');ruleCases++;
}
for(const settings of [{prefix:0},{baseInput:0}]){const r=makeModelsTrace(settings).rule;assert.equal(r.firstCheaper,null);assert(r.withCache.every(x=>x===0));assert(r.noCache.every(x=>x===0));}

// Fractions do not complete future operations. External seeks and reverse leave history fixed.
const replayTrace=makeModelsTrace({...fixture,query:4,denoise:5,tokens:37}),serialized=JSON.stringify(replayTrace);
const fractions=[0,.001,.1249,.125,.2499,.25,.4999,.5,.7999,.8,.9999,1];
for(let chapter=0;chapter<12;chapter++)for(const p of fractions){
  const f=modelsFrameAt(replayTrace,chapter,p),completed=Math.floor(p*8),calls=Math.floor(p*3);
  assert.equal(f.chapter,chapter);assert.equal(f.chapterId,CHAPTER_IDS[chapter]);assert.equal(f.progress,p);assert.equal(f.completed,completed);assert.equal(f.step,Math.min(7,completed));
  assert.equal(f.attention.queryIndex,4);assert.equal(f.attention.ready,p>=.8);assert.equal(f.attention.kind,chapter===2?'encoder':chapter===3?'cross':'causal');
  assert.equal(f.attention.phase,p<.25?'query':p<.5?'scores':p<.8?'weights':'mix');
  assert.deepEqual(f.ssm.state,replayTrace.ssm.states[completed]);assert.equal(f.round,Math.floor(p*5));assert.deepEqual(f.diffusion.state,replayTrace.diffusion.states[Math.floor(p*5)]);
  assert.equal(f.typedRevealed,Math.floor(p*2));assert.equal(f.activeDimension,Math.min(5,Math.floor(p*6)));assert.equal(f.memoryTokens,Math.floor(37*p));
  assert.equal(f.completedRequests,calls);assert.equal(f.billRunning.completedRequests,calls);assert.equal(f.requestIndex,Math.min(2,calls));
  close(f.billRunning.withCache,calls?.00162+(calls-1)*.001179:0);close(f.billRunning.noCache,calls*.00162);
  assert.equal(f.billRunning.hit,Math.max(0,calls-1)*3000);assert.equal(f.billRunning.miss,calls?8400+(calls-1)*5400:0);assert.equal(f.billRunning.output,calls*600);
  assert.equal(f.rule.withCacheRunning,replayTrace.rule.withCache[calls]);assert.equal(f.rule.noCacheRunning,replayTrace.rule.noCache[calls]);
  assert.equal(f.trace,replayTrace);assert.equal(f.params,replayTrace.params);immutableFinite(f);frameCases++;
}
const saved=modelsFrameAt(replayTrace,5,.4375);
for(const p of [1,0,.999,.8,.01])modelsFrameAt(replayTrace,5,p);
assert.deepEqual(modelsFrameAt(replayTrace,5,.4375),saved);assert.equal(JSON.stringify(replayTrace),serialized);
assert.equal(modelsFrameAt(replayTrace,-5,-1).chapter,0);assert.equal(modelsFrameAt(replayTrace,30,30).chapter,11);assert.equal(modelsFrameAt(replayTrace,30,30).progress,1);
assert.equal(modelsFrameAt(replayTrace,NaN,Infinity).progress,0);
const changed=makeModelsTrace({...replayTrace.params,query:0,tariff:'pro-peak',hitFraction:0});
assert.equal(modelsFrameAt(changed,9,0).completedRequests,0);assert.equal(modelsFrameAt(changed,5,0).completed,0);assert.notDeepEqual(changed.moe.active,replayTrace.moe.active);assert.equal(JSON.stringify(replayTrace),serialized);
const summary=snapshot(createState());assert.equal(summary.family,'cache');assert(summary.bill.saved>0);assert(summary.causalHidesFuture);assert(summary.encoderSeesFuture);assert(summary.ssmFlat);
assert.equal(summary.diffusion.positionsPerRound,8);assert.equal(summary.autoregressive.rounds,8);assert.equal(summary.crossWidth,8);close(summary.jepa,.34/6);
assert.throws(()=>{trace.attention.causal[0].weights[0]=0;},TypeError);assert.throws(()=>{trace.params.query=7;},TypeError);assert.throws(()=>{DEEPSEEK.flash.off.hit=1;},TypeError);
console.log(`Models OK: ${attentionRows} QK/mask/AV rows, ${routerCases} value-based routers, ${ssmTransitions} gated transitions, ${generatorStates} masked states, ${billingCases} aggregate bills, ${ruleCases} write/read rules, ${frameCases} causal/reverse chapter frames, ${rejectedInputs} rejected invalid inputs, ${frozenObjects} immutable finite objects checked.`);
