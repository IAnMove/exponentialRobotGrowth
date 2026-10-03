import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {STAGES,SOURCES,stageFact} from './site-src/journeys/internet-route.js';
import {internetFrameAt,internetStatus} from './site-src/journeys/internet-model.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';
import {StepGuide} from './site-src/llms/guide.js';
import {bindFirstPerson} from './site-src/immersive/first-person.js';

// Production controller, NotebookPlayer, TimelineClock and first-person binder.
// Native audio, DOM and GPU are replaced; source-level handler fixtures reproduce
// the former two-owner defect, rather than treating a stub player as evidence.
const source=readFileSync('site-src/journeys/internet-voyage.js','utf8');
const playerSource=readFileSync('site-src/playback/player.js','utf8').replace(/^import .*;$/gm,'').replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/playback/player.js'));
const appSource=source.replace(/^import .*;$/gm,'').replace('export function createInternetController','function createInternetController');
const VOICES=JSON.parse(readFileSync('site-src/journeys/voices-internet-voyage.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const [language,clips]of Object.entries(VOICES))for(const clip of clips)clip.src=`fixture://${language}/${clip.id}`;
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message||`${a} != ${b}`),same=(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message);
const payload=(language,chapter,progress,extra={})=>({version:2,language,chapter:STAGES[chapter].id,offset:VOICES[language][chapter].duration*progress,playing:false,extra:{chapter,progress,source:'manual',voice:true,motion:true,exploring:false,...extra}});
const key=code=>({code,key:code==='Escape'?'Escape':code.replace('Key','').toLowerCase(),target:{closest:()=>null},preventDefault(){}});

function harness({lang='es',storage=new Map(),audioMode='success',lockMode='success',coarse=false,reduced=false,gpu=true}={}){
 const elements=new Map(),audios=[],queued=new Map(),pendingLoads=[],objectUrls=new Set(),goCalls=[],looks=[],moves=[];let now=0,rafId=0,lockCalls=0,lastFrame,exploring=false,chapter=0,view={version:1,index:0,scene:'city',exploring:false,mode:'walk',position:[1,1.65,2],target:[0,1,0],yaw:.2,pitch:.1,orbit:{azimuth:.2,elevation:.4,radius:13}};
 const eventTarget=target=>{const lists=new Map();target.addEventListener=(name,fn)=>{if(!lists.has(name))lists.set(name,new Set());lists.get(name).add(fn);};target.removeEventListener=(name,fn)=>lists.get(name)?.delete(fn);target.dispatch=(name,event={})=>{for(const fn of [...lists.get(name)||[]])fn(event);};return target;};
 const fakeElement=id=>eventTarget({id,hidden:id==='.ap-transcript',checked:false,dataset:{},style:{setProperty(k,v){this[k]=v;}},value:'',textContent:'',children:[],selectors:new Map(),offsetHeight:128,
  get innerHTML(){return this._innerHTML||'';},set innerHTML(value){this._innerHTML=String(value);for(const m of this._innerHTML.matchAll(/<([\w-]+)\b([^>]*)>/g)){const attrs=m[2],name=attrs.match(/\bid="([^"]+)"/);if(!name&&!/data-(?:ap|move)/.test(attrs))continue;const child=element(name?.[1]||'anonymous-'+elements.size);child.tagName=m[1].toUpperCase();for(const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){const k=a[1],v=a[2]??'';if(k.startsWith('data-'))child.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;else if(k==='checked')child.checked=true;else if(k==='hidden')child.hidden=true;else child[k]=v;}if(child.dataset.ap)this.selectors.set(`[data-ap="${child.dataset.ap}"]`,child);}},
  classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);},toggle(v,on){if(on===undefined)on=!this.values.has(v);if(on)this.add(v);else this.remove(v);},contains(v){return this.values.has(v);}},
  setAttribute(k,v){this[k]=v;},setPointerCapture(){},scrollIntoView(){},focus(){this.focused=true;},closest(){return null;},getBoundingClientRect(){return {left:0,top:0,width:1000,height:700};},
  append(...children){for(const c of children){c.parentNode=this;this.children.push(c);}},replaceChildren(...children){this.children=[];this.append(...children);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);},
  querySelector(s){if(!this.selectors.has(s))this.selectors.set(s,fakeElement(s));return this.selectors.get(s);},querySelectorAll(s){return s==='.ap-marks button'?this.querySelector('.ap-marks').children:[];},showModal(){this.open=true;},close(){this.open=false;}
 });
 const element=id=>{if(!elements.has(id))elements.set(id,fakeElement(id));return elements.get(id);};
 const queryAll=s=>{const m=s.match(/^\[data-([\w-]+)\]$/);if(!m)return [];const k=m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return [...elements.values()].filter(e=>k in e.dataset);};
 const document=eventTarget({documentElement:{lang,style:{setProperty(){}}},head:fakeElement('head'),body:element('body'),hidden:false,pointerLockElement:null,getElementById:element,createElement:tag=>Object.assign(fakeElement(tag),{tagName:tag.toUpperCase()}),querySelectorAll:queryAll,
  querySelector(s){if(s==='[data-atlas-player-css]')return this.head.children.find(c=>'atlasPlayerCss'in c.dataset)||null;return s.includes('canvas')?element('canvas'):element(s);},exitPointerLock(){this.pointerLockElement=null;this.dispatch('pointerlockchange');}
 });
 const window=eventTarget({});
 class AudioStub{
  constructor(src){Object.assign(this,{src,currentTime:0,playbackRate:1,muted:false,paused:true,playCalls:0,pauseCalls:0,duration:Object.values(VOICES).flat().find(c=>c.src===src)?.duration||60});audios.push(this);}
  play(){this.playCalls++;this.mutedAtPlay=this.muted;if(audioMode==='throw')throw Error('Native rejection');if(audioMode==='reject')return Promise.reject(Error('Native rejection'));this.paused=false;this.onplaying?.();return Promise.resolve();}
  pause(){this.paused=true;this.pauseCalls++;}removeAttribute(name){if(name==='src')this.src='';}load(){if(this.src.startsWith('blob:fixture:'))queueMicrotask(()=>this.onloadedmetadata?.());}
 }
 class Clock extends TimelineClock{constructor(options){super({...options,AudioClass:AudioStub,loadBlob:src=>audioMode==='slow'?new Promise((resolve,reject)=>pendingLoads.push({src,resolve,reject})):audioMode==='load-error'?Promise.reject(Error('Unavailable')):Promise.resolve(src),urls:{createObjectURL:src=>{const u='blob:fixture:'+src;objectUrls.add(u);return u;},revokeObjectURL:u=>objectUrls.delete(u)}});}}
 const world={canvas:element('canvas'),go(index,instant,options={}){goCalls.push({index,instant,...options});chapter=index;if(!options.preserveView)view.position=[index+1,1.65,2];view.index=index;view.scene=STAGES[index].scene;},explore(value){exploring=value;view.exploring=value;},
  look(dx,dy){looks.push([dx,dy]);view.yaw-=dx*.0025;view.pitch-=dy*.002;},move(forward,side,up,dt){moves.push([forward,side,up,dt]);view.position[0]+=side*dt;view.position[2]-=forward*dt;view.position[1]+=up*dt;},
  getNavigationMode(){return STAGES[chapter].scene==='earth'?'orbit':STAGES[chapter].scene==='ocean'?'observe':'walk';},getViewState(){return structuredClone(view);},restoreViewState(value){view={...view,...structuredClone(value)};chapter=view.index;exploring=view.exploring;},render(f,opts){lastFrame=f;this.lastOptions=opts;},dispose(){this.disposed=true;}
 };
 if(lockMode!=='absent')world.canvas.requestPointerLock=()=>{lockCalls++;if(lockMode==='throw')throw Error('Lock rejection');if(lockMode==='reject')return Promise.reject(Error('Lock rejection'));document.pointerLockElement=world.canvas;document.dispatch('pointerlockchange');return Promise.resolve();};
 const requestAnimationFrame=fn=>{const id=++rafId;queued.set(id,fn);return id;};
 const media=q=>({matches:q.includes('prefers-reduced-motion')?reduced:q.includes('pointer: coarse')?coarse:!coarse});
 const context={STAGES,SOURCES,stageFact,internetFrameAt,internetStatus,VOICES,document,window,bindFirstPerson,TimelineClock:Clock,restoredPosition,URL,Intl,console:gpu?console:{error(){}},queueMicrotask,__INTERNET_CONTROLLER_TEST__:true,
  ResizeObserver:class{observe(){}disconnect(){}},matchMedia:media,performance:{now:()=>now},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame,cancelAnimationFrame:id=>queued.delete(id),
  createVoyageWorld(){if(!gpu)throw Error('WebGL unavailable');return world;}
 };
 context.NotebookPlayer=vm.runInNewContext(`(()=>{${playerSource}\nreturn NotebookPlayer;})()`,context);
 const factory=vm.runInNewContext(`(()=>{${appSource}\nreturn createInternetController;})()`,context);
 const controller=factory();
 function frames(count){for(let n=0;n<count;n++){now+=1000/60;for(const a of audios)if(!a.paused){a.currentTime=Math.min(a.duration,a.currentTime+a.playbackRate/60);if(a.currentTime>=a.duration){a.paused=true;a.onended?.();}}const callbacks=[...queued.values()];queued.clear();callbacks.forEach(fn=>fn(now));}}
 return {controller,player:controller.player,element,queryAll,document,window,world,storage,audios,goCalls,looks,moves,frames,pendingLoads,objectUrls,AudioStub,get frame(){return lastFrame;},get lockCalls(){return lockCalls;},get state(){return controller.state;},setAudioMode(v){audioMode=v;},async flush(){for(let i=0;i<20;i++)await Promise.resolve();},dispose(){window.dispatch('pagehide',{persisted:false});}};
}
function footerAligned(h){const p=h.player;assert.equal(p.current.index,h.state.chapter);near(p.current.progress,h.state.progress);assert.equal(p.root.querySelector('.ap-transcript p').textContent,VOICES[p.language][h.state.chapter].text);assert.equal(h.element('scene-chapter').textContent,`${String(h.state.chapter+1).padStart(2,'0')} / 09`);}
function scrub(h,p){h.element('phase').value=String(p);h.element('phase').oninput();near(h.state.progress,p);near((h.frame||h.state.frame).progress,p,'manual fraction changes the actual scene before the next RAF');assert.equal(h.player.running,false);footerAligned(h);}
function saved(h){return JSON.parse(h.storage.get('atlas-notebook-v2:internet-voyage'));}

