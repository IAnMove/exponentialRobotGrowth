import assert from 'node:assert/strict';
import {TimelineClock,makeTimeline,locate,restoredPosition} from './site-src/playback/timeline.js';
import {responsePlaylist} from './site-src/llms/playlist.js';
import {DEFAULTS} from './site-src/llms/model.js';
import {readFileSync} from 'node:fs';
const clips=[{id:'a',src:'a.mp3',duration:10},{id:'b',src:'b.mp3',duration:20},{id:'c',src:'c.mp3',duration:5}];
const timeline=makeTimeline(clips);assert.equal(timeline.at(-1).end,41);assert.equal(locate(timeline,12).inGap,true);assert.equal(locate(timeline,13).id,'b');assert.equal(restoredPosition({chapter:'b',offset:7.35},timeline),20.35);assert.equal(restoredPosition({chapter:'missing',offset:8},timeline),0);
class AudioStub{static all=[];constructor(src){this.src=src;this.currentTime=0;this.paused=true;AudioStub.all.push(this);}play(){if(this.block)return Promise.reject(Error('Autoplay blocked'));this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){if(this.src?.startsWith('blob:'))this.onloadedmetadata?.();}removeAttribute(){this.src='';}}
const sync=[],states=[],revoked=[];let loads=0;
const clock=new TimelineClock({clips,AudioClass:AudioStub,onSync:s=>sync.push(s),onState:s=>states.push(s),loadBlob:async src=>{loads++;return src;},urls:{createObjectURL:src=>'blob:'+src,revokeObjectURL:url=>revoked.push(url)}});
await clock.play();assert.equal(clock.state,'playing');clock.audio.currentTime=4.7;clock.tick(.1);assert.equal(clock.position,4.7);clock.pause();clock.audio.currentTime=8;clock.tick(.2);assert.equal(clock.position,4.7,'paused clock must not run');
await clock.seek(20.35,false);assert.equal(clock.current.id,'b');assert.equal(clock.audio.currentTime,7.350000000000001);assert.equal(clock.running,false);assert.equal(clock.audio.paused,true);assert.equal(loads,1);await clock.play();assert.equal(clock.state,'playing');
await clock.seek(21,true);assert.equal(loads,1,'repeated scrubbing reuses a single download');assert.equal(AudioStub.all.filter(a=>!a.paused).length,1,'one audio owner');
clock.audio.onended();assert.equal(clock.state,'gap');assert.equal(clock.current.id,'b');for(let i=0;i<11;i++)clock.tick(.25);assert.equal(clock.current.id,'b');clock.tick(.25);await Promise.resolve();assert.equal(clock.current.id,'c');assert.equal(clock.audio.src,'c.mp3');
clock.audio.onended();assert.equal(clock.state,'finished');assert.equal(clock.running,false);await clock.play();assert.equal(clock.current.id,'a');
await clock.seek(0,false);clock.audio.block=true;await clock.play();assert.equal(clock.state,'blocked');assert.equal(clock.running,false);clock.audio.block=false;await clock.play();assert.equal(clock.state,'playing');clock.dispose();assert(AudioStub.all.every(a=>a.paused));
// A slow seek may finish after a newer chapter has already started.
let resolve;const pending=new Promise(r=>resolve=r);const race=new TimelineClock({clips,AudioClass:AudioStub,loadBlob:()=>pending,urls:{createObjectURL:()=>{throw Error('stale seek must not allocate');},revokeObjectURL(){}}});const stale=race.seek(5,true);await race.seek(13,true);resolve({});await stale;assert.equal(race.current.id,'b');assert.equal(race.audio.src,'b.mp3');race.dispose();
// Resume while a blob is downloading must wait for its seek, not play from zero.
let loaded;const slow=new TimelineClock({clips,AudioClass:AudioStub,loadBlob:()=>new Promise(r=>loaded=r),urls:{createObjectURL:()=> 'blob:a',revokeObjectURL(){}}});const waiting=slow.seek(6,false);await slow.play();assert(slow.audio.paused);loaded({});await waiting;await Promise.resolve();assert.equal(slow.audio.currentTime,6);assert.equal(slow.state,'playing');slow.dispose();
const voices=JSON.parse(readFileSync('site-src/llms/voices.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const language of ['es','en']){const list=responsePlaylist(language,DEFAULTS,voices[language],Array.from({length:8},(_,i)=>String(i)));assert(list.at(-1).snapshot.done);assert.equal(new Set(list.map(c=>c.id)).size,list.length,'repeated token chapters need unique restore IDs');const saved={chapter:list.at(-2).id,offset:2};assert(restoredPosition(saved,makeTimeline(list))>makeTimeline(list)[8].start);assert.equal(list[0].snapshot.generated.length,0);assert(list.at(-1).snapshot.generated.length>0);}
console.log('Playback: exact seeking/resume, chapter gaps, autoplay denial, seek races, one audio owner, download reuse and reversible token histories: OK');
