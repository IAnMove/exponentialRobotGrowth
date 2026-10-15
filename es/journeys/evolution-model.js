import {clamp,rng} from './common.js';

export const N=50;

function probabilities(frequency,p){
 const selected=frequency*(1+p.advantage)/(frequency*(1+p.advantage)+1-frequency);
 const mutated=selected*(1-p.mutation)+(1-selected)*p.mutation;
 return {selected,mutated};
}

// A separate keyed draw selects an actual parent without consuming the legacy RNG.
function parentCoin(seed,generation,index,allele){
 let x=((seed>>>0)^Math.imul(generation,0x9e3779b1)^Math.imul(index+1,0x85ebca6b)^(allele==='A'?0x68bc21eb:0x02e5be93))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
}

export function buildEvolutionTrace(p={},horizon=80){
 const params={advantage:p.advantage??.15,mutation:p.mutation??.01,drift:p.drift??true,seed:(p.seed??41)>>>0};
 if(!Number.isFinite(params.advantage)||params.advantage<=-1)throw new RangeError('Reproductive advantage must give A a positive relative fitness.');
 if(!Number.isFinite(params.mutation)||params.mutation<0||params.mutation>1)throw new RangeError('Mutation probability must be between zero and one.');
 if(!Number.isFinite(horizon)||horizon<0)throw new RangeError('Generation horizon must be finite and non-negative.');
 horizon=Math.floor(horizon);
 const random=rng(params.seed),history=[.5],reference=[.5];
 const initialCohort=params.drift?Array.from({length:N},(_,index)=>({id:`0:${index}`,allele:index<N/2?'A':'B'})):null;
 // Generation zero is the initial population, with no incoming reproduction event.
 const generations=[{generation:0,countA:params.drift?N/2:null,frequency:.5,cohort:initialCohort,selected:.5,mutated:.5,events:[],mutations:params.drift?0:null,mutationsAB:params.drift?0:null,mutationsBA:params.drift?0:null}];
 for(let generation=1;generation<=horizon;generation++){
  const previous=generations.at(-1),{selected,mutated}=probabilities(previous.frequency,params);
  const referenceStep=probabilities(reference.at(-1),params);reference.push(referenceStep.mutated);
  if(!params.drift){
   history.push(mutated);
   generations.push({generation,countA:null,frequency:mutated,cohort:null,selected,mutated,events:[],mutations:null,mutationsAB:null,mutationsBA:null});
   continue;
  }
  const pools={A:[],B:[]};for(const parent of previous.cohort)pools[parent.allele].push(parent);
  const aa=selected*(1-params.mutation),ab=selected*params.mutation;
  const events=[],cohort=[];let countA=0,mutationsAB=0,mutationsBA=0;
  for(let index=0;index<N;index++){
   // AA, BA, AB, BB partition one uniform draw. AA+BA is exactly the old
   // mutated probability, preserving every seeded offspring A/B outcome.
   const draw=random();let parentAllele,allele;
   if(draw<aa){parentAllele='A';allele='A';}
   else if(draw<mutated){parentAllele='B';allele='A';}
   else if(draw<mutated+ab){parentAllele='A';allele='B';}
   else {parentAllele='B';allele='B';}
   const pool=pools[parentAllele],parent=pool[Math.floor(parentCoin(params.seed,generation,index,parentAllele)*pool.length)];
   const id=`${generation}:${index}`,changed=parentAllele!==allele,direction=changed?`${parentAllele}${allele}`:null;
   if(allele==='A')countA++;
   if(direction==='AB')mutationsAB++;if(direction==='BA')mutationsBA++;
   cohort.push({id,allele});events.push({index,parentId:parent.id,parentAllele,allele,mutated:changed,direction,id});
  }
  const frequency=countA/N;history.push(frequency);
  generations.push({generation,countA,frequency,cohort,selected,mutated,events,mutations:mutationsAB+mutationsBA,mutationsAB,mutationsBA});
 }
 return {params,horizon,history,reference,generations};
}

export function sampleEvolution(trace,time){
 const value=Number(time),continuous=clamp(Number.isNaN(value)?0:value,0,trace.horizon),t=Math.floor(continuous);
 const nextGeneration=t<trace.horizon?t+1:null;
 return {...trace.generations[t],t,continuous,progress:continuous-t,nextGeneration,next:nextGeneration===null?null:trace.generations[nextGeneration]};
}

// The previous evolve loop completed ceil(t) iterations for fractional t.
export function evolve(p,t){return buildEvolutionTrace(p,Math.ceil(Math.max(0,t))).history;}
