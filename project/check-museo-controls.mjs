import {LESSONS} from './site-src/journeys/catalog.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './site-src/museo/model.js';
import {immersiveHref} from './site-src/immersive/catalog.js';
import {StepGuide} from './site-src/llms/guide.js';
const VOICES=JSON.parse(readFileSync('narration/museo.json','utf8'));
// Exercise app controls with a lightweight DOM and renderer adapter, without a browser.
const source=readFileSync('site-src/museo/app.js','utf8')
  .replace(/import \{[^}]+\} from '\.\/model.js';/,'const {spawn,rooms,exhibits,stepVisitor,lookDelta,nearestExhibit,roomAt,standAt,routeTo,portalPose,yawLookingAt,SPEED}=model;')
  .replace(/import \{createMuseum\} from '\.\/world.js';/,'')
  .replace(/import \{immersiveHref\} from '[^']+';/,'')
  .replace(/import \{NotebookPlayer\} from '[^']+';/,'')
  .replace(/import \{LESSONS\} from '[^']+';/,'')
  .replace(/import \{VOICES\} from '[^']+';/,'');
const players=[];
for(const lang of ['es','en']){
  const elements=new Map(),events={},queued=[];let clock=0,lastPose,url;
  const element=id=>{if(!elements.has(id))elements.set(id,{id,hidden:id==='map',checked:false,dataset:{},style:{},textContent:'',classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(name,fn){(this.handlers??={})[name]=fn;},setPointerCapture(){},append(){}});return elements.get(id);};
  const roomButtons=model.rooms.slice(1).map(r=>({...element('room-'+r.id),dataset:{room:r.id}}));
  const paintings=model.exhibits.map(e=>({...element('painting-'+e.id),dataset:{painting:e.id}}));
  const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:element,createElement:element,exitPointerLock(){},addEventListener(){},querySelectorAll(selector){return selector==='[data-room]'?roomButtons:paintings;}};
  const window={addEventListener(name,fn){events[name]=fn;}};
  // Stand-in for the shared player: records chapters and replays the onSync contract (index, running, reason).
  class Player{constructor(o){this.o=o;this.clips=o.getClips(lang);this.index=0;this.running=false;players.push(this);}get current(){return {...this.clips[this.index],index:this.index};}stage(i,play=this.running){this.index=i;this.running=play;this.o.onSync({...this.current,running:this.running,reason:'seek'});}save(){}toggle(){this.running=!this.running;}pause(){this.running=false;}}
  class Guide extends StepGuide{constructor(options){super({...options,AudioClass:class{pause(){} removeAttribute(){} load(){} play(){return Promise.resolve();}}});}}
  const ctx={LESSONS,document,window,console,URLSearchParams,model,immersiveHref,NotebookPlayer:Player,StepGuide:Guide,VOICES,matchMedia:()=>({matches:false}),performance:{now:()=>clock},location:{search:'',hash:'',assign:value=>{url=value;}},requestAnimationFrame:fn=>queued.push(fn),createMuseum:()=>({render:p=>{lastPose={...p};},pick:()=>null})};
  vm.runInNewContext(source,ctx);
  function frames(n){for(let i=0;i<n;i++){clock+=1000/60;queued.shift()(clock);}}
  element('start').onclick();paintings.find(p=>p.dataset.painting==='llms').onclick();frames(600);
  const llm=model.exhibits.find(e=>e.id==='llms'),stand=model.standAt(llm);
  assert(Math.hypot(lastPose.x-stand.x,lastPose.z-stand.z)<.01,'guided walking reaches LLM painting');
  assert.equal(element('card').hidden,false);assert.equal(element('enter-3d').hidden,false);
  element('enter-3d').onclick();frames(110);assert(url?.includes('experience=llms&entrance=painting'),'portal navigates to actual immersive route');
  events.pagehide();frames(2);assert(Math.hypot(lastPose.x-stand.x,lastPose.z-stand.z)<.01,'back cache restores the approach pose');
  url=null;events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});frames(200);assert(url?.includes('entrance=painting'),'walking into the illuminated canvas crosses its threshold');events.pagehide();frames(2);
  paintings.find(p=>p.dataset.painting==='robots').onclick();frames(40);
  events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});frames(10);events.keyup({code:'KeyW'});frames(60);
  assert.equal(element('stop').hidden,true,'walking interrupts the automatic route');
  paintings.find(p=>p.dataset.painting==='kardashev').onclick();frames(20);const view=element('view').handlers;
  view.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,pointerType:'touch'});view.pointermove({clientX:160,clientY:110});view.pointermove({clientX:260,clientY:120});frames(2);
  assert.equal(element('stop').hidden,false,'looking around keeps the guided route walking');view.pointerup({clientX:260,clientY:120});frames(900);
  const kardashev=model.standAt(model.exhibits.find(e=>e.id==='kardashev'));assert(Math.hypot(lastPose.x-kardashev.x,lastPose.z-kardashev.z)<.01,'a route keeps going while the visitor looks around');
  assert(Math.abs(Math.atan2(Math.sin(lastPose.yaw-kardashev.yaw),Math.cos(lastPose.yaw-kardashev.yaw)))<.02,'the head eases back to face the painting');
  element('instant').checked=true;paintings.find(p=>p.dataset.painting==='robots').onclick();frames(10);
  assert.equal(element('enter-3d').hidden,true,'unbuilt worlds are never presented as immersive');
  assert.equal(element('web').href,'../robots/index.html');
  element('map-toggle').onclick();assert.equal(element('map').hidden,false);element('map-close').onclick();assert.equal(element('map').hidden,true);
  for(const id of Object.keys(LESSONS)){
    paintings.find(p=>p.dataset.painting===id).onclick();frames(10);
    assert.equal(element('enter-3d').hidden,false,id+' has a real walkable world');
    assert.equal(element('web').href,`../journeys/index.html?topic=${id}`);
    element('enter-3d').onclick();frames(110);
    assert.equal(url,`../journeys/index.html?topic=${id}&mode=immersive&entrance=painting`);
    events.pagehide();frames(2);
  }
  const audio=players.at(-1),roomOf=id=>model.rooms.findIndex(r=>r.id===id);element('instant').checked=false;
  assert.equal(audio.clips.length,model.rooms.length,'one audio-guide chapter per room');assert(audio.clips.every(c=>c.text&&c.title));
  element('tour').onclick();frames(900);assert(audio.running,'the guided visit starts the audio guide');assert.equal(audio.index,roomOf('mind'),'the guide plays the chapter of the room reached');
  paintings.find(p=>p.dataset.painting==='cell').onclick();frames(1400);assert.equal(audio.index,roomOf('life'),'walking into another room moves the playing guide there');
  audio.stage(roomOf('cosmos'),true);frames(1400);assert.equal(model.roomAt(lastPose.x,lastPose.z).id,'cosmos','choosing a chapter walks the visitor to its room');
}
console.log('Museum controls: both languages, walking arrival, real portal URL, return pose, route interruption, free look during routes, audio guide by room, map and truthful availability: OK');
