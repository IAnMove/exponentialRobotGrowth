import assert from 'node:assert/strict';
import {packetPose,buildConstellation,positionsAt,routePacket,geodetic,distance} from './site-src/starlink/model.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-7+Math.abs(b)*1e-10,`${a} ≠ ${b}`);
const point=(actual,expected)=>['x','y','z'].forEach(k=>near(actual[k],expected[k]));
const hop=(kind,x,y=0,z=0)=>({kind,p:{x,y,z}});
const rightAngle=[hop('user',0),hop('uplink',2),hop('laser',2,6),hop('gateway',2,6,2)];
// A 2 + 6 + 2 km path must spend 20%, 60%, 20% of its slowed travel on
// the three links. The former equal-time-per-link animation fails these points.
for(const [progress,expected,index] of [[0,{x:0,y:0,z:0},0],[.1,{x:1,y:0,z:0},0],[.2,{x:2,y:0,z:0},1],[.5,{x:2,y:3,z:0},1],[.8,{x:2,y:6,z:0},2],[.9,{x:2,y:6,z:1},2],[1,{x:2,y:6,z:2},2]]){
 const p=packetPose(rightAngle,progress);point(p.position,expected);near(p.totalKm,10);near(p.traveledKm,progress*10);assert.equal(p.index,index);assert.deepEqual(p.parts.map(p=>p.kind),['radio','laser','radio']);
 point(packetPose(rightAngle,1-progress,true).position,expected);
}
assert.equal(packetPose([],0),null);assert.equal(packetPose([hop('user',0)],1),null);
assert.equal(packetPose([hop('user',0),hop('uplink',0)],.5),null);
for(const progress of [-1,NaN,Infinity,undefined])point(packetPose(rightAngle,progress).position,{x:0,y:0,z:0});
point(packetPose(rightAngle,2).position,{x:2,y:6,z:2});
for(const progress of [0,.25,.5,1])for(const reverse of [false,true]){
 const p=packetPose([hop('user',0),hop('uplink',0),hop('laser',4),hop('gateway',4)],progress,reverse);
 assert(Number.isFinite(p.local));near(p.position.x,4*(reverse?1-progress:progress));
}
const sats=buildConstellation();let routes=0,samples=0,partial=0;
for(const lat of [-70,-30,0,40,78])for(const lon of [-155,-30,0,120])for(const time of [0,120,960])for(const lasers of [false,true]){
 const r=routePacket(geodetic(lat,lon),sats,positionsAt(sats,time),lasers),before=JSON.stringify(r);
 for(const hops of [r.hops,r.hops.slice(0,2)])for(const reverse of [false,true])for(const progress of [0,.001,.125,.25,.5,.9,.999,1]){
  const p=packetPose(hops,progress,reverse);
  if(hops.length<2){assert.equal(p,null);continue;}
  assert(p);const parts=p.parts,leg=parts[p.index],total=hops.slice(1).reduce((n,h,i)=>n+distance(hops[i].p,h.p),0);
  near(p.totalKm,total);near(p.traveledKm,progress*total);
  const covered=parts.slice(0,p.index).reduce((n,l)=>n+l.km,0)+distance(leg.from.p,p.position);
  near(covered,progress*total);near(distance(leg.from.p,p.position)+distance(p.position,leg.to.p),leg.km);
  point(packetPose(hops,1-progress,!reverse).position,p.position);
  if(progress===0)point(p.position,reverse?hops.at(-1).p:hops[0].p);
  if(progress===1)point(p.position,reverse?hops[0].p:hops.at(-1).p);
  assert(p.local>=0&&p.local<=1);samples++;if(!r.ok)partial++;
 }
 assert.equal(JSON.stringify(r),before,'packet motion must not mutate the routing result');routes++;
}
assert(routes===120&&samples>2000&&partial>0);
console.log(`Starlink packet: ${routes} current route snapshots, ${samples} distance/direction samples (${partial} partial), unequal links, empty/zero lengths, boundaries, clamp, rewind and routing immutability OK`);
