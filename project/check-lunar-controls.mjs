import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DEFAULTS,STAGES,simulate,sample,crossingYear,START,YEARS,POWER_PER_TONNE} from './site-src/lunar/model.js';
import {lunarFrameAt} from './site-src/lunar/presentation.js';
import {LunarSfx} from './site-src/lunar/sfx.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';

// Execute production bodies without importing WebGL or fetching narration.
// Only module syntax is removed: controller handlers, NotebookPlayer,
// TimelineClock and LunarSfx are the same code used by the page.
const appSource=readFileSync('site-src/lunar/app.js','utf8').replace(/^import .*;$/gm,'').replace('export function createLunarController','function createLunarController');
const playerSource=readFileSync('site-src/playback/player.js','utf8').replace(/^import .*;$/gm,'').replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/playback/player.js'));
const voicesSource=readFileSync('site-src/lunar/voices.js','utf8');
const VOICES=JSON.parse(voicesSource.split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const [language,clips]of Object.entries(VOICES))for(const clip of clips)clip.src=`fixture://${language}/${clip.id}`;
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message||`${a} != ${b}`);
const same=(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message);
const clone=value=>JSON.parse(JSON.stringify(value));

function harness({lang='es',storage=new Map(),audioMode='success',sfxMode='success',gpu=true,reduced=false}={}){
 const ids=new Map(),audios=[],contexts=[],effects=[],objectUrls=new Set(),queued=new Map(),pendingLoads=[],pendingPlays=[],pendingMetadata=[],updates=[],viewCalls=[];
 let now=0,rafId=0,frame,viewListener,capacity={displayedCount:1,logicalCount:1,tonnesPerSample:100,aggregate:false},camera={version:1,view:'mission',position:[30,19,43],target:[0,12,0],orbit:{azimuth:.3,elevation:.5,radius:48}};
 const eventTarget=target=>{const listeners=new Map();target.addEventListener=(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);};target.removeEventListener=(name,fn)=>listeners.get(name)?.delete(fn);target.dispatch=(name,event={})=>{for(const fn of [...listeners.get(name)||[]])fn(event);};target.listenerCount=name=>listeners.get(name)?.size||0;return target;};
 const attrPattern=/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
 function matches(node,selector){
  if(selector.startsWith('#'))return node.id===selector.slice(1);
  if(selector.startsWith('.'))return node.classList.contains(selector.slice(1));
  const attr=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if(attr)return node.attributes.has(attr[1])&&(attr[2]===undefined||node.getAttribute(attr[1])===attr[2]);
  return node.tagName===selector.toUpperCase();
 }
 function query(root,selector){
  const all=[];function visit(node){for(const child of node.children){all.push(child);visit(child);}}visit(root);
  return all.filter(node=>selector.split(',').some(part=>{const tokens=part.trim().split(/\s+/);if(!matches(node,tokens.pop()))return false;let parent=node.parentElement;while(tokens.length){const token=tokens.pop();while(parent&&!matches(parent,token))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;}));
 }
 function element(tag='div'){
  const node=eventTarget({tagName:tag.toUpperCase(),attributes:new Map(),dataset:{},style:{setProperty(k,v){this[k]=v;}},children:[],parentElement:null,hidden:false,checked:false,disabled:false,value:'',clientWidth:700,offsetHeight:128,_text:'',_html:'',classes:new Set(),
   append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}},insertBefore(child,before){child.parentElement=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,child);},replaceChildren(...children){for(const child of this.children)unregister(child);this.children=[];this._text='';this.append(...children);},remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;unregister(this);},
   getAttribute(k){return this.attributes.get(k)??null;},setAttribute(k,v){this.attributes.set(k,String(v));if(k==='id'){this.id=String(v);ids.set(this.id,this);}else if(k==='class')this.className=v;else if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);else if(['checked','hidden','disabled'].includes(k))this[k]=true;else this[k]=String(v);},
   querySelector(s){return query(this,s)[0]||null;},querySelectorAll(s){return query(this,s);},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;},getBoundingClientRect(){return {left:0,top:0,width:700,height:300};}
  });
  Object.defineProperties(node,{className:{get(){return [...this.classes].join(' ');},set(v){this.classes=new Set(String(v).split(/\s+/).filter(Boolean));}},textContent:{get(){return this._text+this.children.map(child=>child.textContent).join('');},set(v){this.replaceChildren();this._text=String(v);}},innerHTML:{get(){return this._html;},set(v){this.replaceChildren();this._html=String(v);const stack=[this];for(const token of this._html.matchAll(/<!--[\s\S]*?-->|<\/?[\w-]+\b[^>]*>|[^<]+/g)){const part=token[0];if(part.startsWith('<!--'))continue;if(part.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(part.startsWith('<')){const tag=part.match(/^<([\w-]+)/)[1],child=element(tag),attrs=part.slice(tag.length+1,-1);for(const a of attrs.matchAll(attrPattern))child.setAttribute(a[1],a[2]??a[3]??a[4]??'');stack.at(-1).append(child);if(!['INPUT','BR','LINK','IMG','META','HR','SOURCE'].includes(child.tagName)&&!part.endsWith('/>'))stack.push(child);}else stack.at(-1)._text+=part;}for(const select of query(this,'select'))if(!select.value)select.value=select.children.find(child=>child.tagName==='OPTION')?.value||'';}}});
  node.classList={contains:v=>node.classes.has(v),add:v=>node.classes.add(v),remove:v=>node.classes.delete(v),toggle(v,on){if(on===undefined)on=!node.classes.has(v);if(on)node.classes.add(v);else node.classes.delete(v);return on;}};
  return node;
 }
 function unregister(node){if(node.id&&ids.get(node.id)===node)ids.delete(node.id);node.children.forEach(unregister);}
 const html=element('html'),head=element('head'),body=element('body'),app=element('main');app.setAttribute('id','app');body.append(app);html.append(head,body);html.lang=lang;
 const document=eventTarget({documentElement:html,head,body,hidden:false,getElementById:id=>ids.get(id)||null,createElement:element,querySelector:s=>html.querySelector(s),querySelectorAll:s=>html.querySelectorAll(s)});
 const window=eventTarget({});
 class AudioStub{
  constructor(src){eventTarget(this);Object.assign(this,{src,currentTime:0,playbackRate:1,muted:false,paused:true,playCalls:0,pauseCalls:0,duration:Object.values(VOICES).flat().find(c=>c.src===src)?.duration||60});audios.push(this);}
  start(){this.paused=false;this.onplaying?.();this.dispatch('playing');}
  play(){this.playCalls++;this.mutedAtPlay=this.muted;if(audioMode==='throw')throw Error('NotAllowedError');if(audioMode==='reject')return Promise.reject(Error('NotAllowedError'));if(audioMode==='delayed-play')return new Promise((resolve,reject)=>pendingPlays.push({audio:this,resolve:()=>{this.start();resolve();},reject}));this.start();return Promise.resolve();}
  pause(){this.paused=true;this.pauseCalls++;}removeAttribute(name){if(name==='src')this.src='';}load(){if(this.src.startsWith('blob:fixture:')){const callback=()=>this.onloadedmetadata?.();if(audioMode==='late-metadata')pendingMetadata.push(callback);else queueMicrotask(callback);}}
 }
 class Clock extends TimelineClock{constructor(options){super({...options,AudioClass:options.AudioClass||AudioStub,loadBlob:src=>audioMode==='slow-load'?new Promise((resolve,reject)=>pendingLoads.push({src,resolve,reject})):audioMode==='load-error'?Promise.reject(Error('Unavailable')):Promise.resolve(src),urls:{createObjectURL:src=>{const url='blob:fixture:'+src;objectUrls.add(url);return url;},revokeObjectURL:url=>objectUrls.delete(url)}});}}
 class Param{
  constructor(context){this.context=context;this.base=0;this.target=null;this.events=[];}
  get value(){return this.target?this.target.value+(this.base-this.target.value)*Math.exp(-(this.context.currentTime-this.target.time)/this.target.seconds):this.base;}
  set value(value){this.base=value;this.target=null;}
  cancelScheduledValues(time){this.base=this.value;this.target=null;this.events.push({type:'cancel',time});}
  setTargetAtTime(value,time,seconds){if(sfxMode==='param-error')throw Error('AudioParam unavailable');assert(Number.isFinite(value));this.base=this.value;this.target={value,time,seconds};this.events.push({type:'target',value,time,seconds});}
  setValueAtTime(value,time){this.value=value;this.events.push({type:'value',value,time});}
 }
 class AudioNode{
  constructor(context){for(const key of ['gain','pan','frequency','Q','threshold','knee','ratio'])this[key]=new Param(context);context.nodes.push(this);}
  connect(){}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}
 }
 class Context{
  constructor(){if(sfxMode==='constructor-error')throw Error('Context unavailable');Object.assign(this,{state:'suspended',currentTime:0,sampleRate:200,nodes:[],destination:{}});contexts.push(this);}
  createGain(){return new AudioNode(this);}createDynamicsCompressor(){return new AudioNode(this);}createStereoPanner(){return new AudioNode(this);}createBufferSource(){return new AudioNode(this);}createBiquadFilter(){return new AudioNode(this);}createOscillator(){if(sfxMode==='build-error')throw Error('Oscillator unavailable');return new AudioNode(this);}createBuffer(c,length){return {getChannelData:()=>new Float32Array(length)};}
  async resume(){if(sfxMode==='blocked')throw Error('NotAllowedError');this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
 }
 class Sfx extends LunarSfx{constructor(options){super({...options,Context});effects.push(this);}}
 const world={updateFrame(value,options){frame=value;camera.view=value.view;updates.push({frame:value,options});},setView(value){viewCalls.push(value);camera.view=value;},getViewState(){return clone(camera);},restoreViewState(value){camera=clone(value);},resetView(){this.resets=(this.resets||0)+1;camera.position=[0,10,20];},inspect(){return {capacity:clone(capacity)};},get representation(){return capacity.tonnesPerSample;},setCapacity(value){capacity=clone(value);},dispose(){this.disposed=true;},orbit(value){camera={...camera,...clone(value)};viewListener?.();}};
 const requestAnimationFrame=fn=>{const id=++rafId;queued.set(id,fn);return id;},media=()=>({matches:reduced});
 const baseline={visibility:document.listenerCount('visibilitychange'),pagehide:window.listenerCount('pagehide'),pointerdown:document.listenerCount('pointerdown'),keydown:document.listenerCount('keydown')};
 const context={DEFAULTS,STAGES,simulate,sample,crossingYear,START,YEARS,POWER_PER_TONNE,lunarFrameAt,VOICES,LunarSfx:Sfx,TimelineClock:Clock,restoredPosition,Audio:AudioStub,document,window,URL,Intl,console:gpu?console:{error(){}},queueMicrotask,__LUNAR_CONTROLLER_TEST__:true,
  ResizeObserver:class{observe(){}disconnect(){this.disconnected=true;}},matchMedia:media,performance:{now:()=>now},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},requestAnimationFrame,cancelAnimationFrame:id=>queued.delete(id),createWorld(){throw Error('World should be injected');}};
 context.NotebookPlayer=vm.runInNewContext(`(()=>{${playerSource}\nreturn NotebookPlayer;})()`,context);
 const factory=vm.runInNewContext(`(()=>{${appSource}\nreturn createLunarController;})()`,context);
 const controller=factory({document,window,Player:context.NotebookPlayer,Sfx,requestFrame:requestAnimationFrame,cancelFrame:context.cancelAnimationFrame,now:()=>now,media,worldFactory(host,es,options){viewListener=options.onViewChange;if(!gpu)throw Error('WebGL unavailable');return world;}});
 function frames(count){for(let n=0;n<count;n++){now+=1000/60;contexts.forEach(c=>{c.currentTime+=1/60;});for(const audio of audios)if(!audio.paused){audio.currentTime=Math.min(audio.duration,audio.currentTime+audio.playbackRate/60);if(audio.currentTime>=audio.duration){audio.paused=true;audio.onended?.();}}const callbacks=[...queued.values()];queued.clear();callbacks.forEach(fn=>fn(now));}}
 return {controller,player:controller.player,world,document,window,storage,audios,contexts,effects,updates,viewCalls,pendingLoads,pendingPlays,pendingMetadata,objectUrls,frames,element:id=>{const value=document.getElementById(id);assert(value,`Native surface ${id} exists`);return value;},get frame(){return frame||controller.state.frame;},get state(){return controller.state;},get queuedFrames(){return queued.size;},setAudioMode:value=>audioMode=value,setSfxMode:value=>sfxMode=value,async flush(){for(let i=0;i<25;i++)await Promise.resolve();},dispose(){window.dispatch('pagehide',{persisted:false});assert.equal(document.listenerCount('visibilitychange'),baseline.visibility,'document visibility listeners return to baseline');assert.equal(window.listenerCount('pagehide'),baseline.pagehide,'window pagehide listeners return to baseline');assert.equal(document.listenerCount('pointerdown'),baseline.pointerdown);assert.equal(document.listenerCount('keydown'),baseline.keydown);assert.equal(queued.size,0,'controller and player RAFs are cancelled at disposal');}};
}

