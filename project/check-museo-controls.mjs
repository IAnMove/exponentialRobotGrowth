import {LESSONS} from './site-src/journeys/catalog.js';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './site-src/museo/model.js';
import {immersiveHref} from './site-src/immersive/catalog.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';
const voiceSource=readFileSync('site-src/museo/voices.js','utf8');
const VOICES=JSON.parse(voiceSource.split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
const narration=JSON.parse(readFileSync('narration/museo.json','utf8'));
// The source checkout retains all original recording proofs. The portable
// GitHub export carries the four new hall/cosmos proofs and public MP3s one
// level above the project; missing portable proofs must still fail the check.
// An old/empty generic scripts folder can exist in the export as an ignored
// artifact. Select its explicit portable layout, not that unrelated folder.
const proofMode=existsSync('narration/museo-audio')||existsSync('narration/museo-scripts')?'portable':'source',newProofIds=new Set(['hall','cosmos']);
let voiceChecks=0,recordingProofs=0;
for(const language of ['es','en']){
 assert.equal(VOICES[language].length,5);assert.deepEqual(VOICES[language].map(clip=>clip.id),model.rooms.map(room=>room.id));
 for(const clip of VOICES[language]){
  const original=narration[language].find(script=>script.id===clip.id),audioPath=['dist/audio/'+clip.file,'../audio/'+clip.file].find(path=>existsSync(path));
  assert(original,'every runtime chapter has a canonical narration');assert.equal(clip.title,original.title);assert.equal(clip.text,original.text);assert(Number.isFinite(clip.duration)&&clip.duration>0);assert(audioPath,'the public MP3 exists for '+clip.file);const audio=statSync(audioPath);assert(audio.isFile()&&audio.size>10000);
  if(proofMode==='source'||newProofIds.has(clip.id)){
   const metadataPath=(proofMode==='source'?'dist/audio/':'narration/museo-audio/')+clip.file.replace(/\.mp3$/,'.json'),scriptPath=(proofMode==='source'?'narration/scripts/':'narration/museo-scripts/')+clip.file+'.txt';
   const metadata=JSON.parse(readFileSync(metadataPath,'utf8')),script=readFileSync(scriptPath,'utf8').trim();assert.equal(clip.text,metadata.text);assert.equal(clip.text,script,'the displayed transcript is the recorded MiniMax script');assert.equal(metadata.provider,'MiniMax');assert.equal(metadata.language,language==='es'?'Spanish':'English');assert(Math.abs(clip.duration*1000-metadata.duration_ms)<1e-7);assert.equal(audio.size,metadata.size_bytes);recordingProofs++;
  }
  voiceChecks++;
 }
 assert.match(VOICES[language][0].text,language==='es'?/veinte cuadros/:/twenty paintings/);assert.match(VOICES[language].find(clip=>clip.id==='cosmos').text,language==='es'?/cinco cuadros/:/five paintings/);
}
assert.equal(recordingProofs,proofMode==='source'?10:4,'all source proofs or all four explicitly required portable recording proofs are present');
assert.equal(model.exhibits.length,20);assert.equal(model.exhibits.filter(exhibit=>exhibit.room==='cosmos').length,5);
for(const clips of Object.values(VOICES))for(const clip of clips)clip.src='fixture://audio/'+clip.file;
// Exercise app controls with a lightweight DOM and renderer adapter, without a browser.
const source=readFileSync('site-src/museo/app.js','utf8')
  .replace(/^import .*;$/gm,'');
const notebookSource=readFileSync('site-src/playback/player.js','utf8').replace(/^import .*;$/gm,'').replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/playback/player.js'));

// Use the real notebook player and audio clock. Only the browser surfaces and
// native Audio are replaced, so controller persistence and timing remain real.
function harness({lang='es',finePointer=false,reduced=false,lockMode='success',audioMode='success',storage=new Map(),search=''}={}){
 const elements=new Map(),events={},queued=[],audios=[],players=[],objectUrls=new Set(),navigations=[],pickCalls=[];let clock=0,lastPose,url,lastRender,pickResult=null,lockCalls=0,exitCalls=0;
 const listen=(name,fn)=>{const previous=events[name];events[name]=event=>{previous?.(event);fn(event);};};
 const fakeElement=id=>({id,hidden:id==='map'||id==='.ap-transcript',checked:false,dataset:{},style:{setProperty(k,v){this[k]=v;}},textContent:'',children:[],selectors:new Map(),offsetHeight:100,
  get innerHTML(){return this._innerHTML||'';},set innerHTML(value){this._innerHTML=String(value);for(const match of this._innerHTML.matchAll(/<input\b([^>]*)>/g)){const name=match[1].match(/\bid="([^"]+)"/);if(name){const input=element(name[1]);input.checked=/\bchecked\b/.test(match[1]);const val=match[1].match(/\bvalue="([^"]+)"/);if(val)input.value=val[1];}}for(const match of this._innerHTML.matchAll(/<a\b([^>]*)>/g)){const name=match[1].match(/\bid="([^"]+)"/),href=match[1].match(/\bhref="([^"]+)"/);if(name&&href)element(name[1]).href=href[1];}},
  classList:{values:new Set(),add(value){this.values.add(value);},remove(value){this.values.delete(value);},toggle(value,on){if(on===undefined)on=!this.values.has(value);if(on)this.add(value);else this.remove(value);},contains(value){return this.values.has(value);}},
  setAttribute(k,v){this[k]=v;},addEventListener(name,fn){const previous=(this.handlers??={})[name];this.handlers[name]=event=>{previous?.(event);fn(event);};},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:1000,height:700};},click(){this.onclick?.();},scrollIntoView(){},
  append(...children){children.forEach(child=>{child.parentNode=this;this.children.push(child);});},replaceChildren(...children){this.children=[];this.append(...children);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);},
  querySelector(selector){if(!this.selectors.has(selector))this.selectors.set(selector,fakeElement(selector));return this.selectors.get(selector);},querySelectorAll(selector){return selector==='.ap-marks button'?this.querySelector('.ap-marks').children:[];}
 });
 const element=id=>{if(!elements.has(id))elements.set(id,fakeElement(id));return elements.get(id);};
 const roomButtons=model.rooms.slice(1).map(r=>({...element('room-'+r.id),dataset:{room:r.id}})),paintings=model.exhibits.map(e=>({...element('painting-'+e.id),dataset:{painting:e.id}}));
 const document={documentElement:{lang,style:{setProperty(){}}},head:fakeElement('head'),body:element('body'),hidden:false,pointerLockElement:null,getElementById:element,createElement:tag=>fakeElement(tag),
  exitPointerLock(){exitCalls++;this.pointerLockElement=null;events['document:pointerlockchange']?.();},addEventListener(name,fn){listen('document:'+name,fn);},
  querySelector(selector){if(selector==='[data-atlas-player-css]')return this.head.children.find(child=>'atlasPlayerCss'in child.dataset)||null;return selector.includes('canvas')?element('canvas'):null;},
  querySelectorAll(selector){return selector==='[data-room]'?roomButtons:paintings;}
 };
 const window={addEventListener:listen};
 class AudioStub{
  constructor(src){this.src=src;this.currentTime=0;this.playbackRate=1;this.readyState=1;this.paused=true;this.playCalls=0;this.pauseCalls=0;this.duration=Object.values(VOICES).flat().find(clip=>clip.src===src)?.duration||60;audios.push(this);}
  play(){this.playCalls++;if(audioMode==='throw')throw Error('Audio blocked');if(audioMode==='reject')return Promise.reject(Error('Audio blocked'));this.paused=false;this.onplaying?.();return Promise.resolve();}
  pause(){this.paused=true;this.pauseCalls++;}removeAttribute(name){if(name==='src')this.src='';}load(){if(this.src.startsWith('blob:fixture:'))queueMicrotask(()=>this.onloadedmetadata?.());}
 }
 class Clock extends TimelineClock{constructor(options){super({...options,AudioClass:AudioStub,loadBlob:async src=>src,urls:{createObjectURL:src=>{const url='blob:fixture:'+src;objectUrls.add(url);return url;},revokeObjectURL:url=>objectUrls.delete(url)}});}}
 const world={dom:element('canvas'),render(p,nearId,dt,portal,destination){lastPose={...p};lastRender={pose:lastPose,nearId,dt,portal:portal?{...portal}:null,destination:destination?{...destination}:null};},pick:(x,y)=>{pickCalls.push({x,y});return pickResult;},dispose(){},
  lookLock(){lockCalls++;if(lockMode==='throw')throw Error('Pointer Lock unsupported');if(lockMode==='reject')return Promise.reject(Error('Pointer Lock denied'));if(lockMode==='unsupported')return undefined;document.pointerLockElement=world.dom;events['document:pointerlockchange']?.();return Promise.resolve();}
 };
 const ctx={...model,model,LESSONS,document,window,console,URLSearchParams,URL,TimelineClock:Clock,restoredPosition,immersiveHref,VOICES,ResizeObserver:class{observe(){}disconnect(){}},
  matchMedia:query=>({matches:query==='(pointer: fine)'?finePointer:query==='(prefers-reduced-motion: reduce)'?reduced:false}),performance:{now:()=>clock},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},location:{search,hash:'',assign:value=>{url=value;navigations.push(value);}},requestAnimationFrame:fn=>queued.push(fn),createMuseum:()=>world
 };
 const Player=vm.runInNewContext(`(()=>{${notebookSource}\nreturn NotebookPlayer;})()`,ctx);ctx.NotebookPlayer=class extends Player{constructor(options){super(options);players.push(this);}};
 vm.runInNewContext(source,ctx);
 function frames(n){for(let i=0;i<n;i++){const dt=1/60;clock+=dt*1000;for(const audio of audios)if(!audio.paused){audio.currentTime=Math.min(audio.duration,audio.currentTime+dt*audio.playbackRate);if(audio.currentTime>=audio.duration){audio.paused=true;audio.onended?.();}}const callbacks=queued.splice(0);callbacks.forEach(callback=>callback(clock));}}
 return {element,elements,events,document,paintings,roomButtons,frames,world,audios,players,storage,objectUrls,navigations,pickCalls,
  get lastPose(){return lastPose;},get lastRender(){return lastRender;},get url(){return url;},set url(value){url=value;},get lockCalls(){return lockCalls;},get exitCalls(){return exitCalls;},
  setPick(value){pickResult=value;},setAudioMode(value){audioMode=value;},setLockMode(value){lockMode=value;},async flush(){for(let i=0;i<8;i++)await Promise.resolve();}
 };
}
const key=code=>({code,repeat:false,target:{closest:()=>false},preventDefault(){}}),near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message),samePose=(a,b,message)=>['x','z','yaw','pitch'].forEach(name=>near(a[name],b[name],message));
const stored=(lang,pose,extra={})=>new Map([['atlas-notebook-v2:museum',JSON.stringify({version:2,language:lang,chapter:'mind',offset:4.25,playing:false,extra:{pose,started:true,instant:false,followNarration:false,entry:'',...extra}})]]);
let controllerCases=0;
for(const lang of ['es','en']){
  controllerCases++;
  const h=harness({lang}),{element,events,paintings,frames}=h;
  element('start').onclick();paintings.find(p=>p.dataset.painting==='llms').onclick();frames(600);
  const llm=model.exhibits.find(e=>e.id==='llms'),stand=model.standAt(llm);
  assert(Math.hypot(h.lastPose.x-stand.x,h.lastPose.z-stand.z)<.01,'guided walking reaches LLM painting');
  assert.equal(element('card').hidden,false);assert.equal(element('enter-3d').hidden,false);
  element('enter-3d').onclick();frames(110);assert(h.url?.includes('experience=llms&entrance=painting'),'portal navigates to actual immersive route');
  events.pagehide();frames(2);assert(Math.hypot(h.lastPose.x-stand.x,h.lastPose.z-stand.z)<.01,'back cache restores the approach pose');
  h.url=null;events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});frames(200);assert(h.url?.includes('entrance=painting'),'walking into the illuminated canvas crosses its threshold');events.pagehide();frames(2);
  paintings.find(p=>p.dataset.painting==='robots').onclick();frames(40);
  events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});frames(10);events.keyup({code:'KeyW'});frames(60);
  assert.equal(element('stop').hidden,true,'walking interrupts the automatic route');
  paintings.find(p=>p.dataset.painting==='kardashev').onclick();frames(20);const view=element('view').handlers;
  view.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,pointerType:'touch'});view.pointermove({clientX:160,clientY:110});view.pointermove({clientX:260,clientY:120});frames(2);
  assert.equal(element('stop').hidden,false,'looking around keeps the guided route walking');const freeHeading={...h.lastPose};view.pointerup({clientX:260,clientY:120});frames(900);
  const kardashev=model.standAt(model.exhibits.find(e=>e.id==='kardashev'));assert(Math.hypot(h.lastPose.x-kardashev.x,h.lastPose.z-kardashev.z)<.01,'a route keeps going while the visitor looks around');
  near(h.lastPose.yaw,freeHeading.yaw,'a guided route never recenters a head that the visitor has turned');near(h.lastPose.pitch,freeHeading.pitch);
  element('instant').checked=true;paintings.find(p=>p.dataset.painting==='robots').onclick();frames(10);
  assert.equal(element('enter-3d').hidden,true,'unbuilt worlds are never presented as immersive');
  assert.equal(element('web').href,'../robots/index.html');
  element('map-toggle').onclick();assert.equal(element('map').hidden,false);element('map-close').onclick();assert.equal(element('map').hidden,true);
  for(const id of Object.keys(LESSONS)){
    paintings.find(p=>p.dataset.painting===id).onclick();frames(10);
    assert.equal(element('enter-3d').hidden,false,id+' has a real walkable world');
    assert.equal(element('web').href,`../journeys/index.html?topic=${id}`);
    element('enter-3d').onclick();frames(110);
    assert.equal(h.url,`../journeys/index.html?topic=${id}&mode=immersive&entrance=painting`);
    events.pagehide();frames(2);
  }
}
for(const lang of ['es','en']){
 for(const lockMode of ['success','unsupported','reject','throw']){
  controllerCases++;const h=harness({lang,finePointer:true,lockMode}),{element,events,frames}=h;frames(1);element('start').onclick();await h.flush();frames(1);
  assert.equal(element('mouse')['aria-pressed'],'true','mouse look remains active even if native pointer capture fails');assert.equal(h.document.pointerLockElement===h.world.dom,lockMode==='success');assert.equal(h.lockCalls,1);
  const before={...h.lastPose};if(lockMode==='success')events.mousemove({movementX:80,movementY:30});else{element('view').handlers.pointermove({pointerType:'mouse',movementX:500,movementY:300,clientX:100,clientY:100});frames(1);samePose(h.lastPose,before,'entering the canvas from the header does not jump the fallback camera');element('view').handlers.pointermove({pointerType:'mouse',movementX:80,movementY:30,clientX:180,clientY:130});}frames(1);
  assert(h.lastPose.yaw<before.yaw&&h.lastPose.pitch<before.pitch,'desktop mouse movement changes the camera without a held mouse button');
  if(lockMode!=='success'){const prior={...h.lastPose};element('view').handlers.pointermove({pointerType:'mouse',clientX:220,clientY:145});frames(1);assert(h.lastPose.yaw<prior.yaw&&h.lastPose.pitch<prior.pitch,'coordinate deltas also work when movementX/Y is absent');}
  events.keydown(key('Escape'));frames(1);assert.equal(element('mouse')['aria-pressed'],'false');assert.equal(h.document.pointerLockElement,null);assert(!h.document.body.classList.contains('looking'));
  const released={...h.lastPose};element('view').handlers.pointermove({pointerType:'mouse',movementX:100,movementY:100,clientX:240,clientY:215});events.mousemove({movementX:100,movementY:100});frames(20);samePose(h.lastPose,released,'Escape releases both native and fallback mouse look');
  h.setLockMode('success');element('mouse').onclick();await h.flush();frames(1);assert.equal(h.document.pointerLockElement,h.world.dom,'a later user gesture can retry native capture');element('map-toggle').onclick();frames(1);assert.equal(element('map')['hidden'],false);assert.equal(element('mouse')['aria-pressed'],'false');assert.equal(element('map-toggle')['aria-expanded'],'true');element('map-close').onclick();
  element('mouse').onclick();await h.flush();frames(1);h.document.pointerLockElement=null;events['document:pointerlockchange']();frames(1);assert.equal(element('mouse')['aria-pressed'],'false','the browser releasing Pointer Lock clears the active mode');
 }
 controllerCases++;{
  const h=harness({lang,finePointer:true}),{element,events,frames}=h;frames(1);element('start').onclick();await h.flush();frames(1);
  events.keydown(key('KeyW'));events.keydown(key('KeyD'));frames(45);assert(h.lastPose.x>.5&&h.lastPose.z<4.5,'W and D remain held together and move diagonally');
  events.keydown(key('KeyS'));const opposing={...h.lastPose};frames(30);assert(h.lastPose.x>opposing.x+.5);assert(Math.abs(h.lastPose.z-opposing.z)<.25,'W and S cancel instead of replacing each other');events.keyup(key('KeyW'));const released={...h.lastPose};frames(30);assert(h.lastPose.z>released.z+.5,'releasing W leaves S held');
  events.blur();const blur={...h.lastPose};frames(60);samePose(h.lastPose,blur,'blur clears all movement and inertial velocity');assert.equal(element('mouse')['aria-pressed'],'false');
  events.keydown(key('KeyW'));frames(15);h.document.hidden=true;events['document:visibilitychange']();const hidden={...h.lastPose};frames(60);h.document.hidden=false;events['document:visibilitychange']();frames(60);samePose(h.lastPose,hidden,'visibility recovery has no retained movement');assert.equal(h.players[0].running,false);
 }
 controllerCases++;{
  const pose={x:-.7,z:-18.5,yaw:0,pitch:.12},h=harness({lang,finePointer:true,storage:stored(lang,pose)}),{element,events,frames}=h;await h.flush();frames(1);element('mouse').onclick();await h.flush();
  const ideas=model.exhibits.find(e=>e.id==='ideas'),targetYaw=model.yawLookingAt(ideas.x-pose.x,ideas.z-pose.z),targetPitch=Math.atan2(model.PAINTING.centerY-model.EYE,Math.hypot(ideas.x-pose.x,ideas.z-pose.z));events.mousemove({movementX:(pose.yaw-targetYaw)/.0022,movementY:(pose.pitch-targetPitch)/.0022});frames(10);
  assert.equal(h.lastRender.nearId,'ideas','renderer focus follows the actual head direction');assert.equal(element('card-name').textContent,lang==='es'?ideas.es:ideas.en);assert.equal(element('card').hidden,false);
  events.mousemove({movementX:0,movementY:-1000});frames(10);assert.equal(h.lastRender.nearId,undefined);assert.equal(element('card').hidden,true,'looking above the rectangle clears the card');events.keydown(key('KeyE'));frames(10);assert.equal(h.navigations.length,0,'E cannot enter a frame that the visitor is not looking at');
  const electricity=model.exhibits.find(e=>e.id==='electricity'),blocked={x:-4.8,z:-4.7,yaw:model.yawLookingAt(electricity.x+4.8,electricity.z+4.7),pitch:0},wall=harness({lang,storage:stored(lang,blocked)});await wall.flush();wall.frames(10);assert.equal(wall.lastRender.nearId,undefined);assert.equal(wall.element('card').hidden,true);wall.events.keydown(key('KeyE'));wall.frames(10);assert.equal(wall.navigations.length,0,'camera focus and E respect a wall in front of a close painting');
 }
 controllerCases++;{
  const h=harness({lang}),{element,frames}=h;frames(1);element('start').onclick();await h.flush();const notebook=h.players[0];assert(notebook,'the museum uses the real global notebook player');assert.equal(notebook.clock.timeline.length,5);assert.deepEqual(notebook.clock.timeline.map(clip=>clip.id),['hall','mind','industry','cosmos','life']);assert.equal(notebook.root.querySelector('.ap-marks').children.length,5);assert.equal(notebook.clock.state,'playing');notebook.pause();
  notebook.el('text').onclick();assert.equal(notebook.root.querySelector('.ap-transcript').hidden,false);
  for(const [i,edge] of notebook.clock.timeline.entries()){
   notebook.root.querySelector('.ap-marks').children[i].onclick();await h.flush();frames(1);assert.equal(model.roomAt(h.lastPose.x,h.lastPose.z).id,edge.id,'a footer chapter marker visits its narrated gallery');assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[notebook.language][i].text);assert.equal(notebook.root.querySelector('.ap-marks').children[i]['aria-current'],'step');
   notebook.el('seek').oninput({target:{value:String(edge.start+edge.duration*.37)}});await h.flush();frames(1);near(notebook.current.progress,.37,'scrubbing retains a fractional point in the recorded explanation');assert.equal(model.roomAt(h.lastPose.x,h.lastPose.z).id,edge.id);
  }
  const camera={...h.lastPose},chapter=notebook.current.id,progress=notebook.current.progress,language=notebook.language==='es'?'en':'es';notebook.el('language').onchange({target:{value:language}});await h.flush();frames(1);samePose(h.lastPose,camera,'changing narration language keeps the full visitor pose');assert.equal(notebook.current.id,chapter);near(notebook.current.progress,progress);assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[language].find(clip=>clip.id===chapter).text);
  element('follow-narration').checked=false;element('follow-narration').onchange();const mind=notebook.clock.timeline[1];notebook.el('seek').oninput({target:{value:String(mind.start+7.35)}});await h.flush();frames(1);samePose(h.lastPose,camera,'turning off follow narration leaves the camera free while scrubbing');assert.equal(notebook.current.id,'mind');
  element('narrate').onclick();await h.flush();frames(1);samePose(h.lastPose,camera,'listening to the physical gallery does not teleport to its default room pose');assert.equal(notebook.current.id,'life');assert.equal(notebook.running,true);notebook.clock.audio.currentTime=2.5;notebook.clock.tick(0);element('narrate').onclick();near(notebook.current.local,2.5);assert.equal(notebook.running,false);element('narrate').onclick();await h.flush();near(notebook.clock.audio.currentTime,2.5,'gallery voice resumes where it was paused');notebook.pause();
  const edge=notebook.clock.timeline[3];notebook.el('seek').oninput({target:{value:String(edge.start+7.35)}});await h.flush();frames(1);notebook.save();const saved=JSON.parse(h.storage.get('atlas-notebook-v2:museum'));samePose(saved.extra.pose,h.lastPose);assert.equal(saved.chapter,'cosmos');near(saved.offset,7.35);assert.equal(saved.playing,false);assert.equal(saved.extra.followNarration,false);
  const restored=harness({lang,storage:h.storage});await restored.flush();restored.frames(1);samePose(restored.lastPose,h.lastPose,'a fresh page restores position, yaw and pitch without a narrated-room teleport');assert.equal(restored.players[0].language,language);assert.equal(restored.players[0].current.id,'cosmos');near(restored.players[0].current.local,7.35);assert.equal(restored.element('follow-narration').checked,false);assert.equal(restored.players[0].running,false);const still={...restored.lastPose};restored.frames(120);samePose(restored.lastPose,still,'restored visits begin with no held input');near(restored.players[0].current.local,7.35);
  for(const bad of [{x:-6,z:5,yaw:0,pitch:0},{x:NaN,z:0,yaw:0,pitch:0}]){const invalid=harness({lang,storage:stored(lang,bad)});await invalid.flush();invalid.frames(1);samePose(invalid.lastPose,model.spawn,'a corrupt or wall-intersecting saved pose recovers safely');}
  const reducedDefault=harness({lang,reduced:true});await reducedDefault.flush();reducedDefault.frames(1);assert.equal(reducedDefault.element('instant').checked,true,'reduced motion supplies the instant-travel default for a new visit');
  const reducedSaved=harness({lang,reduced:true,storage:stored(lang,model.spawn,{instant:false})});await reducedSaved.flush();reducedSaved.frames(1);assert.equal(reducedSaved.element('instant').checked,false,'a saved explicit choice of walking survives reload even when the system requests reduced motion');
 }
 for(const audioMode of ['reject','throw']){
  controllerCases++;const h=harness({lang,audioMode}),{element,frames}=h;frames(1);element('start').onclick();await h.flush();const notebook=h.players[0];assert.equal(notebook.clock.state,'blocked');assert.equal(notebook.running,false);near(notebook.clock.position,0);const pose={...h.lastPose};frames(120);near(notebook.clock.position,0,'blocked audio does not consume the explanation');samePose(h.lastPose,pose);assert.match(notebook.root.querySelector('.ap-heading span').textContent,/Pulsa|Press/);
  h.setAudioMode('success');notebook.el('play').onclick();await h.flush();assert.equal(notebook.clock.state,'playing');notebook.clock.audio.currentTime=5.25;notebook.clock.tick(0);notebook.pause();near(notebook.current.local,5.25);frames(60);near(notebook.current.local,5.25);notebook.el('play').onclick();await h.flush();near(notebook.clock.audio.currentTime,5.25,'audio reactivation resumes the same recorded position');
  const oldAudio=notebook.clock.audio,staleError=oldAudio.onerror;oldAudio.onerror();assert.equal(notebook.clock.state,'error');notebook.el('play').onclick();await h.flush();assert.equal(notebook.clock.state,'playing');assert.notEqual(notebook.clock.audio,oldAudio);near(notebook.clock.audio.currentTime,5.25,'download/playback retry preserves the museum timeline');staleError();assert.equal(notebook.clock.state,'playing','an obsolete audio failure cannot overwrite the successful retry');samePose(h.lastPose,pose);
 }
 controllerCases++;{
  const h=harness({lang});h.frames(1);h.element('start').onclick();await h.flush();const notebook=h.players[0];notebook.clock.audio.currentTime=notebook.current.duration;h.frames(1);assert.equal(notebook.clock.state,'gap');assert.equal(notebook.current.id,'hall');h.frames(150);assert.equal(model.roomAt(h.lastPose.x,h.lastPose.z).id,'hall','the next narrated gallery waits for the full observation gap');h.frames(31);await h.flush();h.frames(1);assert.equal(notebook.current.id,'mind');assert.equal(model.roomAt(h.lastPose.x,h.lastPose.z).id,'mind','continuous playback follows the next audio chapter automatically');
  h.element('follow-narration').checked=false;h.element('follow-narration').onchange();const free={...h.lastPose};notebook.clock.audio.currentTime=notebook.current.duration;h.frames(182);await h.flush();h.frames(1);assert.equal(notebook.current.id,'industry');samePose(h.lastPose,free,'natural chapter advance respects free exploration when follow is disabled');
 }
 controllerCases++;{
  const llm=model.exhibits.find(e=>e.id==='llms'),h=harness({lang,search:'?pieza=llms'}),{element,events,frames}=h;await h.flush();frames(1);const entry={...h.lastPose};assert.equal(element('page-language').href,(lang==='es'?'../../museo/index.html':'../es/museo/index.html')+'?pieza=llms');events.keydown(key('KeyE'));frames(12);assert(h.lastRender.portal);events.keydown(key('Escape'));frames(1);samePose(h.lastPose,entry,'Escape cancels a transition and returns the complete entry pose');assert.equal(h.navigations.length,0);assert.equal(h.document.body.classList.contains('crossing'),false);
  events.keydown(key('KeyW'));frames(180);assert.equal(h.navigations.length,1);const returnPose={...h.lastRender.portal.from};frames(30);assert.equal(h.navigations.length,1,'a completed portal navigates only once');events.pagehide({persisted:true});events.pageshow({persisted:true});frames(60);samePose(h.lastPose,returnPose,'back-cache return restores the approach and drops the retained forward key');assert.equal(h.navigations.length,1);assert.equal(h.players[0].running,false);
  h.players[0].save();const reload=harness({lang,search:'?pieza=llms',storage:h.storage});await reload.flush();reload.frames(1);samePose(reload.lastPose,returnPose,'reload at the same entry URL preserves the saved approach rather than snapping back to the stand');assert.equal(reload.players[0].current.id,'mind');
  const other=harness({lang,search:'?pieza=cell',storage:h.storage});await other.flush();other.frames(1);samePose(other.lastPose,model.standAt(model.exhibits.find(e=>e.id==='cell')),'a different painting URL overrides a previous saved entry');
  for(const lateral of [2.3,2.45]){const plane=model.paintingPlane(llm),pose={x:plane.center.x+lateral,z:plane.center.z+1.2,yaw:0,pitch:0},walk=harness({lang,storage:stored(lang,pose)});await walk.flush();walk.frames(1);walk.events.keydown(key('KeyW'));walk.frames(150);assert.equal(walk.navigations.length,lateral===2.3?1:0,'walking enters the wide canvas near its edge, but not outside the rectangle');}
 }
}
console.log(`Museum controls: ${controllerCases} bilingual controller scenarios, ${voiceChecks} canonical/runtime transcripts and MP3 assets, ${recordingProofs} ${proofMode} recording proofs, real NotebookPlayer/TimelineClock, native/fallback mouse capture, held-key diagonals, camera/LOS focus, free head during guide, rectangular portals and safe return, five-chapter seek/transcript/language/advance, audio retries, exact pose/audio/instant persistence and map availability: OK`);
