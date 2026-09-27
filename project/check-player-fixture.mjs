// DOM-free adapter fixture: timing and races are tested with the real clock in check-playback.
import {makeTimeline,locate} from './site-src/playback/timeline.js';
export function playerFixture(language,onCreate=()=>{}){return class {
 constructor(options){this.options=options;this.language=language;this.running=false;this.clock={timeline:makeTimeline(options.getClips(language))};options.onLanguage?.(language);onCreate(this);this.seek(0,false);}
 seek(seconds,play=this.running){this.running=play;this.current=locate(this.clock.timeline,seconds);this.options.onSync({...this.current,running:play,reason:'seek'});}
 stage(index,play=this.running){this.seek(this.clock.timeline[Math.max(0,Math.min(this.clock.timeline.length-1,index))].start,play);}
 toggle(){this.running=!this.running;this.options.onSync({...this.current,running:this.running,reason:'tick'});}
 pause(){this.running=false;}
 save(){}
 changeLanguage(language){const i=this.current.index,p=this.current.progress;this.language=language;this.options.onLanguage?.(language);this.clock.timeline=makeTimeline(this.options.getClips(language));this.seek(this.clock.timeline[i].start+p*this.clock.timeline[i].duration);}
};}
