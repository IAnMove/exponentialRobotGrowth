import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {INITIAL,RESERVOIRS,FLUXES,transfers,carbonRun,carbonTrace,sampleCarbon,carbonStoryTime} from './site-src/journeys/carbon-model.js';
import {carbon,carbonExperiment} from './site-src/journeys/carbon.js';
import {defaults} from './site-src/journeys/common.js';

const near=(a,b,context='',tolerance=1e-9)=>assert(Math.abs(a-b)<=tolerance,`${context}: ${a} != ${b}`);
const total=s=>RESERVOIRS.reduce((sum,id)=>sum+s[id],0);
const p=defaults(carbon);
assert.deepEqual(INITIAL,{air:10,land:20,ocean:40,fossil:30});
assert.equal(new Set(FLUXES.map(f=>f.id)).size,5);
assert(FLUXES.every(f=>RESERVOIRS.includes(f.from)&&RESERVOIRS.includes(f.to)&&f.from!==f.to));
near(transfers(p,INITIAL,10).emitted,.5,'last interval before the stop');
near(transfers(p,INITIAL,11).emitted,0,'first interval after the stop');
near(transfers({...p,stop:false,emissions:2},{...INITIAL,fossil:.05},11).emitted,.05,'source transfer is capped by the available reserve');

// A stock can remain constant even while carbon moves through it.
const equilibrium=carbonRun({emissions:0,uptake:1,stop:false},60);
for(const s of equilibrium){
 for(const id of RESERVOIRS)near(s[id],INITIAL[id],`equilibrium ${id}`);
 if(s.flows)for(const id of ['photosynthesis','respiration','intoOcean','outOfOcean'])near(s.flows[id],.2,`equilibrium flow ${id}`);
}

// Check every slider setting, not only independent extremes. Each reservoir's
// ledger must agree with the exported flows, in addition to the total balance.
let cases=0;
for(let e=0;e<=20;e++)for(let u=5;u<=20;u++)for(const stop of [false,true]){
 const params={emissions:e/10,uptake:u/10,stop},trace=carbonTrace(params),states=trace.states;
 assert.equal(states.length,61);near(total(states[0]),100);
 for(let interval=1;interval<states.length;interval++){
  const before=states[interval-1],after=states[interval];
  near(total(after),100,`total ${JSON.stringify(params)}/${interval}`);
  for(const id of RESERVOIRS){
   assert(after[id]>=-1e-10&&Number.isFinite(after[id]),`negative or nonfinite ${id}`);
   const incoming=FLUXES.filter(f=>f.to===id).reduce((sum,f)=>sum+after.flows[f.id],0);
   const outgoing=FLUXES.filter(f=>f.from===id).reduce((sum,f)=>sum+after.flows[f.id],0);
   near(after[id]-before[id],incoming-outgoing,`${id} balance`);
   assert(outgoing<=before[id]+1e-10,`${id}: transfers exceed available carbon`);
  }
  assert(after.flows.emitted<=before.fossil+1e-10);
  assert(after.fossil<=before.fossil+1e-10,'fossil store cannot replenish in this model');
  if(stop&&interval>10)near(after.flows.emitted,0,'only the fossil source stops');
 }
 for(const t of [0,.37,5.37,9.37,10,10.999,15.37,59.37,60]){
  const s=sampleCarbon(trace,t),a=states[Math.floor(t)],b=states[Math.min(60,Math.floor(t)+1)],fraction=t-Math.floor(t);
  near(s.total,100,'interpolated total');
  for(const id of RESERVOIRS){near(s[id],a[id]+fraction*(b[id]-a[id]),`interpolated ${id}`);assert(s[id]>=-1e-10);}
  near(s.air-a.air,s.netAir*fraction,'air stock and flowing amount agree');
 }
 cases++;
}
assert.equal(cases,672);

// The stop controls interval 11: the first ten complete transfers are shared.
const stopped=carbonRun({...p,emissions:.5,uptake:1,stop:true},60),continuous=carbonRun({...p,emissions:.5,uptake:1,stop:false},60);
assert.deepEqual(stopped.slice(0,11),continuous.slice(0,11));
near(continuous[11].air-stopped[11].air,.5,'first divergent air stock');
near(stopped[10].fossil,25);
for(let i=11;i<=60;i++){
 near(stopped[i].fossil,25,'fossil source closed');
 near(stopped[i].flows.emitted,0);
 for(const id of ['photosynthesis','respiration','intoOcean','outOfOcean'])assert(stopped[i].flows[id]>0,'natural exchanges continue');
}
assert(stopped[11].air>10,'stopping the source does not reset air to its initial stock');
assert(stopped[60].air>10&&stopped[60].air<stopped[10].air);
assert.notEqual(stopped[60].land,stopped[10].land);
assert.notEqual(stopped[60].ocean,stopped[10].ocean);
assert(continuous[60].air>stopped[60].air);

