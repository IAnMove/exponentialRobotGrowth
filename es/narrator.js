import {NARRATIONS} from '../narration-catalog.js';

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

export function createNarrator({toggleHost,onBegin}){
  let enabled=true;try{enabled=localStorage.getItem('robot-lab-narration')!=='off';}catch{}
  const toggle=document.createElement('button');toggle.type='button';toggle.className='narration-toggle';toggleHost.append(toggle);
  const dock=document.createElement('aside');dock.className='narration-dock';dock.hidden=true;dock.setAttribute('aria-label','Explicación del lugar seleccionado');
  dock.innerHTML='<div class="narration-row"><span class="narration-symbol" aria-hidden="true">◖))</span><div class="narration-heading"><span class="narration-eyebrow">EXPLICACIÓN DEL LUGAR</span><strong data-n="title"></strong></div><button type="button" data-n="play" aria-label="Pausar explicación">Ⅱ</button><button type="button" data-n="repeat" aria-label="Repetir explicación" title="Repetir explicación">↺</button><button type="button" data-n="close" aria-label="Cerrar explicación">×</button></div><div class="narration-meta"><span data-n="status" role="status"></span><button type="button" data-n="next">Qué ocurre ahora →</button></div><details><summary>Leer la explicación</summary><p data-n="transcript"></p></details><p class="narration-note">La simulación está en pausa. Pulsa Reproducir para continuar.</p>';
  document.body.append(dock);const el=name=>dock.querySelector('[data-n="'+name+'"]');
  const labels={loading:'Cargando voz…',playing:'Escuchando',paused:'Narración en pausa',blocked:'Pulsa ▶ para escuchar',error:'No se pudo cargar la voz. Puedes leer la explicación o reintentar.',finished:'Explicación terminada'};
  const player=new NarrationPlayer({onBegin,onClip(item,index,total){el('title').textContent=item.title;el('transcript').textContent=item.text;el('next').hidden=index+1>=total;el('next').textContent=total>2?'Siguiente sector →':'Qué ocurre ahora →';if(item.focus)document.dispatchEvent(new CustomEvent('narration-focus',{detail:item.focus}));},onState(state){
    dock.hidden=state==='stopped';document.body.classList.toggle('has-narration',state!=='stopped');
    el('status').textContent=labels[state]??'';el('play').textContent=state==='playing'?'Ⅱ':'▶';el('play').setAttribute('aria-label',state==='playing'?'Pausar explicación':state==='finished'?'Repetir explicación':'Escuchar explicación');
  }});
  function updateToggle(){toggle.textContent=enabled?'◖)) Voz activada':'◖)) Voz desactivada';toggle.setAttribute('aria-pressed',String(enabled));toggle.title='Explicar cada lugar al seleccionarlo';toggle.setAttribute('aria-label',enabled?'Desactivar narración al seleccionar':'Activar narración al seleccionar');}
  toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('robot-lab-narration',enabled?'on':'off');}catch{}if(!enabled)player.stop();updateToggle();});updateToggle();
  el('play').addEventListener('click',()=>player.toggle());el('repeat').addEventListener('click',()=>player.repeat());el('next').addEventListener('click',()=>player.next());el('close').addEventListener('click',()=>player.stop());
  window.addEventListener('pagehide',()=>player.stop());
  document.addEventListener('fullscreenchange',()=>{(document.fullscreenElement??document.body).append(dock);});
  const scene=location.pathname.includes('district')?'district':location.pathname.includes('region')?'region':location.pathname.includes('city')?'city':'factory';
  const tours={factory:['guide-factory',...Array.from({length:5},(_,i)=>'robot-factory-'+i)],district:['guide-district',...Array.from({length:14},(_,i)=>'district-'+i)],region:['region-overview',...Array.from({length:3},(_,i)=>'region-city-'+i),...Array.from({length:6},(_,i)=>'region-'+i)],city:['guide-city',...Array.from({length:6},(_,i)=>'city-'+i)]};
  document.getElementById('lesson-overview')?.addEventListener('click',()=>player.start([NARRATIONS[tours[scene][0]]].filter(Boolean)));
  document.getElementById('lesson-tour')?.addEventListener('click',()=>player.start(tours[scene].map(key=>NARRATIONS[key]?{...NARRATIONS[key],focus:key}:null).filter(Boolean)));
  return {explain(key,stateKey){if(!enabled)return;const items=[NARRATIONS[key],NARRATIONS[stateKey]].filter(Boolean);player.start(items);},stop:()=>player.stop()};
}
