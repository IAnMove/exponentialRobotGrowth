import assert from 'node:assert/strict';
import {createTerritory,tickTerritory,advanceTerritory,townCapacity,covered} from './dist/territory-model.js';
import * as spanish from './dist/es/territory-model.js';
import {STEP,END} from './dist/region-model.js';
for(const investment of [0,.4,.7])for(const delivery of [.1,.35,.8]){
 const s=createTerritory(investment,true,delivery);
 for(let step=0;step<END/STEP;step++){
  tickTerritory(s);
  assert.equal(s.fleet+s.exported,24+s.built,'A shipped robot cannot also remain in industry');
  assert.equal(s.exported,s.delivered+s.shipments.length+s.depot,'Every exported robot must have a location');
  assert.equal(s.delivered,s.towns.reduce((a,t)=>a+covered(t),0));
  s.towns.forEach((t,i)=>{
   assert.equal(t.reserved,s.shipments.filter(p=>p.town===i).length);
   assert.equal(t.received,covered(t));
   assert(covered(t)+t.reserved<=townCapacity(t).reduce((a,b)=>a+b,0));
   t.assigned.forEach((n,k)=>assert(n>=0&&n<=townCapacity(t)[k]&&n<t.tasks[k]));
  });
  for(const p of s.shipments)assert(p.ready>s.time-1e-8&&p.ready-p.depart===s.towns[p.town].travel);
  assert(Math.abs(s.ore+s.material+2*s.kits+s.spent+2*(s.built+s.partial)-(248+s.extracted))<1e-6);
 }
 const snapshot=JSON.stringify(s);tickTerritory(s);assert.equal(JSON.stringify(s),snapshot);
 assert.deepEqual(s,spanish.advanceTerritory(spanish.createTerritory(investment,true,delivery),END),'EN and ES must produce identical allocations');
}
const early=advanceTerritory(createTerritory(.4,true,.8),2);
assert(covered(early.towns[0])>0);assert.equal(covered(early.towns[1]),0);assert.equal(covered(early.towns[2]),0);
const expand=advanceTerritory(createTerritory(.4,true,.35),END),fixed=advanceTerritory(createTerritory(0,false,.35),END);
assert(expand.built>fixed.built);assert(expand.flow[3]>fixed.flow[3]);
console.log(JSON.stringify({checks:'Regional conservation, reservations, delivery delay, finite scope, baseline and bilingual parity OK',expansion:expand.built,fixed:fixed.built,cities:expand.towns.map(covered)}));
