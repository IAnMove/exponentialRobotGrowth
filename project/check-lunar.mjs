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
for(const lang of ['es','en']){let i=0;const guide=new StepGuide({AudioClass:AudioStub,getClip:()=>clips[lang][i],onAdvance:()=>i===6?false:!!(++i)});guide.resume();for(let j=0;j<7;j++){assert.equal(clips[lang][j].id,STAGES[j].id);assert.equal(clips[lang][j].text,scripts[lang][j].text);assert(statSync('dist/audio/'+clips[lang][j].file).size>100000);assert(clips[lang][j].duration>15);for(let k=0;k<200;k++)guide.tick(.1);assert.equal(i,j);guide.audio.onended();for(let k=0;k<20;k++)guide.tick(.1);assert.equal(i,j);guide.pause();guide.tick(100);guide.resume();for(let k=0;k<11;k++)guide.tick(.1);}assert.equal(guide.state,'finished');}
const {buildLunarScene}=await import('./dist/lunar/world.js');
for(const lang of [true,false]){const world=buildLunarScene(lang,{textures:false});for(const row of [simulate().rows[0],simulate().rows[120],simulate({power:1000,flights:24,flightGrowth:.2}).rows.at(-1)]){for(const view of ['route','base','growth']){world.setView(view);world.update(row,17,'replicate');world.scene.updateMatrixWorld(true);assert(world.instances.every(i=>i.count>0&&i.count<=256));world.scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite));if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));if(o.isInstancedMesh)assert([...o.instanceMatrix.array].every(Number.isFinite));});}}world.dispose();}
console.log('Lunar: 108 resource scenarios, monthly mass conservation, real flight counts, power constraints, doubling/date arithmetic, 14 narration clips, complete audio tours and finite 3D geometry: OK');
const app=readFileSync('site-src/lunar/app.js','utf8').replace(/^import .*;$/gm,'');
for(const lang of ['es','en']){
 const elements=new Map(),frames=[],events={},audios=[],views=[];let now=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{id,value:id==='seed-power'?'0.5820766091':id==='power-doubling'?'12':'0',checked:false,dataset:{},style:{},setAttribute(k,v){this[k]=v;}});return elements.get(id);};
 const stages=STAGES.map((_,i)=>Object.assign(element('stage-'+i),{dataset:{stage:String(i)}})),params=Object.keys(DEFAULTS).filter(k=>!['seed','payload'].includes(k)).map(id=>Object.assign(element(id),{dataset:{param:id}})),buttons=['route','base','growth'].map(v=>Object.assign(element('view-'+v),{dataset:{view:v}})),presets=['default','imports','fast'].map(v=>Object.assign(element('preset-'+v),{dataset:{preset:v}}));
 const document={documentElement:{lang},hidden:false,getElementById:element,querySelectorAll:s=>({'[data-view]':buttons,'[data-param]':params,'[data-stage]':stages,'[data-preset]':presets}[s]||[]),addEventListener(n,f){events[n]=f;}};
 class TestAudio extends AudioStub{constructor(){super();audios.push(this);}}
 class Guide extends StepGuide{constructor(o){super({...o,AudioClass:TestAudio});}}
 vm.runInNewContext(app,{DEFAULTS,STAGES,simulate,sample,crossingYear,START:2030,YEARS:20,POWER_PER_TONNE,VOICES:clips,StepGuide:Guide,document,window:{addEventListener(n,f){events[n]=f;}},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>frames.push(f),Intl,console,createWorld:()=>({representation:100,setView(v){views.push(v);},render(){},dispose(){}})});
 const tick=n=>{for(let i=0;i<n;i++){now+=1000/60;frames.shift()(now);}};
 element('time').value='120';element('time').oninput({target:element('time')});assert.equal(element('year').textContent,2040,'input value must survive pause/update');
 const before=element('capital').textContent;element('local').value='0';element('local').oninput();assert.notEqual(element('capital').textContent,before,'sliders recompute the history');
 element('reset').onclick();element('play').onclick();tick(365);assert(views.includes('base'));assert(views.includes('growth'));events.blur();const stopped=element('time').value;tick(60);assert.equal(element('time').value,stopped);
 element('reset').onclick();element('guide-top').onclick();for(let i=0;i<7;i++){assert.equal(element('chapter').textContent,`0${i+1} / 07`);audios.at(-1).onended();tick(181);}assert.match(element('voice-status').textContent,/completado|complete/);
 element('seed-power').value='0';element('seed-power').oninput();assert.equal(element('type1').textContent,'—');events.pagehide({persisted:false});
}
console.log('Lunar app: timeline regression, scenario controls, animation camera progression, pause, complete bilingual guide and invalid power input: OK');
