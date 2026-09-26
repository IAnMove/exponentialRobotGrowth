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
  .replace(/import \{StepGuide\} from '[^']+';/,'')
  .replace(/import \{LESSONS\} from '[^']+';/,'')
  .replace(/import \{VOICES\} from '[^']+';/,'');
for(const lang of ['es','en']){
  const elements=new Map(),events={},queued=[];let clock=0,lastPose,url;
  const element=id=>{if(!elements.has(id))elements.set(id,{id,hidden:id==='map',checked:false,dataset:{},style:{},textContent:'',classList:{add(){},remove(){}},setAttribute(k,v){this[k]=v;},addEventListener(){},setPointerCapture(){},append(){}});return elements.get(id);};
  const roomButtons=model.rooms.slice(1).map(r=>({...element('room-'+r.id),dataset:{room:r.id}}));
  const paintings=model.exhibits.map(e=>({...element('painting-'+e.id),dataset:{painting:e.id}}));
  const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:element,createElement:element,exitPointerLock(){},addEventListener(){},querySelectorAll(selector){return selector==='[data-room]'?roomButtons:paintings;}};
  const window={addEventListener(name,fn){events[name]=fn;}};
  class Guide extends StepGuide{constructor(options){super({...options,AudioClass:class{pause(){} removeAttribute(){} load(){} play(){return Promise.resolve();}}});}}
  const ctx={LESSONS,document,window,console,URLSearchParams,model,immersiveHref,StepGuide:Guide,VOICES,matchMedia:()=>({matches:false}),performance:{now:()=>clock},location:{search:'',hash:'',assign:value=>{url=value;}},requestAnimationFrame:fn=>queued.push(fn),createMuseum:()=>({render:p=>{lastPose={...p};},pick:()=>null})};
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
}
console.log('Museum controls: both languages, walking arrival, real portal URL, return pose, route interruption, map and truthful availability: OK');
