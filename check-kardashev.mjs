import assert from 'node:assert/strict';
import {MIN_K,MAX_K,HUMAN_POWER,powerAt,indexAt,multiplier,yearsAtGrowth,createState,tick,snapshot} from './site-src/kardashev/model.js';
const near=(a,b)=>assert(Math.abs(a-b)/Math.max(1,Math.abs(b))<1e-10,`${a} != ${b}`);
for(const k of [MIN_K,.8,1,1.1,1.5,2,2.1,3]){near(indexAt(powerAt(k)),k);near(multiplier(k,k+.1),10);near(multiplier(k,k+1),1e10);}
near(powerAt(MIN_K),HUMAN_POWER);near(powerAt(1),1e16);near(powerAt(2),1e26);near(powerAt(3),1e36);
near(snapshot(createState()).fractionOfNext,.002);near(indexAt(2e13),.7301029995663981);
assert.throws(()=>indexAt(0),RangeError);assert.throws(()=>indexAt(Infinity),RangeError);
assert.equal(yearsAtGrowth(1,2,0),Infinity);assert.equal(yearsAtGrowth(3,3,0),0);
const years=yearsAtGrowth(1,2,2);near(1.02**years,1e10);
const s=createState();tick(s,10);assert.equal(s.k,MIN_K);s.playing=true;tick(s,-1);assert.equal(s.k,MIN_K);
for(let i=0;i<1000;i++){const before=s.k;tick(s,.1);assert(s.k>=before&&s.k<=MAX_K);assert(Number.isFinite(snapshot(s).power));}
assert.equal(s.k,3);assert.equal(s.playing,false);assert.equal(snapshot(s).view,'galaxy');assert.equal(snapshot(createState()).view,'planet');assert.equal(snapshot({k:2}).view,'star');
console.log('Kardashev: inverse scale, exact thresholds and multipliers, human reference, compound growth, pause and bounded playback: OK');
