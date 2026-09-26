import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {STAGES,PLACES,geoPoint,greatCircle,CABLE_KM,propagationMs,stageFact} from './site-src/journeys/internet-route.js';
import {StepGuide} from './site-src/llms/guide.js';
import vm from 'node:vm';
const close=(a,b)=>Math.abs(a-b)<1e-7;
assert.equal(propagationMs(CABLE_KM),33);
assert.equal(2*propagationMs(CABLE_KM),66);
assert.deepEqual(geoPoint({lat:0,lon:0},10),[0,0,10]);
assert(close(geoPoint({lat:90,lon:0})[1],10));
const cable=greatCircle(PLACES.sopelana,PLACES.virginia);
for(const p of cable)assert(close(Math.hypot(...p),10.05),'route follows Earth rather than passing through it');
for(const [p,place] of [[cable[0],PLACES.sopelana],[cable.at(-1),PLACES.virginia]])geoPoint(place,10.05).forEach((n,i)=>assert(close(n,p[i]),'cable endpoint matches its geographic anchor'));
assert.equal(STAGES.length,9);assert.equal(new Set(STAGES.map(s=>s.id)).size,9);
const scripts=JSON.parse(readFileSync('narration/internet-voyage.json','utf8'));
const clips=JSON.parse(readFileSync('site-src/journeys/voices-internet-voyage.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
class AudioStub{constructor(src){this.src=src;this.currentTime=0;}play(){this.onplaying?.();return Promise.resolve();}pause(){}load(){}removeAttribute(){}}
for(const lang of ['es','en']){
 assert.equal(clips[lang].length,9);
 let stage=0,visits=[];
 const guide=new StepGuide({AudioClass:AudioStub,getClip:()=>{visits.push(stage);return clips[lang][stage];},onAdvance:()=>stage===8?false:!!(++stage),gap:3});
 guide.resume();
 for(let i=0;i<9;i++){
  const c=clips[lang][i];assert.equal(c.id,STAGES[i].id);assert.equal(c.text,scripts[lang][i].text);assert(c.duration>15&&c.duration<65);assert(statSync('dist/audio/'+c.file).size>100000);
  assert(stageFact(STAGES[i],lang==='es').every(Boolean));
  for(let n=0;n<500;n++)guide.tick(.1);assert.equal(stage,i,'estimated time must never skip narration');
  guide.audio.onended();for(let n=0;n<20;n++)guide.tick(.1);assert.equal(stage,i,'three-second observation gap');
  guide.pause();const remaining=guide.remaining;guide.tick(20);assert.equal(guide.remaining,remaining);guide.resume();
  for(let n=0;n<11;n++)guide.tick(.1);
 }
 assert.equal(guide.state,'finished');assert.deepEqual(visits,[0,1,2,3,4,5,6,7,8]);
}
const {createVoyageScene}=await import('./dist/journeys/internet-world.js');
for(const es of [true,false]){
 const w=createVoyageScene(es,{textures:false});
 for(let i=0;i<9;i++)for(const time of [0,1,10]){
  w.setStage(i);w.update(time,.7);w.scene.updateMatrixWorld(true);
  assert.equal(Object.values(w.groups).filter(g=>g.visible).length,1);
  assert(w.groups[STAGES[i].scene].visible);
  let meshes=0;w.scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite));if(o.isMesh){meshes++;assert([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert(meshes>500);
  for(const path of w.paths)for(const p of path.particles)assert.equal(p.visible,path.stages.includes(i));
 }
 const ret=w.paths.find(p=>p.stages.includes(7)),start=geoPoint(PLACES.ashburn,10.05),end=geoPoint(PLACES.madrid,10.05);
 ret.curve.getPoint(0).toArray().forEach((n,i)=>assert(close(n,start[i])));ret.curve.getPoint(1).toArray().forEach((n,i)=>assert(close(n,end[i])));
 w.dispose();
}
for(const prefix of ['dist','dist/es']){
 assert(readFileSync(prefix+'/journeys/app.js','utf8').includes("location.replace('./internet-voyage.html')"));
 assert(readFileSync(prefix+'/journeys/internet-voyage.html','utf8').includes(prefix.endsWith('/es')?'lang="es"':'lang="en"'));
}
console.log('Internet voyage: real geographic endpoints, propagation arithmetic, 18 recorded transcripts, complete audio-gated tours, finite geometry, scene isolation and return direction: OK');
// Exercise the application wiring, not just the shared narration state machine.
const appSource=readFileSync('site-src/journeys/internet-voyage.js','utf8').replace(/^import .*;$/gm,'');
for(const lang of ['es','en']){
 const elements=new Map(),events={},frames=[],audios=[],visits=[];let now=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{id,hidden:false,style:{},dataset:{},classList:{toggle(){}},setAttribute(k,v){this[k]=v;},scrollIntoView(){},blur(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const stages=STAGES.map((_,i)=>Object.assign(element('stage-'+i),{dataset:{stage:String(i)}}));
 const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:element,querySelectorAll:s=>s==='[data-stage]'?stages:[],querySelector:s=>s==='.touch'?element('touch'):stages[+s.match(/\d+/)[0]],addEventListener(n,f){events[n]=f;}};
 class TestAudio extends AudioStub{constructor(src){super(src);audios.push(this);}}
 class Guide extends StepGuide{constructor(o){super({...o,AudioClass:TestAudio});}}
 vm.runInNewContext(appSource,{STAGES,SOURCES:[],stageFact,VOICES:clips,StepGuide:Guide,document,window:{addEventListener(n,f){events[n]=f;}},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>frames.push(f),console,createVoyageWorld:()=>({canvas:{},go(i){visits.push(i);},explore(){},look(){},move(){},render(){},dispose(){}}),bindFirstPerson:()=>({release(){},request(){},dispose(){}})});
 const tick=n=>{for(let i=0;i<n;i++){now+=1000/60;frames.shift()(now);}};
 element('play').onclick();tick(300);assert.match(element('counter').textContent,/01/);
 element('play').onclick();const count=audios.length;tick(200);assert.equal(audios.length,count,'pause must not load another clip');element('play').onclick();
 for(let i=0;i<9;i++){assert.equal(element('counter').textContent,`${String(i+1).padStart(2,'0')} / 09`);audios.at(-1).onended();tick(181);}
 assert.match(element('status').textContent,/completado|complete/);assert.deepEqual(visits,[1,2,3,4,5,6,7,8]);
 stages[4].onclick();assert.match(element('counter').textContent,/05/);assert.equal(element('number').textContent,'≈ 33 ms');
 element('language').onchange({target:{value:lang==='es'?'en':'es'}});assert.equal(element('words').textContent,clips[lang==='es'?'en':'es'][4].text);
 element('explore').onclick();assert.equal(element('look-help').hidden,false);element('sources').onclick();assert.equal(element('source-dialog').open,true);
 events.pagehide({persisted:false});
}
console.log('Voyage application: nine-stage tour, pause/resume, manual selection, language/transcript switch, exploration, sources and cleanup: OK');
