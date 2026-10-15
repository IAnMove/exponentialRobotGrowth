import assert from 'node:assert/strict';
import {LunarSfx,soundFrame} from './site-src/lunar/sfx.js';
import {STAGES,simulate} from './site-src/lunar/model.js';
import {lunarFrameAt} from './site-src/lunar/presentation.js';

class Param {constructor(){this.value=0;}cancelScheduledValues(){}setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}setValueAtTime(v){this.value=v;}}
class Node {constructor(){for(const p of ['gain','pan','frequency','Q','threshold','knee','ratio'])this[p]=new Param();}connect(){}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
class Context {constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination={};}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createStereoPanner(){return new Node();}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}createOscillator(){return new Node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}}
for(const stage of STAGES)for(let i=0;i<=100;i++){const s=soundFrame(stage.id,i/100,i*.4);assert(Object.values(s).every(Number.isFinite));for(const channel of ['rumble','air','servo','ping'])assert(s[channel]>=0&&s[channel]<=1);assert(s.pan>=-1&&s.pan<=1);}
const sfx=new LunarSfx({Context});assert.equal(sfx.ctx,undefined,'No AudioContext before a gesture');assert(await sfx.unlock());const tick=(stage='liftoff',progress=.1,active=true,hidden=false)=>sfx.update({stage,progress,active,hidden});
tick();assert(sfx.master.gain.value>0);assert(sfx.channels.rumble.gain.gain.value>0);assert(sfx.master.gain.value<.11,'Conservative default gain below narration');
tick('liftoff',.1,false);assert.equal(sfx.master.gain.value,0,'Pause silences all effects');
tick();tick('unload',.3);assert.equal(sfx.channels.rumble.gain.gain.value,0,'Scrubbing cannot leave an old engine playing');assert(sfx.channels.servo.gain.gain.value>0);
tick('return',.5,true,true);assert.equal(sfx.master.gain.value,0,'Hidden page is silent');
tick();sfx.setEnabled(false);assert.equal(sfx.master.gain.value,0);tick();assert.equal(sfx.master.gain.value,0,'Disabled effects stay silent during narration');
sfx.setEnabled(true);sfx.setVolume(0);tick();assert.equal(sfx.master.gain.value,0);sfx.setVolume(99);assert.equal(sfx.volume,1);sfx.setVolume(NaN);assert.equal(sfx.volume,0);
sfx.setVolume(.4);tick();sfx.suspend();assert.equal(sfx.ctx.state,'suspended');assert.equal(sfx.master.gain.value,0);
await sfx.unlock();tick();sfx.dispose();assert.equal(sfx.ctx.state,'closed');assert(sfx.sources.every(s=>s.stopped));assert(sfx.nodes.every(n=>n.disconnected));sfx.dispose();
const absent=new LunarSfx({Context:null});assert.equal(await absent.unlock(),false);absent.update({active:true});absent.dispose();
class Blocked extends Context {async resume(){throw Error('NotAllowedError');}}
const blocked=new LunarSfx({Context:Blocked});assert.equal(await blocked.unlock(),false);assert.equal(blocked.master.gain.value,0);blocked.dispose();
for(const stage of ['booster','return'])assert.equal(soundFrame(stage,1).rumble,0,'Completed recovery/ascent has no engine sound');
const stopped=lunarFrameAt(simulate({power:5}),11,.4),working=lunarFrameAt(simulate(),11,.4);
for(const stage of ['mine','factory','replicate','limits']){
 const sound=soundFrame(stage,.4,123,stopped);for(const channel of ['rumble','air','servo','ping'])assert.equal(sound[channel],0,'No industrial sound without production');
 assert(soundFrame(stage,.4,123,working).servo>0);assert.deepEqual(soundFrame(stage,.4,123,working),soundFrame(stage,.4,9999,working),'Elapsed clock does not invent repeated operations');
}
const beforeDock=lunarFrameAt(simulate(),2,.2),docked=lunarFrameAt(simulate(),2,.5),separated=lunarFrameAt(simulate(),2,1);
assert.equal(soundFrame('refuel',.2,0,beforeDock).air,0);assert(soundFrame('refuel',.5,0,docked).air>0);assert.equal(soundFrame('refuel',1,0,separated).air,0);
// Inject failure at every node construction, including after sources have started.
// A failed unlock must clean the partial graph and permit a fresh gesture retry.
for(let failure=1;failure<=16;failure++){
 const contexts=[];let attempt=0;
 class FailingContext extends Context {
  constructor(){super();this.attempt=attempt++;this.calls=0;this.made=[];contexts.push(this);}
  make(){if(this.attempt===0&&++this.calls===failure)throw Error('Injected audio allocation failure');const n=new Node();this.made.push(n);return n;}
  createGain(){return this.make();}createDynamicsCompressor(){return this.make();}createStereoPanner(){return this.make();}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}
 }
 const retry=new LunarSfx({Context:FailingContext});assert.equal(await retry.unlock(),false);assert.equal(retry.ctx,undefined,'Partial context cannot be published');assert.equal(contexts[0].state,'closed');assert(contexts[0].made.every(n=>n.disconnected));assert(contexts[0].made.filter(n=>n.started).every(n=>n.stopped));assert.doesNotThrow(()=>retry.update({stage:'liftoff',active:true}));assert.doesNotThrow(()=>retry.silence());assert(await retry.unlock());retry.update({stage:'liftoff',progress:.3,active:true});assert(retry.master.gain.value>0);retry.dispose();
}
let release;class SlowContext extends Context{resume(){return new Promise(resolve=>{release=resolve;});}}
const racing=new LunarSfx({Context:SlowContext}),pending=racing.unlock();racing.dispose();release();assert.equal(await pending,false,'Late audio unlock cannot revive a disposed experience');
console.log('Lunar SFX: 14 stage envelopes, frame-driven operation/docking, conservative mix, seek/pause/mute/background silence, 16 atomic-build failures with retry, late unlock and disposal: OK');
