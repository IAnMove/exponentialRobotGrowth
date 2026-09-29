import assert from 'node:assert/strict';
import {R_EARTH,GEO_ALT,SHELLS,period,lightMs,geoOneWayMs,leoOneWayMs,footprintKm,elevation,geodetic,eci,buildConstellation,positionsAt,routePacket,refreshRoute,coverageGrid,sampleCount,lineOfSight,laserLink,distance,inView} from './site-src/starlink/model.js';
const near=(a,b,tol=1e-6)=>assert(Math.abs(a-b)<=tol+1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
assert(Math.abs(period(550)/60-95.6)<1.5);
near(geoOneWayMs(),1000*GEO_ALT/299792.458,0.05);
near(leoOneWayMs(550),lightMs(550),1e-9);
assert(geoOneWayMs()>100&&leoOneWayMs(550)<5);
assert(footprintKm(480,25)>400&&footprintKm(480,25)<2000);
const up=geodetic(0,0),zen=eci(480,0,0,0);assert(elevation(up,zen)>89);
const sats=buildConstellation();assert.equal(sats.length,sampleCount());assert(sats.length>200&&sats.length<600);
const pos=positionsAt(sats,0);pos.forEach(p=>assert(Math.hypot(p.x,p.y,p.z)>R_EARTH+300));
const madrid=geodetic(40.4,-3.7),vis=pos.filter(p=>elevation(madrid,p)>=25);
assert(vis.length>=1,'Madrid should see a sample satellite');
const r0=routePacket(madrid,sats,pos,true);assert.equal(r0.inView,vis.length);
const ocean=geodetic(0,-30);
const bent=routePacket(ocean,sats,pos,false),mesh=routePacket(ocean,sats,pos,true);
assert.equal(bent.mode,'bent-pipe');
if(bent.ok)assert.equal(mesh.ok,true);
const all=coverageGrid(sats,pos,30),mid=coverageGrid(buildConstellation(new Set(['mid53'])),positionsAt(buildConstellation(new Set(['mid53'])),0),30);
assert(all.fraction>=mid.fraction-1e-6,'More shells cannot reduce coverage');
assert(all.fraction>0.3);
SHELLS.forEach(s=>assert(s.detail[0]&&s.detail[1]&&s.es&&s.en));
const user=geodetic(0,0),fake=[{id:0},{id:1}],gw=lon=>[{id:'test',lat:0,lon}];
const direct=routePacket(user,fake.slice(0,1),[geodetic(0,0,480)],false,gw(0));
assert(direct.ok);near(direct.km,960);near(direct.ms,lightMs(960));assert.equal(direct.laserHops,0);
const alternative=routePacket(user,fake,[geodetic(0,0,480),geodetic(0,6,480)],false,gw(12));
assert(alternative.ok);assert.equal(alternative.serve,1,'Choose a satellite with a valid downlink, not just the highest');
const far=[geodetic(0,0,480),geodetic(0,20,480)];
const laser=routePacket(user,fake,far,true,gw(20)),failed=routePacket(user,fake,far,false,gw(20));
assert(laser.ok);assert.equal(laser.laserHops,1);assert(!failed.ok);assert.equal(failed.ms,0);assert.equal(failed.km,0);assert(!failed.hops.some(h=>h.kind==='gateway'));
assert(!lineOfSight(far[0],geodetic(0,180,480)));assert(!laserLink(far[0],geodetic(0,180,480)));
const high=[{x:10000,y:0,z:0},{x:10000,y:6000,z:0}];assert(lineOfSight(...high));assert(!laserLink(...high));
assert(!routePacket(user,fake,far,true,[]).ok);const empty=routePacket(user,[],[],true);assert.equal(empty.inView,0);assert.deepEqual(empty.hops,[]);assert.equal(sampleCount(new Set()),0);
for(const lat of [-70,-30,0,40,78])for(const lon of [-155,-30,0,120])for(const time of [0,120,960]){
 const ground=geodetic(lat,lon),p=positionsAt(sats,time),r=routePacket(ground,sats,p,true);
 if(!r.ok){assert(!r.hops.some(h=>h.kind==='gateway'));assert.equal(r.ms,0);continue;}
 const h=r.hops;assert(inView(ground,h[1].p));assert(inView(h.at(-1).p,h.at(-2).p));
 assert.equal(new Set(h.filter(h=>h.i!=null).map(h=>h.i)).size,h.length-2);
 let km=0;for(let i=1;i<h.length;i++){assert(lineOfSight(h[i-1].p,h[i].p));if(h[i].kind==='laser')assert(laserLink(h[i-1].p,h[i].p));km+=distance(h[i-1].p,h[i].p);}
 near(km,r.km);near(r.ms,lightMs(km));
}
const hawaii=geodetic(19,-155),cached=routePacket(hawaii,sats,pos,true);
assert(refreshRoute(cached,hawaii,sats,positionsAt(sats,1)),'A still-valid cached route refreshes metrics');
assert.equal(refreshRoute(cached,hawaii,sats,positionsAt(sats,19)),null,'Reroute when elevation drops below 25°, before cache timeout');
const refreshed=refreshRoute(cached,hawaii,sats,positionsAt(sats,1));near(refreshed.ms,lightMs(refreshed.hops.slice(1).reduce((km,h,i)=>km+distance(refreshed.hops[i].p,h.p),0)));
console.log('Starlink: orbital physics, honest routing, Earth occlusion, empty layers and moving-route validation OK');
