import assert from 'node:assert/strict';
import {tcpTrace,sampleTCP,tcpPathAt,shortestPath,MSS,TCP_EDGES,TOY_TIMEOUT} from './site-src/journeys/internet-tcp.js';
import {internet} from './site-src/journeys/internet.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let cases=0,frames=0;
for(let size=3;size<=30;size++)for(const cut of [false,true])for(const loss of [false,true])for(const duplicate of [false,true]){
 const raw={size,cut,loss,duplicate},trace=tcpTrace(raw);cases++;
 assert(Object.isFrozen(trace)&&Object.isFrozen(trace.events)&&Object.isFrozen(trace.transmissions));
 assert.deepEqual(trace,tcpTrace(raw));assert.deepEqual(trace.route,cut?[0,1,3,4]:[0,1,2,4]);near(trace.delay,cut?7:4);
 assert.equal(trace.timeout,TOY_TIMEOUT);const observed=Math.max(0,...trace.acks.filter(a=>a.arrival<=TOY_TIMEOUT).map(a=>a.nextByte));assert.equal(trace.retryDecision.ackBytes,observed);assert.equal(trace.retryDecision.expired,observed===0);assert.equal(trace.transmissions.some(tx=>tx.retransmit),observed===0);if(cut&&!loss){assert.equal(sampleTCP(trace,11).ackBytes,0);assert.equal(sampleTCP(trace,11).retrySent,false);assert(sampleTCP(trace,14).ackBytes>0);assert.equal(sampleTCP(trace,15).retrySent,false);}
 assert.equal(trace.totalBytes,size*1000);assert.equal(trace.packets,Math.ceil(size*1000/MSS));
 assert.equal(trace.segments.reduce((n,s)=>n+s.bytes,0),trace.totalBytes);
 trace.segments.forEach((s,i)=>{assert.equal(s.seq,i*MSS);assert.equal(s.end-s.seq,s.bytes);assert(s.bytes>0&&s.bytes<=MSS);});
 for(const tx of trace.transmissions){assert.equal(tx.seq,trace.segments[tx.segment].seq);if(tx.lost){assert(tx.lossTime>tx.send&&tx.lossTime<tx.send+trace.delay);assert.equal(tx.arrival,null);}else near(tx.arrival-tx.send,trace.delay);}
 for(const ack of trace.acks){const tx=trace.transmissions.find(t=>t.id===ack.tx);near(ack.send,tx.arrival);near(ack.arrival-ack.send,trace.delay);assert(ack.nextByte>=0&&ack.nextByte<=trace.totalBytes);}
 let previous={uniqueBytes:0,deliveredBytes:0,ackBytes:0};
 for(let n=0;n<=120;n++){
  const t=n/4,s=sampleTCP(trace,t);frames++;
  for(const field of ['uniqueBytes','deliveredBytes','ackBytes'])assert(s[field]>=previous[field]&&s[field]<=trace.totalBytes);
  assert(s.deliveredBytes<=s.uniqueBytes);assert(s.ackBytes<=s.deliveredBytes);assert.equal(s.bufferedBytes,s.uniqueBytes-s.deliveredBytes);
  const arrived=trace.transmissions.filter(tx=>!tx.lost&&tx.arrival<=t),uniqueIds=new Set(arrived.map(tx=>tx.segment));
  assert.equal(s.uniqueBytes,[...uniqueIds].reduce((n,id)=>n+trace.segments[id].bytes,0));assert.equal(s.unique,uniqueIds.size);
  if(loss&&t<TOY_TIMEOUT+trace.delay)assert.equal(s.deliveredBytes,0,'missing first byte prevents ordered delivery');
  if(t<trace.requestCompleteAt+1)assert.equal(s.responseReady,false);if(t<trace.response.arrival)assert.equal(s.responseArrived,false);
  assert.equal(s.attempts,trace.transmissions.filter(tx=>tx.send<=t).length);
  for(const f of s.flights){const position=f.position;assert(trace.edges.some(([a,b])=>a===position.from&&b===position.to||a===position.to&&b===position.from));assert(position.progress>=0&&position.progress<=1);if(f.kind==='ack')assert(t>=f.send,'ACK travels only after data arrival');if(f.kind==='response')assert(t>=trace.requestCompleteAt+1);}
  assert(s.events.every(e=>e.time<=t));assert.deepEqual(s,sampleTCP(trace,t));previous=s;
 }
 const final=sampleTCP(trace,30);assert.equal(final.uniqueBytes,trace.totalBytes);assert.equal(final.deliveredBytes,trace.totalBytes);assert.equal(final.ackBytes,trace.totalBytes);assert.equal(final.attempts,trace.packets+Number(loss)+Number(duplicate));assert.equal(final.duplicateArrivals,Number(duplicate));assert.equal(final.responseArrived,true);assert.equal(final.flights.length,0);
 if(loss){const gap=sampleTCP(trace,trace.delay+1);assert(gap.uniqueBytes>0&&gap.bufferedBytes>0);assert.equal(gap.nextByte,0);assert.equal(gap.ackBytes,0);assert.equal(sampleTCP(trace,TOY_TIMEOUT-1e-8).retrySent,false);assert.equal(sampleTCP(trace,TOY_TIMEOUT).retrySent,true);}
 const end=trace.requestCompleteAt;assert.equal(sampleTCP(trace,end-1e-8).requestComplete,false);assert.equal(sampleTCP(trace,end).requestComplete,true);
 const model=internet.evaluate(raw,7);assert.equal(model.metrics.length,4);assert.equal(model.delay,trace.delay);assert.equal(model.series.length,3);assert.equal(model.series[0].values.length,8);assert.deepEqual(model.trace,trace);
 const reverse=sampleTCP(trace,.25);sampleTCP(trace,29);assert.deepEqual(reverse,sampleTCP(trace,.25));
}
assert.deepEqual(shortestPath([],0,4),{path:[],delay:Infinity});assert.deepEqual(shortestPath(TCP_EDGES,2,2),{path:[2],delay:0});
assert.deepEqual(shortestPath([...TCP_EDGES].reverse()),shortestPath(TCP_EDGES));
for(const value of [NaN,Infinity,-Infinity,'12',null]){assert.throws(()=>tcpTrace({size:value}),RangeError);assert.throws(()=>sampleTCP(tcpTrace(),value),RangeError);}
for(const edges of [[[0,1,-2]],[[0,9,1]],[[.5,1,1]],[[0,1,NaN]]])assert.throws(()=>shortestPath(edges),RangeError);
for(const reverse of [false,true]){const trace=tcpTrace();near(tcpPathAt(trace,0,reverse).progress,0);near(tcpPathAt(trace,trace.delay,reverse).progress,1);}
// Real Three objects exercise the notebook builder, including identity and reverse seeks.
globalThis.document={createElement:()=>({getContext:()=>({measureText:s=>({width:s.length*22}),fillText(){},fillRect(){}})})};
const {createLessonScene}=await import('./dist/journeys/world.js');
for(const es of [true,false]){
 const built=createLessonScene(internet,es),parts=built.scene.userData.internet,ids=parts.packets.map(m=>m.uuid),resourceCount=built.resources.length;
 for(const cut of [false,true])for(const loss of [false,true])for(const duplicate of [false,true]){
  const model=internet.evaluate({size:30,cut,loss,duplicate},0);
  for(const time of [0,.45,2.4,4,7,14.99,15,19,22,29,30]){
   built.update(model,time,3);built.scene.updateMatrixWorld(true);const s=sampleTCP(model.trace,time);
   assert.equal(parts.packets.filter(m=>m.visible).length,s.flights.length);assert.equal(parts.localPackets.filter(m=>m.visible).length,s.flights.length);
   s.flights.forEach((f,i)=>{const a=parts.coords[f.position.from],b=parts.coords[f.position.to];parts.packets[i].position.toArray().forEach((value,k)=>near(value,a[k]+(b[k]-a[k])*f.position.progress));});
   near(parts.bar.scale.x,Math.max(.001,s.uniqueBytes/model.trace.totalBytes));near(parts.orderedBar.scale.x,Math.max(.001,s.deliveredBytes/model.trace.totalBytes));near(parts.ackBar.scale.x,Math.max(.001,s.ackBytes/model.trace.totalBytes));
   for(const link of parts.links)assert.equal(link.mesh.visible,!(cut&&link.a===1&&link.b===2));
   built.scene.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
  }
  built.update(model,10,3);const positions=parts.packets.map(m=>m.position.toArray());built.update(model,30,3);assert(parts.packets.every(m=>!m.visible));built.update(model,10,3);assert.deepEqual(parts.packets.map(m=>m.position.toArray()),positions);
 }
 assert.deepEqual(parts.packets.map(m=>m.uuid),ids);assert.equal(built.resources.length,resourceCount);built.resources.forEach(r=>r.dispose());
}
console.log(`Internet TCP: ${cases} experiments and ${frames} fractional samples; bytes, relative sequence/ACKs, buffering, toy timeout, duplicate discard, causal response, weighted paths and reverse seek: OK`);
