// Published references and explicit, untrained teaching examples. Presentation progress
// is supplied by the player: this module has no clock, random state or learned updates.
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function nonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
  return value;
}
function integer(value, name, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
  return value;
}
function finiteVector(vector, name) {
  if (!Array.isArray(vector) || !vector.length || vector.some(x => !Number.isFinite(x))) throw new RangeError(`${name} must be a finite nonempty vector`);
  return vector;
}
function finiteProduct(value, name) {
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) throw new RangeError(`${name} is too large`);
  return value;
}
export const V2 = deepFreeze({layers:60,heads:128,headDim:128,kvLoraRank:512,ropeDim:64,bytes:2});
export const JAMBA = deepFreeze({layers:32,attentionEvery:8});
// A published per-channel state width, NOT the full state size of a Mamba model.
export const MAMBA_STATE = 16;
// USD / million tokens; official price sheet checked on this date, not a forecast.
export const DEEPSEEK = deepFreeze({
  date:'2026-10-03',checked:'2026-10-03',
  peakUtc:'Mon–Fri 01:00–04:00 and 06:00–10:00 UTC, outside Chinese public holidays',
  flash:{off:{hit:.003,miss:.15,output:.6},peak:{hit:.006,miss:.3,output:1.2}},
  pro:{off:{hit:.022,miss:.66,output:1.98},peak:{hit:.044,miss:1.32,output:3.96}},
  announced2024:{hit:.014,miss:.14}
});
// Standard read multiplier .1; selected published exceptions are .05 and .025.
export const ANTHROPIC_RULE = deepFreeze({read:.1,readExceptions:[.05,.025],write5m:1.25,write1h:2});
export const TARIFFS = deepFreeze([
  {id:'flash-off',group:'flash',band:'off',...DEEPSEEK.flash.off},
  {id:'flash-peak',group:'flash',band:'peak',...DEEPSEEK.flash.peak},
  {id:'pro-off',group:'pro',band:'off',...DEEPSEEK.pro.off},
  {id:'pro-peak',group:'pro',band:'peak',...DEEPSEEK.pro.peak}
]);
export const FAMILIES = deepFreeze([
  {id:'causal',es:'Decodificador',en:'Decoder'},
  {id:'encoder',es:'Codificador',en:'Encoder'},
  {id:'encdec',es:'Codificador-decodificador',en:'Encoder-decoder'},
  {id:'moe',es:'Expertos',en:'Experts'},
  {id:'ssm',es:'Estado y Jamba',en:'State and Jamba'},
  {id:'diffusion',es:'Difusión',en:'Diffusion'},
  {id:'jepa',es:'JEPA',en:'JEPA'},
  {id:'jev',es:'Jev',en:'Jev'},
  {id:'cache',es:'Caché y precio',en:'Cache and price'}
]);
export const CHAPTER_IDS = deepFreeze(['intro','causal','encoder','encdec','moe','ssm','diffusion','jepa','jev','cache','disk','rule']);
export const TOY_WEIGHTS = deepFreeze({
  embeddings:[[1,0],[.6,.8],[-.3,.9],[-.8,.2],[.2,-.7],[.9,.4],[-.5,-.6],[.3,.5]],
  query:[[1,.2],[-.1,.9]],key:[[.8,-.3],[.4,1]],value:[[.7,.1],[-.2,.8]],
  router:[[.7,-.5,.2,1,-.7,.45,-.2,.6],[-.4,.8,.6,-.25,.9,-.6,.5,.1]],
  routerBias:[.05,-.1,.12,-.02,.08,.03,-.05,.01],
  experts:Array.from({length:8},(_,i)=>({
    matrix:[[.55+.08*i,.16-.04*i],[-.25+.06*i,.8-.05*i]],
    bias:[.025*(i-3),-.02*(i-4)]
  })),
  ssmGateScale:[.5,-.4,.3],ssmGateBias:[.15,-.1,.2]
});
export function tariffById(id) {
  const result=TARIFFS.find(t=>t.id===id);
  if (!result) throw new RangeError('Unknown tariff');
  return result;
}
export function softmax(logits) {
  finiteVector(logits,'Logits');
  const max=Math.max(...logits),exponents=logits.map(x=>Math.exp(x-max));
  const total=exponents.reduce((a,b)=>a+b,0);
  return deepFreeze(exponents.map(x=>x/total));
}
// Permission only, not a probability distribution. Q/K scores determine the weights.
export function attentionMask(kind,query,count,sourceCount=count) {
  integer(count,'Count',1); integer(query,'Query');
  if (query>=count) throw new RangeError('Query out of range');
  if (kind==='cross') { integer(sourceCount,'Source count',1); return deepFreeze(Array(sourceCount).fill(1)); }
  if (kind==='causal') return deepFreeze(Array.from({length:count},(_,j)=>+(j<=query)));
  if (kind==='encoder'||kind==='bidirectional') return deepFreeze(Array(count).fill(1));
  throw new RangeError('Unknown mask');
}
export function moeActiveFraction(experts,active) {
  integer(experts,'Experts',1); integer(active,'Active experts',1);
  if (active>experts) throw new RangeError('Active experts must fit');
  return active/experts;
}
export function mhaElementsPerToken(spec=V2) {
  for (const key of ['layers','heads','headDim']) integer(spec[key],key,1);
  return finiteProduct(spec.layers*2*spec.heads*spec.headDim,'MHA values');
}
export function mlaElementsPerToken(spec=V2) {
  for (const key of ['layers','kvLoraRank','ropeDim']) integer(spec[key],key,1);
  return finiteProduct(spec.layers*(spec.kvLoraRank+spec.ropeDim),'MLA values');
}
export function elementsToBytes(elements,bytes=V2.bytes) {
  integer(elements,'Elements'); integer(bytes,'Bytes per value',1);
  return finiteProduct(elements*bytes,'Bytes');
}
export function jambaAttentionLayers(layers=JAMBA.layers,every=JAMBA.attentionEvery) {
  integer(layers,'Layers',1); integer(every,'Attention interval',1);
  return Math.floor(layers/every);
}
export function contextMemory(tokens) {
  integer(tokens,'Tokens');
  return deepFreeze({tokens,mha:finiteProduct(tokens*mhaElementsPerToken(),'MHA cache'),mla:finiteProduct(tokens*mlaElementsPerToken(),'MLA cache'),ssmExample:3});
}
export function serialRounds(kind,length,steps) {
  integer(length,'Length',1); integer(steps,'Steps',1);
  if (kind==='autoregressive') return deepFreeze({rounds:length,positionsPerRound:1});
  if (kind==='diffusion') return deepFreeze({rounds:steps,positionsPerRound:length});
  throw new RangeError('Unknown generator');
}
export function jepaError(predicted,target) {
  finiteVector(predicted,'Predicted latents'); finiteVector(target,'Target latents');
  if (predicted.length!==target.length) throw new RangeError('Latent vectors must match');
  const result=predicted.reduce((sum,x,i)=>sum+(x-target[i])**2,0)/predicted.length;
  if (!Number.isFinite(result)) throw new RangeError('Latent error overflow');
  return result;
}
// A toy constrained interface, not Jev's unpublished weights or calibrated confidence.
export function jevChoice(options,logits) {
  if (!Array.isArray(options)||options.length<2||options.length!==logits?.length||options.some(x=>typeof x!=='string')||new Set(options).size!==options.length) throw new RangeError('Distinct options and logits must match');
  const probabilities=softmax(logits);
  let index=0;
  for (let i=1;i<probabilities.length;i++) if (probabilities[i]>probabilities[index]) index=i;
  return deepFreeze({options:[...options],choice:options[index],probabilities,index});
}
export function jevIndependent(questions) {
  if (!Array.isArray(questions)) throw new RangeError('Questions required');
  return deepFreeze(questions.map(q=>jevChoice(q.options,q.logits)));
}
export function requestCost(prices,{hit=0,miss=0,output=0}) {
  for (const [name,value] of Object.entries({hit,miss,output})) integer(value,name);
  for (const key of ['hit','miss','output']) nonnegative(prices[key],`${key} price`);
  const hitCost=hit/1e6*prices.hit,missCost=miss/1e6*prices.miss,outputCost=output/1e6*prices.output;
  const total=hitCost+missCost+outputCost;
  if (!Number.isFinite(total)) throw new RangeError('Cost overflow');
  return deepFreeze({hitCost,missCost,outputCost,total});
}
// A declared hit scenario. Eligibility, eviction, lifetime and matching are not guaranteed.
// The first request is cold; output is regenerated and charged on every request.
export function repeatedPrefix(prices,{prefix,suffix,output,repeats,hitFraction=1}) {
  integer(prefix,'Prefix'); integer(suffix,'Suffix'); integer(output,'Output'); integer(repeats,'Repeats',1);
  nonnegative(hitFraction,'Hit fraction');
  if (hitFraction>1) throw new RangeError('Hit fraction cannot exceed one');
  const laterHit=Math.floor(prefix*hitFraction);
  const firstCounts={hit:0,miss:prefix+suffix,output};
  const laterCounts={hit:laterHit,miss:prefix-laterHit+suffix,output};
  const first=requestCost(prices,firstCounts),later=requestCost(prices,laterCounts);
  const hit=finiteProduct((repeats-1)*laterHit,'Aggregate hits');
  const miss=finiteProduct(firstCounts.miss+(repeats-1)*laterCounts.miss,'Aggregate misses');
  const generated=finiteProduct(repeats*output,'Aggregate output');
  const input=finiteProduct(hit+miss,'Aggregate input'),withCache=first.total+(repeats-1)*later.total,noCache=repeats*first.total;
  if (!Number.isFinite(withCache)||!Number.isFinite(noCache)) throw new RangeError('Aggregate cost overflow');
  return deepFreeze({repeats,first,later,firstCounts,laterCounts,withCache,noCache,saved:noCache-withCache,hit,miss,output:generated,hitRate:input?hit/input:0,laterHitShare:prefix+suffix?laterHit/(prefix+suffix):0});
}
// N includes the write request. With a write markup >=1, cheaper requires N>threshold.
export function requestsToBreakEven(writeMultiplier,readMultiplier) {
  nonnegative(writeMultiplier,'Write multiplier'); nonnegative(readMultiplier,'Read multiplier');
  if (writeMultiplier<1) throw new RangeError('Write multiplier must be at least one');
  if (readMultiplier>=1) return Infinity;
  return (writeMultiplier-readMultiplier)/(1-readMultiplier);
}
export function createState() {
  return {family:'cache',tariff:'flash-off',prefix:100000,suffix:2000,output:4000,repeats:50,tokens:4096,denoise:8,hitFraction:1,writeRule:'5m',readMultiplier:.1,baseInput:3,query:4};
}
function numberOr(raw,fallback) {
  if (raw===null||(typeof raw==='string'&&raw.trim()==='')||typeof raw==='boolean'||(typeof raw!=='number'&&typeof raw!=='string')) return fallback;
  const value=Number(raw);return Number.isFinite(value)?value:fallback;
}
export function cleanState(raw=createState()) {
  const source=raw&&typeof raw==='object'?raw:{},defaults=createState();
  const bounded=(key,lo,hi,isInteger=true)=>{const value=Math.max(lo,Math.min(hi,numberOr(source[key],defaults[key])));return isInteger?Math.floor(value):value;};
  const read=numberOr(source.readMultiplier,defaults.readMultiplier);
  return deepFreeze({
    family:FAMILIES.some(f=>f.id===source.family)?source.family:defaults.family,
    tariff:TARIFFS.some(t=>t.id===source.tariff)?source.tariff:defaults.tariff,
    prefix:bounded('prefix',0,200000),suffix:bounded('suffix',0,20000),output:bounded('output',0,20000),
    repeats:bounded('repeats',1,200),tokens:bounded('tokens',0,32000),denoise:bounded('denoise',1,16),
    hitFraction:bounded('hitFraction',0,1,false),writeRule:source.writeRule==='1h'?'1h':'5m',
    readMultiplier:[.1,.05,.025].includes(read)?read:defaults.readMultiplier,
    baseInput:bounded('baseInput',0,100,false),query:bounded('query',0,7)
  });
}
function project(row,matrix) { return matrix[0].map((_,j)=>row.reduce((sum,x,i)=>sum+x*matrix[i][j],0)); }
function attentionRow(query,keys,values,allowed,queryIndex,sourceKind) {
  const scores=keys.map(key=>query.reduce((sum,x,i)=>sum+x*key[i],0)/Math.sqrt(2));
  const max=Math.max(...scores.filter((_,j)=>allowed[j]));
  const exponents=scores.map((score,j)=>allowed[j]?Math.exp(score-max):0),sum=exponents.reduce((a,b)=>a+b,0);
  const weights=exponents.map(x=>x/sum);
  const output=[0,1].map(d=>weights.reduce((total,w,j)=>total+w*values[j][d],0));
  return {queryIndex,sourceKind,query,keys,values,allowed,scores,weights,output};
}
function makeAttention() {
  const q=TOY_WEIGHTS.embeddings.map(x=>project(x,TOY_WEIGHTS.query));
  const k=TOY_WEIGHTS.embeddings.map(x=>project(x,TOY_WEIGHTS.key));
  const v=TOY_WEIGHTS.embeddings.map(x=>project(x,TOY_WEIGHTS.value));
  const causal=q.map((query,i)=>attentionRow(query,k,v,attentionMask('causal',i,8).map(Boolean),i,'decoder'));
  const encoder=q.map((query,i)=>attentionRow(query,k,v,Array(8).fill(true),i,'encoder'));
  const encoderStates=encoder.map(row=>row.output),crossK=encoderStates.map(x=>project(x,TOY_WEIGHTS.key)),crossV=encoderStates.map(x=>project(x,TOY_WEIGHTS.value));
  const cross=q.map((query,i)=>attentionRow(query,crossK,crossV,Array(8).fill(true),i,'encoder-output'));
  return {tokens:Array.from({length:8},(_,i)=>`t${i}`),sourceTokens:Array.from({length:8},(_,i)=>`s${i}`),count:8,q,k,v,causal,encoder,cross,encoderStates,crossK,crossV};
}
function makeMoe(input) {
  const logits=project(input,TOY_WEIGHTS.router).map((x,i)=>x+TOY_WEIGHTS.routerBias[i]);
  const active=logits.map((_,i)=>i).sort((a,b)=>logits[b]-logits[a]||a-b).slice(0,2);
  const selected=softmax(active.map(i=>logits[i])),weights=Array(8).fill(0);
  active.forEach((id,i)=>{weights[id]=selected[i];});
  const expertOutputs=TOY_WEIGHTS.experts.map(expert=>project(input,expert.matrix).map((x,d)=>Math.tanh(x+expert.bias[d])));
  const output=[0,1].map(d=>weights.reduce((sum,w,i)=>sum+w*expertOutputs[i][d],0));
  return {input,logits,active,weights,expertOutputs,output,scope:'Toy router: 2 of 8 expert blocks, not a fraction of total model cost or parameters.'};
}
function makeSsm() {
  const inputs=TOY_WEIGHTS.embeddings.map((x,i)=>[...x,.6*Math.sin(i+1)]);
  const gates=inputs.map(row=>row.map((x,j)=>1/(1+Math.exp(-(x*TOY_WEIGHTS.ssmGateScale[j]+TOY_WEIGHTS.ssmGateBias[j])))));
  const states=[[0,0,0]];
  inputs.forEach((row,i)=>{states.push(row.map((x,j)=>gates[i][j]*states[i][j]+(1-gates[i][j])*Math.tanh(x)));});
  return {inputs,gates,states,width:3,scope:'Input-dependent gated recurrence with 3 toy channels; not a Mamba implementation or real memory measurement.'};
}
function makeGenerators(rounds,tokens) {
  const revealOrder=[2,5,0,7,3,6,1,4];
  const states=Array.from({length:rounds+1},(_,r)=>{
    const visible=new Set(revealOrder.slice(0,Math.floor(r*8/rounds)));
    return tokens.map((token,i)=>visible.has(i)?token:'·');
  });
  const autoregressive={rounds:8,positionsPerRound:1,states:Array.from({length:9},(_,r)=>tokens.map((token,i)=>i<r?token:'·'))};
  return {diffusion:{rounds,positionsPerRound:8,revealOrder,states,scope:'Scheduled masked teaching example: no learned denoiser, no exact LLaDA algorithm or speed claim.'},autoregressive};
}
function makeRule(params) {
  const write=params.writeRule==='1h'?ANTHROPIC_RULE.write1h:ANTHROPIC_RULE.write5m,read=params.readMultiplier;
  const base=params.prefix/1e6*params.baseInput,breakEven=requestsToBreakEven(write,read);
  const withCache=Array.from({length:params.repeats+1},(_,i)=>i?base*(write+(i-1)*read):0);
  const noCache=Array.from({length:params.repeats+1},(_,i)=>base*i);
  return {write,read,breakEven,firstCheaper:base>0?Math.floor(breakEven)+1:null,withCache,noCache,scope:'Cacheable prefix input only. Equal suffix and output charges cancel; eligibility and lifetime are assumed.'};
}
export function makeModelsTrace(rawState=createState()) {
  const params=cleanState(rawState),attention=makeAttention(),generators=makeGenerators(params.denoise,attention.tokens);
  const predicted=[.2,-.4,.7,.1,.8,-.2],target=[.4,-.1,.5,.3,.6,-.5],squared=predicted.map((x,i)=>(x-target[i])**2);
  return deepFreeze({
    params,attention,moe:makeMoe(attention.causal[params.query].output),ssm:makeSsm(),...generators,
    jepa:{predicted,target,squared,error:jepaError(predicted,target),scope:'Six toy latent dimensions; squared-error illustration, no pixels or training update.'},
    jev:jevIndependent([{options:['yes','no'],logits:[.8,.8]},{options:['yes','no'],logits:[.8,-1]}]),
    memory:contextMemory(params.tokens),bill:repeatedPrefix(tariffById(params.tariff),params),rule:makeRule(params),
    scope:{weights:'Fixed untrained 2D teaching weights.',memory:'Full DeepSeek-V2 MHA/MLA cache-width comparison, not total VRAM; 2 bytes per value is a stated scenario.',prices:'Official reference checked 2026-10-03; declared future cache hits are not guaranteed.',progress:'Unitless presentation progress, not latency or elapsed compute time.'}
  });
}
function runningBill(bill,completedRequests) {
  if (!completedRequests) return {completedRequests,withCache:0,noCache:0,saved:0,hit:0,miss:0,output:0};
  const withCache=bill.first.total+(completedRequests-1)*bill.later.total,noCache=completedRequests*bill.first.total;
  return {completedRequests,withCache,noCache,saved:noCache-withCache,hit:(completedRequests-1)*bill.laterCounts.hit,miss:bill.firstCounts.miss+(completedRequests-1)*bill.laterCounts.miss,output:completedRequests*bill.firstCounts.output};
}
export function modelsFrameAt(trace,chapterIndex=0,progress=0) {
  if (!trace?.params||!trace.attention) throw new RangeError('A models trace is required');
  const chapter=Math.floor(Math.max(0,Math.min(11,numberOr(chapterIndex,0)))),p=Math.max(0,Math.min(1,numberOr(progress,0)));
  const completed=Math.min(8,Math.floor(p*8)),step=Math.min(7,completed),round=Math.min(trace.params.denoise,Math.floor(p*trace.params.denoise));
  const kind=chapter===2?'encoder':chapter===3?'cross':'causal',row=trace.attention[kind][trace.params.query];
  const phase=p<.25?'query':p<.5?'scores':p<.8?'weights':'mix';
  const completedRequests=Math.min(trace.params.repeats,Math.floor(p*trace.params.repeats));
  const typedRevealed=Math.min(2,Math.floor(p*2)),activeDimension=Math.min(5,Math.floor(p*6));
  return deepFreeze({
    trace,params:trace.params,chapter,chapterId:CHAPTER_IDS[chapter],progress:p,completed,step,round,
    attention:{...row,kind,phase,ready:p>=.8,readiness:{query:true,scores:p>=.25,weights:p>=.5,output:p>=.8}},
    moe:{...trace.moe,ready:p>=.8},ssm:{...trace.ssm,state:trace.ssm.states[completed],completed},
    diffusion:{...trace.diffusion,state:trace.diffusion.states[round],round},autoregressive:{...trace.autoregressive,state:trace.autoregressive.states[completed],completed},
    jepa:{...trace.jepa,completedDimensions:Math.min(6,Math.floor(p*6)),activeDimension,ready:p===1},
    jev:trace.jev,typedRevealed,activeDimension,
    requestIndex:Math.min(trace.params.repeats-1,completedRequests),completedRequests,billRunning:runningBill(trace.bill,completedRequests),
    memoryTokens:Math.floor(trace.params.tokens*p),memory:contextMemory(Math.floor(trace.params.tokens*p)),
    rule:{...trace.rule,completedRequests,withCacheRunning:trace.rule.withCache[completedRequests],noCacheRunning:trace.rule.noCache[completedRequests]}
  });
}
// Compatibility summary: both generators now compare the same eight toy positions.
export function snapshot(state=createState()) {
  const trace=makeModelsTrace(state),{params,memory,bill,rule}=trace,prices=tariffById(params.tariff);
  return deepFreeze({family:params.family,prices,bill,ratio:prices.hit/prices.miss,memory,mlaShrink:mhaElementsPerToken()/mlaElementsPerToken(),causalHidesFuture:trace.attention.causal[0].weights[7]===0,encoderSeesFuture:trace.attention.encoder[0].weights[7]>0,crossWidth:8,moeFraction:moeActiveFraction(8,2),ssmFlat:trace.ssm.states.every(row=>row.length===3),diffusion:serialRounds('diffusion',8,params.denoise),autoregressive:serialRounds('autoregressive',8,params.denoise),jepa:trace.jepa.error,jev:trace.jev,breakEven:rule.breakEven,anthropicRead:rule.read,anthropicWrite:rule.write,announcedRatio:DEEPSEEK.announced2024.hit/DEEPSEEK.announced2024.miss});
}