const saved=h=>JSON.parse(h.storage.get('atlas-notebook-v2:lunar'));
function footerAligned(h){const p=h.player;assert.equal(p.current.index,h.state.phase);near(p.current.progress,h.state.progress);assert.equal(p.root.querySelector('.ap-transcript p').textContent,VOICES[p.language][h.state.phase].text);assert.equal(h.element('chapter').textContent,`${String(h.state.phase+1).padStart(2,'0')} / 14`);}
function scrub(h,value){h.element('phase').value=String(value);h.element('phase').oninput();near(h.frame.progress,value);assert.equal(h.state.source,'manual');assert.equal(h.player.running,false);footerAligned(h);}
function month(h,value){h.element('time').value=String(value);h.element('time').oninput();near(h.state.month,value);assert.equal(h.frame.row.month,Math.floor(value));assert.equal(h.player.running,false);}
function viewButton(h,value){const button=h.document.querySelector(`[data-view="${value}"]`);assert(button);button.onclick();}
function setting(h,id,value){h.element(id).value=String(value);h.element(id).oninput();}
function checkbox(h,id,value){h.element(id).checked=value;h.element(id).onchange();}

let chapterChecks=0;
for(const lang of ['es','en']){
 const h=harness({lang});await h.flush();h.frames(1);const p=h.player;
 assert.equal(p.clock.timeline.length,14);assert.equal(p.root.querySelector('.ap-marks').children.length,14);assert.equal(h.document.querySelectorAll('.atlas-player').length,1);assert.equal(h.audios.filter(audio=>!audio.paused).length,1,'one actual native narration owns playback');
 assert.equal(h.effects.length,1);assert.equal(h.effects[0].ctx,undefined,'WebAudio waits for a gesture');assert.equal(p.clock.state,'playing');
 h.document.dispatch('pointerdown');await h.flush();h.frames(30);const fx=h.effects[0];assert.equal(fx.ctx.state,'running');assert(fx.master.gain.value>.09&&fx.master.gain.value<.11,'real SFX ramp remains below narration');assert(fx.master.gain.events.some(event=>event.type==='target'&&event.seconds===.04));
 p.pause();assert.equal(fx.master.gain.value,0);const paused=clone(h.frame);h.frames(120);same(h.frame,paused,'pause freezes the complete mission frame');
 checkbox(h,'voice',false);assert.equal(p.clock.audio.muted,true);assert.equal(saved(h).extra.voice,false);
 p.toggle();await h.flush();const before=h.state.progress;h.frames(10);assert(h.state.progress>before,'muted narration keeps one timeline');const ended=p.clock.audio;ended.currentTime=p.current.duration;ended.paused=true;ended.onended();h.frames(182);await h.flush();assert.equal(h.state.phase,1);assert.equal(p.clock.audio.mutedAtPlay,true,'future chapter audio is muted before native play');p.pause();
 for(let chapter=0;chapter<14;chapter++){
  p.root.querySelector('.ap-marks').children[chapter].onclick();await h.flush();assert.equal(h.state.phase,chapter);assert.equal(p.clock.audio.muted,true);assert.equal(h.element('lesson-title').textContent,STAGES[chapter].title[lang==='es'?0:1]);assert.equal(h.element('lesson').textContent,VOICES[lang].find(c=>c.id===STAGES[chapter].id).text,'visible reader contains the complete spoken script');assert.equal(h.element('lesson').lang,lang);
  const clip=p.clock.timeline[chapter];p.el('seek').oninput({target:{value:clip.start+clip.duration*.377}});await h.flush();near(h.frame.progress,.377);footerAligned(h);
  scrub(h,.731);await h.flush();const held=clone(h.frame);h.frames(60);same(h.frame,held,'manual fraction survives native metadata and RAF');chapterChecks++;
 }
 p.stage(5,false);scrub(h,.413);viewButton(h,'mission');h.world.orbit({position:[13,8,26],target:[1,7,0],orbit:{azimuth:.9,elevation:.28,radius:32}});const pose=h.world.getViewState(),resets=h.world.resets||0,calls=h.viewCalls.length;
 p.seek(p.current.start+p.current.duration*.52,false);await h.flush();same(h.world.getViewState(),pose,'actual player seek preserves orbit pose');assert.equal(h.world.resets||0,resets);assert.equal(h.viewCalls.length,calls,'same-stage seek does not issue a view reset');
 scrub(h,.413);const physical=clone(h.frame);p.el('language').onchange({target:{value:lang==='es'?'en':'es'}});await h.flush();same(h.frame,physical,'language changes voice while keeping the manual physical fraction');same(h.world.getViewState(),pose);assert.equal(h.element('lesson').textContent,VOICES[lang==='es'?'en':'es'][5].text,'reader follows the selected voice language');assert.equal(p.clock.audio.muted,true);footerAligned(h);
 month(h,123);const old=clone(h.state);p.changeLanguage(lang);await h.flush();near(h.state.month,123,'month 123 survives a real player language change');assert.equal(h.state.source,'manual');near(h.state.progress,old.progress);same(h.state.params,old.params);same(h.world.getViewState(),{...pose,view:'route'});
 p.el('play').onclick();await h.flush();assert.equal(h.state.source,'narration','footer Play deliberately returns ownership to narration');h.frames(5);assert.notEqual(h.state.month,123);assert(p.running);assert.equal(h.audios.filter(audio=>!audio.paused).length,1);footerAligned(h);p.pause();
 checkbox(h,'voice',true);assert.equal(p.clock.audio.muted,false);p.el('text').onclick();p.save();assert.equal(saved(h).extra.transcript,true);
 assert.match(h.document.querySelector('.metrics').textContent,lang==='es'?/MASA LOCAL INCORPORADA · ACUM\./:/LOCAL MASS INCORPORATED · CUMULATIVE/);assert.match(h.document.querySelector('.comparison').textContent,lang==='es'?/Masa local incorporada · últimos 12 meses/:/Local mass incorporated · past 12 months/);
 month(h,4.5);near(h.frame.row.earthOnly,100);near(h.frame.row.capital,100);const svg=h.element('chart'),capitalPath=svg.querySelector('[data-series="capital"]'),earthPath=svg.querySelector('[data-series="earthOnly"]'),cursor=h.element('chart-cursor'),dot=h.element('chart-dot');
 const points=path=>[...path.getAttribute('d').matchAll(/[MH]([\d.e+-]+)/g)].map(match=>Number(match[1]));const cursorX=Number(cursor.getAttribute('d').match(/^M([\d.e+-]+)/)[1]);near(Number(dot.getAttribute('cx')),cursorX);near(points(capitalPath).at(-1),cursorX);near(points(earthPath).at(-1),cursorX);near(Number(capitalPath.getAttribute('d').match(/V([\d.e+-]+)$/)[1]),Number(dot.getAttribute('cy')),'capacity marker lies on the completed monthly state');assert.equal(points(earthPath).length,5,'only completed monthly rows are plotted');assert(!/[LCQ]/.test(earthPath.getAttribute('d')),'deliveries are steps rather than fractional straight lines');
 const legacyRun=simulate(h.state.params),legacyEarth=(legacyRun.rows[3].earthOnly+legacyRun.rows[6].earthOnly)/2;near(legacyEarth,112.5,'former quarter-sample straight line incorrectly anticipated a delivery');assert.notEqual(legacyEarth,h.frame.row.earthOnly);
 const sameMonthSvg=svg.innerHTML;month(h,4.9);assert.equal(svg.innerHTML,sameMonthSvg,'fractional cursor remains at the completed row');month(h,6);assert(h.frame.row.earthOnly>100);near(points(svg.querySelector('[data-series="earthOnly"]')).at(-1),Number(h.element('chart-dot').getAttribute('cx')));
 h.element('play').onclick();h.frames(60);near(h.state.month,18,'growth play advances twelve months per second');assert.equal(h.state.source,'manual');assert.equal(h.player.running,false);assert(h.audios.every(audio=>audio.paused),'manual growth animation owns no narration');h.element('play').onclick();const growthHeld=clone(h.frame);h.frames(60);same(h.frame,growthHeld,'growth pause freezes the exact fractional month and operation frame');
 setting(h,'reinvest',0);month(h,120);near(h.frame.row.localIncorporated,0);assert.equal(h.element('made').textContent,'0');assert.equal(h.element('output').textContent,'0 t');
 h.dispose();assert(h.world.disposed);assert(h.audios.every(audio=>audio.paused));assert(fx.disposed);assert.equal(fx.ctx.state,'closed');assert(fx.sources.every(node=>node.stopped));assert(fx.nodes.every(node=>node.disconnected));h.frames(2);assert.equal(h.queuedFrames,0);assert.equal(h.objectUrls.size,0);
}

