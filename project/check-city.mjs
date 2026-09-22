import assert from 'node:assert/strict';
import {createCity,tickCity,advanceCity,eligible,SECTORS,TOTAL_TASKS,STEP,END} from './dist/city-model.js';
for(const scenario of [0,1,2])for(const share of [.1,.35,.8]){
 const s=createCity(scenario,share);let last=0;
 for(let i=0;i<END/STEP;i++){
  tickCity(s);const covered=s.assigned.reduce((a,b)=>a+b,0),cap=eligible(s),pending=s.pending.reduce((a,b)=>a+b.count,0),r=s.industry;
  assert.equal(r.fleet-24+r.exported,r.built,'Exported robots cannot also work in industry');
  assert.equal(s.dispatched,r.exported);assert.equal(s.received+pending,s.dispatched);assert.equal(covered+s.available,s.received);
  assert(covered>=last&&covered<=TOTAL_TASKS);last=covered;
  s.assigned.forEach((n,k)=>{assert(n>=0&&n<=cap[k]&&n<SECTORS[k].tasks);});
  assert(Math.abs(r.ore+r.material+2*r.kits+r.spent+2*(r.built+r.partial)-(248+r.extracted))<1e-6);
 }
 const snapshot=JSON.stringify(s);tickCity(s);assert.equal(JSON.stringify(s),snapshot);
}
const s=createCity();advanceCity(s,1);assert.equal(s.received,0,'Transfers are delayed');
const stay=advanceCity(createCity(2,.1),120),send=advanceCity(createCity(2,.8),120);
assert(stay.industry.fleet>send.industry.fleet);assert(send.received>stay.received);
console.log('City: conserved industry exports, travel delay, sector limits, scenario changes, human tasks retained and reinvestment tradeoff: OK');
