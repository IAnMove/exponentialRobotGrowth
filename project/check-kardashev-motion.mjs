import assert from 'node:assert/strict';
import {advanceScene,collectorAngularSpeed,collectorPhaseAt} from './site-src/kardashev/motion.js';
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
for(const radius of [2.5,2.545,3.535,5,10]){
 const speed=collectorAngularSpeed(radius),period=2*Math.PI/speed;
 assert(Math.abs((period/(2*Math.PI/.18))**2-(radius/2.5)**3)<1e-9,'relative periods obey Kepler III');
 for(const u of [0,.125,.25,.5,.75,.99])assert(Math.abs(collectorPhaseAt(radius,u*period)-u*2*Math.PI)<1e-10);
 assert(Math.abs(collectorPhaseAt(radius,period+.25)-collectorPhaseAt(radius,.25))<1e-12);
 assert.equal(collectorPhaseAt(radius,0),0,'rewind is independent of previous samples');
}
assert(collectorAngularSpeed(2.5)>collectorAngularSpeed(3.535));
for(const radius of [0,-1,NaN,Infinity])assert.throws(()=>collectorAngularSpeed(radius),RangeError);
for(const clock of [-1,NaN,Infinity])assert.throws(()=>collectorPhaseAt(2.5,clock),RangeError);
console.log('Kardashev: independent scene motion, pause/visibility, ideal circular orbit period ratios, deterministic phases, rewind and invalid inputs: OK');