// The world supplies representation metadata. Test the controller's disclosure
// with a fixed external fact, rather than recreating instancing logic here.
for(const lang of ['es','en']){
 const h=harness({lang});await h.flush();h.player.pause();h.world.setCapacity({displayedCount:200,logicalCount:200,tonnesPerSample:100,aggregate:false});viewButton(h,'growth');setting(h,'doubling',6);setting(h,'flights',24);setting(h,'local',98);setting(h,'uptime',100);setting(h,'power',1000);month(h,240);near(h.frame.row.capital,20000);const caption=h.element('visual-scale').textContent;assert.match(caption,/\b200\b/);assert.match(caption,/\b256\b/);assert.match(caption,lang==='es'?/muestras/:/samples/);assert.match(caption,lang==='es'?/(?:hasta|≤)\s*100\s*t/:/(?:up to|≤)\s*100\s*t/);h.dispose();
}
for(const lang of ['es','en']){
 const h=harness({lang});await h.flush();h.player.stage(11,false);h.player.seek(h.player.current.start+h.player.current.duration*.377,false);await h.flush();checkbox(h,'auto-view',false);const heldMonth=h.state.month;for(const value of ['route','base','growth']){viewButton(h,value);assert.equal(h.state.phase,11);near(h.state.progress,.377);near(h.state.month,heldMonth);assert.equal(h.state.view,value);footerAligned(h);}viewButton(h,'mission');assert.equal(h.state.source,'manual');assert.equal(h.state.phase,0,'One delivery opens its first mission chapter from industrial time');near(h.state.progress,0);near(h.state.month,heldMonth,'choosing the illustrative mission preserves the manual growth month');assert.equal(h.state.view,'mission');assert(h.frame.mission);footerAligned(h);h.player.stage(11,false);await h.flush();assert.equal(h.state.autoView,false);assert.equal(h.state.source,'narration');assert.equal(h.state.view,STAGES[11].view,'industrial narration uses its compatible view even when automatic view changes are disabled');assert.equal(h.frame.mission,null);footerAligned(h);h.dispose();
 for(const source of ['manual','narration']){
  const extra={params:{...DEFAULTS},phase:11,progress:.377,month:123,source,view:'mission',autoView:false};const payload={version:2,language:lang,chapter:STAGES[11].id,offset:VOICES[lang][11].duration*.377,playing:false,extra};const restored=harness({lang,storage:new Map([['atlas-notebook-v2:lunar',JSON.stringify(payload)]])});await restored.flush();assert.equal(restored.state.source,source);assert.equal(restored.state.phase,11);near(restored.state.progress,.377);assert.equal(restored.state.view,STAGES[11].view,'incompatible saved mission/industrial state is normalized on reload');if(source==='manual')near(restored.state.month,123);else near(restored.state.month,STAGES[11].month+(STAGES[12].month-STAGES[11].month)*.377);footerAligned(restored);restored.dispose();
 }
}

