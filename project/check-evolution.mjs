import assert from 'node:assert/strict';
import {N,buildEvolutionTrace,sampleEvolution,evolve} from './site-src/journeys/evolution-model.js';
import {rng} from './site-src/journeys/common.js';

const defaults={advantage:.15,mutation:.01,drift:true,seed:41};
// Independent copy of the pre-trace model: exact seeded compatibility matters.
function legacy(p,t){
 let frequency=.5;const random=rng(p.seed),history=[frequency];
 for(let i=0;i<t;i++){
  const selected=frequency*(1+p.advantage)/(frequency*(1+p.advantage)+1-frequency),mutated=selected*(1-p.mutation)+(1-selected)*p.mutation;
  if(p.drift){let count=0;for(let n=0;n<50;n++)if(random()<mutated)count++;frequency=count/50;}else frequency=mutated;
  history.push(frequency);
 }
 return history;
}
assert.equal(N,50);
let compatibilityCases=0;
const checkCompatibility=p=>{
 const trace=buildEvolutionTrace(p);
 assert.deepEqual(trace.history,legacy(p,80),`Seeded history: ${JSON.stringify(p)}`);
 assert.deepEqual(trace.reference,legacy({...p,drift:false},80),'Deterministic reference');
 assert.equal(trace.history.length,81);assert.equal(trace.generations.length,81);assert.equal(trace.reference.length,81);
 compatibilityCases++;
};
for(const seed of [...Array.from({length:100},(_,i)=>i+1),0,4294967295])for(const advantage of [-.4,0,.15,.4])for(const mutation of [0,.005,.01,.05]){
 checkCompatibility({...defaults,seed,advantage,mutation});
 checkCompatibility({...defaults,seed,advantage,mutation,drift:false});
}
// Cover every slider position with several reproducible seeds.
for(const seed of [1,41,100])for(let a=0;a<=16;a++)for(let m=0;m<=10;m++)checkCompatibility({...defaults,seed,advantage:-.4+a*.05,mutation:m*.005});

const inspectGenealogy=trace=>{
 assert.deepEqual(trace.generations[0].cohort.map(x=>x.allele),Array(25).fill('A').concat(Array(25).fill('B')));
 for(let g=1;g<=trace.horizon;g++){
  const previous=trace.generations[g-1],current=trace.generations[g],parents=new Map(previous.cohort.map(x=>[x.id,x]));
  assert.equal(current.cohort.length,N);assert.equal(current.events.length,N);
  assert.equal(current.countA,current.cohort.filter(x=>x.allele==='A').length);
  assert.equal(current.frequency,current.countA/N);assert.equal(current.frequency,trace.history[g]);
  assert.equal(current.selected,previous.frequency*(1+trace.params.advantage)/(previous.frequency*(1+trace.params.advantage)+1-previous.frequency));
  assert.equal(current.mutated,current.selected*(1-trace.params.mutation)+(1-current.selected)*trace.params.mutation);
  assert.equal(current.mutationsAB,current.events.filter(x=>x.direction==='AB').length);
  assert.equal(current.mutationsBA,current.events.filter(x=>x.direction==='BA').length);
  assert.equal(current.mutations,current.mutationsAB+current.mutationsBA);
  const ids=new Set();
  for(const event of current.events){
   assert.equal(event.id,`${g}:${event.index}`);assert(!ids.has(event.id));ids.add(event.id);
   const parent=parents.get(event.parentId);assert(parent,'Parent exists in the preceding generation');
   assert.equal(parent.allele,event.parentAllele);
   assert.equal(event.mutated,event.parentAllele!==event.allele);
   assert.equal(event.direction,event.mutated?`${event.parentAllele}${event.allele}`:null);
   assert.deepEqual(current.cohort[event.index],{id:event.id,allele:event.allele});
   if(trace.params.mutation===0)assert(!event.mutated);
   if(trace.params.mutation===1)assert(event.mutated);
  }
 }
};
for(const seed of [1,3,41,100])for(const advantage of [-.4,0,.4])for(const mutation of [0,.01,.05,1])inspectGenealogy(buildEvolutionTrace({...defaults,seed,advantage,mutation}));

const original={...defaults},replay=buildEvolutionTrace(original);assert.deepEqual(original,defaults,'Caller parameters stay unchanged');
assert.deepEqual(replay,buildEvolutionTrace(defaults),'Full genealogy replays with the same seed');
assert.notDeepEqual(replay.generations,buildEvolutionTrace({...defaults,seed:42}).generations,'Changing the seed changes the random run');
const shorter=buildEvolutionTrace(defaults,17);assert.deepEqual(shorter.generations,replay.generations.slice(0,18),'Trace extension preserves its prefix');
for(let g=0;g<80;g++){
 const start=sampleEvolution(replay,g),near=sampleEvolution(replay,g+.999),finish=sampleEvolution(replay,g+1);
 assert.equal(start.t,g);assert.equal(start.progress,0);assert.equal(near.t,g);assert.equal(near.nextGeneration,g+1);
 assert.equal(near.frequency,start.frequency);assert.equal(near.countA,start.countA);assert.strictEqual(near.cohort,start.cohort);
 assert.strictEqual(near.next,replay.generations[g+1]);assert.equal(finish.frequency,replay.history[g+1]);
 assert.deepEqual(sampleEvolution(replay,g+.37),sampleEvolution(replay,g+.37),'Seeking is deterministic');
}
for(const time of [80,81,Infinity]){const end=sampleEvolution(replay,time);assert.equal(end.t,80);assert.equal(end.progress,0);assert.equal(end.next,null);assert.equal(end.nextGeneration,null);}
for(const time of [-10,-Infinity,NaN])assert.equal(sampleEvolution(replay,time).t,0);
assert.deepEqual(evolve(defaults,17),legacy(defaults,17));assert.deepEqual(evolve(defaults,17.2),legacy(defaults,17.2));

