import {NotebookPlayer} from './playback/player.js';
import {NARRATIONS} from './narration-catalog-en.js';

// One owner for playback. A superseded request cannot resume or advance the new one.
export class NarrationPlayer {
  constructor({AudioClass=Audio,onClip=()=>{},onState=()=>{},onBegin=()=>{}}={}){
    this.AudioClass=AudioClass;this.onClip=onClip;this.onState=onState;this.onBegin=onBegin;
    this.items=[];this.index=0;this.audio=null;this.state='stopped';
  }
  setState(state){this.state=state;this.onState(state);}
  dispose(){const old=this.audio;this.audio=null;if(old){old.onended=old.onerror=old.onplaying=old.onpause=null;old.pause();old.removeAttribute('src');old.load();}}
  start(items){this.dispose();this.items=items;this.index=0;if(!items.length){this.setState('stopped');return;}this.onBegin();this.playClip();}
  playClip(){
    this.dispose();const item=this.items[this.index];if(!item){this.setState('finished');return;}
    this.onClip(item,this.index,this.items.length);const a=new this.AudioClass(new URL(item.src,import.meta.url).href);this.audio=a;a.preload='auto';
    a.onplaying=()=>{if(this.audio===a)this.setState('playing');};
    a.onpause=()=>{if(this.audio===a&&this.state!=='finished')this.setState('paused');};
    a.onerror=()=>{if(this.audio===a)this.setState('error');};
    a.onended=()=>{if(this.audio!==a)return;if(this.index+1<this.items.length){this.index++;this.playClip();}else this.setState('finished');};
    this.play();
  }
  play(){const a=this.audio;if(!a)return;this.setState('loading');try{Promise.resolve(a.play()).catch(()=>{if(this.audio===a)this.setState('blocked');});}catch{if(this.audio===a)this.setState('blocked');}}
  toggle(){if(!this.items.length)return;if(this.state==='finished'){this.start(this.items);return;}if(this.audio?.paused||['blocked','error'].includes(this.state)){this.onBegin();if(this.state==='error')this.playClip();else this.play();}else this.audio?.pause();}
  repeat(){if(this.items.length)this.start(this.items);}
  next(){if(this.index+1<this.items.length){this.index++;this.onBegin();this.playClip();}}
  stop(){this.dispose();this.items=[];this.setState('stopped');}
}

export function createNarrator({toggleHost,onBegin,capture=()=>null,restore=()=>{},onSync=()=>{},onReady=()=>{},onIntent=()=>{}}){
 const scene=location.pathname.includes('district')?'district':location.pathname.includes('region')?'region':location.pathname.includes('city')?'city':'factory';
 const tours={factory:['guide-factory',...Array.from({length:5},(_,i)=>'robot-factory-'+i),'factory-first-loop','factory-limits'],district:['guide-district',...Array.from({length:14},(_,i)=>'district-'+i)],region:['region-overview',...Array.from({length:3},(_,i)=>'region-city-'+i),...Array.from({length:6},(_,i)=>'region-'+i)],city:['guide-city',...Array.from({length:6},(_,i)=>'city-'+i)]};
 const es=document.documentElement.lang==='es';let notebook,focused='',pending,extras=[],context=null,rawSeek,changingLanguage=false;let catalogs;
 const root=new URL((location.pathname.includes('/robots/')?'../':'')+(es?'../':'./'),import.meta.url);
 // Initialization follows the scene's synchronous setup, so focus callbacks are ready.
 queueMicrotask(async()=>{
  let other;try{other=(await import(new URL(es?'narration-catalog-en.js':'narration-catalog.js',root).href)).NARRATIONS;}catch{other=NARRATIONS;}
  catalogs=es?{es:NARRATIONS,en:other}:{en:NARRATIONS,es:other};
  notebook=new NotebookPlayer({id:'robots-'+scene,capture:()=>({extras,context,simulation:capture()}),restore(saved){if(Array.isArray(saved?.extras))extras=saved.extras.filter(key=>typeof key==='string'&&catalogs.es[key]);if(saved?.context&&catalogs.es[saved.context.key]&&catalogs.es[saved.context.stateKey])context=saved.context;restore(saved?.simulation);},getClips:language=>[...tours[scene],...extras].flatMap(key=>context?.key===key?[key,context.stateKey]:[key]).filter(key=>catalogs[language][key]).map(key=>({...catalogs[language][key],id:key,src:new URL(catalogs[language][key].src,root).href})),onSync(s){if(!s)return;if(s.reason==='seek'||focused!==s.id){focused=s.id;onBegin?.();document.dispatchEvent(new CustomEvent('narration-focus',{detail:s.id}));}onSync(s);}});
  rawSeek=notebook.seek.bind(notebook);notebook.seek=(seconds,play=notebook.wanted)=>{if(!changingLanguage)onIntent('seek');rawSeek(seconds,play);};
  const rawToggle=notebook.toggle.bind(notebook);notebook.toggle=()=>{if(!notebook.running)onIntent('play');rawToggle();};
  const rawLanguage=notebook.changeLanguage.bind(notebook);notebook.changeLanguage=language=>{changingLanguage=true;try{rawLanguage(language);}finally{changingLanguage=false;}};
  onReady(notebook);
  if(pending)explain(...pending);
 });
 document.getElementById('lesson-overview')?.addEventListener('click',()=>notebook?.stage(0,true));document.getElementById('lesson-tour')?.addEventListener('click',()=>notebook?.toggle());
 function explain(key,stateKey){onIntent('play');if(!notebook){pending=[key,stateKey];return;}if(!catalogs.es[key])return;if(!tours[scene].includes(key)&&!extras.includes(key))extras.push(key);context=stateKey&&catalogs.es[stateKey]?{key,stateKey}:null;notebook.rebuild();const i=notebook.clock.timeline.findIndex(c=>c.id===key);notebook.stage(i,true);}
 return {explain,stop:()=>notebook?.pause(),save:()=>notebook?.save(),align(seconds){if(rawSeek)rawSeek(seconds,false);},get player(){return notebook;},dispose:()=>notebook?.dispose()};
}