// Exact former page bindings with a real effective NotebookPlayer and StepGuide.
// The test demonstrates why updating guide.enabled/voiceLang was insufficient.
{
 const h=harness();await h.flush();let voiceLang='es';const guide=new StepGuide({AudioClass:h.AudioStub,getClip:()=>VOICES[voiceLang][0],onAdvance:()=>false});
 const legacySound=e=>guide.setEnabled(e.target.checked);
 const legacyLanguage=e=>{voiceLang=e.target.value;const active=guide.running;guide.stop();if(active)guide.enter();};
 legacySound({target:{checked:false}});assert.equal(guide.enabled,false);assert.equal(h.player.clock.audio.muted,false,'former sound handler leaves effective narration audible');
 legacyLanguage({target:{value:'en'}});assert.equal(voiceLang,'en');assert.equal(h.player.language,'es','former language handler leaves effective narration Spanish');assert.equal(guide.state,'idle');assert.equal(h.player.clock.state,'playing','former guide status diverges from effective playback');h.dispose();
}

let chapterChecks=0;
for(const lang of ['es','en']){
 const h=harness({lang});await h.flush();h.frames(1);const p=h.player;assert.equal(p.clock.timeline.length,9);assert.equal(p.root.querySelector('.ap-marks').children.length,9);assert.equal(h.audios.filter(a=>!a.paused).length,1);assert.equal(p.clock.state,'playing');assert(!source.includes('StepGuide'));
 p.pause();const paused=JSON.stringify(h.frame);h.frames(120);assert.equal(JSON.stringify(h.frame),paused,'pause freezes the representative message and every event');
 h.element('motion').checked=false;h.element('motion').onchange();assert.equal(h.goCalls.at(-1).instant,true,'disabling camera transitions resolves an in-flight guided camera immediately');p.stage(2,false);assert.equal(h.goCalls.at(-1).instant,true,'disabled camera transitions cannot leave the previous scene camera frozen');h.element('motion').checked=true;h.element('motion').onchange();p.stage(0,false);
 h.element('voice').checked=false;h.element('voice').onchange();assert.equal(p.clock.audio.muted,true);assert.equal(saved(h).extra.voice,false);
 p.toggle();await h.flush();const beforeSilent=h.state.progress;h.frames(10);assert(h.state.progress>beforeSilent,'muted narration continues the same physical clock');p.clock.audio.onended();h.frames(182);await h.flush();assert.equal(h.state.chapter,1);assert.equal(p.clock.audio.mutedAtPlay,true,'automatic chapter transition is muted before native play');p.pause();
 for(let chapter=0;chapter<9;chapter++){
  p.root.querySelector('.ap-marks').children[chapter].onclick();assert.equal(h.state.chapter,chapter);assert.equal(p.clock.audio.muted,true,'mute follows new native audio instances');
  assert.equal(h.element('ocean-caption').hidden,chapter!==4,'the optical explanation is visible throughout the ocean chapter');assert.equal(h.element('scene-area').classList.contains('has-ocean-caption'),chapter===4);
  if(chapter===4){for(const copy of lang==='es'?[/infrarroja invisible/,/colores simbólicos/,/cubierta transparente/,/amplificación óptica ilustrativa/]:[/infrared light/,/symbolic colours/,/transparent jacket/,/illustrative optical amplification/])assert.match(h.element('ocean-caption').textContent,copy);}
  const clip=p.clock.timeline[chapter];p.el('seek').oninput({target:{value:clip.start+clip.duration*.377}});await h.flush();footerAligned(h);near(h.frame.progress,.377);
  scrub(h,.731);await h.flush();const held=JSON.stringify(h.frame);h.frames(90);assert.equal(JSON.stringify(h.frame),held,'late metadata and paused ticks cannot overwrite a manual fraction');chapterChecks++;
 }
 p.stage(6,false);scrub(h,.299);assert.equal(h.element('number').textContent,'HTTPS');assert.match(h.element('fact').textContent,lang==='es'?/aún no ha llegado/:/not arrived/);assert.doesNotMatch(h.element('number').textContent,/200/);
 scrub(h,.3);assert.equal(h.element('number').textContent,'0%');scrub(h,.5);assert.equal(h.element('number').textContent,'57%');assert.match(h.element('fact').textContent,lang==='es'?/Procesamiento/:/processing/);assert.doesNotMatch(h.element('number').textContent,/200/);
 scrub(h,.649);assert.notEqual(h.element('number').textContent,'200 OK');scrub(h,.65);assert.equal(h.element('number').textContent,'200 OK');assert.equal(h.element('fact').textContent,lang==='es'?'Respuesta preparada':'Response prepared');
 p.stage(4,false);scrub(h,.413);const physical=h.frame,view=p.capture().camera,goCount=h.goCalls.length;
 p.el('language').onchange({target:{value:lang==='es'?'en':'es'}});await h.flush();same(h.frame,physical,'both voice languages show the same physical fraction');same(p.capture().camera,view,'language switching keeps the camera');assert.equal(h.goCalls.length,goCount);assert.equal(h.state.source,'manual');assert.equal(p.clock.audio.muted,true);footerAligned(h);assert.match(h.element('metric-value').textContent,/km.*13\.6 ms/);
 p.el('text').onclick();assert.equal(p.root.querySelector('.ap-transcript').hidden,false);p.save();assert.equal(saved(h).extra.transcript,true);
 h.element('voice').checked=true;h.element('voice').onchange();assert.equal(p.clock.audio.muted,false);p.el('play').onclick();await h.flush();h.frames(20);assert.equal(h.state.source,'narration');assert(h.state.progress>.413);footerAligned(h);
 h.element('sources').onclick();assert.equal(h.element('source-dialog').open,true);assert.equal(p.running,false);h.element('close-sources').onclick();assert.equal(h.element('source-dialog').open,false);h.dispose();assert(h.world.disposed);assert(h.audios.every(a=>a.paused));
}

