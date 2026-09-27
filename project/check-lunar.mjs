import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {simulate,sample,crossingYear,STAGES,DEFAULTS,POWER_PER_TONNE} from './site-src/lunar/model.js';
import {StepGuide} from './site-src/llms/guide.js';
import vm from 'node:vm';
const close=(a,b)=>assert(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
for(const local of [0,.5,.9,.98])for(const flights of [0,2,24])for(const flightGrowth of [0,.2,.5])for(const power of [5,250,1000]){
 const run=simulate({local,flights,flightGrowth,power});let last=100;
 for(const r of run.rows){
  assert(Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite));assert(r.capital>=last-1e-8);assert(r.stock>=0);assert(r.capital<=run.powerLimit+1e-6);assert(r.earthOnly<=run.powerLimit+1e-6);
  close(r.capital,DEFAULTS.seed+r.localTotal+r.usedImports);close(r.delivered,DEFAULTS.seed+r.stock+r.usedImports);close(r.localMade,r.build*local);close(r.power,r.capital*POWER_PER_TONNE);assert(r.flights===Math.floor(r.flights));last=r.capital;
 }
 if(flights===0)close(run.rows.at(-1).capital,100);
 if(local===0)assert(run.rows.every(r=>r.capital<=r.earthOnly+1e-6));
}
assert.equal(simulate().rows.at(-1).flights,44);assert.equal(simulate().rows[5].flights,4);assert.equal(simulate().rows[6].flights,5);
assert(simulate({flightGrowth:.2}).rows.at(-1).delivered>simulate().rows.at(-1).delivered);
for(const key of ['reinvest','uptime'])close(simulate({[key]:0}).rows.at(-1).capital,100);
const ideal=simulate({flights:120,payload:1000,uptime:1,power:100000});close(ideal.rows[12].capital,200);close(ideal.rows[24].capital,400);close(sample(ideal,-2).month,0);close(sample(ideal,999).month,240);
const seed=1e16/2**34;close(crossingYear(seed,1e16,12),2064);close(crossingYear(seed,1e16,24),2098);close(crossingYear(seed,1e26,24)-2030,2*(crossingYear(seed,1e26,12)-2030));
assert.throws(()=>simulate({local:1}));assert.throws(()=>simulate({flights:NaN}));assert.throws(()=>crossingYear(0,1e16,12));
const clips=JSON.parse(readFileSync('site-src/lunar/voices.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]),scripts=JSON.parse(readFileSync('narration/lunar.json','utf8'));
class AudioStub{play(){this.onplaying?.();return Promise.resolve();}pause(){}removeAttribute(){}load(){}}
for(const lang of ['es','en']){let i=0;const guide=new StepGuide({AudioClass:AudioStub,getClip:()=>clips[lang][i],onAdvance:()=>i===STAGES.length-1?false:!!(++i)});guide.resume();for(let j=0;j<STAGES.length;j++){assert.equal(clips[lang][j].id,STAGES[j].id);assert.equal(clips[lang][j].text,scripts[lang][j].text);assert(statSync('dist/audio/'+clips[lang][j].file).size>100000);assert(clips[lang][j].duration>10);for(let k=0;k<200;k++)guide.tick(.1);assert.equal(i,j);guide.audio.onended();for(let k=0;k<20;k++)guide.tick(.1);assert.equal(i,j);guide.pause();guide.tick(100);guide.resume();for(let k=0;k<11;k++)guide.tick(.1);}assert.equal(guide.state,'finished');}
const {buildLunarScene}=await import('./dist/lunar/world.js');
for(const lang of [true,false]){const world=buildLunarScene(lang,{textures:false});for(const row of [simulate().rows[0],simulate().rows[120],simulate({power:1000,flights:24,flightGrowth:.2}).rows.at(-1)]){for(const view of ['mission','route','base','growth']){world.setView(view);world.update(row,17,'replicate');world.scene.updateMatrixWorld(true);assert(world.instances.every(i=>i.count>0&&i.count<=256));world.scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite));if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));if(o.isInstancedMesh)assert([...o.instanceMatrix.array].every(Number.isFinite));});}}world.dispose();}
console.log('Lunar: 108 resource scenarios, monthly mass conservation, real flight counts, power constraints, doubling/date arithmetic, 28 narration clips, complete audio tours and finite 3D geometry: OK');

const {missionPose,deliveryEvents,deliveriesAt,MISSION_STAGES}=await import('./site-src/lunar/mission.js');
const {buildMission}=await import('./dist/lunar/mission-world.js');
for(const es of [true,false]){const mission=buildMission(es,{textures:false});for(const st of MISSION_STAGES)for(const progress of [0,.25,.6,1]){const pose=missionPose(st.id,progress);assert(pose.camera.every(Number.isFinite));mission.update(st.id,progress);mission.group.updateMatrixWorld(true);mission.group.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));}mission.dispose();}
const schedule=deliveryEvents(simulate());assert.equal(schedule.length,40);assert.equal(deliveriesAt(schedule,5.5).length,1);assert.equal(deliveriesAt(schedule,6).length,0);assert.equal(deliveriesAt(schedule,0).length,0);assert.equal(schedule.at(-1).number,44);assert.equal(deliveryEvents(simulate({flights:0})).length,0);
console.log('Lunar mission: seven deterministic camera/vehicle phases, finite meshes and individual deliveries aligned with the mass model: OK');
