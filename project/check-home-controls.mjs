import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './site-src/home/model.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';
import {bindFirstPerson} from './site-src/immersive/first-person.js';
import {narrationTime,narrationProgress} from './site-src/home/guide.js';

// Use the actual player and audio clock; replace only native browser surfaces.
const notebookSource=readFileSync('site-src/playback/player.js','utf8').replace(/^import .*;$/gm,'').replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/playback/player.js'));
function recordingProofs(voices){
 const narration=JSON.parse(readFileSync('narration/home.json','utf8'));
 // An export can retain a stale ignored narration/scripts folder after a
 // build. Its explicitly shipped proof directories must always take priority.
 const portable=existsSync('narration/home-audio')||existsSync('narration/home-scripts'),metadataDir=portable?'narration/home-audio/':'dist/audio/',scriptDir=portable?'narration/home-scripts/':'narration/scripts/';let recordings=0;
 for(const language of ['es','en']){
  assert.equal(voices[language].length,7);assert.deepEqual(voices[language].map(clip=>clip.id),['floor','dishes','cook','laundry','bed','bath','plan']);
  for(const clip of voices[language]){const original=narration[language].find(script=>script.id===clip.id),metadata=JSON.parse(readFileSync(metadataDir+clip.file.replace(/\.mp3$/,'.json'),'utf8')),script=readFileSync(scriptDir+clip.file+'.txt','utf8').trim(),audioPath=['dist/audio/'+clip.file,'../audio/'+clip.file].find(path=>existsSync(path));assert(original);assert.equal(clip.title,original.title);assert.equal(clip.text,original.text);assert.equal(clip.text,metadata.text);assert.equal(clip.text,script,'the transcript is the exact recorded MiniMax script');assert.equal(metadata.provider,'MiniMax');assert.equal(metadata.language,language==='es'?'Spanish':'English');assert(Number.isFinite(clip.duration)&&clip.duration>0);assert(Math.abs(clip.duration*1000-metadata.duration_ms)<1e-7);assert(audioPath,'each recorded clip has a public MP3');const audio=statSync(audioPath);assert(audio.isFile()&&audio.size>10000);assert.equal(audio.size,metadata.size_bytes);recordings++;}
 }
 assert.equal(recordings,14,'all fourteen new recording proofs are mandatory in both source and portable export');return {recordings,mode:portable?'portable':'source'};
}
function harness({lang='es',mode='notebook',audioMode='success',reduced=false,finePointer=true,storage=new Map(),voices,worldAPI={}}={}){
 const elements=new Map(),events={},queued=[],audios=[],players=[],objectUrls=new Set();let clock=0,lastFrame,lastChapter,lastPose,lastRender,inspect,lockCalls=0,worldMode=mode,view={yaw:.1,pitch:.23,distance:10,whole:false,zoneOverview:false};
 const listen=(name,fn)=>{const previous=events[name];events[name]=event=>{previous?.(event);fn(event);};};
 const fakeElement=id=>({id,hidden:id==='.ap-transcript',checked:false,dataset:{},style:{setProperty(k,v){this[k]=v;}},value:'',textContent:'',children:[],selectors:new Map(),offsetHeight:100,
  get innerHTML(){return this._innerHTML||'';},set innerHTML(value){this._innerHTML=String(value);for(const match of this._innerHTML.matchAll(/<(?:input|button|select|a)\b([^>]*)>/g)){const attrs=match[1],name=attrs.match(/\bid="([^"]+)"/);const child=element(name?.[1]||'anonymous-'+elements.size);for(const attr of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){const key=attr[1],value=attr[2]??'';if(key.startsWith('data-'))child.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;else if(key==='checked')child.checked=true;else if(key==='hidden')child.hidden=true;else child[key]=value;}}},
  classList:{values:new Set(),add(value){this.values.add(value);},remove(value){this.values.delete(value);},toggle(value,on){if(on===undefined)on=!this.values.has(value);if(on)this.add(value);else this.remove(value);},contains(value){return this.values.has(value);}},
  setAttribute(k,v){this[k]=v;},addEventListener(name,fn){const previous=(this.handlers??={})[name];this.handlers[name]=event=>{previous?.(event);fn(event);};},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:1000,height:700};},click(){this.onclick?.();},scrollIntoView(){},focus(){},
  append(...children){children.forEach(child=>{child.parentNode=this;this.children.push(child);});},replaceChildren(...children){this.children=[];this.append(...children);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);},
  querySelector(selector){if(!this.selectors.has(selector))this.selectors.set(selector,fakeElement(selector));return this.selectors.get(selector);},querySelectorAll(selector){return selector==='.ap-marks button'?this.querySelector('.ap-marks').children:[];},removeEventListener(){}
 });
 const element=id=>{if(!elements.has(id))elements.set(id,fakeElement(id));return elements.get(id);};
 const queryAll=selector=>{const match=selector.match(/^\[data-([\w-]+)\]$/);if(match){const key=match[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return [...elements.values()].filter(el=>key in el.dataset);}return [];};
 const document={documentElement:{lang,style:{setProperty(){}}},head:fakeElement('head'),body:element('body'),hidden:false,pointerLockElement:null,getElementById:element,createElement:tag=>fakeElement(tag),removeEventListener(){},
  exitPointerLock(){this.pointerLockElement=null;events['document:pointerlockchange']?.();},addEventListener(name,fn){listen('document:'+name,fn);},
  querySelector(selector){if(selector==='[data-atlas-player-css]')return this.head.children.find(child=>'atlasPlayerCss'in child.dataset)||null;return selector.includes('canvas')?element('canvas'):null;},querySelectorAll:queryAll
 };
 class AudioStub{
  constructor(src){this.src=src;this.currentTime=0;this.playbackRate=1;this.readyState=1;this.paused=true;this.playCalls=0;this.pauseCalls=0;this.duration=Object.values(voices).flat().find(clip=>clip.src===src)?.duration||60;audios.push(this);}
  play(){this.playCalls++;if(audioMode==='throw')throw Error('Audio blocked');if(audioMode==='reject')return Promise.reject(Error('Audio blocked'));this.paused=false;this.onplaying?.();return Promise.resolve();}
  pause(){this.paused=true;this.pauseCalls++;}removeAttribute(name){if(name==='src')this.src='';}load(){const original=this.src?.replace(/^blob:fixture:/,'');this.duration=Object.values(voices).flat().find(clip=>clip.src===original)?.duration||60;if(this.src?.startsWith('blob:fixture:'))queueMicrotask(()=>this.onloadedmetadata?.());}
 }
 class Clock extends TimelineClock{constructor(options){super({...options,AudioClass:AudioStub,loadBlob:async src=>src,urls:{createObjectURL:src=>{const url='blob:fixture:'+src;objectUrls.add(url);return url;},revokeObjectURL:url=>objectUrls.delete(url)}});}}
 const world={canvas:element('canvas'),dom:element('canvas'),update(frame,chapter){lastFrame=frame;lastChapter=chapter;},render(frame,dt,chapter){if(frame)lastFrame=frame;if(chapter!==undefined)lastChapter=chapter;lastRender={pose:lastPose?{...lastPose}:null,frame:lastFrame,chapter:lastChapter,mode:worldMode,view:{...view}};},dispose(){},lookLock(){lockCalls++;document.pointerLockElement=this.canvas;events['document:pointerlockchange']?.();return Promise.resolve();},
  setPose(value){lastPose={...value};},setMode(value){worldMode=value;},focus(chapter){lastChapter=chapter;view.whole=false;view.zoneOverview=false;},fit(options={}){view={yaw:.1,pitch:.23,distance:10,whole:false,zoneOverview:false,...options};},overview(all=true){view.whole=all!==false&&all!=='zone';view.zoneOverview=!view.whole;},zoomBy(f){view.distance=Math.min(35,Math.max(4,view.distance/f));},getViewState(){return {...view};},restoreViewState(value={}){view={...view,...(value.orbit||value)};},
  nearest(pose=lastPose){return pose?worldAPI.homeNearestStand(pose)?.index??null:null;},activate(){const chapter=this.nearest();if(chapter!==null)inspect?.(chapter);return chapter;},inspect(x,y){const chapter=this.activate();return chapter===null?null:{chapter};}
 };
 world.canvas.requestPointerLock=()=>world.lookLock();
 const createHomeWorld=(...args)=>{inspect=args.find(arg=>typeof arg==='function')||args.find(arg=>arg&&typeof arg==='object'&&arg.onInspect)?.onInspect;return world;};
 const window={addEventListener:listen,removeEventListener(){}};
 const ctx={...model,...worldAPI,narrationTime,narrationProgress,VOICES:voices,document,window,bindFirstPerson:options=>bindFirstPerson({...options,document,window,coarse:!finePointer}),console,URLSearchParams,URL,Intl,TimelineClock:Clock,restoredPosition,ResizeObserver:class{observe(){}disconnect(){}},
  matchMedia:query=>({matches:query==='(pointer: fine)'?finePointer:query==='(prefers-reduced-motion: reduce)'?reduced:false}),performance:{now:()=>clock},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},location:{search:'?mode='+mode,hash:'',href:'https://fixture.test/home/index.html?mode='+mode},history:{replaceState(){}},requestAnimationFrame:fn=>queued.push(fn),createHomeWorld
 };
 const Player=vm.runInNewContext(`(()=>{${notebookSource}\nreturn NotebookPlayer;})()`,ctx);ctx.NotebookPlayer=class extends Player{constructor(options){super(options);players.push(this);}};
 const source=readFileSync('site-src/home/app.js','utf8').replace(/^import .*;$/gm,'');vm.runInNewContext(source,ctx);
 function frames(n){for(let i=0;i<n;i++){const dt=1/60;clock+=dt*1000;for(const audio of audios)if(!audio.paused){audio.currentTime=Math.min(audio.duration,audio.currentTime+dt*audio.playbackRate);if(audio.currentTime>=audio.duration){audio.paused=true;audio.onended?.();}}const callbacks=queued.splice(0);callbacks.forEach(callback=>callback(clock));}}
 return {element,elements,events,document,queryAll,frames,world,audios,players,storage,objectUrls,
  get lastFrame(){return lastFrame;},get lastChapter(){return lastChapter;},get lastPose(){return lastPose;},get lastRender(){return lastRender;},get lockCalls(){return lockCalls;},
  get inspect(){return inspect;},setAudioMode(value){audioMode=value;},async flush(){for(let i=0;i<12;i++)await Promise.resolve();}
 };
}
const key=code=>({code,repeat:false,target:{closest:()=>false},preventDefault(){}}),near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message),samePose=(a,b,message)=>['x','z','yaw','pitch'].forEach(name=>near(a[name],b[name],message));

