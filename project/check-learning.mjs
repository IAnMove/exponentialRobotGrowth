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

// Diagnose the last credited hour without consulting future flow or end stock.
const context=vm.createContext({});vm.runInContext(fs.readFileSync('dist/industrial-model.js','utf8')+';globalThis.run=simulateIndustry();',context);
const frames=context.run.frames;let shortages=0,rest=0,diagnoses=0,initial=0,partial=0,building=0,openings=0;
for(const policy of ['none','assembly','network'])for(const expansion of [false,true]){
 const run=vm.runInContext(`simulateIndustry('${policy}',${expansion},30)`,context),before=JSON.stringify(run);
 for(let t=0;t<run.frames.length;t++)for(let i=0;i<9;i++){
  const f=run.frames[t],previous=run.frames[t-1],next=run.frames[t+1],d=explainConstraint(f,next,i);diagnoses++;
  assert.deepEqual(d,explainConstraint(f,{flow:Array(9).fill(999),worked:{cap:Array(9).fill(999)}},i),'future output cannot explain this snapshot');
  if(!previous){initial++;assert.equal(d.kind,'initial');assert.equal(d.sources.length,0);continue;}
  assert.equal(f.worked.hour,previous.absHour);assert.equal(d.flow,f.flow[i]);assert.equal(d.cap,f.worked.cap[i]);
  const available=f.worked.active[i]+f.worked.humansWorking[i]-f.worked.builders[i];
  if(d.cap<=0){const expected=available>0?'partial':f.worked.builders[i]>0?'building':'staff';assert.equal(d.kind,expected);assert.equal(d.sources.length,0);if(expected==='staff')rest++;if(expected==='partial')partial++;if(expected==='building')building++;continue;}
  if(d.kind==='inputs'){
   shortages++;assert(f.flow[i]<f.worked.cap[i]);assert(d.sources.length);
   const inputs=[[],[0],[1],[1],[1],[1],[2,3,4,5],[6],[7]][i],lowest=Math.min(...inputs.map(k=>previous.inventory[k]));
   assert.deepEqual(d.sources,inputs.filter(k=>previous.inventory[k]===lowest));
   if(i===6)assert(d.sources.every(k=>previous.inventory[k]===f.flow[i]));
   if([1,7,8].includes(i))assert.equal(previous.inventory[d.sources[0]],f.flow[i]);
   assert.deepEqual(d,explainConstraint({...f,inventory:Array(8).fill(9999)},null,i),'end-of-hour deliveries cannot change the cause of the shortfall');
  }else{assert.equal(d.kind,d.cap>=previous.hardware[i]?'equipment':'working');assert.equal(d.sources.length,0);}
  if(f.opened.includes(i)){openings++;assert.equal(f.hardware[i],previous.hardware[i]+3);}
 }
 assert.equal(JSON.stringify(run),before,'diagnosis never mutates simulation state');
}
assert(shortages>0&&rest>0&&partial>0&&openings>0);assert.equal(initial,54);
console.log('Completed-hour diagnosis:',{diagnoses,initial,shortages,rest,partial,building,openings});
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
const f={capacity:Array(9).fill(0),hardware:Array(9).fill(6),inventory:Array(8).fill(0),flow:Array(9).fill(0),worked:{cap:Array(9).fill(0),active:Array(9).fill(1),humansWorking:Array(9).fill(0),builders:Array(9).fill(0),before:Array(8).fill(0)}};
assert.equal(explainConstraint(f,null,0).kind,'partial','fractional completed-hour capacity is not a material shortage');
f.worked.active.fill(2);f.worked.builders.fill(2);assert.equal(explainConstraint(f,null,0).kind,'building','builders are unavailable for production');
f.worked.active.fill(0);f.worked.builders.fill(0);f.capacity.fill(99);assert.equal(explainConstraint(f,null,0).kind,'staff','staff returning now does not rewrite the preceding break');
console.log('First robot causality, measured doubling intervals, ideal reference and real supply constraints: OK');
