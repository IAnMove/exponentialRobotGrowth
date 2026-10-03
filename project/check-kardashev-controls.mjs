import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import * as model from './site-src/kardashev/model.js';
import {kardashevFrameAt} from './site-src/kardashev/presentation.js';
import {advanceScene} from './site-src/kardashev/motion.js';
import {TimelineClock,restoredPosition} from './site-src/playback/timeline.js';
const strip=source=>source.replace(/^import .*;$/gm,'');
const playerSource=strip(readFileSync('site-src/playback/player.js','utf8')).replace('export class NotebookPlayer','class NotebookPlayer').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/player.js'));
const source=strip(readFileSync('site-src/kardashev/app.js','utf8')).replace('export function createKardashevController','function createKardashevController');
const clone=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
export function kardashevHarness({lang='es',storage=new Map(),audioMode='success',reduced=false}={}){
 const voicesSource=readFileSync('site-src/kardashev/voices.js','utf8'),VOICES=JSON.parse(voicesSource.split('export const VOICES = ')[1].split(/;\r?\n/)[0]);for(const [language,clips]of Object.entries(VOICES))for(const c of clips)c.src=`fixture://${language}/${c.id}`;
 const ids=new Map(),audios=[],queued=new Map(),pendingLoads=[],pendingPlays=[],pendingMetadata=[],objectUrls=new Set();let now=0,rafId=0,frame,camera={version:1,view:'planet',yaw:.3,pitch:.1,distance:30,views:{}};
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

 class AudioStub{constructor(src){Object.assign(this,{src,currentTime:0,playbackRate:1,muted:false,paused:true,duration:Object.values(VOICES).flat().find(c=>c.src===src)?.duration||60});audios.push(this);}play(){this.mutedAtPlay=this.muted;if(audioMode==='blocked')return Promise.reject(Error('NotAllowedError'));if(audioMode==='deferred')return new Promise((resolve,reject)=>pendingPlays.push({audio:this,resolve:()=>{this.paused=false;this.onplaying?.();resolve();},reject}));this.paused=false;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){if(this.src.startsWith('blob:')){if(audioMode==='metadata')pendingMetadata.push(()=>this.onloadedmetadata?.());else queueMicrotask(()=>this.onloadedmetadata?.());}}}
 const urls={createObjectURL:src=>{const url='blob:'+src;objectUrls.add(url);return url;},revokeObjectURL:url=>objectUrls.delete(url)},loadBlob=src=>audioMode==='blob'?new Promise((resolve,reject)=>pendingLoads.push({src,resolve,reject})):audioMode==='error'?Promise.reject(Error('audio unavailable')):Promise.resolve(src);
 class Clock extends TimelineClock{constructor(o){super({...o,AudioClass:o.AudioClass||AudioStub,loadBlob,urls});}}

 const canvas=element('canvas');
 const world={canvas,renderFrame(value){frame=value;this.renders=(this.renders||0)+1;},getViewState(){return clone(camera);},restoreViewState(value){camera=clone(value);this.restores=(this.restores||0)+1;},orbit(value){camera={...camera,...value};this.onViewChange?.();},fit(){camera={...camera,yaw:0,pitch:0,distance:30};this.onViewChange?.();},zoomBy(value){camera.distance/=value;this.onViewChange?.();},inspect(){return {frame,camera:clone(camera)};},dispose(){this.disposed=true;}};
 const requestAnimationFrame=fn=>{const id=++rafId;queued.set(id,fn);return id;},media=()=>({matches:reduced});
 const context={...model,kardashevFrameAt,advanceScene,VOICES,TimelineClock:Clock,restoredPosition,Audio:AudioStub,document,window,URL,Intl,console,queueMicrotask,__KARDASHEV_CONTROLLER_TEST__:true,
  ResizeObserver:class{observe(){}disconnect(){}},matchMedia:media,performance:{now:()=>now},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame,cancelAnimationFrame:id=>queued.delete(id),createWorld(host,options){world.onViewChange=options.onViewChange;options.onAsset('satellite',true);options.onAsset('earth',true);return world;}};
 context.NotebookPlayer=vm.runInNewContext(`(()=>{${playerSource};return NotebookPlayer;})()`,context);
 const factory=vm.runInNewContext(`(()=>{${source};return createKardashevController;})()`,context);
 const controller=factory({document,window,AudioClass:AudioStub,Player:context.NotebookPlayer,worldFactory:context.createWorld,requestFrame:requestAnimationFrame,cancelFrame:context.cancelAnimationFrame,now:()=>now,media});
 function frames(count){for(let n=0;n<count;n++){now+=1000/60;for(const a of audios)if(!a.paused){a.currentTime=Math.min(a.duration,a.currentTime+1/60);if(a.currentTime>=a.duration){a.paused=true;a.onended?.();}}const callbacks=[...queued.values()];queued.clear();callbacks.forEach(fn=>fn(now));}}
 return {controller,player:controller.player,world,document,window,storage,audios,pendingLoads,pendingPlays,pendingMetadata,frames,get state(){return controller.state;},get queued(){return queued.size;},element:id=>{const e=document.getElementById(id);assert(e,`surface ${id}`);return e;},async flush(){for(let i=0;i<30;i++)await Promise.resolve();},dispose(){controller.dispose();assert(audios.every(a=>a.paused),'native media stops at disposal');assert.equal(queued.size,0,'both real player and page animation cancel');}};
}
async function checks(){
 for(const lang of ['es','en']){
  const h=kardashevHarness({lang});await h.flush();assert.equal(h.document.querySelectorAll('.atlas-player').length,1);assert.equal(h.document.querySelectorAll('.voice-panel').length,0);
  h.controller.setK(2.4);h.element('linear').onclick();h.element('speed').onchange({target:{value:'4'}});h.element('growth').oninput({target:{value:'3.5'}});h.world.orbit({yaw:1.1,pitch:.4,distance:23});h.element('motion').onclick();h.element('voice-enabled').checked=false;h.element('voice-enabled').onchange();h.player.el('text').onclick();
  h.player.changeLanguage(lang==='es'?'en':'es');await h.flush();near(h.state.state.k,2.4);assert.equal(h.state.source,'manual');assert.equal(h.state.chartMode,'linear');assert.equal(h.state.speed,4);assert.match(h.element('lesson-title').textContent,lang==='es'?/Camino al tipo III/:/Toward Type III/);near(h.state.frame.fractionOfNext,1e-6);assert.equal(h.state.frame.samples.representsPowerFraction,false);
  h.player.onSync({...h.player.current,index:0,progress:.9});near(h.state.state.k,2.4);h.player.save();const saved=clone(h.controller.capture());const restored=kardashevHarness({lang,storage:h.storage});await restored.flush();near(restored.state.state.k,2.4);assert.equal(restored.state.source,'manual');assert.equal(restored.state.chartMode,'linear');assert.equal(restored.state.speed,4);assert.equal(restored.state.growth,3.5);assert.equal(restored.state.sceneMoving,false);assert.equal(restored.state.voice,false);assert.deepEqual(clone(restored.world.getViewState()),saved.camera);assert.equal(restored.player.root.querySelector('.ap-transcript').hidden,false);near(restored.state.state.motion,saved.motion);restored.dispose();
  h.element('play').onclick();near(h.state.state.k,2.4);h.frames(10);assert(h.state.state.k>2.4);assert.equal(h.player.running,false);const growing=h.state.state.k;h.player.changeLanguage(lang);await h.flush();near(h.state.state.k,growing);assert.equal(h.state.state.playing,true);h.element('play').onclick();const held=h.state.state.k;h.frames(10);near(h.state.state.k,held);
  h.player.stage(2,false);near(h.state.state.k,2);assert.equal(h.state.source,'narration');h.player.toggle();await h.flush();const running=h.player.running,motion=h.state.state.motion;h.frames(10);near(h.state.state.motion,motion);assert.equal(h.player.running,running,'motion pause does not toggle narration');h.element('motion').onclick();h.frames(10);assert(h.state.state.motion>motion);
  h.controller.setK(1.675);assert.match(h.element('lesson-title').textContent,lang==='es'?/Camino al tipo II/:/Toward Type II/);h.element('inspect').onclick();const parts=h.document.querySelectorAll('[data-part]');parts.find(b=>b.dataset.part==='antenna').onclick();assert.equal(h.state.highlight,'antenna');h.player.changeLanguage(lang);await h.flush();assert.equal(h.state.inspect,true);assert.equal(h.state.highlight,'antenna');near(h.state.state.k,1.675);h.player.save();const inspected=kardashevHarness({lang,storage:h.storage});await inspected.flush();assert.equal(inspected.state.inspect,true);assert.equal(inspected.state.highlight,'antenna');near(inspected.state.state.k,1.675);inspected.dispose();
  h.element('inspect').onclick();near(h.state.state.k,1.675);h.window.dispatch('pagehide',{persisted:true});assert.equal(h.world.disposed,undefined);assert.equal(h.player.running,false);h.dispose();const renders=h.world.renders;h.frames(3);h.document.hidden=true;h.document.dispatch('visibilitychange');h.window.dispatch('pagehide',{});assert.equal(h.world.renders,renders);assert.equal(h.document.listenerCount('visibilitychange'),0);assert.equal(h.window.listenerCount('pagehide'),0);
 }
 for(const mode of ['deferred','metadata','blob','blocked','error']){
  const h=kardashevHarness({audioMode:mode});await h.flush();h.player.seek(h.player.clock.timeline[2].start+10,true);await h.flush();h.controller.setK(2.4);for(const load of h.pendingLoads.splice(0))load.resolve(load.src);await h.flush();for(const metadata of h.pendingMetadata.splice(0))metadata();for(const play of h.pendingPlays.splice(0))play.resolve();await h.flush();h.frames(10);near(h.state.state.k,2.4);assert.equal(h.state.source,'manual');assert.equal(h.player.running,false);assert(h.audios.every(a=>a.paused));h.dispose();
 }
 const base=kardashevHarness();await base.flush();base.element('voice-enabled').checked=false;base.element('voice-enabled').onchange();base.player.save();const muted=kardashevHarness({storage:base.storage});await muted.flush();assert(muted.audios.every(a=>a.mutedAtPlay===true),'saved mute applies before initial native play');muted.frames(2);assert(muted.player.current.progress>0,'muted narration continues its clock');muted.player.changeLanguage('en');await muted.flush();assert.equal(muted.player.clock.audio.mutedAtPlay,true);base.dispose();muted.dispose();
 const reduced=kardashevHarness({reduced:true});await reduced.flush();reduced.frames(10);assert.equal(reduced.state.sceneMoving,false);near(reduced.state.frame.motion,0);reduced.dispose();
 console.log('Kardashev controls: real NotebookPlayer/TimelineClock; ES/EN manual K, growth, scene pause, camera/options/inspection/text restore, delayed media, pre-play mute and lifecycle: OK');
 console.log('Limits: DOM/native media and GPU renderer are simulated; Chrome geometry, decode and autoplay are separate QA.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await checks();
