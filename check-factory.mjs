import assert from 'node:assert/strict';
import {createFactory,tick,automate,advance,forecast,capacity,status,robotDuty,STEP,BUFFER,constraint} from './dist/factory-model.js';

function conserved(s){assert.equal(s.delivered,s.total+s.queues.reduce((a,b)=>a+b,0)+s.jobs.filter(x=>x!==null).length);for(let i=1;i<5;i++)assert(s.queues[i]>=0&&s.queues[i]<=BUFFER);s.queues.forEach(n=>assert(Number.isInteger(n)));assert(s.jobs.every(p=>p===null||(p>=0&&p<=1)));}
const human=forecast([0,0,0,0,0]),assembly=forecast([0,2,0,0,0]),tests=forecast([0,0,0,2,0]),all=forecast([2,2,2,2,2]);
assert(human>0);assert(tests>human,'Fixing tests must improve output');assert(assembly<=tests,'Speeding assembly alone must not beat fixing tests');assert(all>tests);assert(all<=160,'Cannot ship more phones than kits available');
for(const config of [[0,0,0,0,0],[2,2,2,2,2],[1,2,0,1,2]]){
  const s=createFactory(config);
  for(let k=0;k<24*6/STEP;k++){tick(s);conserved(s);}
  assert.equal(s.day,7);assert.equal(s.history.length,6);assert.equal(s.history.reduce((a,b)=>a+b,0)+s.today,s.total);
}
const s=createFactory();automate(s,1);assert.equal(capacity(s,1).robots,0);assert.equal(robotDuty(s,1,0),'arriving');assert.equal(automate(s,1),true);assert.equal(automate(s,1),false);
advance(s,6);conserved(s);assert.equal(capacity(s,0).humans,2);advance(s,5);assert.equal(capacity(s,0).humans,0);
const working=createFactory();advance(working,5);assert.equal(capacity(working,0).humans,0);assert.equal(status(working,0).code,'rest');
assert.equal(constraint(createFactory()).index,3);assert.equal(constraint(createFactory([2,2,2,2,2])).index,-1);
const limited=createFactory([2,2,2,2,2]);for(let k=0;k<24/STEP;k++){tick(limited);conserved(limited);}assert(limited.queues[0]>=0);
console.log(JSON.stringify({human,assembly,tests,all,checks:'Conservation, bounded queues, daily resets, shifts, arrivals, supply and intervention outcomes OK'}));
