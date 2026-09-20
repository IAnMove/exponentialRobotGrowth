import assert from 'node:assert/strict';
import {FALCON_STEPS,STARSHIP_STEPS,stepAt,progress,payloadMass,lightPayloadPenalty,tickFlight,createFlight,boosterBack,landed,PAYLOAD,F9_HEIGHT,STARSHIP_HEIGHT} from './site-src/spacex/model.js';
assert.equal(F9_HEIGHT,70);assert.equal(STARSHIP_HEIGHT,121);
assert(PAYLOAD.leoExpend>PAYLOAD.leoReuse);assert.equal(lightPayloadPenalty(),PAYLOAD.leoExpend-PAYLOAD.leoReuse);
assert.equal(payloadMass(true),PAYLOAD.leoReuse);assert.equal(payloadMass(false),PAYLOAD.leoExpend);
for(const steps of [FALCON_STEPS,STARSHIP_STEPS]){
 for(let i=1;i<steps.length;i++)assert(steps[i].t>steps[i-1].t);
 steps.forEach(s=>assert(s.es&&s.en&&s.body[0]&&s.body[1]));
}
const f=createFlight('falcon');assert.equal(stepAt(f.steps,0).id,'pad');assert.equal(stepAt(f.steps,150).id,'meco');assert.equal(stepAt(f.steps,480).id,'landing');
assert.equal(progress(f.steps,0),0);assert.equal(progress(f.steps,f.duration),1);
f.playing=true;f.speed=1;tickFlight(f,10);assert.equal(f.time,10);
const g=createFlight('falcon');g.time=300;g.reuse=true;assert(boosterBack(g));g.time=500;assert(landed(g));
const x=createFlight('falcon');x.reuse=false;x.time=500;assert.equal(landed(x),false);
const s=createFlight('starship');assert.equal(s.steps,STARSHIP_STEPS);s.time=430;s.reuse=true;assert(landed(s));
console.log('SpaceX timeline order, payload penalty, reuse landing and bilingual steps: OK');
