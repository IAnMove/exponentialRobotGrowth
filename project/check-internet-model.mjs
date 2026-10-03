import assert from 'node:assert/strict';
import {internetFrameAt,internetStatus} from './site-src/journeys/internet-model.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
let samples=0;
for(let index=0;index<9;index++)for(let n=0;n<=200;n++){
 const p=n/200,s=internetFrameAt(index,p);samples++;
 assert(Object.isFrozen(s)&&Object.isFrozen(s.signal)&&Object.isFrozen(s.activeSegments));
 assert.deepEqual(s,internetFrameAt(index,p),'seek and replay never consume random state');
 assert.equal(s.index,index);near(s.progress,p);near(s.visualTime,(index+p)*20);
 assert.equal(s.totalLatencyMs,null);assert.equal(s.routeSurveyed,false);
 assert.equal(s.requestArrived,index>6||(index===6&&p>=.3));
 assert.equal(s.responseReady,index>6||(index===6&&p>=.65));
 assert.equal(s.responseArrived,index===8&&p>=.45);
 assert(s.processingProgress>=0&&s.processingProgress<=1);
 assert(s.screenProgress>=0&&s.screenProgress<=1);
 if(!s.responseArrived)assert.equal(s.screenProgress,0);
 if(!s.responseReady)assert(s.activeSegments.every(x=>x.direction==='request'));
 for(const x of s.activeSegments){assert(Object.isFrozen(x));assert(x.local>=0&&x.local<=1);assert.equal(x.arrived,x.local===1);}
 assert.equal(s.activeSegments.length,index===6&&p>=.3&&p<.65||index===8&&p>=.45?0:1);
 assert(internetStatus(s,true)&&internetStatus(s,false));
 if(index===4){near(s.signal.distanceKm,p*6600);near(s.signal.travelMs,p*33);}else{assert.equal(s.signal.distanceKm,null);assert.equal(s.signal.travelMs,null);}
 near(s.signal.submarineOneWayMs,33);near(s.signal.submarineRoundTripMs,66);
}
for(const [p,arrived,processing,ready,ids]of [[0,false,0,false,['server-in']],[.3,true,0,false,[]],[.475,true,.5,false,[]],[.65,true,1,true,['server-out']],[1,true,1,true,['server-out']]]){
 const s=internetFrameAt(6,p);assert.equal(s.requestArrived,arrived);near(s.processingProgress,processing);assert.equal(s.responseReady,ready);assert.deepEqual(s.activeSegments.map(x=>x.id),ids);
}
near(internetFrameAt(8,.45).screenProgress,0);near(internetFrameAt(8,.725).screenProgress,.5);near(internetFrameAt(8,1).screenProgress,1);
assert.deepEqual(internetFrameAt(0,-8),internetFrameAt(0,0));assert.deepEqual(internetFrameAt(8,99),internetFrameAt(8,1));
for(const i of [-1,9,.5,NaN,Infinity,'0',null])assert.throws(()=>internetFrameAt(i),RangeError);
for(const p of [NaN,Infinity,-Infinity,'0',null])assert.throws(()=>internetFrameAt(0,p),RangeError);
assert.throws(()=>{internetFrameAt(4,.5).signal.travelMs=99;},TypeError);
console.log(`Internet immutable voyage: ${samples} stage/fraction samples, causal request/processing/reply/render, no invented total latency, fixed propagation reference and reverse seeks: OK`);