// Construct saved state through production UI/capture and reload it in a fresh page.
for(const lang of ['es','en']){
 const storage=new Map(),first=harness({lang,storage});await first.flush();first.player.stage(5,false);scrub(first,.617);setting(first,'local',73);setting(first,'flightGrowth',10);checkbox(first,'auto-view',false);viewButton(first,'mission');checkbox(first,'ideal',true);checkbox(first,'voice',false);checkbox(first,'sfx-enabled',false);setting(first,'sfx-volume',41);first.player.el('text').onclick();first.world.orbit({position:[17.2,9.6,30.1],target:[1.4,6.3,.7],orbit:{azimuth:1.1,elevation:.39,radius:29}});first.player.save();const original=saved(first),pose=first.world.getViewState();first.dispose();
 const h=harness({lang:lang==='es'?'en':'es',storage});await h.flush();assert.equal(h.player.language,lang);assert.equal(h.state.source,'manual');assert.equal(h.state.view,'mission','manual mission view is restored rather than replaced by route');near(h.state.progress,.617);assert.equal(h.state.phase,5);near(h.state.month,original.extra.month);same(h.state.params,original.extra.params);assert.equal(h.state.autoView,false);same(h.world.getViewState(),pose,'camera restoration is the final pose');assert.equal(h.player.clock.audio.muted,true);assert.equal(h.element('voice').checked,false);assert.equal(h.effects[0].enabled,false);near(h.effects[0].volume,.41);assert.equal(h.element('ideal').checked,true);assert.equal(h.element('log').checked,true);assert.equal(h.player.root.querySelector('.ap-transcript').hidden,false);assert.equal(h.player.running,false);footerAligned(h);const held=clone(h.frame);h.frames(90);same(h.frame,held);h.dispose();
}