// Distributional check from the Wright–Fisher mechanism, independently of the
// seed-compatibility oracle: fitness-weighted parent, then symmetric mutation.
const ensembleParams={...defaults,advantage:.2,mutation:.05},ensembleSeeds=4000,categories={AA:0,AB:0,BA:0,BB:0},parentCounts=Array(N).fill(0);
for(let seed=1;seed<=ensembleSeeds;seed++)for(const event of buildEvolutionTrace({...ensembleParams,seed},1).generations[1].events){
 categories[event.parentAllele+event.allele]++;
 parentCounts[Number(event.parentId.split(':')[1])]++;
}
const draws=ensembleSeeds*N,q=1.2/(1.2+1),mu=.05,expectedCategories={AA:q*(1-mu),AB:q*mu,BA:(1-q)*mu,BB:(1-q)*(1-mu)};
// At 200,000 draws, .006 exceeds five binomial standard deviations even at p=.5.
for(const [category,expected] of Object.entries(expectedCategories))assert(Math.abs(categories[category]/draws-expected)<.006,`Joint offspring category ${category} matches its theoretical probability`);
assert(Math.abs((categories.AA+categories.AB)/draws-q)<.006,'Parental A contribution follows relative fitness, before mutation');
for(const counts of [parentCounts.slice(0,N/2),parentCounts.slice(N/2)]){
 const total=counts.reduce((a,b)=>a+b,0),expected=1/(N/2);
 // Each allele pool receives >90,000 choices; .004 is more than six standard deviations per parent.
 for(const count of counts)assert(Math.abs(count/total-expected)<.004,'Parents within the same allele have equal reproductive opportunity');
 assert(Math.max(...counts)/Math.min(...counts)<1.15,'No strongly favoured parent within an allele');
}

const neutral=buildEvolutionTrace({...defaults,advantage:0,mutation:0});assert(neutral.reference.every(f=>f===.5));
const fixed=buildEvolutionTrace({...defaults,advantage:0,mutation:0,seed:3}),fixation=fixed.history.findIndex(f=>f===1);
assert.equal(fixation,33);assert(fixed.history.slice(fixation).every(f=>f===1),'No mutation: fixation is absorbing');
assert(fixed.generations.slice(fixation+1).every(g=>g.events.every(e=>e.parentAllele==='A'&&e.allele==='A')));
const reintroduced=buildEvolutionTrace({...defaults,advantage:.4,mutation:.005,seed:1});
assert.equal(reintroduced.history[36],1);assert.equal(reintroduced.history[37],.98,'Nonzero mutation can reintroduce a lost variant');
assert.equal(reintroduced.generations[37].mutationsAB,1);assert.equal(reintroduced.generations[37].mutationsBA,0);
assert(reintroduced.generations[37].events.every(e=>e.parentAllele==='A'),'B is reintroduced by mutation, not a nonexistent B parent');
const deterministic=buildEvolutionTrace({...defaults,drift:false});assert.deepEqual(deterministic.history,deterministic.reference);
assert(deterministic.generations.every(g=>g.cohort===null&&g.countA===null&&g.events.length===0&&g.mutations===null&&g.mutationsAB===null&&g.mutationsBA===null));
const selected=buildEvolutionTrace({...defaults,advantage:.2,mutation:0,drift:false});assert(Math.abs(selected.history[1]-6/11)<1e-15);assert(Math.abs(selected.history[20]-.974579028666723)<1e-12);
const mutationBalance=buildEvolutionTrace({...defaults,advantage:.2,mutation:.01,drift:false});assert(Math.abs(mutationBalance.history[80]-.9430207461503658)<1e-12);
const neutralMutation=buildEvolutionTrace({...defaults,advantage:0,mutation:.05,drift:false});assert(neutralMutation.history.every(f=>f===.5),'Balanced frequency does not imply zero mutations');
const zero=buildEvolutionTrace(defaults,0);assert.deepEqual(zero.history,[.5]);assert.equal(sampleEvolution(zero,.9).next,null);
assert.throws(()=>buildEvolutionTrace({...defaults,advantage:-1}),RangeError);assert.throws(()=>buildEvolutionTrace({...defaults,mutation:1.01}),RangeError);
console.log(`Evolution: ${compatibilityCases} exact legacy trajectories, ${ensembleSeeds} first-generation runs with joint probabilities and uniform parents, deterministic references, genealogy and mutations, seed replay, completed-generation sampling, fixation and reintroduction: OK`);