for(const rejection of ['reject','throw']){
 const h=harness({audioMode:rejection});await h.flush();assert.equal(h.player.clock.state,'blocked');assert.equal(h.player.running,false);assert.match(h.player.root.querySelector('.ap-heading span').textContent,/activar|enable/);const held=JSON.stringify(h.frame);h.frames(60);assert.equal(JSON.stringify(h.frame),held);h.setAudioMode('success');h.player.el('play').onclick();await h.flush();assert.equal(h.player.clock.state,'playing');assert.equal(h.audios.filter(a=>!a.paused).length,1);h.dispose();
}
{
 const h=harness({audioMode:'slow'});await h.flush();h.player.pause();h.player.stage(6,false);scrub(h,.51);assert(h.pendingLoads.length);const held=h.frame;
 h.player.el('language').onchange({target:{value:'en'}});assert.equal(h.state.source,'manual');near(h.state.progress,.51);for(const load of h.pendingLoads.splice(0))load.resolve(load.src);await h.flush();h.frames(60);same(h.frame,held,'resolved obsolete audio seeks cannot replace server processing');assert.equal(h.player.clock.state,'paused');h.dispose();
}

for(const lang of ['es','en']){
 const camera={version:1,index:4,scene:'ocean',exploring:true,mode:'observe',position:[3.2,2.1,8.4],target:[0,0,0],yaw:.37,pitch:-.16,orbit:{azimuth:.4,elevation:.5,radius:11}};
 const storage=new Map([['atlas-notebook-v2:internet-voyage',JSON.stringify(payload(lang,4,.617,{camera,exploring:true,motion:false,voice:false,transcript:true}))]]);
 const h=harness({lang:lang==='es'?'en':'es',storage});await h.flush();near(h.state.progress,.617);assert.equal(h.state.chapter,4);assert.equal(h.player.language,lang);assert.equal(h.player.running,false);assert.equal(h.state.exploring,true);assert.equal(h.state.lookActive,false,'restoration cannot request pointer lock without a user gesture');assert.equal(h.lockCalls,0);assert.equal(h.state.motion,false);assert.equal(h.player.clock.audio.muted,true);assert.equal(h.player.root.querySelector('.ap-transcript').hidden,false);same(h.world.getViewState(),camera,'saved camera is the final restored pose');footerAligned(h);const held=h.frame;h.frames(60);same(h.frame,held);h.dispose();
}

