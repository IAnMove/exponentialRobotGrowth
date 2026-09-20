import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createFactory,tick,advance,automate,capacity} from './dist/factory-model.js';
import {createTerritory,tickTerritory} from './dist/territory-model.js';
import {END,STEP} from './dist/region-model.js';
import {idealFleet,explainConstraint} from './dist/learning-model.js';
import {productionSeries,productionComparison} from './dist/district-productivity.js';

// A completed robot must exist before its return can be shown or add capacity.
const factory=createFactory(undefined,true);
while(!factory.firstReturn){assert(factory.time<8);tick(factory);}
assert(factory.firstFinished<=factory.firstReturn.depart);
assert.equal(factory.total,1);assert.equal(factory.deployed,1);
assert.equal(capacity(factory,factory.firstReturn.station).robots,0);
const first={...factory.firstReturn};advance(factory,24);
assert.deepEqual(factory.firstReturn,first,'Later arrivals must not replace the tracked first robot');
assert.equal(factory.deployed,10);
const manual=createFactory();advance(manual,1);
assert(manual.firstFinished!==null);assert.equal(manual.firstReturn,null);
assert(automate(manual,0));assert.equal(manual.firstReturn.depart,manual.time);

// Record every threshold on the physical simulation tick, not on UI sampling.
for(const expanded of [true,false]){
 const s=createTerritory(expanded?.4:0,expanded);
 let lastTotal=24,previousTime=0;
 while(s.time<END){
  const count=s.doublings.length;tickTerritory(s);
  for(const d of s.doublings.slice(count)){
   assert(lastTotal<d.target&&s.fleet+s.exported>=d.target);
   assert.equal(d.time,s.time);assert.equal(d.duration,d.time-previousTime);
   assert.equal(d.time/STEP,Math.round(d.time/STEP));previousTime=d.time;
  }
  lastTotal=s.fleet+s.exported;
 }
 assert(s.doublings.length>=4);
 console.log(expanded?'Expansion':'Fixed facilities',s.doublings);
}
assert.equal(idealFleet(0),24);
for(const time of [0,20,40,80])assert.equal(idealFleet(time+20),idealFleet(time)*2);

// Test diagnosis against a real shared-inventory run, including fractional work.
const context=vm.createContext({});vm.runInContext(fs.readFileSync('dist/industrial-model.js','utf8')+';globalThis.run=simulateIndustry();',context);
const frames=context.run.frames;let shortages=0,rest=0;
for(let t=0;t<frames.length-1;t++)for(let i=0;i<9;i++){
 const f=frames[t],next=frames[t+1],d=explainConstraint(f,next,i);
 if(d.kind==='inputs'){
  shortages++;assert(next.flow[i]<next.worked.cap[i]);assert(d.sources.length);
  if(i===6)assert(d.sources.every(k=>f.inventory[k]===next.flow[i]));
  if([1,7,8].includes(i))assert.equal(f.inventory[d.sources[0]],next.flow[i]);
 }
 if(d.kind==='staff'){rest++;assert.equal(f.capacity[i],0);}
}
assert(shortages>0&&rest>0);
const humanRun=vm.runInContext("simulateIndustry('none',false)",context);
for(const policy of ['none','assembly','network'])for(const expansion of [false,true]){
 const run=vm.runInContext(`simulateIndustry('${policy}',${expansion})`,context);
 for(let industry=0;industry<9;industry++){
  const values=productionSeries(run.frames,industry),human=productionSeries(humanRun.frames,industry);
  for(const index of [0,1,23,24,25,80,run.frames.length-1]){
   const direct=run.frames.slice(Math.max(1,index-23),index+1).reduce((n,f)=>n+f.flow[industry]*(industry===1?4:1),0);
   assert.equal(values[index],direct,'Only completed output inside the trailing window is counted');
   const p=productionComparison(values,human,index);
   assert.equal(p.hours,Math.min(24,index));
   if(policy==='none'){assert.equal(p.actual,p.human);assert(p.percent===0||p.percent===null);}
   if(human[index]===0)assert.equal(p.percent,null);
  }
 }
}
const plan=productionSeries(frames),human=productionSeries(humanRun.frames);
console.log('Final 24-hour window:',productionComparison(plan,human,frames.length-1));
const f={capacity:Array(9).fill(.5),hardware:Array(9).fill(2),inventory:Array(8).fill(0),flow:Array(9).fill(0)};
assert.equal(explainConstraint(f,{worked:{cap:Array(9).fill(0)},flow:f.flow},0).kind,'working');
console.log('First robot causality, measured doubling intervals, ideal reference and real supply constraints: OK');
