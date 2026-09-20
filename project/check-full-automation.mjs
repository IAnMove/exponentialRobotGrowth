import assert from 'node:assert/strict';
import {createFactory,advance} from './site-src/factory-model.js';
import {simulateIndustry} from './industrial-model.js';
import {createCity,tickCity,FULL_END,STEP,SECTORS} from './site-src/city-model.js';
import {createTerritory,tickTerritory} from './site-src/territory-model.js';
import {CHORES,DURATION,createHome,tickHome,homeSnapshot} from './site-src/home/model.js';
const factory=advance(createFactory(undefined,true),24);
assert.equal(factory.deployed,10);assert(factory.total>=factory.deployed);
assert.equal(simulateIndustry().frames.at(-1).humansReplaced,74);
const city=createCity(3),region=createTerritory(.4,true,.35,true);
for(let i=0;i<FULL_END/STEP;i++){
 tickCity(city);tickTerritory(region);
 assert.equal(city.industry.fleet+city.dispatched,24+city.industry.built);
 assert.equal(city.received+city.pending.reduce((a,p)=>a+p.count,0),city.dispatched);
 assert.equal(city.assigned.reduce((a,b)=>a+b,0)+city.available,city.received);
 assert.equal(region.fleet+region.exported,24+region.built);
 assert.equal(region.exported,region.delivered+region.shipments.length+region.depot);
 assert(Math.abs(region.ore+region.material+2*region.kits+region.spent+2*(region.built+region.partial)-248-region.extracted)<1e-6);
}
assert.deepEqual(city.assigned,SECTORS.map(s=>s.tasks));
assert.equal(region.delivered,600);region.towns.forEach(t=>assert.deepEqual(t.assigned,t.tasks));
const end=JSON.stringify([city,region]);tickCity(city);tickTerritory(region);assert.equal(JSON.stringify([city,region]),end);
for(const overhead of [0,20]){
 const home=createHome(overhead);tickHome(home,10);assert.equal(home.time,0,'Paused clock must not move');
 home.playing=true;let before=homeSnapshot(home);
 for(let i=0;i<DURATION*10;i++){tickHome(home,.1);const now=homeSnapshot(home);assert(now.done>=before.done);assert(now.remaining<=before.remaining);assert.equal(now.remaining+now.freed,now.total);before=now;}
 tickHome(home,1);const done=homeSnapshot(home);assert.equal(done.done,CHORES.length);assert.equal(done.remaining,overhead===0?0:29);assert.equal(home.playing,false);
 assert.equal(homeSnapshot(createHome()).remaining,145);
}
console.log('Full factory/district/city/region handover, robot and resource conservation, household playback/reset/supervision: OK');
