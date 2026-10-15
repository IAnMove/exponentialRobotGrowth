import {contextWindow,transformerTrace,nextCandidates,softmax,randomStep,sample,vector} from './model.js';
const traces=new WeakMap(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const value of Object.values(o))freeze(value);Object.freeze(o);}return o;};
const finite=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new RangeError('Finite '+name+' required');return v;};
const paths=['context','retrieval','tokenize','embedding',null,'logits-softmax','decode','append'];
const operations=['qkv','dot-scale','mask-softmax','av','residual-ffn'];

// Recorded-time presentation of one calculated, untrained toy block. It does
// not claim to expose a deployed model or derive the curated response logits.
export function llmFrameAt(input,{progress=0,operationIndex,operationProgress,queryIndex,selectedToken=0}={}){
 if(!input||!Number.isInteger(input.phase)||input.phase<0||input.phase>7||!Array.isArray(input.tokens)||!input.tokens.length||input.tokens.some(t=>typeof t!=='string')||!Array.isArray(input.generated)||input.generated.some(t=>typeof t!=='string'))throw new RangeError('A valid LLM run is required');
 const p=clamp(finite(progress,'chapter progress')),selected=clamp(Math.floor(finite(selectedToken,'selected token')),0,input.tokens.length-1),window=contextWindow(input),q=clamp(Math.floor(finite(queryIndex??window.tokens.length-1,'query index')),0,window.tokens.length-1);
 if(operationIndex!==undefined&&(!Number.isInteger(operationIndex)||operationIndex<0||operationIndex>=operations.length))throw new RangeError('Valid attention operation required');
 if(operationProgress!==undefined)finite(operationProgress,'operation progress');
 const index=input.phase===4?(operationIndex??Math.min(4,Math.floor(p*5))):0,flow={index,progress:input.phase===4?clamp(operationProgress??(p*5-index)):p};
 const signature=JSON.stringify(window);let cached=traces.get(input);
 if(cached?.signature!==signature){cached={signature,trace:freeze(transformerTrace(window.tokens,window.offset))};traces.set(input,cached);}
 const trace=cached.trace,candidates=nextCandidates(input),temperature=finite(input.options?.temperature,'temperature');
 if(temperature<0||!['greedy','sample'].includes(input.options?.decoding))throw new RangeError('Valid decoder settings required');
 const seed=finite(input.seed,'seed');if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Unsigned 32-bit seed required');
 const probabilities=softmax(candidates.logits,temperature),scripted=!!input.outputTokens,mode=scripted?'scripted':input.options.decoding,rng=randomStep(seed),randomValue=mode==='sample'?rng.value:null;
 const chosenIndex=scripted?0:mode==='greedy'?candidates.logits.indexOf(Math.max(...candidates.logits)):sample(probabilities,randomValue),cumulative=[0];
 for(const probability of probabilities)cumulative.push(cumulative.at(-1)+probability);cumulative[cumulative.length-1]=1;
 const decoder={pieces:[...candidates.pieces],logits:[...candidates.logits],probabilities,cumulative,mode,requestedMode:input.options.decoding,scripted,chosenIndex,choice:candidates.pieces[chosenIndex],randomValue,seedBefore:seed,seedAfter:scripted?seed:rng.seed,selectionVisible:input.phase===6&&p===1};
 const N=window.tokens.length,shapes={X:[N,6],Q:[N,3],K:[N,3],V:[N,3],scores:[N,N],masked:[N,N],A:[N,N],mixed:[N,3],projected:[N,6],residual:[N,6],H:[N,6],hidden:[N,12],ffn:[N,6],Y:[N,6]};
 const path=input.phase===4?operations[index]:input.done&&input.phase===7?'eos':paths[input.phase],available=input.phase!==1||!!input.data?.source;
 const signals={path,progress:flow.progress,available,queryIndex:q,queryAbsolute:window.offset+q,vectorDimensions:input.phase===4&&index===0?3:6,branchProgress:{residual:clamp(flow.progress*3),hidden:clamp(flow.progress*3-1),output:clamp(flow.progress*3-2)},selectionVisible:decoder.selectionVisible,appendedToken:input.phase===7&&!input.done?input.generated.at(-1)??null:null,stopped:!!input.done};
 const run=JSON.parse(JSON.stringify(input));
 return freeze({run,phase:input.phase,progress:p,flow,window,trace,shapes,queryIndex:q,queryAbsolute:window.offset+q,queryWeights:trace.A[q],selectedToken:selected,selectedVector:vector(input.tokens[selected],selected),decoder,signals,generatedCount:input.generated.length,blockCount:1,headCount:1,trained:false,outputCurated:true});
}

// A phase rail inspects the present generation cycle; it never silently selects
// the first occurrence of a repeated stage and discards the generated answer.
export function phaseIndexInCycle(timeline,currentIndex,phase){
 if(!Array.isArray(timeline)||!timeline.length||!Number.isInteger(currentIndex)||currentIndex<0||currentIndex>=timeline.length||!Number.isInteger(phase)||phase<0||phase>7)throw new RangeError('Valid timeline index and phase required');
 const cycle=timeline[currentIndex].snapshot.loops,matches=timeline.map((clip,index)=>({clip,index})).filter(({clip})=>clip.snapshot.loops===cycle&&clip.snapshot.phase===phase);
 return matches.length?matches[0].index:null;
}
