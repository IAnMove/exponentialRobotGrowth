import {NotebookPlayer} from './site-src/playback/player.js';
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
const pausedGap=new TimelineClock({clips,AudioClass:AudioStub});await pausedGap.seek(11,false);assert.equal(pausedGap.state,'paused','a restored observation gap must not promise automatic playback while paused');pausedGap.tick(.25);assert.equal(pausedGap.position,11);await pausedGap.play();assert.equal(pausedGap.state,'gap');pausedGap.tick(.25);assert.equal(pausedGap.position,11.25);pausedGap.dispose();
// A slow seek may finish after a newer chapter has already started.
let resolve;const pending=new Promise(r=>resolve=r);const race=new TimelineClock({clips,AudioClass:AudioStub,loadBlob:()=>pending,urls:{createObjectURL:()=>{throw Error('stale seek must not allocate');},revokeObjectURL(){}}});const stale=race.seek(5,true);await race.seek(13,true);resolve({});await stale;assert.equal(race.current.id,'b');assert.equal(race.audio.src,'b.mp3');race.dispose();
// Resume while a blob is downloading must wait for its seek, not play from zero.
let loaded;const slow=new TimelineClock({clips,AudioClass:AudioStub,loadBlob:()=>new Promise(r=>loaded=r),urls:{createObjectURL:()=> 'blob:a',revokeObjectURL(){}}});const waiting=slow.seek(6,false);await slow.play();assert(slow.audio.paused);loaded({});await waiting;await Promise.resolve();assert.equal(slow.audio.currentTime,6);assert.equal(slow.state,'playing');slow.dispose();
// Native play promises can settle after pause, a different seek, or disposal.
// They must never revive stale media or replace a deliberate pause with blocked.
class DeferredAudio extends AudioStub{play(){return new Promise((resolve,reject)=>{this.finish=()=>{this.paused=false;resolve();};this.fail=()=>reject(Error('AbortError'));});}}
for(const reuse of [false,true]){const deferred=new TimelineClock({clips,AudioClass:DeferredAudio});if(reuse)await deferred.seek(0,false);const started=reuse?deferred.play():deferred.seek(0,true),audio=deferred.audio;deferred.pause();audio.finish();await started;assert.equal(audio.paused,true,'late native start is stopped after pause');assert.equal(deferred.state,'paused');assert.equal(deferred.running,false);deferred.dispose();}
const aborted=new TimelineClock({clips,AudioClass:DeferredAudio}),abortPlay=aborted.seek(0,true),abortAudio=aborted.audio;aborted.pause();abortAudio.fail();await abortPlay;assert.equal(aborted.state,'paused','late AbortError does not replace intentional pause with blocked');aborted.dispose();
// Native attempts on the same media can settle out of order after pause/resume.
class OrderedAudio extends AudioStub{constructor(src){super(src);this.attempts=[];}play(){return new Promise((resolve,reject)=>this.attempts.push({resolve:()=>{this.paused=false;resolve();},reject}));}}
for(const initialSeek of [false,true]){const resumed=new TimelineClock({clips,AudioClass:OrderedAudio});if(!initialSeek)await resumed.seek(0,false);const old=initialSeek?resumed.seek(0,true):resumed.play(),audio=resumed.audio,first=audio.attempts[0];resumed.pause();const current=resumed.play(),second=audio.attempts[1];second.resolve();await current;first.reject(Error('AbortError from superseded play'));await old;assert.equal(resumed.state,'playing','obsolete rejection cannot block the newer successful resume');assert.equal(resumed.running,true);assert.equal(audio.paused,false);resumed.dispose();}
const ordered=new TimelineClock({clips,AudioClass:OrderedAudio});await ordered.seek(0,false);const earlier=ordered.play(),same=ordered.audio,earlierAttempt=same.attempts[0];ordered.pause();const latest=ordered.play(),latestAttempt=same.attempts[1];earlierAttempt.resolve();await earlier;assert.equal(ordered.state,'loading','obsolete fulfillment cannot announce readiness for the newer pending attempt');latestAttempt.resolve();await latest;assert.equal(ordered.state,'playing');assert.equal(same.paused,false);ordered.dispose();
const switched=new TimelineClock({clips,AudioClass:DeferredAudio}),oldPlay=switched.seek(0,true),oldAudio=switched.audio,newPlay=switched.seek(13,true),newAudio=switched.audio;newAudio.finish();await newPlay;oldAudio.finish();await oldPlay;assert.equal(oldAudio.paused,true,'obsolete fulfillment stops its captured media');assert.equal(newAudio.paused,false,'obsolete fulfillment cannot stop the newer owner');assert.equal(switched.current.id,'b');assert.equal(switched.state,'playing');switched.dispose();
const disposedNative=new TimelineClock({clips,AudioClass:DeferredAudio}),disposePlay=disposedNative.seek(0,true),disposeAudio=disposedNative.audio;disposedNative.dispose();disposeAudio.finish();await disposePlay;assert.equal(disposeAudio.paused,true,'late native start cannot outlive disposal');
const disposedEvents=[],closed=new TimelineClock({clips,AudioClass:AudioStub,onSync:()=>disposedEvents.push('sync'),onState:()=>disposedEvents.push('state')});await closed.play();closed.dispose();const closedPosition=closed.position,closedAudioCount=AudioStub.all.length,closedEventCount=disposedEvents.length;await closed.play();await closed.seek(13,true);closed.pause();closed.tick(.25);closed.notify();closed.status('playing');closed.dispose();assert.equal(closed.audio,null,'a disposed clock cannot reacquire media');assert.equal(AudioStub.all.length,closedAudioCount,'visibility callbacks cannot revive disposed narration');assert.equal(closed.position,closedPosition);assert.equal(closed.running,false);assert.equal(closed.state,'paused');assert.equal(disposedEvents.length,closedEventCount,'disposed callbacks cannot paint removed UI');
// Exercise the real NotebookPlayer language transition with the real clock.
// Narration maps by fractional progress; its following observation maps by seconds.
let languageCases=0;
for(const languageClips of [{es:clips,en:[{id:'a',src:'en-a.mp3',duration:6},{id:'b',src:'en-b.mp3',duration:27},{id:'c',src:'en-c.mp3',duration:9}]},{es:clips.map((c,i)=>({...c,duration:c.duration+[.17,.23,.31][i]})),en:clips.map((c,i)=>({...c,duration:[6.19,27.41,9.79][i]}))}]){
for(const language of ['es','en'])for(const playing of [false,true])for(const index of [0,1,2]){
 const timeline=makeTimeline(languageClips[language]),entry=timeline[index];
 const offsets=[0,entry.duration*.37,entry.duration-.000001,entry.duration,...(index<2?[entry.duration+.000001,entry.duration+.8,entry.duration+2.4,entry.end-entry.start-.000001]:[])];
 for(const offset of offsets){
  const controls={language:{value:language}},synced=[],saved=[];
  const player={language,wanted:playing,AudioClass:AudioStub,getClips:l=>languageClips[l],onLanguage(){},paint(){},marks(){},el:name=>controls[name],onSync:s=>synced.push(s),save(){saved.push({language:this.language,position:this.clock.position,playing:this.wanted});},seek:NotebookPlayer.prototype.seek,get current(){return this.clock.current;}};
  player.clock=new TimelineClock({clips:languageClips[language],AudioClass:AudioStub,loadBlob:async src=>src,urls:{createObjectURL:src=>'blob:'+src,revokeObjectURL(){}}});
  await player.clock.seek(entry.start+offset,playing);const before=player.current,old=player.clock,oldAudio=old.audio,other=language==='es'?'en':'es';
  NotebookPlayer.prototype.changeLanguage.call(player,other);
  const next=player.clock.timeline[index],expected=before.elapsed>=before.total?player.clock.total:next.start+Math.min(offset/entry.duration,1)*next.duration+Math.max(0,offset-entry.duration);
  assert(Math.abs(player.clock.position-expected)<1e-9,'language switch retains audio progress or elapsed observation');
  assert.equal(player.current.index,index);if(Math.abs(offset-entry.duration)>1e-9)assert.equal(player.current.inGap,before.inGap);assert.equal(player.wanted,playing);assert.equal(player.clock.running,playing&&expected<player.clock.total);
  if(before.elapsed>=before.total){assert.equal(player.clock.position,player.clock.total,'completion stays exactly at the new end despite fractional durations');assert.equal(player.clock.state,'finished');}
  assert.equal(old.disposed,true);if(oldAudio)assert.equal(oldAudio.paused,true,'the replaced voice is silenced');
  assert.equal(synced.length,1,'one deliberate seek synchronizes the language transition');assert.equal(synced[0].reason,'seek');assert.equal(saved.at(-1).position,player.clock.position);
  const position=player.clock.position;player.clock.tick(.25);if(!playing)assert.equal(player.clock.position,position,'paused observation stays paused');
  if(playing&&before.inGap&&index<2){assert(Math.abs(player.clock.position-Math.min(next.end,expected+.25))<1e-9);}
  player.clock.dispose();languageCases++;
 }
}
}
assert.equal(languageCases,160);
const voices=JSON.parse(readFileSync('site-src/llms/voices.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const language of ['es','en']){const list=responsePlaylist(language,DEFAULTS,voices[language],Array.from({length:8},(_,i)=>String(i)));assert(list.at(-1).snapshot.done);assert.equal(new Set(list.map(c=>c.id)).size,list.length,'repeated token chapters need unique restore IDs');const saved={chapter:list.at(-2).id,offset:2};assert(restoredPosition(saved,makeTimeline(list))>makeTimeline(list)[8].start);assert.equal(list[0].snapshot.generated.length,0);assert(list.at(-1).snapshot.generated.length>0);}
// Two paused notebook instances share a key. An old tab must not periodically
// overwrite the newer tab's position/parameters, nor do so on pagehide.
const storage=new Map();let writes=0;globalThis.localStorage={setItem(k,v){storage.set(k,v);writes++;}};
const pausedTab={key:'shared-notebook',language:'es',wanted:false,clock:{current:{id:'a',start:0},position:4.7},capture:()=>({params:{uptake:1},experiment:{source:'experiment',round:10.25}})};
NotebookPlayer.prototype.save.call(pausedTab);const oldPayload=storage.get(pausedTab.key);
const newerTab={...pausedTab,lastSavedPayload:oldPayload,clock:{current:{id:'b',start:13},position:20.35},capture:()=>({params:{uptake:2},experiment:{source:'experiment',round:59.8}})};
NotebookPlayer.prototype.save.call(newerTab);const newPayload=storage.get(pausedTab.key);assert.notEqual(newPayload,oldPayload);const afterEdit=writes;
for(let i=0;i<20;i++)NotebookPlayer.prototype.save.call(pausedTab);
assert.equal(storage.get(pausedTab.key),newPayload,'unchanged old tab cannot rewind the new experiment');assert.equal(writes,afterEdit,'paused frames and pagehide do not rewrite unchanged state');
const reopened={...newerTab,lastSavedPayload:newPayload};NotebookPlayer.prototype.save.call(reopened);assert.equal(writes,afterEdit,'a restored paused tab does not claim ownership');
pausedTab.wanted=true;pausedTab.clock.position=6.5;NotebookPlayer.prototype.save.call(pausedTab);assert.equal(JSON.parse(storage.get(pausedTab.key)).offset,6.5,'a deliberate change is still persisted');
console.log(`Playback: exact seeking/resume, ${languageCases} real language transitions retaining audio/observation time, autoplay denial, seek races, one audio owner, download reuse, stale-tab persistence and reversible token histories: OK`);
