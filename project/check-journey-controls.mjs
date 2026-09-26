import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt,walk} from './site-src/journeys/common.js';
import {StepGuide} from './site-src/llms/guide.js';
const source=readFileSync('site-src/journeys/app.js','utf8').replace(/^import .*;$/gm,'');
for(const lang of ['es','en'])for(const mode of ['web','immersive'])for(const [id,lesson] of Object.entries(LESSONS)){
 const elements=new Map(),events={},frames=[],audios=[];let now=0,current,phase,pose;
 const element=id=>{if(!elements.has(id))elements.set(id,{id,checked:false,dataset:{},style:{},value:'',classList:{toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(){},setPointerCapture(){},append(){}});return elements.get(id);};
 const stops=lesson.steps.map((s,i)=>({...element('stop-'+i),dataset:{stop:String(i)}})),controls=lesson.controls.map(c=>({...element('control-'+c.id),dataset:{control:c.id},value:c.value,checked:c.value})),moves=['forward','left','right','back'].map(move=>({...element(move),dataset:{move}}));
 const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:element,querySelectorAll:s=>s==='[data-stop]'?stops:s==='[data-control]'?controls:moves,addEventListener(name,fn){events['document:'+name]=fn;}};
 class AudioStub{constructor(){audios.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){}removeAttribute(){}load(){}}
 class Guide extends StepGuide{constructor(o){super({...o,AudioClass:AudioStub});}}
 const VOICES={[id]:Object.fromEntries(['es','en'].map((l,i)=>[l,lesson.steps.map((s,j)=>({id:'step-'+j,text:s.text[i],src:'fixture.mp3',duration:10}))]))};
 const ctx={LESSONS,defaults,poseAt,walk,StepGuide:Guide,VOICES,document,window:{addEventListener(n,f){events[n]=f;}},console,URLSearchParams,Intl,performance:{now:()=>now},matchMedia:()=>({matches:false}),location:{search:`?topic=${id}&mode=${mode}`},requestAnimationFrame:f=>frames.push(f),createWorld:()=>({canvas:element('canvas'),update(s,i){current=s;phase=i;},render(p){pose={...p};},dispose(){}})};
 vm.runInNewContext(source,ctx);
 const advance=n=>{for(let i=0;i<n;i++){now+=1000/60;frames.shift()(now);}};
 assert.equal(phase,0);assert(element('app').innerHTML.includes(`pieza=${id}`));
 element('timeline').oninput({target:{value:String(lesson.horizon)}});assert.equal(+element('timeline').value,lesson.horizon);
 assert.equal(JSON.stringify(current.metrics),JSON.stringify(lesson.evaluate(defaults(lesson),lesson.horizon).metrics));
 element('reset').onclick();assert.equal(+element('timeline').value,0);
 element('step').onclick();assert.equal(+element('timeline').value,1);
 element('play').onclick();advance(50);assert(+element('timeline').value>1);events.blur();const paused=+element('timeline').value;advance(80);assert.equal(+element('timeline').value,paused);
 element('instant').checked=true;element('guide').onclick();assert.equal(audios.length,1);advance(210);assert.equal(phase,0,'a long audio never advances on a guessed duration');
 for(let i=0;i<4;i++){assert.equal(phase,i);audios.at(-1).onended();advance(120);assert.equal(phase,i,'observe for three seconds after audio');advance(65);}
 assert.equal(phase,3);assert.match(element('voice-state').textContent,/completo|complete/);
 stops[1].onclick();assert.equal(phase,1);assert.equal(audios.length,5);
 if(mode==='immersive'){const initial=poseAt(1);events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});advance(25);events.keyup({code:'KeyW'});assert(pose.x<initial.x,'walk uses camera forward');assert.match(element('voice-state').textContent,/pausa|Paused/);}
 events.pagehide({persisted:false});
}
console.log('32 lesson/language/mode combinations: controls, metric updates, experiment pause, four-stage audio-ended tour with 3 s gap, walking interruption and cleanup: OK');