for(const lockMode of ['success','reject','absent']){
 const h=harness({lockMode});await h.flush();h.element('explore').onclick();await h.flush();assert.equal(h.state.exploring,true);assert.equal(h.player.running,false);assert.equal(h.element('look-help').hidden,false);
 if(lockMode==='success'){h.window.dispatch('mousemove',{movementX:12,movementY:-5});h.window.dispatch('mousemove',{movementX:8,movementY:2});}
 else{h.world.canvas.dispatch('pointermove',{pointerType:'mouse',clientX:20,clientY:30});h.world.canvas.dispatch('pointermove',{pointerType:'mouse',clientX:35,clientY:32});h.world.canvas.dispatch('pointermove',{pointerType:'mouse',clientX:40,clientY:36});}
 assert.equal(h.looks.length,2,'real binder continuously looks with pointer lock or hover fallback');
 const view=h.world.getViewState(),count=h.goCalls.length;h.player.seek(h.player.current.start+3,false);await h.flush();h.player.changeLanguage('en');await h.flush();same(h.world.getViewState(),view,'same-stage seeking and listening preserve exploration pose');assert.equal(h.goCalls.length,count);h.player.toggle();await h.flush();same(h.world.getViewState(),view,'resuming narration never teleports');
 h.element('motion').checked=false;h.element('motion').onchange();same(h.world.getViewState(),view,'camera transition preference preserves exploration pose');assert.equal(h.goCalls.at(-1).preserveView,true);
 h.window.dispatch('keydown',key('KeyW'));h.window.dispatch('keydown',key('KeyD'));assert.equal(h.player.running,false,'manual movement pauses narration');assert.equal(h.state.keys.length,2);h.frames(6);assert(h.moves.some(m=>m[0]===1&&m[1]===1));h.window.dispatch('keyup',key('KeyW'));h.window.dispatch('keyup',key('KeyD'));same(saved(h).extra.camera,h.world.getViewState(),'input release immediately persists visible camera');
 h.window.dispatch('keydown',key('KeyW'));h.window.dispatch('blur');assert.equal(h.state.keys.length,0);assert.equal(h.state.touch.length,0);assert.equal(h.state.lookActive,false);const moveCount=h.moves.length;h.frames(3);assert.equal(h.moves.length,moveCount,'blur cannot leave a held movement input');
 h.element('capture').onclick();await h.flush();h.window.dispatch('keydown',key('Escape'));assert.equal(h.document.pointerLockElement,null);assert.equal(h.state.lookActive,false);const locks=h.lockCalls;h.world.canvas.dispatch('pointerdown',{button:0,pointerType:'mouse',clientX:10,clientY:10});h.world.canvas.dispatch('pointerup',{pointerType:'mouse',clientX:10,clientY:10});await h.flush();assert.equal(h.lockCalls,locks,'Escape prevents automatic re-capture');
 h.player.stage(2,false);assert.equal(h.goCalls.at(-1).preserveView,true,'chapter changes retain remembered exploration state');assert.match(h.element('navigation').textContent,/orbital/);h.dispose();
}
{
 const h=harness({coarse:true});await h.flush();h.element('explore').onclick();assert.equal(h.lockCalls,0);assert.equal(h.element('.touch').hidden,false);h.world.canvas.dispatch('pointerdown',{button:0,pointerType:'touch',clientX:10,clientY:10,pointerId:2});h.world.canvas.dispatch('pointermove',{pointerType:'touch',clientX:28,clientY:14});h.world.canvas.dispatch('pointermove',{pointerType:'touch',clientX:35,clientY:17});assert.equal(h.looks.length,2);
 const forward=h.queryAll('[data-move]').find(b=>b.dataset.move==='forward'),right=h.queryAll('[data-move]').find(b=>b.dataset.move==='right');forward.onpointerdown({preventDefault(){},pointerId:3});right.onpointerdown({preventDefault(){},pointerId:4});h.frames(4);assert(h.moves.some(m=>m[0]===1&&m[1]===1));h.document.hidden=true;h.document.dispatch('visibilitychange');assert.equal(h.state.touch.length,0);assert.equal(h.state.keys.length,0);h.document.hidden=false;h.document.dispatch('visibilitychange');assert.equal(h.player.running,false);h.dispose();
}
{
 const h=harness({gpu:false,reduced:true});await h.flush();assert.equal(h.element('explore').disabled,true);assert.equal(h.state.motion,false);h.player.pause();h.player.stage(8,false);scrub(h,1);assert.equal(h.state.frame.screenProgress,1);footerAligned(h);h.dispose();
}
console.log(`Internet controls: former dual-owner bug reproduced; real NotebookPlayer/clock/binder, ${chapterChecks} chapter scrubs, ES/EN parity, mute, autoplay denial/retry, delayed metadata, restoration, pointer lock/fallback/touch, movement pause and lifecycle cleanup: OK`);
