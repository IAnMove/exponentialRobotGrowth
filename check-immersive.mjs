import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STOPS,SPAWN,poseAt,walk,nearestStop,travelPose,obstacles} from './site-src/immersive/model.js';
import {immersiveHref} from './site-src/immersive/catalog.js';
import {createRun,advance} from './site-src/llms/model.js';
assert.equal(STOPS.length,8);assert.equal(new Set(STOPS.map(s=>s.z)).size,8);
assert.equal(immersiveHref('llms'),'../immersive/index.html?experience=llms');assert.equal(immersiveHref('home'),null);assert.equal(immersiveHref('__proto__'),null);
const blocked=p=>obstacles.some(b=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ);
for(const s of STOPS){const pose=poseAt(s.index);assert(!blocked(pose));assert.equal(nearestStop(pose).index,s.index);const end=travelPose(SPAWN,pose,1);for(const key of ['x','z','yaw','pitch'])assert(Math.abs(end[key]-pose[key])<1e-9);}
let p=poseAt(0);for(let i=0;i<500;i++)p=walk(p,{forward:1,strafe:0},.05);assert(p.x>-3.3);assert(!blocked(p));
let straight={...SPAWN,yaw:0};for(let i=0;i<1000;i++)straight=walk(straight,{forward:1,strafe:0},.05);assert.equal(straight.z,-106);
const a=walk({...SPAWN,yaw:0},{forward:1,strafe:0},.05),b=walk({...SPAWN,yaw:0},{forward:1,strafe:1},.05);assert(Math.abs(Math.hypot(a.x-SPAWN.x,a.z-SPAWN.z)-Math.hypot(b.x-SPAWN.x,b.z-SPAWN.z))<1e-10);
const run=createRun();for(let i=0;i<7;i++)advance(run);assert.equal(run.phase,7);assert.equal(run.generated.length,1);advance(run);assert.equal(run.phase,4);
for(const base of ['dist/','dist/es/'])for(const file of ['index.html','app.js','world.js','model.js','catalog.js','style.css'])assert(existsSync(base+'immersive/'+file));
for(const lang of ['en','es']){const page=readFileSync(`dist/${lang==='es'?'es/':''}immersive/index.html`,'utf8');assert(page.includes(`lang="${lang}"`));}
console.log('Immersive: supported worlds, 8 stops, walking basis, collisions, normalized diagonal speed, tour poses, first token and bilingual build: OK');
