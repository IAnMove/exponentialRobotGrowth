import assert from 'node:assert/strict';
import {LunarSfx,soundFrame} from './site-src/lunar/sfx.js';
import {STAGES} from './site-src/lunar/model.js';

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
console.log('Lunar SFX: 14 stage envelopes, conservative mix, seek isolation, pause/mute/background silence, gesture gating, unavailable audio and disposal: OK');
