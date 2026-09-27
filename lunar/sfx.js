const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const pulse=(u,c,w)=>Math.exp(-(((u-c)/w)**2));

// The same narrative position drives geometry and sound. Scrubbing never queues old cues.
export function soundFrame(stage,progress=0,time=0){
 const u=clamp(progress),s={rumble:0,air:0,servo:0,ping:0,frequency:180,cutoff:650,pan:0};
 if(stage==='liftoff'){s.rumble=.75-.42*u;s.air=.22*(1-u);s.cutoff=900-500*u;}
 else if(stage==='booster'){s.rumble=u<.25?.32:u>.72?.45:.025;s.air=.1*pulse(u,.04,.035);s.cutoff=400;}
 else if(stage==='refuel'){s.air=.055;s.servo=.025;s.frequency=115;s.ping=.032*pulse((u*6)%1,.15,.07);s.pan=Math.sin(u*6)*.45;}
 else if(stage==='transfer'){s.ping=.016*pulse(u,.12,.025);s.frequency=420;}
 else if(stage==='descent'){s.rumble=u<.97?.18+.13*u:0;s.air=.06*pulse(u,.83,.12);s.ping=.09*pulse(u,.965,.014);s.frequency=75;s.cutoff=450;}
 else if(stage==='unload'){s.servo=u<.55?.065:u>.6?.045:0;s.frequency=u<.55?135:95;s.ping=.075*pulse(u,.58,.015);s.pan=-.4+u*.8;}
 else if(stage==='return'){s.rumble=u>.04?.3*(1-u*.6):0;s.cutoff=450;}
 else if(stage==='power'){s.servo=.012;s.frequency=120;}
 else if(['mine','factory','replicate','limits'].includes(stage)){s.servo=.024+.01*Math.sin(time*3);s.air=.026;s.rumble=.018;s.frequency=stage==='mine'?85:155;s.ping=.018*pulse((time/3)%1,.08,.04);}
 else if(['seed','launch'].includes(stage)){s.servo=.012;s.frequency=110;}
 return s;
}

export class LunarSfx {
 constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,volume=.28,enabled=true}={}){this.Context=Context;this.volume=clamp(volume);this.enabled=enabled;this.nodes=[];this.sources=[];this.active=false;this.targets=new Map();}
 async unlock(){if(this.disposed||!this.Context||!this.enabled)return false;try{if(!this.ctx)this.build();if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx.state==='running';}catch{return false;}}
 build(){const c=this.ctx=new this.Context();const keep=n=>(this.nodes.push(n),n);this.master=keep(c.createGain());this.master.gain.value=0;const limiter=keep(c.createDynamicsCompressor());limiter.threshold.value=-16;limiter.knee.value=12;limiter.ratio.value=8;this.master.connect(limiter);limiter.connect(c.destination);
  const data=c.createBuffer(1,c.sampleRate*2,c.sampleRate),samples=data.getChannelData(0);let seed=7321;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
  this.channels={};for(const name of ['rumble','air','servo','ping']){const gain=keep(c.createGain());gain.gain.value=0;const pan=keep(c.createStereoPanner());gain.connect(pan);pan.connect(this.master);let source,filter;
   if(name==='rumble'||name==='air'){source=keep(c.createBufferSource());source.buffer=data;source.loop=true;filter=keep(c.createBiquadFilter());filter.type=name==='rumble'?'lowpass':'bandpass';filter.frequency.value=name==='rumble'?500:1800;filter.Q.value=.55;source.connect(filter);filter.connect(gain);}
   else {source=keep(c.createOscillator());source.type=name==='servo'?'triangle':'sine';source.frequency.value=120;source.connect(gain);}
   source.start();this.sources.push(source);this.channels[name]={gain,pan,source,filter};
  }
 }
 setVolume(v){this.volume=clamp(v);if(!this.volume)this.silence();}
 setEnabled(v){this.enabled=!!v;if(!this.enabled)this.silence();}
 smooth(param,value,seconds=.04){const last=this.targets.get(param);if(last!==undefined&&Math.abs(last-value)<1e-3)return;this.targets.set(param,value);const t=this.ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 update({stage,progress,time=0,active=false,hidden=false}){if(!this.ctx||this.disposed)return;this.active=active&&!hidden&&this.enabled&&this.volume>0;if(!this.active){this.silence();return;}if(this.ctx.state==='suspended'&&!this.resuming){this.resuming=this.ctx.resume().catch(()=>{}).finally(()=>this.resuming=null);}
  const s=soundFrame(stage,progress,time);this.smooth(this.master.gain,this.volume*.36);for(const [name,ch] of Object.entries(this.channels)){this.smooth(ch.gain.gain,s[name]);this.smooth(ch.pan.pan,s.pan);if(name==='servo'||name==='ping')this.smooth(ch.source.frequency,s.frequency*(name==='ping'?2:1));}this.smooth(this.channels.rumble.filter.frequency,s.cutoff);
 }
 silence(){this.active=false;this.targets.clear();if(!this.ctx||this.disposed)return;this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setValueAtTime(0,this.ctx.currentTime);for(const ch of Object.values(this.channels)){ch.gain.gain.cancelScheduledValues(this.ctx.currentTime);ch.gain.gain.setValueAtTime(0,this.ctx.currentTime);}}
 suspend(){this.silence();if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
 dispose(){if(this.disposed)return;this.silence();this.sources.forEach(s=>s.stop());this.nodes.forEach(n=>n.disconnect());this.ctx?.close().catch(()=>{});this.disposed=true;}
}
