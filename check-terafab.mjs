import assert from 'node:assert/strict';
import {capacity,DEFAULTS} from './site-src/terafab/model.js';
assert.equal(capacity().output,80);
assert.equal(capacity({logic:240}).output,80,'More logic cannot bypass packaging');
assert.equal(capacity({packaging:140}).output,90,'Logic yield limits an expanded packaging stage');
assert.equal(capacity({logic:240,packaging:140}).output,100,'Testing and utilities limit the expanded factory');
assert.deepEqual(capacity({logic:240,packaging:140}).bottlenecks,['test','utilities']);
assert.equal(capacity({utilities:40}).output,40,'Infrastructure can limit all fabrication');
assert.equal(capacity({yield:0}).output,0,'No usable logic means no usable output');
for(let logic=40;logic<=240;logic+=10)for(let yieldValue=20;yieldValue<=100;yieldValue+=5)for(let packaging=20;packaging<=160;packaging+=10){
  const c=capacity({logic,yield:yieldValue,packaging});
  assert(c.output>=0&&c.output<=100);
  for(const v of Object.values(c.stages))assert(c.output<=v+1e-8);
  assert(c.bottlenecks.length>0);
  if(logic<240)assert(capacity({logic:logic+10,yield:yieldValue,packaging}).output>=c.output);
}
for(const value of [NaN,Infinity,-1,241])assert.throws(()=>capacity({logic:value}),RangeError);
assert.deepEqual(DEFAULTS,{logic:120,yield:75,packaging:80,utilities:100});
// Language builds must retain identical model rules.
const en=await import('./dist/terafab/model.js'),es=await import('./dist/es/terafab/model.js');
for(const parameters of [{},{logic:240},{packaging:140},{yield:20,utilities:40}])assert.deepEqual(en.capacity(parameters),es.capacity(parameters));
console.log('Terafab: bottlenecks, yield, infrastructure, bounds, monotonicity and EN/ES parity OK');
