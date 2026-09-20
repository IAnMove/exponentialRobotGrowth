import assert from 'node:assert/strict';
import {advanceScene} from './site-src/kardashev/motion.js';
import {createState,tick} from './site-src/kardashev/model.js';
for(const k of [.7301029995663981,1,2,3]){
  const s=createState();s.k=k;let clock=0;
  for(let i=0;i<60;i++){tick(s,1/60);clock=advanceScene(clock,1/60,true);}
  assert.equal(s.k,k,'Inspecting a level must not advance energy');
  assert(clock>.99,'All selected scenes animate even when growth is paused or complete');
  assert.equal(advanceScene(clock,.1,false),clock);
  assert.equal(advanceScene(clock,.1,true,false),clock);
  assert.equal(advanceScene(clock,NaN,true),clock);
}
console.log('Kardashev: independent motion at every level, pause, hidden tab and invalid delta: OK');
