// A single clock for recorded narration, chapter gaps and deterministic scenes.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
export function makeTimeline(clips,gap=3){let start=0;return clips.map((clip,index)=>{const duration=Math.max(.1,Number(clip.duration)||.1),entry={...clip,index,start,duration,end:start+duration+(index<clips.length-1?gap:0)};start=entry.end;return entry;});}
export function locate(timeline,seconds){const total=timeline.at(-1)?.end||0,elapsed=clamp(seconds,0,total),entry=timeline.find(e=>elapsed<e.end)||timeline.at(-1);if(!entry)return null;const local=clamp(elapsed-entry.start,0,entry.duration);return {...entry,elapsed,local,progress:local/entry.duration,inGap:elapsed>=entry.start+entry.duration,total};}
export function restoredPosition(saved,timeline){const e=timeline.find(c=>c.id===saved?.chapter);return e?e.start+clamp(saved.offset,0,e.end-e.start):0;}

export class TimelineClock {
 constructor({clips,gap=3,AudioClass=Audio,onSync=()=>{},onState=()=>{},loadBlob=async src=>{const r=await fetch(src);if(!r.ok)throw Error('Audio unavailable');return r.blob();},urls=URL}){Object.assign(this,{AudioClass,onSync,onState,loadBlob,urls});this.timeline=makeTimeline(clips,gap);this.position=0;this.running=false;this.state='paused';this.audio=null;this.revision=0;this.cache=new Map();this.objectUrl=null;this.rate=1;this.bound=-1;this.pending=false;}
 get total(){return this.timeline.at(-1)?.end||0;}
 get current(){return locate(this.timeline,this.position);}
 notify(reason='tick'){this.onSync({...this.current,running:this.running,state:this.state,reason});}
 status(value){this.state=value;this.onState(value);}
 release(){this.revision++;this.pending=false;if(this.audio){this.audio.onended=this.audio.onerror=this.audio.onloadedmetadata=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}this.audio=null;this.bound=-1;if(this.objectUrl)this.urls.revokeObjectURL(this.objectUrl);this.objectUrl=null;}
 pause(){if(this.audio&&this.bound===this.current?.index&&this.state==='playing')this.position=this.current.start+clamp(this.audio.currentTime,0,this.current.duration);this.running=false;this.audio?.pause();this.status('paused');this.notify('pause');}
 async play(){if(this.position>=this.total)this.position=0;this.running=true;if(this.pending){this.status('loading');return;}const c=this.current;if(!c)return;if(c.inGap){this.status('gap');this.notify();return;}if(this.audio&&this.bound===c.index&&!['error','loading'].includes(this.state)){this.audio.playbackRate=this.rate;this.status('loading');const rev=this.revision;try{await this.audio.play();if(rev===this.revision&&this.running)this.status('playing');}catch{if(rev===this.revision){this.running=false;this.status('blocked');this.notify();}}return;}return this.seek(this.position,true);}
 async seek(seconds,play=this.running){this.release();this.position=clamp(seconds,0,this.total);this.running=play&&this.position<this.total;const c=this.current;this.status(this.position>=this.total?'finished':c.inGap?'gap':this.running?'loading':'paused');this.notify('seek');if(this.position>=this.total||c.inGap)return;const rev=this.revision,a=new this.AudioClass(c.src);this.pending=true;this.audio=a;this.bound=c.index;a.preload='auto';a.playbackRate=this.rate;
  a.onended=()=>{if(this.audio!==a)return;this.position=c.start+c.duration;if(c.index===this.timeline.length-1){this.position=this.total;this.running=false;this.status('finished');}else this.status(this.running?'gap':'paused');this.notify('ended');};
  a.onerror=()=>{if(this.audio!==a)return;this.pending=false;this.running=false;this.status('error');this.notify();};
  const ready=async()=>{if(rev!==this.revision||this.audio!==a)return;this.pending=false;a.currentTime=c.local;if(!this.running){this.status('paused');return;}try{await a.play();if(rev===this.revision&&this.running)this.status('playing');}catch{if(rev===this.revision){this.running=false;this.status('blocked');this.notify();}}};
  // Blob URLs are seekable even when a static host does not honor Range requests.
  if(c.local>.01){try{if(!this.cache.has(c.src))this.cache.set(c.src,this.loadBlob(c.src).catch(e=>{this.cache.delete(c.src);throw e;}));const blob=await this.cache.get(c.src);if(rev!==this.revision)return;this.objectUrl=this.urls.createObjectURL(blob);a.onloadedmetadata=()=>{a.onloadedmetadata=null;ready();};a.src=this.objectUrl;a.load();}catch{if(rev===this.revision){this.pending=false;this.running=false;this.status('error');this.notify();}}}
  else await ready();
 }
 tick(dt){if(!this.running)return;const c=this.current;if(this.state==='playing'&&this.audio){this.position=c.start+clamp(this.audio.currentTime,0,c.duration);this.notify();}else if(this.state==='gap'){this.position=Math.min(c.end,this.position+clamp(dt,0,.25)*this.rate);if(this.position>=c.end)this.seek(this.position,true);else this.notify();}}
 dispose(){this.running=false;this.release();this.cache.clear();}
}
