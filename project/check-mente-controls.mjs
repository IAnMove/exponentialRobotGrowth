import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './site-src/mente/model.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';
import {bindFirstPerson} from './site-src/immersive/first-person.js';
import {narrationTick} from './site-src/mente/guide.js';

// Use the actual player and audio clock; replace only native browser surfaces.
const notebookSource=readFileSync('site-src/playback/player.js','utf8').replace(/^import .*;$/gm,'').replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/playback/player.js'));
function recordingProofs(voices){
 const narration=JSON.parse(readFileSync('narration/mente.json','utf8'));
 // An export can retain a stale ignored narration/scripts folder after a
 // build. Its explicitly shipped proof directories must always take priority.
 const portable=existsSync('narration/mente-audio')||existsSync('narration/mente-scripts'),metadataDir=portable?'narration/mente-audio/':'dist/audio/',scriptDir=portable?'narration/mente-scripts/':'narration/scripts/';let recordings=0;
 for(const language of ['es','en']){
  assert.equal(voices[language].length,4);assert.deepEqual(voices[language].map(clip=>clip.id),['units','memory','learn','energy']);
  for(const clip of voices[language]){const original=narration[language].find(script=>script.id===clip.id),metadata=JSON.parse(readFileSync(metadataDir+clip.file.replace(/\.mp3$/,'.json'),'utf8')),script=readFileSync(scriptDir+clip.file+'.txt','utf8').trim(),audioPath=['dist/audio/'+clip.file,'../audio/'+clip.file].find(path=>existsSync(path));assert(original);assert.equal(clip.title,original.title);assert.equal(clip.text,original.text);assert.equal(clip.text,metadata.text);assert.equal(clip.text,script,'the transcript is the exact recorded MiniMax script');assert.equal(metadata.provider,'MiniMax');assert.equal(metadata.language,language==='es'?'Spanish':'English');assert(Number.isFinite(clip.duration)&&clip.duration>0);assert(Math.abs(clip.duration*1000-metadata.duration_ms)<1e-7);assert(audioPath,'each recorded clip has a public MP3');const audio=statSync(audioPath);assert(audio.isFile()&&audio.size>10000);assert.equal(audio.size,metadata.size_bytes);recordings++;}
 }
 assert.equal(recordings,8,'all eight new recording proofs are mandatory in both source and portable export');return {recordings,mode:portable?'portable':'source'};
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
  nearest(pose=lastPose){if(!pose)return null;let best=null,distance=3.8;[-12,-3,6,12].forEach((x,i)=>{const d=Math.hypot(pose.x-x,pose.z-4.3);if(d<distance){distance=d;best=i;}});return best;},activate(){const chapter=this.nearest();if(chapter!==null)inspect?.(chapter);return chapter;},inspect(x,y){return this.activate();}
 };
 world.canvas.requestPointerLock=()=>world.lookLock();
 const createMindWorld=(...args)=>{inspect=args.find(arg=>typeof arg==='function')||args.find(arg=>arg&&typeof arg==='object'&&arg.onInspect)?.onInspect;return world;};
 const window={addEventListener:listen,removeEventListener(){}};
 const ctx={...model,...worldAPI,narrationTick,VOICES:voices,document,window,bindFirstPerson:options=>bindFirstPerson({...options,document,window,coarse:!finePointer}),console,URLSearchParams,URL,Intl,TimelineClock:Clock,restoredPosition,ResizeObserver:class{observe(){}disconnect(){}},
  matchMedia:query=>({matches:query==='(pointer: fine)'?finePointer:query==='(prefers-reduced-motion: reduce)'?reduced:false}),performance:{now:()=>clock},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},location:{search:'?mode='+mode,hash:'',href:'https://fixture.test/mente/index.html?mode='+mode},history:{replaceState(){}},requestAnimationFrame:fn=>queued.push(fn),createMindWorld
 };
 const Player=vm.runInNewContext(`(()=>{${notebookSource}\nreturn NotebookPlayer;})()`,ctx);ctx.NotebookPlayer=class extends Player{constructor(options){super(options);players.push(this);}};
 const source=readFileSync('site-src/mente/app.js','utf8').replace(/^import .*;$/gm,'');vm.runInNewContext(source,ctx);
 function frames(n){for(let i=0;i<n;i++){const dt=1/60;clock+=dt*1000;for(const audio of audios)if(!audio.paused){audio.currentTime=Math.min(audio.duration,audio.currentTime+dt*audio.playbackRate);if(audio.currentTime>=audio.duration){audio.paused=true;audio.onended?.();}}const callbacks=queued.splice(0);callbacks.forEach(callback=>callback(clock));}}
 return {element,elements,events,document,queryAll,frames,world,audios,players,storage,objectUrls,
  get lastFrame(){return lastFrame;},get lastChapter(){return lastChapter;},get lastPose(){return lastPose;},get lastRender(){return lastRender;},get lockCalls(){return lockCalls;},
  get inspect(){return inspect;},setAudioMode(value){audioMode=value;},async flush(){for(let i=0;i<12;i++)await Promise.resolve();}
 };
}
const key=code=>({code,repeat:false,target:{closest:()=>false},preventDefault(){}}),near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message),samePose=(a,b,message)=>['x','z','yaw','pitch'].forEach(name=>near(a[name],b[name],message));
const voiceSource=readFileSync('site-src/mente/voices.js','utf8'),VOICES=JSON.parse(voiceSource.split('export const VOICES = ')[1].split(/;\r?\n/)[0]),proofs=recordingProofs(VOICES);
for(const clips of Object.values(VOICES))for(const clip of clips)clip.src='fixture://audio/'+clip.file;
const worldAPI=await import('./dist/mente/world.js');
// Independent numerical cases check the narrative's pauses, prefill/decode
// sequence and accelerated later cycles. They do not derive expected values
// from the exported cue table, so changing a cue cannot silently bless itself.
const at37={es:[0,6,23.34246575342466,48],en:[0,5.833333333333333,24,48]};
const guideCases=[
 ['es','units',.8,0],['en','units',.8,0],
 ['es','memory',.2,1.445945945945946],['es','memory',.37,6],['en','memory',.37,5.833333333333333],
 ['es','memory',.6,10.35294117647059],['en','memory',.65,23.48387096774194],
 ['es','learn',.37,23.34246575342466],['en','learn',.37,24],
 ['es','learn',.65,42.54545454545455],['en','learn',.65,41.67272727272727],
 ['es','energy',.3,23.36283185840708],['en','energy',.3,25.6551724137931]
];
for(const [language,chapter,progress,expected] of guideCases)near(narrationTick(chapter,progress,language),expected,`${language} ${chapter} phrase cue at ${progress}`);
for(const language of ['es','en'])for(const chapter of ['memory','learn','energy']){
 near(narrationTick(chapter,-1,language),0);near(narrationTick(chapter,NaN,language),0);near(narrationTick(chapter,1,language),48);near(narrationTick(chapter,2,language),48);
 let previous=0;for(let i=0;i<=1000;i++){const tick=narrationTick(chapter,i/1000,language);assert(Number.isFinite(tick)&&tick>=previous&&tick>=0&&tick<=48,'phrase timing is finite, bounded and monotone');previous=tick;}
}
near(narrationTick('unknown',.4,'es'),0);near(narrationTick('memory',.37,'unknown'),6,'unknown language has the declared Spanish fallback');
let scenarios=0;
for(const lang of ['es','en'])for(const mode of ['notebook','immersive']){
 scenarios++;const h=harness({lang,mode,voices:VOICES,worldAPI}),{element,events,frames}=h;await h.flush();frames(1);const notebook=h.players[0];assert(notebook);assert.equal(notebook.id,'mind');assert.equal(notebook.clock.timeline.length,4);assert.equal(notebook.root.querySelector('.ap-marks').children.length,4);assert.equal(notebook.running,true);assert.equal(h.lastRender.mode,mode);
 notebook.pause();notebook.el('text').onclick();assert.equal(notebook.root.querySelector('.ap-transcript').hidden,false);
 element('instant').checked=true;element('instant').onchange();
 for(const [i,edge] of notebook.clock.timeline.entries()){
  notebook.root.querySelector('.ap-marks').children[i].onclick();await h.flush();frames(1);assert.equal(h.lastChapter,i);assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[lang][i].text);
  notebook.el('seek').oninput({target:{value:String(edge.start+edge.duration*.37)}});await h.flush();frames(1);near(notebook.current.progress,.37);near(h.lastFrame.time,at37[lang][i],'audio scrub follows independently checked phrase cues rather than a linear 48-step clock');assert.equal(h.lastFrame.mode,i===2?'learn':'reply');assert.equal(element('pipeline').dataset.stage,h.lastFrame.phase);if(mode==='immersive')samePose(h.lastPose,worldAPI.mindPoseAt(i),'an explicit followed chapter reaches its actual exhibit');
 }
 // Manual exploration must survive late audio callbacks, language changes and
 // reload. Use a non-default prefix and a fraction inside a real operation.
 element('prompt').value=48;element('prompt').onchange();frames(1);assert.equal(h.lastFrame.time,0);assert.equal(h.lastFrame.generated,0);assert.equal(notebook.running,false);assert.equal(element('prompt').value,48);assert.equal(h.lastFrame.attention.sampled,true);
 element('timeline').value=7.35;element('timeline').oninput();frames(1);const partialFrame=JSON.stringify(h.lastFrame),pose={...h.lastPose},params=notebook.capture().params;near(h.lastFrame.time,7.35);assert.equal(h.lastFrame.generated,1);assert.equal(h.lastFrame.cache.positions,49);assert.equal(h.lastFrame.counts.prefillPerLayer,48*48*49/2);assert.equal(h.lastFrame.counts.decodePerLayer,0,'the second score row is still travelling at 7.35');
 notebook.onSync({...notebook.current,index:3,progress:1,reason:'tick'});frames(1);assert.equal(JSON.stringify(h.lastFrame),partialFrame,'a late paused narration tick cannot overwrite the manual experiment');
 const other=lang==='es'?'en':'es';notebook.el('language').onchange({target:{value:other}});await h.flush();frames(1);assert.equal(notebook.language,other);assert.equal(JSON.stringify(h.lastFrame),partialFrame,'changing voice preserves manual prefix, training mode and fractional time');samePose(h.lastPose,pose,'changing voice preserves the visitor camera');assert.deepEqual(notebook.capture().params,params);assert.equal(notebook.root.querySelector('.ap-transcript p').textContent,VOICES[other][notebook.current.index].text);
 notebook.save();const saved=JSON.parse(h.storage.get('atlas-notebook-v2:mind'));near(saved.extra.tick,7.35);assert.equal(saved.extra.timeSource,'manual');assert.equal(saved.extra.params.promptTokens,48);samePose(saved.extra.player,pose);assert.equal(saved.playing,false);
 const restored=harness({lang,mode,voices:VOICES,worldAPI,storage:h.storage});await restored.flush();restored.frames(1);assert.equal(restored.players[0].language,other);assert.equal(JSON.stringify(restored.lastFrame),partialFrame,'reload restores the actual fractional calculation instead of regenerating from zero');samePose(restored.lastPose,pose);assert.equal(restored.element('prompt').value,48);restored.frames(90);assert.equal(JSON.stringify(restored.lastFrame),partialFrame,'restored experiments stay paused');
 element('seconds').value=30;element('seconds').onchange();element('grouping').checked=true;element('grouping').onchange();frames(1);near(h.lastFrame.time,7.35,'grouping and the energy interval do not rewind inference');assert.equal(h.lastFrame.brain.human.illustratedChunks,4);near(h.lastFrame.brain.energyJoules,20*30*7.35/48);assert.equal(h.lastFrame.cache.positions,49);assert.equal(h.lastFrame.generated,1);
 for(const [prompt,outputs] of [[0,8],[8190,3],[8192,1],[9000,0]]){element('prompt').value=prompt;element('prompt').onchange();frames(1);assert.equal(h.lastFrame.time,0);assert.equal(h.lastFrame.generated,0);assert.equal(element('prompt').value,prompt);element('timeline').value=48;element('timeline').oninput();frames(1);assert.equal(h.lastFrame.generated,outputs);assert.equal(h.lastFrame.valid,prompt<=8192);assert.equal(h.lastFrame.counts.nextPerLayer,null);if(prompt===9000){assert.equal(h.lastFrame.cache.positions,0);assert.match(element('scope').textContent,lang==='es'?/demasiado larga/:/too long/);}}
 element('prompt').value=6;element('prompt').onchange();element('reset').onclick();element('play').onclick();frames(18);element('play').onclick();frames(1);const paused=h.lastFrame.time;assert(paused>0&&paused<1);frames(90);near(h.lastFrame.time,paused,'pause freezes the travelling value inside the query stage');element('step').onclick();frames(1);near(h.lastFrame.time,1);assert.equal(h.lastFrame.attention.ready.query,true);
 element('chapter-2').onclick();frames(1);assert.equal(h.lastFrame.mode,'learn','selecting the training station selects its separate computation');assert.equal(h.lastFrame.time,0);element('mode-reply').onclick();frames(1);assert.equal(h.lastFrame.mode,'reply');element('chapter-2').onclick();frames(1);assert.equal(h.lastFrame.mode,'learn');element('mode-learn').onclick();frames(1);assert.equal(h.lastFrame.generated,0);assert.equal(h.lastFrame.mode,'learn');assert.equal(h.lastFrame.time,0);element('weight').value=2;element('weight').onchange();element('rate').value=.7;element('rate').onchange();element('label').value=0;element('label').onchange();frames(1);assert.equal(h.lastFrame.training.before,2);assert.equal(h.lastFrame.training.after,null);for(const time of [12,24,36,47.9,48]){element('timeline').value=time;element('timeline').oninput();frames(1);assert.equal(h.lastFrame.generated,0);assert.equal(h.lastFrame.counts.totalPerLayer,0);assert.equal(h.lastFrame.training.after!==null,time===48);}assert(h.lastFrame.training.after<2);assert(h.lastFrame.training.afterLoss<h.lastFrame.training.loss);
 const final=JSON.stringify(h.lastFrame);element('timeline').value=12;element('timeline').oninput();frames(1);assert.equal(h.lastFrame.training.after,null);assert.equal(h.lastFrame.training.weight,2);element('timeline').value=48;element('timeline').oninput();frames(1);assert.equal(JSON.stringify(h.lastFrame),final,'manual rewind reconstructs one update without cumulative training history');
 const beforeMode={...h.lastPose},beforeToggle=JSON.stringify(h.lastFrame);element(mode==='immersive'?'mode-notebook':'mode-immersive').onclick();frames(1);assert.equal(h.lastRender.mode,mode==='immersive'?'notebook':'immersive');samePose(h.lastPose,mode==='notebook'?worldAPI.mindPoseAt(h.lastChapter):beforeMode,'the first immersive entry faces the selected station; later switches retain the visitor pose');assert.equal(notebook.capture().enteredImmersive,true);assert.equal(JSON.stringify(h.lastFrame),beforeToggle);element(mode==='immersive'?'mode-immersive':'mode-notebook').onclick();frames(1);assert.equal(h.lastRender.mode,mode);
 if(mode==='notebook'){const view=h.world.getViewState();element('zoom-in').onclick();assert(h.world.getViewState().distance<view.distance);element('overview').onclick();assert.equal(h.world.getViewState().whole,true);element('fit').onclick();assert.equal(h.world.getViewState().whole,false);}
 if(mode==='immersive'){
  element('mode-reply').onclick();frames(1);const edge=notebook.clock.timeline[1];notebook.seek(edge.start+edge.duration*.2,true);await h.flush();frames(1);assert.equal(notebook.running,true);const initial={...h.lastPose};events.keydown(key('KeyW'));frames(12);events.keyup(key('KeyW'));assert(h.lastPose.z<initial.z);assert.equal(notebook.running,false,'walking stops the narration while keeping first-person control');
  const movingTick=h.lastFrame.time;events.blur();const blur={...h.lastPose};frames(60);samePose(h.lastPose,blur,'blur clears walking and releases capture');near(h.lastFrame.time,movingTick);
  element('capture').onclick();await h.flush();frames(1);const look={...h.lastPose};events.mousemove({movementX:50,movementY:-10});frames(1);assert(h.lastPose.yaw<look.yaw);assert(h.lastPose.pitch>look.pitch,'mouse look uses the actual shared first-person controls');events.keydown(key('Escape'));frames(1);assert.equal(element('capture')['aria-pressed'],'false');
  // The stand callback represents a physical click; raycasting is exercised
  // separately against the real meshes in check-mente-scenes.
  const physical={...h.lastPose};h.inspect(3);await h.flush();frames(1);assert.equal(h.lastChapter,3);samePose(h.lastPose,physical,'clicking a physical listening stand does not reposition the visitor');assert.equal(notebook.current.id,'energy');assert.equal(notebook.running,true);
  element('chapter-1').onclick();frames(1);const standPose={...h.lastPose};events.keydown(key('KeyE'));await h.flush();frames(1);assert.equal(notebook.current.id,'memory');samePose(h.lastPose,standPose,'E listens at the nearby faced pedestal while preserving pose');
  events.keydown(key('KeyW'));frames(6);h.document.hidden=true;events['document:visibilitychange']();const hidden={...h.lastPose};frames(60);h.document.hidden=false;events['document:visibilitychange']();frames(60);samePose(h.lastPose,hidden,'visibility recovery has no retained walking input');assert.equal(notebook.running,false);
 }
}
// First entry is a deliberate arrival at whichever station is active. Once
// visited, walking and camera orientation survive notebook/FPS toggles/reload.
for(const lang of ['es','en'])for(let chapter=0;chapter<4;chapter++){
 scenarios++;const h=harness({lang,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];notebook.pause();h.element('instant').checked=true;h.element('instant').onchange();h.element('chapter-'+chapter).onclick();h.frames(1);
 assert.equal(h.lastChapter,chapter);assert.equal(notebook.capture().enteredImmersive,false);h.element('timeline').value=3.45;h.element('timeline').oninput();h.frames(1);const calculation=JSON.stringify(h.lastFrame);
 h.element('mode-immersive').onclick();h.frames(1);samePose(h.lastPose,worldAPI.mindPoseAt(chapter),'first FPS entry reaches the currently selected station');assert.equal(JSON.stringify(h.lastFrame),calculation);
 h.events.keydown(key('KeyD'));h.frames(6);h.events.keyup(key('KeyD'));h.element('capture').onclick();await h.flush();h.events.mousemove({movementX:19,movementY:-11});h.frames(1);const walked={...h.lastPose};assert(walked.x>worldAPI.mindPoseAt(chapter).x);assert.notEqual(walked.yaw,worldAPI.mindPoseAt(chapter).yaw);
 h.element('mode-notebook').onclick();h.frames(1);h.element('mode-immersive').onclick();h.frames(1);samePose(h.lastPose,walked,'re-entry preserves a walked and freely rotated pose');assert.equal(JSON.stringify(h.lastFrame),calculation);notebook.save();
 const restored=harness({lang,mode:'immersive',voices:VOICES,worldAPI,storage:h.storage});await restored.flush();restored.frames(1);samePose(restored.lastPose,walked,'reload preserves an already visited first-person pose');assert.equal(restored.players[0].capture().enteredImmersive,true);assert.equal(JSON.stringify(restored.lastFrame),calculation);
 restored.element('mode-notebook').onclick();restored.frames(1);restored.element('mode-immersive').onclick();restored.frames(1);samePose(restored.lastPose,walked,'persisted entry status prevents a later teleport');
}
for(const lang of ['es','en'])for(const audioMode of ['reject','throw']){
 scenarios++;const h=harness({lang,audioMode,voices:VOICES,worldAPI});await h.flush();h.frames(1);const notebook=h.players[0];assert.equal(notebook.clock.state,'blocked');assert.equal(notebook.running,false);const position=notebook.clock.position,frame=JSON.stringify(h.lastFrame);h.frames(120);near(notebook.clock.position,position);assert.equal(JSON.stringify(h.lastFrame),frame,'blocked audio does not advance a narrated operation');
 const edge=notebook.clock.timeline[1];notebook.seek(edge.start+edge.duration*.3,true);await h.flush();h.frames(1);near(h.lastFrame.time,lang==='es'?3.878048780487805:3.558139534883721,'a blocked seek still locates the correct phrase cue without advancing it');assert.equal(notebook.clock.state,'blocked');h.setAudioMode('success');notebook.el('play').onclick();await h.flush();h.frames(1);assert.equal(notebook.clock.state,'playing');const offset=notebook.current.local;assert(offset>0);notebook.pause();const oldAudio=notebook.clock.audio,oldError=oldAudio.onerror;notebook.el('play').onclick();await h.flush();near(notebook.current.local,offset,'retry resumes the exact voice offset');oldAudio.onerror();assert.equal(notebook.clock.state,'error');notebook.el('play').onclick();await h.flush();assert.equal(notebook.clock.state,'playing');assert.notEqual(notebook.clock.audio,oldAudio);near(notebook.current.local,offset);oldError();assert.equal(notebook.clock.state,'playing','an obsolete audio error cannot overwrite a successful retry');
}
console.log(`Mind controls: ${scenarios} bilingual notebook/immersive/rejected-audio scenarios, ${proofs.recordings} ${proofs.mode} MiniMax transcript/metadata/MP3 proofs, real NotebookPlayer/TimelineClock and first-person controls, ${guideCases.length} independent phrase-cue numerical oracles, first/repeated FPS entry, fractional manual/audio seek, causal KV/output, capacity rejection, separate learning, pause/reverse/language/reload, view switching and physical E/click: OK`);