// A fractional final fossil transfer uses the remaining stock exactly, never
// the requested transfer after exhaustion. It is a distinct state from a stop.
const partial=carbonTrace({...p,emissions:.7,stop:false});
near(partial.states[42].fossil,.6);
near(partial.states[43].flows.emitted,.6);
near(partial.states[43].fossil,0);
near(partial.states[44].flows.emitted,0);
assert.equal(sampleCarbon(partial,42).reason,'active');
assert.equal(sampleCarbon(partial,43).reason,'empty');
assert.equal(sampleCarbon(carbonTrace(p),10).reason,'stopped');
assert.equal(sampleCarbon(carbonTrace({...p,emissions:0,stop:false}),0).reason,'off');
near(sampleCarbon(partial,-2).continuous,0);near(sampleCarbon(partial,99).continuous,60);

// A reference curve changes only the fossil-stop choice. In particular, it
// cannot silently revert the user's land-uptake multiplier.
for(const uptake of [.5,1,2])for(const emissions of [0,.5,2]){
 const params={uptake,emissions,stop:true},snapshot={...params},{trace,reference}=carbonExperiment(params);
 assert.deepEqual(params,snapshot,'evaluation does not mutate the controls');
 assert.deepEqual(reference.params,{...params,stop:false});
 assert.deepEqual(trace.states.slice(0,11),reference.states.slice(0,11));
 assert.deepEqual(reference.states,carbonRun({...params,stop:false},60));
 for(const t of [0,10,10.5,60]){
  const s=carbon.evaluate(params,t);assert.equal(s.metrics.length,4);
  s.metrics.forEach((m,i)=>near(m.value,s[RESERVOIRS[i]],'header stock'));
  assert.equal(s.series.length,3);assert(s.series.every(line=>line.values.length===61&&line.values.every(Number.isFinite)));
  assert.deepEqual(s.series[0].values,trace.states.map(h=>h.air));
  assert.deepEqual(s.series[1].values,reference.states.map(h=>h.air));
 }
}

// Recorded phrase timings locate the first post-stop interval in both voices.
for(const [lang,duration,ceased] of [['es',19.296,8.23],['en',19.332,8.59]]){
 near(carbonStoryTime(3,ceased/duration,lang),11,`${lang} emissions cease cue`);
 let previous=-Infinity;
 for(let chapter=0;chapter<4;chapter++)for(let i=0;i<=1000;i++){
  const time=carbonStoryTime(chapter,i/1000,lang);assert(time>=previous-1e-10,'narrative time does not run backwards');assert(time>=0&&time<=60);previous=time;
 }
 near(previous,60);near(carbonStoryTime(3,-1,lang),9);near(carbonStoryTime(3,2,lang),60);
}

// Keep narration and captions tied to the actual eight existing recordings.
const voiceSource=readFileSync('site-src/journeys/voices-carbon.js','utf8');
const voices=JSON.parse(voiceSource.match(/export const VOICES = ([\s\S]*?);\r?\nconst base/)[1]);
const scripts=JSON.parse(readFileSync('narration/journey-carbon.json','utf8'));
for(const [language,index] of [['es',0],['en',1]]){
 assert.equal(voices[language].length,4);
 voices[language].forEach((clip,i)=>{
  assert.equal(clip.id,`step-${i}`);assert.equal(clip.text,carbon.steps[i].text[index]);assert.equal(clip.title,carbon.steps[i].title[index]);
  assert.deepEqual({id:clip.id,title:clip.title,text:clip.text},scripts[language][i]);
  assert.equal(readFileSync(`narration/scripts/${clip.file}.txt`,'utf8').trim(),clip.text);
  assert(clip.duration>3&&existsSync(`dist/audio/${clip.file}`),'reused audio is present');
 });
}
console.log('Carbon: 672 control combinations, four-reservoir ledgers, active equilibrium, stop timing, partial exhaustion, interpolation, honest reference curves and eight MiniMax transcripts: OK');