const voiceSource=readFileSync('site-src/home/voices.js','utf8'),VOICES=JSON.parse(voiceSource.split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const clips of Object.values(VOICES))for(const clip of clips)clip.src='fixture://audio/'+clip.file;
const worldAPI=await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/home/world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)).replace("'./model.js'",JSON.stringify(new URL('./site-src/home/model.js',import.meta.url).href))));
const at37={es:[2.75,19.5,29.5,39.5,49.5,59.5,69.54545454545455],en:[2.775862068965517,19.5,29.5,39.5,49.20454545454545,59.5,69.52380952380952]};
for(const lang of ['es','en'])for(let chapter=0;chapter<7;chapter++){
 near(narrationTime(chapter,.37,lang),at37[lang][chapter],'independent phrase pause/operation oracle');near(narrationTime(chapter,-1,lang),chapter*10);near(narrationTime(chapter,NaN,lang),chapter*10);near(narrationTime(chapter,1,lang),(chapter+1)*10);near(narrationTime(chapter,2,lang),(chapter+1)*10);
 let previous=chapter*10;for(let i=0;i<=1000;i++){const value=narrationTime(chapter,i/1000,lang);assert(value>=previous&&value<=(chapter+1)*10);previous=value;}
}
// Literal inverse cases cover non-linear washing/drying phases and the
// nearest equivalent location within a hold. Expected values are independent
// of CUES; forward/inverse sampling below supplements these concrete oracles.
const inverseCases=[
 [3,35,'es',.9,.18],[3,35,'en',.1,.19],[3,36,'es',.9,.212],[3,36,'en',.1,.222],
 [3,36.25,'es',.1,.22],[3,36.25,'en',.1,.23],[3,36.5,'es',.9,.228],[3,36.5,'en',.1,.238],
 [3,37.5,'es',.1,.26],[3,37.5,'en',.1,.27],[3,39.5,'es',.5,.5],[3,39.5,'en',.5,.5],
 [3,39.5,'es',.1,.35],[3,39.5,'en',.1,.36],[3,39.5,'es',.99,.91],[3,39.5,'en',.99,.91],
 [0,0,'es',.1,.1],[0,0,'en',.5,.22],[0,0,'es',.5,.23],
 [0,10,'es',.5,.95],[0,10,'en',.98,.98],[6,70,'es',.1,.57],[6,70,'en',.8,.8],
 [1,19.5,'es',.1,.34],[1,19.5,'en',.1,.35],[1,19.5,'en',.99,.77],
 [2,29.5,'es',.1,.31],[2,29.5,'en',.1,.32],[2,29.5,'es',.99,.90]
];
for(const [chapter,time,language,preferred,expected] of inverseCases)near(narrationProgress(chapter,time,language,preferred),expected,'independent inverse operation/hold oracle');
let inverseSamples=0;
for(const language of ['es','en'])for(let chapter=0;chapter<7;chapter++)for(let i=0;i<=1000;i++){
 const progress=i/1000,time=narrationTime(chapter,progress,language),inverse=narrationProgress(chapter,time,language,progress);near(inverse,progress,'an equivalent preferred point on a hold is retained');near(narrationTime(chapter,inverse,language),time,'the inverse returns the same physical state');inverseSamples++;
}
for(const language of ['es','en'])for(let chapter=0;chapter<7;chapter++)for(const local of [0,.01,.7,2.35,4.95,5.02,6.25,7.37,9.5,9.77,10]){
 const time=chapter*10+local;for(const preferred of [0,.37,1])near(narrationTime(chapter,narrationProgress(chapter,time,language,preferred),language),time);inverseSamples++;
}
let scenarios=0;
for(const lang of ['es','en'])for(const mode of ['notebook','immersive']){
 scenarios++;const h=harness({lang,mode,voices:VOICES,worldAPI}),{element,events,frames}=h;await h.flush();frames(1);const notebook=h.players[0];assert.equal(notebook.id,'home');assert.equal(notebook.clock.timeline.length,7);assert.equal(notebook.root.querySelector('.ap-marks').children.length,7);assert.equal(notebook.running,true);assert.equal(h.lastRender.mode,mode);
 notebook.pause();notebook.el('text').onclick();assert.equal(notebook.root.querySelector('.ap-transcript').hidden,false);element('instant').checked=true;element('instant').onchange();
 for(const [i,edge] of notebook.clock.timeline.entries()){
  notebook.root.querySelector('.ap-marks').children[i].onclick();await h.flush();frames(1);assert.equal(h.lastChapter,i);assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[lang][i].text);
  notebook.el('seek').oninput({target:{value:String(edge.start+edge.duration*.37)}});await h.flush();frames(1);near(notebook.current.progress,.37);near(h.lastFrame.time,at37[lang][i]);if(mode==='immersive')samePose(h.lastPose,worldAPI.homePoseAt(i),'following the explicit voice seek reaches the actual stand room');
 }
 element('timeline').value=47.95;element('timeline').oninput();frames(1);near(h.lastFrame.time,47.95);assert.equal(h.lastFrame.done,4);assert.equal(h.lastFrame.ledger.completedBaseline,100);assert.equal(notebook.running,false);
 element('overhead').value=20;element('overhead').onchange();frames(1);near(h.lastFrame.time,47.95);assert.equal(h.lastFrame.ledger.freed,80);assert.equal(h.lastFrame.ledger.humanSpent,20);
 element('actor-mode').value='human';element('actor-mode').onchange();frames(1);near(h.lastFrame.time,47.95);assert.equal(h.lastFrame.ledger.freed,0);assert.equal(h.lastFrame.ledger.humanSpent,100);assert.equal(element('overhead').disabled,true);assert.match(element('description').textContent,lang==='es'?/^La persona/:/^The person/);const partial=JSON.stringify(h.lastFrame),pose={...h.lastPose},params=notebook.capture().params;
 notebook.onSync({...notebook.current,index:0,progress:1,reason:'tick'});frames(1);assert.equal(JSON.stringify(h.lastFrame),partial,'late paused narration cannot overwrite a manual comparison');
 const other=lang==='es'?'en':'es';notebook.el('language').onchange({target:{value:other}});await h.flush();frames(1);assert.equal(notebook.language,other);assert.equal(JSON.stringify(h.lastFrame),partial);samePose(h.lastPose,pose);assert.deepEqual(notebook.capture().params,params);assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[other][notebook.current.index].text);
 element('speed').value=4;element('speed').onchange();notebook.save();const saved=JSON.parse(h.storage.get('atlas-notebook-v2:home'));near(saved.extra.time,47.95);assert.equal(saved.extra.timeSource,'manual');assert.equal(saved.extra.speed,4);assert.equal(saved.extra.params.actorMode,'human');samePose(saved.extra.player,pose);assert.equal(saved.playing,false);
 const restored=harness({lang,mode,voices:VOICES,worldAPI,storage:h.storage});await restored.flush();restored.frames(1);assert.equal(restored.players[0].language,other);assert.equal(JSON.stringify(restored.lastFrame),partial);samePose(restored.lastPose,pose);restored.frames(90);assert.equal(JSON.stringify(restored.lastFrame),partial);
 for(let i=0;i<7;i++){element('task-'+i).onclick();frames(1);near(h.lastFrame.time,i*10);assert.equal(h.lastChapter,i);assert.equal(notebook.running,false);element('timeline').value=i*10;element('timeline').oninput();frames(1);assert.equal(h.lastFrame.tasks[i].localTime,0,'task selection and manual scrub have one calculation');}
 element('actor-mode').value='robots';element('actor-mode').onchange();element('reset').onclick();element('play').onclick();frames(18);element('play').onclick();frames(1);const paused=h.lastFrame.time;assert(paused>0&&paused<2);frames(90);near(h.lastFrame.time,paused);element('step').onclick();frames(1);near(h.lastFrame.time,10);assert.equal(h.lastFrame.done,1);
 element('finish').onclick();frames(1);near(h.lastFrame.time,70);assert.equal(h.lastFrame.ledger.freed,116);assert.equal(h.lastFrame.ledger.humanSpent,29);assert.equal(element('completion').hidden,false);assert.equal(Number(element('metrics').dataset.freed),116);const final=JSON.stringify(h.lastFrame);
 element('timeline').value=12.7;element('timeline').oninput();frames(1);element('timeline').value=70;element('timeline').oninput();frames(1);assert.equal(JSON.stringify(h.lastFrame),final,'rewind restores exact props, contacts and ledger');element('overhead').value=0;element('overhead').onchange();frames(1);assert.equal(h.lastFrame.ledger.freed,145);assert.equal(h.lastFrame.ledger.humanSpent,0);element('actor-mode').value='human';element('actor-mode').onchange();frames(1);assert.equal(h.lastFrame.ledger.freed,0);assert.equal(h.lastFrame.ledger.humanSpent,145);
 const beforeMode={...h.lastPose},beforeToggle=JSON.stringify(h.lastFrame);element(mode==='immersive'?'mode-notebook':'mode-immersive').onclick();frames(1);samePose(h.lastPose,mode==='notebook'?worldAPI.homePoseAt(6):beforeMode);assert.equal(JSON.stringify(h.lastFrame),beforeToggle);element(mode==='immersive'?'mode-immersive':'mode-notebook').onclick();frames(1);
 if(mode==='notebook'){const view=h.world.getViewState();element('zoom-in').onclick();assert(h.world.getViewState().distance<view.distance);element('overview').onclick();assert(h.world.getViewState().whole);element('fit').onclick();assert(!h.world.getViewState().whole);}
 if(mode==='immersive'){
  element('task-0').onclick();frames(1);element('listen').onclick();await h.flush();frames(1);assert(notebook.running);const initial={...h.lastPose};events.keydown(key('KeyW'));frames(6);events.keyup(key('KeyW'));assert(Math.hypot(h.lastPose.x-initial.x,h.lastPose.z-initial.z)>0);assert.equal(notebook.running,false);const movingTime=h.lastFrame.time;events.blur();const blurred={...h.lastPose};frames(60);samePose(h.lastPose,blurred);near(h.lastFrame.time,movingTime);
  element('capture').onclick();await h.flush();frames(1);const look={...h.lastPose};events.mousemove({movementX:50,movementY:-10});frames(1);assert(h.lastPose.yaw<look.yaw);assert(h.lastPose.pitch>look.pitch);events.keydown(key('Escape'));frames(1);assert.equal(element('capture')['aria-pressed'],'false');
  const physical={...h.lastPose};h.inspect(3);await h.flush();frames(1);assert.equal(h.lastChapter,3);samePose(h.lastPose,physical);assert.equal(notebook.current.id,'laundry');assert(notebook.running);
  element('task-0').onclick();frames(1);const stand={...h.lastPose};assert.equal(worldAPI.homeNearestStand(stand)?.index,0);events.keydown(key('KeyE'));await h.flush();frames(1);assert.equal(notebook.current.id,'floor');samePose(h.lastPose,stand);
  notebook.pause();const canvas=h.world.canvas;canvas.handlers.pointerdown({button:0,clientX:500,clientY:350,pointerType:'mouse',pointerId:1});canvas.handlers.pointerup({button:0,clientX:500,clientY:350,pointerType:'mouse',pointerId:1});await h.flush();frames(1);assert(notebook.running,'a physical click runs through the real first-person binder');samePose(h.lastPose,stand);
  events.keydown(key('KeyW'));frames(6);h.document.hidden=true;events['document:visibilitychange']();const hidden={...h.lastPose};frames(60);h.document.hidden=false;events['document:visibilitychange']();frames(60);samePose(h.lastPose,hidden);assert.equal(notebook.running,false);
 }
}
for(const lang of ['es','en'])for(let chapter=0;chapter<7;chapter++){
 scenarios++;const h=harness({lang,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];notebook.pause();h.element('instant').checked=true;h.element('instant').onchange();h.element('task-'+chapter).onclick();h.frames(1);assert.equal(notebook.capture().enteredImmersive,false);h.element('timeline').value=chapter*10+3.45;h.element('timeline').oninput();h.frames(1);const calculation=JSON.stringify(h.lastFrame);
 h.element('mode-immersive').onclick();h.frames(1);samePose(h.lastPose,worldAPI.homePoseAt(chapter));assert.equal(JSON.stringify(h.lastFrame),calculation);h.events.keydown(key('KeyD'));h.frames(3);h.events.keyup(key('KeyD'));h.element('capture').onclick();await h.flush();h.events.mousemove({movementX:19,movementY:-11});h.frames(1);const walked={...h.lastPose};assert(Math.hypot(walked.x-worldAPI.homePoseAt(chapter).x,walked.z-worldAPI.homePoseAt(chapter).z)>0);assert.notEqual(walked.yaw,worldAPI.homePoseAt(chapter).yaw);
 h.element('mode-notebook').onclick();h.frames(1);h.element('mode-immersive').onclick();h.frames(1);samePose(h.lastPose,walked);assert.equal(JSON.stringify(h.lastFrame),calculation);notebook.save();const restored=harness({lang,mode:'immersive',voices:VOICES,worldAPI,storage:h.storage});await restored.flush();restored.frames(1);samePose(restored.lastPose,walked);assert.equal(restored.players[0].capture().enteredImmersive,true);assert.equal(JSON.stringify(restored.lastFrame),calculation);
}
// A change of recording must preserve physical progress, including the
// exact ES .22 dryer boundary that formerly moved backwards to EN washing.
// No extra animation frame is inserted between the anchor and language switch.
for(const lang of ['es','en'])for(const mode of ['notebook','immersive'])for(const progress of [.19,.22,.23,.245,.27,.50]){
 scenarios++;const other=lang==='es'?'en':'es',h=harness({lang,mode,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];notebook.pause();h.element('instant').checked=true;h.element('instant').onchange();h.element('task-3').onclick();const edge=notebook.clock.timeline[3];notebook.seek(edge.start+edge.duration*progress,false);await h.flush();h.frames(1);notebook.el('play').onclick();await h.flush();assert(notebook.running);
 // Leave a free head orientation / chosen notebook camera as the clock runs.
 if(mode==='immersive'){h.element('capture').onclick();await h.flush();h.events.mousemove({movementX:17,movementY:-9});}
 else h.world.restoreViewState({yaw:.43,pitch:.74,distance:8.6,whole:true});
 const anchor=notebook.capture(),expected=progress===.50?.50:progress+(lang==='es'?.01:-.01),phaseBefore=h.lastFrame.appliances.washerDryer.phase;
 if(progress===.22)near(anchor.time,lang==='es'?36.25:35.9375,'the original wash/dry regression begins at a literal independently known time');
 notebook.el('language').onchange({target:{value:other}});await h.flush();const switched=notebook.capture();near(switched.time,anchor.time,'voice switch preserves the same physical operation');near(notebook.current.progress,expected,'the new clip uses the equivalent physical fraction rather than the old fraction');assert.equal(notebook.running,true);samePose(switched.player,anchor.player,'voice switch does not start a guided camera trip');assert.deepEqual(switched.view,anchor.view);
 const phases=['idle','loading','washing','drying','unloading','finished'];h.frames(1);assert(h.lastFrame.time>=anchor.time-1e-8,'the next real audio-clock tick must not rewind an operation');assert(phases.indexOf(h.lastFrame.appliances.washerDryer.phase)>=phases.indexOf(phaseBefore),'drying cannot become washing on the next tick');samePose(h.lastPose,anchor.player);h.frames(12);assert(h.lastFrame.time>=anchor.time-1e-8);samePose(h.lastPose,anchor.player);
 notebook.pause();h.frames(1);const paused=JSON.stringify(h.lastFrame),pauseAnchor=notebook.capture();h.frames(90);assert.equal(JSON.stringify(h.lastFrame),paused);notebook.save();const restored=harness({lang,mode,voices:VOICES,worldAPI,storage:h.storage});await restored.flush();restored.frames(1);assert.equal(restored.players[0].running,false);assert.equal(restored.players[0].language,other);assert.equal(JSON.stringify(restored.lastFrame),paused,'reload preserves the equivalent paused narrated operation');samePose(restored.lastPose,pauseAnchor.player);assert.deepEqual(restored.world.getViewState(),pauseAnchor.view);
 restored.players[0].el('language').onchange({target:{value:lang}});await restored.flush();restored.frames(1);assert.equal(restored.players[0].running,false);near(restored.lastFrame.time,pauseAnchor.time,'switching back while paused retains the same physical point');samePose(restored.lastPose,pauseAnchor.player);restored.frames(60);near(restored.lastFrame.time,pauseAnchor.time);
}
for(const lang of ['es','en'])for(const audioMode of ['reject','throw']){
 scenarios++;const h=harness({lang,audioMode,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];assert.equal(notebook.clock.state,'blocked');assert.equal(notebook.running,false);const position=notebook.clock.position,frame=JSON.stringify(h.lastFrame);h.frames(120);near(notebook.clock.position,position);assert.equal(JSON.stringify(h.lastFrame),frame);
 const edge=notebook.clock.timeline[3];notebook.seek(edge.start+edge.duration*.37,true);await h.flush();h.frames(1);near(h.lastFrame.time,39.5);assert.equal(notebook.clock.state,'blocked');h.setAudioMode('success');notebook.el('play').onclick();await h.flush();h.frames(1);assert.equal(notebook.clock.state,'playing');const offset=notebook.current.local;assert(offset>0);notebook.pause();const oldAudio=notebook.clock.audio,oldError=oldAudio.onerror;notebook.el('play').onclick();await h.flush();near(notebook.current.local,offset);oldAudio.onerror();assert.equal(notebook.clock.state,'error');notebook.el('play').onclick();await h.flush();assert.equal(notebook.clock.state,'playing');assert.notEqual(notebook.clock.audio,oldAudio);near(notebook.current.local,offset);oldError();assert.equal(notebook.clock.state,'playing');
}
for(const lang of ['es','en']){
 scenarios++;const h=harness({lang,mode:'immersive',finePointer:false,reduced:true,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];notebook.pause();assert.equal(h.element('instant').checked,true);const canvas=h.world.canvas,pose={...h.lastPose},touch=(x,y)=>({button:0,clientX:x,clientY:y,pointerType:'touch',pointerId:7});canvas.handlers.pointerdown(touch(500,350));canvas.handlers.pointermove(touch(520,340));canvas.handlers.pointerup(touch(520,340));h.frames(1);assert(h.lastPose.yaw<pose.yaw&&h.lastPose.pitch>pose.pitch,'mobile drag rotates through the actual binder');assert.equal(h.lockCalls,0);h.element('task-0').onclick();h.frames(1);const stand={...h.lastPose};canvas.handlers.pointerdown(touch(500,350));canvas.handlers.pointerup(touch(500,350));await h.flush();h.frames(1);assert(notebook.running);samePose(h.lastPose,stand);assert.equal(h.lockCalls,0,'a touch click listens without requesting desktop pointer lock');
}
const proofs=recordingProofs(VOICES);
console.log(`Home controls: ${scenarios} bilingual notebook/FPS/audio-failure scenarios, 14 independent phrase-cue and ${inverseCases.length} inverse numerical oracles / ${inverseSamples} roundtrip samples, narrated ES↔EN wash/dry switching without rewind or camera travel, first/repeated entry, manual fractional scenario/voice/reload, real player/clock/mouse binder, spent/released ledger, seven selections/scrubs, physical E/click, blur/visibility and ${proofs.recordings} ${proofs.mode} MiniMax proofs: OK`);