for(const lang of ['es','en']){
 const first=harness({lang});await first.flush();first.player.stage(12,false);first.player.seek(first.player.current.start+first.player.current.duration*.623,false);await first.flush();checkbox(first,'voice',false);first.world.orbit({position:[41,16,33],target:[0,2,0],orbit:{azimuth:.74,elevation:.48,radius:50}});first.player.save();const original=saved(first),storage=new Map(first.storage),physical=clone(first.frame),pose=first.world.getViewState();first.dispose();
 const h=harness({lang:lang==='es'?'en':'es',storage});await h.flush();assert.equal(h.state.source,'narration');near(h.state.progress,.623);near(h.state.month,physical.month);same(h.world.getViewState(),pose);assert.equal(h.player.clock.audio.muted,true);assert.equal(h.player.running,false);footerAligned(h);same(saved(h).extra.params,original.extra.params);h.dispose();
}
{
 const first=harness();await first.flush();checkbox(first,'voice',false);first.player.save();const storage=new Map(first.storage);assert.equal(saved(first).playing,true);near(saved(first).offset,0);first.dispose();const h=harness({storage});await h.flush();assert.equal(h.player.clock.state,'playing');assert.equal(h.player.clock.audio.mutedAtPlay,true,'saved mute applies before constructor autoplay at a chapter boundary');assert.equal(h.audios.filter(audio=>!audio.paused).length,1);h.dispose();
}

