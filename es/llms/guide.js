// Audio completion, not a guessed duration, gates the next step.
export function narrationId(run){
  const phases=['question','retrieval','tokens','vectors','layers','scores','choose','feedback'],phase=run.phase;
  return run.done?'done':phase>=4&&((phase===7&&run.loops>1)||(phase<7&&run.loops>0))?'loop-'+phases[phase]:phases[phase];
}
export class StepGuide {
  constructor({getClip,onAdvance,onChange=()=>{},AudioClass=Audio,gap=3}={}){
    Object.assign(this,{getClip,onAdvance,onChange,AudioClass,gap});
    this.audio=null;this.clip=null;this.state='idle';this.remaining=0;
    this.enabled=true;this.automatic=true;this.running=false;this.resumeState='idle';
  }
  notify(){this.onChange(this);}
  dispose(){const a=this.audio;this.audio=null;if(a){a.onended=a.onerror=a.onplaying=a.onpause=null;a.pause();a.removeAttribute('src');a.load();}}
  stop(){this.dispose();this.running=false;this.state='idle';this.clip=null;this.remaining=0;this.notify();}
  enter(){
    this.dispose();this.clip=this.getClip();this.running=true;this.remaining=this.gap;
    if(!this.enabled){this.remaining=this.gap+Math.max(6,Math.min(14,this.clip.text.length/32));this.state='reading';this.notify();return;}
    const a=new this.AudioClass(this.clip.src);this.audio=a;a.preload='auto';
    a.onplaying=()=>{if(this.audio!==a||!this.running)return;this.state='speaking';this.notify();};
    a.onended=()=>{if(this.audio!==a)return;this.remaining=this.gap;if(this.running)this.state='waiting';else this.resumeState='waiting';this.notify();};
    a.onerror=()=>{if(this.audio!==a)return;this.running=false;this.state='error';this.notify();};
    this.playAudio();
  }
  playAudio(){const a=this.audio;if(!a)return;this.state='loading';this.notify();
    try{Promise.resolve(a.play()).catch(()=>{if(this.audio!==a||!this.running)return;this.running=false;this.state='blocked';this.notify();});}
    catch{this.running=false;this.state='blocked';this.notify();}
  }
  pause(){if(!this.running)return;this.resumeState=this.state;this.running=false;this.state='paused';this.audio?.pause();this.notify();}
  resume(){
    if(this.running)return;
    if(!this.clip||['idle','finished','error'].includes(this.state)){this.enter();return;}
    if(this.state==='ready'){this.next();return;}
    this.running=true;
    if(this.state==='paused'&&['waiting','reading'].includes(this.resumeState)){this.state=this.resumeState;this.notify();}
    else this.playAudio();
  }
  next(){this.dispose();this.running=false;
    if(this.onAdvance()===false){this.state='finished';this.notify();return;}
    this.enter();
  }
  replay(){this.enter();}
  setEnabled(enabled){const active=this.running;this.enabled=enabled;if(active)this.enter();else this.stop();}
  tick(dt){
    if(!this.running||!['waiting','reading'].includes(this.state)||!Number.isFinite(dt)||dt<=0)return;
    this.remaining=Math.max(0,this.remaining-Math.min(dt,.25));
    if(this.remaining>1e-8)return;
    if(this.automatic)this.next();else {this.running=false;this.state='ready';this.notify();}
  }
}
