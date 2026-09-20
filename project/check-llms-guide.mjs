import assert from 'node:assert/strict';
import {StepGuide,narrationId} from './site-src/llms/guide.js';
import {createRun,advance} from './site-src/llms/model.js';
import {readFileSync,statSync} from 'node:fs';
class FakeAudio {constructor(src){this.src=src;this.paused=true;}play(){this.paused=false;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}}
let index=0;
const guide=new StepGuide({AudioClass:FakeAudio,getClip:()=>({src:`${index}.mp3`,text:'Teaching narration.'}),onAdvance:()=>++index<3});
guide.resume();const first=guide.audio;
for(let i=0;i<1000;i++)guide.tick(.1);assert.equal(index,0,'Never advance while narration is speaking');
first.onended();for(let i=0;i<20;i++)guide.tick(.1);assert.equal(index,0,'Wait after narration');
guide.pause();const remaining=guide.remaining;guide.tick(20);assert.equal(guide.remaining,remaining);
guide.resume();for(let i=0;i<11;i++)guide.tick(.1);assert.equal(index,1);
const old=guide.audio,staleEnd=old.onended;guide.next();assert.equal(index,2);staleEnd();assert.equal(guide.state,'speaking','Stale audio cannot advance a replacement');
guide.automatic=false;guide.audio.onended();for(let i=0;i<40;i++)guide.tick(.1);assert.equal(index,2);assert.equal(guide.state,'ready');
guide.next();assert.equal(guide.state,'finished');
guide.stop();guide.enabled=false;guide.resume();assert.equal(guide.state,'reading');assert.equal(guide.audio,null);guide.pause();guide.resume();assert.equal(guide.state,'reading');
guide.stop();guide.enabled=true;guide.resume();guide.audio.onerror();assert.equal(guide.state,'error');guide.tick(100);assert.equal(index,3);
guide.stop();assert.equal(guide.audio,null);
let reject;class BlockedAudio extends FakeAudio{play(){return new Promise((resolve,r)=>{reject=r;});}}
const blocked=new StepGuide({AudioClass:BlockedAudio,getClip:()=>({src:'clip',text:'test'}),onAdvance:()=>{throw Error('must not advance');}});
blocked.resume();reject(Error('autoplay'));await Promise.resolve();assert.equal(blocked.state,'blocked');assert.equal(blocked.running,false);blocked.tick(999);
const catalog=JSON.parse(readFileSync('site-src/llms/voices.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const lang of ['es','en']){
  assert.equal(catalog[lang].length,13);assert.equal(new Set(catalog[lang].map(x=>x.id)).size,13);
  for(const clip of catalog[lang]){assert(clip.text.length>50);assert(clip.duration>3);assert(statSync('dist/audio/'+clip.file).size>1024);}
  const run=createRun(lang),ids=[];
  const full=new StepGuide({AudioClass:FakeAudio,getClip(){const id=narrationId(run);ids.push(id);const clip=catalog[lang].find(c=>c.id===id);assert(clip,id);return {...clip,src:clip.file};},onAdvance(){if(run.done)return false;advance(run);return true;}});
  full.resume();let safety=0;
  while(full.state!=='finished'&&safety++<200){const before=run.generated.length;full.tick(.2);assert.equal(run.generated.length,before);full.audio.onended();for(let i=0;i<31;i++)full.tick(.1);assert(run.generated.length-before<=1);}
  assert.equal(full.state,'finished');assert.equal(run.generated.join(''),run.data.completions[run.chosen]);assert.equal(ids.at(-1),'done');assert(ids.includes('loop-feedback'));assert.equal(ids.filter(x=>x==='feedback').length,1);
}
console.log('LLM guide: 26 clips, complete bilingual generation, audio gates, delay, pause/resume, manual mode, stale events and errors: OK');