for(const mode of ['reject','throw','load-error']){
 const h=harness({audioMode:mode});await h.flush();if(mode==='load-error'){h.player.seek(h.player.current.start+3,true);await h.flush();assert.equal(h.player.clock.state,'error');}else assert.equal(h.player.clock.state,'blocked');assert.equal(h.player.running,false);const held=clone(h.frame);h.frames(60);same(h.frame,held,'blocked/unavailable native audio cannot advance scene time');h.setAudioMode('success');h.player.el('play').onclick();await h.flush();assert.equal(h.player.clock.state,'playing');assert.equal(h.audios.filter(audio=>!audio.paused).length,1);h.dispose();
}
for(const mode of ['slow-load','late-metadata']){
 const h=harness({audioMode:mode});await h.flush();h.player.pause();h.player.stage(5,false);scrub(h,.51);month(h,123);const held=clone(h.frame);h.player.changeLanguage('en');near(h.state.month,123);assert.equal(h.state.source,'manual');for(const item of h.pendingLoads.splice(0))item.resolve(item.src);await h.flush();for(const ready of h.pendingMetadata.splice(0))ready();await h.flush();h.frames(60);same(h.frame,held,'obsolete blob or metadata completions preserve the manual month/fraction');assert.equal(h.player.clock.state,'paused');h.dispose();
}
{
 const h=harness({audioMode:'delayed-play'});await h.flush();assert.equal(h.player.clock.state,'loading');h.player.pause();const held=clone(h.frame);for(const item of h.pendingPlays.splice(0))item.resolve();await h.flush();h.frames(30);same(h.frame,held,'late play completion cannot advance a paused timeline');assert(h.audios.every(audio=>audio.paused),'late native play completion must be silenced after pause');h.dispose();
}
{
 const h=harness();await h.flush();h.player.pause();h.setAudioMode('delayed-play');h.player.toggle();await h.flush();h.player.pause();const held=clone(h.frame);for(const item of h.pendingPlays.splice(0))item.resolve();await h.flush();h.frames(30);same(h.frame,held);assert(h.audios.every(audio=>audio.paused),'the reused native audio play promise is also silenced after pause');h.dispose();
}
{
 const h=harness({audioMode:'delayed-play'});await h.flush();checkbox(h,'voice',false);h.player.stage(2,true);h.player.changeLanguage('en');await h.flush();const plays=h.pendingPlays.splice(0);assert.equal(plays.length,3);for(const item of plays.slice(0,-1))item.resolve();await h.flush();assert(h.audios.every(audio=>audio.paused),'stale chapter and language play completions cannot start old audio');plays.at(-1).resolve();await h.flush();assert.equal(h.player.clock.state,'playing');assert.equal(h.audios.filter(audio=>!audio.paused).length,1);assert.equal(h.player.clock.audio.mutedAtPlay,true,'language replacement audio is muted before native play');assert.equal(h.state.phase,2);footerAligned(h);h.dispose();
}

