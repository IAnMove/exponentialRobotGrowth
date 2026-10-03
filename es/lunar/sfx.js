const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const pulse=(u,c,w)=>Math.exp(-(((u-c)/w)**2));

// The same narrative position drives geometry and sound. Scrubbing never queues old cues.
export function soundFrame(stage,progress=0,time=0,frame=null){
 const u=clamp(progress),s={rumble:0,air:0,servo:0,ping:0,frequency:180,cutoff:650,pan:0};
 if(stage==='liftoff'){s.rumble=.75-.42*u;s.air=.22*(1-u);s.cutoff=900-500*u;}
 else if(stage==='booster'){s.rumble=u===1?0:u<.25?.32:u>.72?.45:.025;s.air=u===1?0:.1*pulse(u,.04,.035);s.cutoff=400;}
 else if(stage==='refuel'){const f=frame?.mission?.refuel;s.air=(f?f.connected:u>=.25&&u<.8)?.055:0;s.servo=u<.3||u>=.8?.025:0;s.frequency=115;s.ping=.06*pulse(u,.7,.02);s.pan=-.4+.8*u;}
 else if(stage==='transfer'){s.ping=.016*pulse(u,.12,.025);s.frequency=420;}
 else if(stage==='descent'){s.rumble=u<.97?.18+.13*u:0;s.air=.06*pulse(u,.83,.12);s.ping=.09*pulse(u,.965,.014);s.frequency=75;s.cutoff=450;}
 else if(stage==='unload'){s.servo=u>=.08&&u<.5?.065:u>=.65&&u<.92?.045:0;s.frequency=u<.5?135:95;s.ping=.075*pulse(u,.56,.015)+.035*pulse(u,.99,.012);s.pan=-.4+u*.8;}
 else if(stage==='return'){s.rumble=u>.04&&u<1?.3*(1-u*.6):0;s.cutoff=450;}
 else if(stage==='power'){s.servo=.012;s.frequency=120;}
 else if(['mine','factory','replicate','limits'].includes(stage)&&(!frame||frame.operation.active)){const q=frame?.operation.progress??u;s.servo=.024+.01*Math.sin(q*Math.PI*2);s.air=q<.4?.026:0;s.rumble=q<.2?.018:0;s.frequency=stage==='mine'?85:155;s.ping=.018*pulse(q,.95,.025);}
 else if(['seed','launch'].includes(stage)){s.servo=.012;s.frequency=110;}
 return s;
}

export class LunarSfx {
 constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,volume=.28,enabled=true}={}){this.Context=Context;this.volume=clamp(volume);this.enabled=enabled;this.nodes=[];this.sources=[];this.active=false;this.targets=new Map();}
 async unlock(){if(this.disposed||!this.Context||!this.enabled)return false;try{if(!this.ctx)this.build();const context=this.ctx;if(context.state==='suspended')await context.resume();return !this.disposed&&this.ctx===context&&context.state==='running';}catch{return false;}}
 build(){const c=new this.Context(),nodes=[],sources=[],channels={},keep=n=>(nodes.push(n),n);try{const master=keep(c.createGain());master.gain.value=0;const limiter=keep(c.createDynamicsCompressor());limiter.threshold.value=-16;limiter.knee.value=12;limiter.ratio.value=8;master.connect(limiter);limiter.connect(c.destination);
  const data=c.createBuffer(1,c.sampleRate*2,c.sampleRate),samples=data.getChannelData(0);let seed=7321;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
  for(const name of ['rumble','air','servo','ping']){const gain=keep(c.createGain());gain.gain.value=0;const pan=keep(c.createStereoPanner());gain.connect(pan);pan.connect(master);let source,filter;
   if(name==='rumble'||name==='air'){source=keep(c.createBufferSource());source.buffer=data;source.loop=true;filter=keep(c.createBiquadFilter());filter.type=name==='rumble'?'lowpass':'bandpass';filter.frequency.value=name==='rumble'?500:1800;filter.Q.value=.55;source.connect(filter);filter.connect(gain);}
   else {source=keep(c.createOscillator());source.type=name==='servo'?'triangle':'sine';source.frequency.value=120;source.connect(gain);}
   sources.push(source);source.start();channels[name]={gain,pan,source,filter};
  }
  this.ctx=c;this.nodes=nodes;this.sources=sources;this.channels=channels;this.master=master;
  }catch(error){for(const source of sources){try{source.stop();}catch{}}for(const node of nodes){try{node.disconnect();}catch{}}try{c.close()?.catch?.(()=>{});}catch{}throw error;}
 }
 setVolume(v){this.volume=clamp(v);if(!this.volume)this.silence();}
 setEnabled(v){this.enabled=!!v;if(!this.enabled)this.silence();}
 smooth(param,value,seconds=.04){const last=this.targets.get(param);if(last!==undefined&&Math.abs(last-value)<1e-3)return;this.targets.set(param,value);const t=this.ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 update({stage,progress,time=0,frame=null,active=false,hidden=false}){if(!this.ctx||this.disposed)return;this.active=active&&!hidden&&this.enabled&&this.volume>0;if(!this.active){this.silence();return;}if(this.ctx.state==='suspended'&&!this.resuming){this.resuming=Promise.resolve(this.ctx.resume()).catch(()=>{}).finally(()=>this.resuming=null);}
  const s=soundFrame(stage,progress,time,frame);this.smooth(this.master.gain,this.volume*.36);for(const [name,ch] of Object.entries(this.channels)){this.smooth(ch.gain.gain,s[name]);this.smooth(ch.pan.pan,s.pan);if(name==='servo'||name==='ping')this.smooth(ch.source.frequency,s.frequency*(name==='ping'?2:1));}this.smooth(this.channels.rumble.filter.frequency,s.cutoff);
 }
 silence(){this.active=false;this.targets.clear();if(!this.ctx||this.disposed)return;this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setValueAtTime(0,this.ctx.currentTime);for(const ch of Object.values(this.channels)){ch.gain.gain.cancelScheduledValues(this.ctx.currentTime);ch.gain.gain.setValueAtTime(0,this.ctx.currentTime);}}
 suspend(){this.silence();if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
 dispose(){if(this.disposed)return;this.silence();this.sources.forEach(s=>s.stop());this.nodes.forEach(n=>n.disconnect());this.ctx?.close().catch(()=>{});this.disposed=true;}
}
