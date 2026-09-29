import {sampleEvolution} from './site-src/journeys/evolution-model.js';
import {sampleCarbon,FLUXES,RESERVOIRS} from './site-src/journeys/carbon-model.js';
import {playerFixture} from './check-player-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt,walk} from './site-src/journeys/common.js';
import {StepGuide} from './site-src/llms/guide.js';
const source=readFileSync('site-src/journeys/app.js','utf8').replace(/^import .*;$/gm,'');
for(const lang of ['es','en'])for(const mode of ['web','immersive'])for(const [id,lesson] of Object.entries(LESSONS)){
 const elements=new Map(),events={},frames=[],audios=[];let now=0,current,phase,pose,redirect,notebook,sceneTime,inspect,orbitState,savedForReload=null;
 const element=id=>{if(!elements.has(id))elements.set(id,{id,checked:false,dataset:{},style:{},value:'',classList:{toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(){},setPointerCapture(){},append(){}});return elements.get(id);};
 const stops=lesson.steps.map((s,i)=>({...element('stop-'+i),dataset:{stop:String(i)}})),controls=lesson.controls.map(c=>({...element('control-'+c.id),dataset:{control:c.id},value:c.value,checked:c.value})),moves=['forward','left','right','back'].map(move=>({...element(move),dataset:{move}}));
 const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:element,querySelectorAll:s=>s==='[data-stop]'?stops:s==='[data-control]'?controls:moves,addEventListener(name,fn){events['document:'+name]=fn;}};
 class AudioStub{constructor(){audios.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){}removeAttribute(){}load(){}}
 class Guide extends StepGuide{constructor(o){super({...o,AudioClass:AudioStub});}}
 const VOICES={[id]:Object.fromEntries(['es','en'].map((l,i)=>[l,lesson.steps.map((s,j)=>({id:'step-'+j,text:s.text[i],src:'fixture.mp3',duration:10}))]))};
 const Player=playerFixture(lang,p=>notebook=p);class NotebookFixture extends Player{
  constructor(options){if(savedForReload&&id==='evolution')options.restore(savedForReload);super(options);}
  pause(){super.pause();if(this.current)this.options.onSync({...this.current,running:false,reason:'pause'});}
  save(){if(id==='evolution')savedForReload=JSON.parse(JSON.stringify(this.options.capture()));}
 }
 const ctx={sampleEvolution,sampleCarbon,FLUXES,RESERVOIRS,NotebookPlayer:NotebookFixture,LESSONS,defaults,poseAt,walk,StepGuide:Guide,VOICES,document,window:{addEventListener(n,f){events[n]=f;}},console,URLSearchParams,Intl,performance:{now:()=>now},matchMedia:()=>({matches:false}),location:{search:`?topic=${id}&mode=${mode}`,replace(url){redirect=url;}},requestAnimationFrame:f=>frames.push(f),createWorld:(host,lesson,es,fn)=>(inspect=fn,{canvas:element('canvas'),update(s,i){current=s;phase=i;},render(p,dt,animation,orbit,mode,time){pose={...p};sceneTime=time;orbitState={...orbit};},dispose(){}})};
 vm.runInNewContext(source,ctx);
 if(id==='internet'&&mode==='immersive'){assert.equal(redirect,'./internet-voyage.html');assert.equal(frames.length,0,'legacy gallery must not start behind redirect');continue;}
 const advance=n=>{for(let i=0;i<n;i++){now+=1000/60;frames.shift()(now);}};
 if(lesson.continuous){advance(1);const initialDistance=orbitState.distance;element('zoom-in').onclick();advance(1);assert(orbitState.distance<initialDistance,'zoom button moves the camera closer');element('fit-network').onclick();advance(1);assert.equal(orbitState.distance,initialDistance,'fit restores the overview');}assert.equal(phase,0);assert(element('app').innerHTML.includes(`pieza=${id}`));
 element('timeline').oninput({target:{value:String(lesson.horizon)}});assert.equal(+element('timeline').value,lesson.horizon);
 assert.equal(JSON.stringify(current.metrics),JSON.stringify(lesson.evaluate(defaults(lesson),lesson.horizon).metrics));
 element('reset').onclick();assert.equal(+element('timeline').value,0);
 element('step').onclick();assert.equal(+element('timeline').value,1);
 element('play').onclick();advance(50);assert(+element('timeline').value>1);if(mode==='immersive')events.blur();else{document.hidden=true;events['document:visibilitychange']();document.hidden=false;}const paused=+element('timeline').value;advance(80);assert.equal(+element('timeline').value,paused);
 if(mode==='web'||lesson.continuous){for(let i=0;i<4;i++){notebook.stage(i,false);assert.equal(phase,i);notebook.seek(notebook.clock.timeline[i].start+5,false);assert.equal(+element('timeline').value,Math.floor(lesson.narrationTime?lesson.narrationTime(defaults(lesson),i,.5,lang):(i+.5)/4*lesson.horizon));}stops[1].onclick();assert.equal(phase,1);notebook.changeLanguage(lang==='es'?'en':'es');assert.equal(element('language').value,lang==='es'?'en':'es');if(lesson.continuous){const edge=notebook.clock.timeline[2];notebook.seek(edge.start+edge.duration-1e-9,false);advance(1);assert.equal(id==='carbon'?current.interval:current.t,Math.floor(sceneTime),'counters must not announce arrivals before their packets reach the next round');notebook.seek(notebook.clock.timeline[2].start+8,false);const before=+element('timeline').value;element('step').onclick();advance(70);assert.equal(+element('timeline').value,Math.min(lesson.horizon,before+1),'paused narration must not overwrite manual step');assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'rendered messages must match the manual round');notebook.options.onSync({...notebook.current,running:false,reason:'tick'});advance(1);assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'late audio errors cannot overwrite a manual experiment');notebook.changeLanguage('en');advance(1);assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'language changes preserve the manual experiment');element('reset').onclick();element('play').onclick();advance(20);const partial=sceneTime;element('play').onclick();advance(10);assert.equal(sceneTime,partial,'pause freezes messages inside a round');if(mode==='immersive'){notebook.stage(1,true);const initial=lesson.poseAt(1);events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});advance(25);events.keyup({code:'KeyW'});assert(pose.z<initial.z,'visitor walks into the actual exhibit');assert.equal(notebook.running,false,'walking pauses the narrated simulation');const beforePose={...pose};inspect({chapter:3});advance(1);assert.equal(phase,3);assert.deepEqual(pose,beforePose,'a physical listening button preserves the visitor position');}}if(id==='evolution'){
   // A discontinuous generation must remain the completed one while the next
   // generation is being copied. Seek to the actual end of the mutation stage.
   const edge=notebook.clock.timeline[2];notebook.seek(edge.start+edge.duration-1e-9,false);advance(1);
   assert.equal(current.t,0);assert.equal(current.countA,25);assert.equal(current.frequency,.5);assert.equal(element('evolution-result').textContent,'25 A / 50','HUD retains the completed population while copies are forming');
   notebook.seek(edge.start+edge.duration,false);advance(1);assert.equal(current.t,1);assert.equal(element('evolution-result').textContent,`${current.countA} A / 50`);
   const input=(name,value)=>{const el=controls.find(c=>c.dataset.control===name);if(typeof value==='boolean')el.checked=value;else el.value=value;el.oninput();};
   input('drift',false);input('advantage',-.25);input('seed',17);
   element('timeline').oninput({target:{value:'7'}});advance(1);
   assert.equal(current.countA,null,'infinite-population expectation has no rounded individual count');assert.equal(current.cohort,null);assert.equal(current.events.length,0);assert(element('evolution-result').textContent.endsWith(' % A'),'deterministic result uses a proportion');assert(!element('evolution-result').textContent.includes('/ 50'));
   element('play').onclick();advance(20);element('play').onclick();advance(10);
   const partial=sceneTime;assert(partial>7&&partial<8,'manual simulation retains a fractional generation');
   const frequency=current.frequency;assert.equal(current.t,7);assert.equal(frequency,lesson.evaluate({advantage:-.25,mutation:.01,drift:false,seed:17},7).frequency);
   notebook.changeLanguage(notebook.language==='es'?'en':'es');advance(1);
   assert.equal(sceneTime,partial,'changing voice language preserves the fractional generation');assert.equal(current.frequency,frequency);
   notebook.save();assert.equal(savedForReload.experiment.round,partial);assert.equal(savedForReload.params.seed,17);
   // Re-execute the real app in a fresh VM, with the same persisted capture.
   // The fixture only supplies storage; restoration and time ownership are app code.
   frames.length=0;elements.clear();now=0;notebook=undefined;current=undefined;
   vm.runInNewContext(source,{...ctx});advance(1);
   assert.equal(sceneTime,partial,'reload restores exact fractional manual position');assert.equal(current.t,7);assert.equal(current.frequency,frequency);
   assert.equal(controls.find(c=>c.dataset.control==='seed').value,17);assert.equal(controls.find(c=>c.dataset.control==='advantage').value,-.25);assert.equal(controls.find(c=>c.dataset.control==='drift').checked,false);
   advance(80);assert.equal(sceneTime,partial,'restored manual experiment stays paused');
  }
  events.pagehide({persisted:false});continue;}
 element('instant').checked=true;element('guide').onclick();assert.equal(audios.length,1);advance(210);assert.equal(phase,0,'a long audio never advances on a guessed duration');
 for(let i=0;i<4;i++){assert.equal(phase,i);audios.at(-1).onended();advance(120);assert.equal(phase,i,'observe for three seconds after audio');advance(65);}
 assert.equal(phase,3);assert.match(element('voice-state').textContent,/completo|complete/);
 stops[1].onclick();assert.equal(phase,1);assert.equal(audios.length,5);
 if(mode==='immersive'){const initial=poseAt(1);events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});advance(25);events.keyup({code:'KeyW'});assert(pose.x<initial.x,'walk uses camera forward');assert.match(element('voice-state').textContent,/pausa|Paused/);}
 events.pagehide({persisted:false});
}
console.log('30 lesson/language/mode combinations and two Internet redirects: controls, metrics, global timeline scrubbing, fractional Evolution seek/pause/language/reload, honest deterministic counts, audio-ended immersive tours, walking interruption and cleanup: OK');