for(const mode of ['constructor-error','build-error','blocked','param-error']){
 const h=harness({sfxMode:mode});await h.flush();h.document.dispatch('pointerdown');await h.flush();h.frames(20);assert.equal(h.player.clock.state,'playing');assert(h.updates.length>10,'SFX failure cannot stop the scene RAF');h.player.stage(5,false);scrub(h,.6);h.frames(20);near(h.frame.progress,.6);assert.equal(h.player.running,false);if(mode==='build-error'){assert.equal(h.effects[0].ctx,undefined,'a partial audio graph is never retained');assert(h.contexts.every(context=>context.state==='closed'));assert(h.contexts.flatMap(context=>context.nodes).every(node=>node.disconnected));assert(h.contexts.flatMap(context=>context.nodes).filter(node=>node.started).every(node=>node.stopped));}if(mode==='param-error')assert.equal(h.state.sfxFailed,true);h.dispose();assert(h.world.disposed);assert(h.audios.every(audio=>audio.paused));
}
{
 const h=harness();await h.flush();h.document.dispatch('pointerdown');await h.flush();h.frames(30);const fx=h.effects[0];assert(fx.channels.rumble.gain.gain.value>0);h.player.stage(5,true);assert.equal(fx.master.gain.value,0,'actual chapter seek immediately silences the previous engine');await h.flush();h.frames(30);near(fx.channels.rumble.gain.gain.value,0);h.player.pause();assert.equal(fx.master.gain.value,0);h.document.hidden=true;h.document.dispatch('visibilitychange');await h.flush();assert.equal(fx.ctx.state,'suspended');const held=clone(h.frame);h.frames(30);same(h.frame,held);h.document.hidden=false;h.document.dispatch('visibilitychange');await h.flush();assert.equal(h.player.running,false,'a user pause is preserved across page visibility');h.dispose();const count=h.updates.length;h.document.hidden=true;h.document.dispatch('visibilitychange');h.document.hidden=false;h.document.dispatch('visibilitychange');h.window.dispatch('pagehide',{persisted:false});await h.flush();h.frames(2);assert.equal(h.updates.length,count,'disposed native lifecycle handlers cannot render into a disposed world');assert(h.audios.every(audio=>audio.paused));assert.equal(h.queuedFrames,0);
}
{
 const h=harness({gpu:false,reduced:true});await h.flush();assert.equal(h.element('fit').disabled,true);assert.match(h.element('world').innerHTML,/3D no disponible/);h.player.stage(11,false);scrub(h,.42);month(h,123);assert(h.element('chart').querySelector('[data-series="capital"]'));assert(h.element('capital').textContent);footerAligned(h);h.dispose();assert(h.audios.every(audio=>audio.paused));
}
{
 const h=harness();await h.flush();assert.equal(h.player.clock.state,'playing');h.dispose();const count=h.updates.length;h.document.hidden=true;h.document.dispatch('visibilitychange');h.document.hidden=false;h.document.dispatch('visibilitychange');await h.flush();h.frames(2);assert.equal(h.updates.length,count,'visibility listeners cannot render after disposal while wanted playback remains true');assert(h.audios.every(audio=>audio.paused),'visibility listeners cannot create or resume narration after disposal');assert.equal(h.queuedFrames,0);
}

console.log(`Lunar controller: ${chapterChecks} bilingual chapter checks; actual player/clock/SFX, audio ownership/mute, pause/manual month+fraction, metadata races, restore/orbit, monthly SVG steps, labels, SFX failures and lifecycle: OK`);
console.log('Limits: DOM, native media and WebAudio surfaces are simulated; orbit persistence checks controller calls only. Browser layout, decoding, autoplay policy and real Three.js/GPU rendering require separate validation.');
