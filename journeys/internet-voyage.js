import {NotebookPlayer} from '../playback/player.js';
import {STAGES,SOURCES,stageFact} from './internet-route.js';
import {internetFrameAt,internetStatus} from './internet-model.js';
import {createVoyageWorld} from './internet-world.js';
import {VOICES} from './voices-internet-voyage.js';
import {bindFirstPerson} from '../immersive/first-person.js';

const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
const movementCodes=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];

// The production player owns audio, transcript, language, timeline and persistence.
// The local fraction slider holds a deterministic teaching frame until playback resumes.
export function createInternetController({document:doc=document,window:win=window,Player=NotebookPlayer,
 worldFactory=createVoyageWorld,binder=bindFirstPerson,requestFrame=requestAnimationFrame,
 cancelFrame=cancelAnimationFrame,now=()=>performance.now(),media=matchMedia,world:providedWorld}={}){
 const es=doc.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>doc.getElementById(id),txt=a=>a[es?0:1];
 const reduced=media('(prefers-reduced-motion: reduce)').matches,coarse=media('(pointer: coarse)').matches;
 let world=providedWorld,player,controls,chapter=0,progress=0,source='narration',exploring=false,lookActive=false,
  motion=!reduced,voice=true,frame=internetFrameAt(0,0),last=now(),raf,ready=false,restored=false,
  aligning=false,changingLanguage=false,disposed=false,wasLocked=false,transcriptOpen=false;
 const keys=new Set(),touch=new Set(),listeners=[],mutedClocks=new WeakSet();
 const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
 doc.title=t('Internet · Un clic al otro lado del océano','Internet · A click across the ocean')+' · Atlas';
 $('app').innerHTML=`
  <header><a class="brand" href="../museo/index.html?pieza=internet">ATLAS<span> / ${t('MUSEO','MUSEUM')}</span></a><div class="top-links"><a href="./index.html?topic=internet">Notebook ↗</a><button type="button" id="sources">${t('Fuentes','Sources')}</button><a href="${es?'../../journeys/internet-voyage.html':'../es/journeys/internet-voyage.html'}" lang="${es?'en':'es'}">${es?'EN':'ES'}</a></div></header>
  <div class="voyage-layout">
   <section class="story" aria-labelledby="title"><span class="eyebrow">INTERNET / ${t('EL VIAJE DE UN CLIC','THE JOURNEY OF A CLICK')}</span><p class="place" id="place"></p><h1 id="title"></h1><p class="caption" id="caption"></p><div class="fact"><strong id="number"></strong><span id="fact"></span></div><p class="scope">${t('Ruta de ejemplo · no mide tu conexión','Example route · does not measure your connection')}</p><div class="legend"><i class="gold"></i>${t('Petición','Request')}<i class="mint"></i>${t('Respuesta','Response')}</div>
    <div class="phase-control"><label for="phase">${t('Momento de esta etapa','Moment in this chapter')} <output id="phase-value" for="phase">0%</output></label><input id="phase" type="range" min="0" max="1" step=".001" value="0"><div class="phase-buttons"><button type="button" id="phase-start">${t('Inicio','Start')}</button><span id="phase-source"></span><button type="button" id="phase-end">${t('Final','End')}</button></div></div>
   </section>
   <div id="scene-area" class="scene-area"><section class="scene-panel" aria-label="${t('Escena del recorrido de Internet','Internet journey scene')}"><div id="world"></div><div class="scene-meta"><div class="signal-state"><i id="signal-dot"></i><strong id="signal-status"></strong><span id="scene-chapter"></span></div><div class="signal-metric"><span id="metric-label"></span><strong id="metric-value"></strong></div><small>${t('Solo propagación submarina · excluye tierra, colas y aplicación','Submarine propagation only · excludes land, queues and application')}</small></div><p class="scene-limits">${t('Trayecto, escala y velocidad visual ilustrativos','Illustrative route, visual scale and speed')}</p>
    <div class="scene-actions"><button type="button" id="explore">${t('Explorar la escena','Explore the scene')}</button><button type="button" id="capture" hidden>${t('Activar ratón','Enable mouse look')}</button><label><input type="checkbox" id="motion" ${motion?'checked':''}>${t('Viajes de cámara','Camera transitions')}</label></div><p id="look-help" hidden></p><p id="navigation" hidden></p><div class="touch" hidden>${[['forward','↑'],['left','←'],['back','↓'],['right','→'],['up','＋'],['down','−']].map(([d,v])=>`<button type="button" data-move="${d}" aria-label="${({forward:t('Avanzar','Forward'),left:t('Izquierda','Left'),back:t('Retroceder','Back'),right:t('Derecha','Right'),up:t('Subir','Up'),down:t('Bajar','Down')})[d]}">${v}</button>`).join('')}</div>
   </section><p id="ocean-caption" class="ocean-caption" hidden></p></div>
  </div>
  <dialog id="source-dialog"><button type="button" id="close-sources" class="close" aria-label="${t('Cerrar','Close')}">×</button><span class="eyebrow">${t('UN RECORRIDO DOCUMENTADO','A DOCUMENTED JOURNEY')}</span><h2>${t('Infraestructura real. Un recorrido ilustrativo.','Real infrastructure. An illustrative journey.')}</h2><p>${t('MAREA conecta Sopelana y Virginia Beach mediante unos 6.600 km de cable. Las conexiones terrestres hacia Ashburn están documentadas. Madrid, el proveedor, el servidor y sus edificios forman un ejemplo.','MAREA connects Sopelana and Virginia Beach with around 6,600 km of cable. Terrestrial connections toward Ashburn are documented. Madrid, the provider, the server and its buildings form an example.')}</p><ul><li>${t('Las curvas del globo son corredores esquemáticos, no coordenadas del cable tendido. La sección de fibra y los repetidores muestran el principio óptico, no la construcción privada de MAREA.','Globe curves are schematic corridors, not surveyed cable coordinates. The fiber cutaway and repeaters show the optical principle, not MAREA’s private construction details.')}</li><li>${t('HTTPS sobre TCP, con DNS y conexión preparados antes del viaje principal. Una CDN cercana o HTTP/3 cambiarían parte de la historia.','HTTPS over TCP, with DNS and connection setup before the main journey. A nearby CDN or HTTP/3 would change parts of the story.')}</li><li>${t('6.600 km ÷ 200.000 km/s × 1.000 ≈ 33 ms por sentido; ≈ 66 ms de ida y vuelta solo en el tramo submarino. No incluye tierra, colas, equipos, aplicación ni dibujo de la página. No es una latencia medida.','6,600 km ÷ 200,000 km/s × 1,000 ≈ 33 ms one way; ≈ 66 ms round trip for the submarine section alone. Excludes land, queues, equipment, application work and page rendering. It is not measured latency.')}</li><li>${t('Un punto luminoso representa un mensaje cifrado. Los colores distinguen mensajes y longitudes de onda: la luz de telecomunicaciones es infrarroja e invisible. Las distancias y tiempos de animación están adaptados para enseñar; la respuesta puede tomar otro camino.','One light point represents an encrypted message. Colours distinguish messages and wavelengths: telecommunications light is infrared and invisible. Distances and animation timing are adapted for teaching; the response can take another route.')}</li></ul><div class="source-links">${SOURCES.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('')}</div></dialog>`;

 function applyVoice(){
  const clock=player?.clock;if(!clock)return;
  // Automatic chapter gaps create media inside the clock, bypassing page.seek.
  // Give those native Audio instances the saved voice setting before play().
  if(!mutedClocks.has(clock)){const AudioClass=clock.AudioClass;clock.AudioClass=function(...args){const audio=new AudioClass(...args);audio.muted=!voice;return audio;};mutedClocks.add(clock);}
  if(clock.audio)clock.audio.muted=!voice;
 }
 function save(){player?.save();}
 function rebuild(){frame=internetFrameAt(chapter,progress);}
 function paint(dt=0){
  const s=STAGES[chapter];let [n,f]=stageFact(s,es);
  if(chapter===6&&!frame.responseReady){if(!frame.requestArrived){n='HTTPS';f=t('La petición aún no ha llegado','The request has not arrived yet');}else{n=Math.round(frame.processingProgress*100)+'%';f=t('Procesamiento ilustrativo del servicio','Illustrative service processing');}}
  $('place').textContent=txt(s.place);$('title').textContent=txt(s.title);$('caption').textContent=txt(s.caption);$('number').textContent=n;$('fact').textContent=f;
  $('ocean-caption').hidden=chapter!==4;$('scene-area').classList.toggle('has-ocean-caption',chapter===4);$('ocean-caption').textContent=t('Luz infrarroja invisible; colores simbólicos. La cubierta transparente muestra la fibra y una amplificación óptica ilustrativa.','Invisible infrared light; symbolic colours. The transparent jacket reveals the fiber and illustrative optical amplification.');
  $('phase').value=String(progress);$('phase-value').value=$('phase-value').textContent=Math.round(progress*100)+'%';$('phase').setAttribute('aria-valuetext',`${Math.round(progress*100)}% · ${txt(s.title)}`);
  $('phase-source').textContent=source==='manual'?t('Momento fijado','Moment held'):t('Sigue la narración','Follows narration');
  $('signal-status').textContent=internetStatus(frame,es);$('scene-chapter').textContent=`${String(chapter+1).padStart(2,'0')} / 09`;$('signal-dot').className=frame.signal.kind;
  const underwater=Number.isFinite(frame.signal.distanceKm)&&Number.isFinite(frame.signal.travelMs);
  $('metric-label').textContent=underwater?t('Avance por MAREA · modelo','Progress through MAREA · model'):t('Referencia submarina · un sentido','Submarine reference · one way');
  $('metric-value').textContent=underwater?`${Math.round(frame.signal.distanceKm).toLocaleString(es?'es-ES':'en-US')} km · ${frame.signal.travelMs.toFixed(1)} ms`:`${(6600).toLocaleString(es?'es-ES':'en-US')} km · ${frame.signal.submarineOneWayMs} ms`;
  $('motion').checked=motion;$('explore').textContent=exploring?t('Volver a cámara guiada','Return to guided camera'):t('Explorar la escena','Explore the scene');$('explore').setAttribute('aria-pressed',String(exploring));$('capture').hidden=!exploring||coarse;$('capture').textContent=lookActive?t('Ratón activo · Esc','Mouse active · Esc'):t('Activar ratón','Enable mouse look');
  $('look-help').hidden=!exploring;$('look-help').textContent=t('Ratón: mirar · WASD: moverte · Esc: soltar ratón','Mouse: look · WASD: move · Esc: release mouse');
  const nav=world?.getNavigationMode?.()||world?.inspect?.()?.navigation?.mode||'observe';$('navigation').hidden=!exploring;$('navigation').textContent=nav==='walk'?t('Paseo de ejemplo · altura y colisiones limitadas','Example walk · constrained height and collisions'):nav==='orbit'?t('Observación orbital · no es un paseo sobre la Tierra','Orbital observation · not a walk on Earth'):t('Observación libre de una sección ampliada · Q/E: bajar/subir','Free observation of an enlarged cutaway · Q/E: down/up');
  doc.querySelector('.touch').hidden=!exploring||!coarse;doc.body.classList.toggle('returning',frame.signal.kind==='response');
  applyVoice();world?.render(frame,{dt:motion&&!reduced?dt:0,reduced:reduced||!motion,preserveView:exploring});
 }
 function release(){lookActive=false;keys.clear();touch.clear();controls?.release();paint();save();}
 function pause(clearInput=true){player?.pause();if(clearInput){keys.clear();touch.clear();}paint();save();}
 function align(){if(!ready||source!=='manual')return;const clip=player.clock.timeline[chapter];aligning=true;try{player.seek(clip.start+progress*clip.duration,false);}finally{aligning=false;}applyVoice();}
 function setProgress(value){source='manual';player?.pause();progress=bounded(Number(value),0,1);rebuild();paint();align();save();}
 function capture(){return {chapter,progress,source,exploring,motion,voice,camera:world?.getViewState(),transcript:player?.root.querySelector('.ap-transcript').hidden===false};}
 function restore(saved){
  if(!saved||typeof saved!=='object')return;chapter=Math.floor(bounded(Number(saved.chapter),0,8));progress=bounded(Number(saved.progress),0,1);source=saved.source==='manual'?'manual':'narration';exploring=saved.exploring===true;motion=saved.motion==null?!reduced:saved.motion===true;voice=saved.voice!==false;transcriptOpen=saved.transcript===true;rebuild();
  world?.go(chapter,true,{preserveView:true});world?.explore(exploring);if(saved.camera)world?.restoreViewState(saved.camera);restored=true;
 }
 try{world ||= worldFactory($('world'),es);}catch(error){$('world').innerHTML=`<p class="fallback">${t('3D no disponible. Puedes seguir las nueve etapas, el texto y la voz.','3D unavailable. You can follow the nine chapters, transcript and narration.')}</p>`;$('explore').disabled=true;console.error(error);}
 player=new Player({id:'internet-voyage',getClips:language=>STAGES.map(s=>({...VOICES[language].find(c=>c.id===s.id),title:s.title[language==='es'?0:1]})),capture,restore,onSync(s){
  if(!s||aligning||source==='manual'&&(!ready||!player?.wanted)||changingLanguage&&source==='manual')return;
  const changed=chapter!==s.index;chapter=s.index;progress=s.progress;rebuild();if(changed)world?.go(chapter,reduced||!motion,{preserveView:exploring});paint();
 }});
 player.root.setAttribute('aria-label',t('Narración y línea de tiempo del viaje','Journey narration and timeline'));
 const voiceLabel=doc.createElement('label');voiceLabel.className='ap-voice';voiceLabel.innerHTML=`<input type="checkbox" id="voice" ${voice?'checked':''}> ${t('Voz','Voice')}`;player.root.querySelector('.ap-bar').append(voiceLabel);
 const voiceControl=$('voice');voiceControl.checked=voice;voiceControl.onchange=()=>{voice=voiceControl.checked;applyVoice();save();};
 // Interpose page semantics, while every media action still reaches the real player.
 const originalSeek=player.seek.bind(player);player.seek=(seconds,play=player.wanted)=>{if(!aligning&&!changingLanguage)source='narration';originalSeek(seconds,play);applyVoice();};
 const originalToggle=player.toggle.bind(player);player.toggle=()=>{if(!player.running)source='narration';originalToggle();applyVoice();paint();};
 const originalLanguage=player.changeLanguage.bind(player);player.changeLanguage=language=>{const held={chapter,progress,source};changingLanguage=true;try{originalLanguage(language);if(held.source==='manual'){chapter=held.chapter;progress=held.progress;source=held.source;rebuild();}}finally{changingLanguage=false;}applyVoice();paint();save();};
 ready=true;if(!restored){chapter=player.current.index;progress=player.current.progress;rebuild();world?.go(chapter,true);}if(source==='manual'){player.pause();align();}
 player.root.querySelector('.ap-transcript').hidden=!transcriptOpen;player.el('text').setAttribute('aria-expanded',String(transcriptOpen));applyVoice();paint();
 if(world)controls=binder({canvas:world.canvas,document:doc,window:win,coarse,enabled:()=>exploring&&lookActive,onLook(dx,dy){world.look(dx,dy);save();},onActivate(){},onState(state){const locked=state==='locked';if(wasLocked&&!locked){lookActive=false;pause();}wasLocked=locked;}});
 $('phase').oninput=()=>setProgress($('phase').value);$('phase-start').onclick=()=>setProgress(0);$('phase-end').onclick=()=>setProgress(1);
 $('motion').onchange=()=>{motion=$('motion').checked;if(!motion)world?.go(chapter,true,{preserveView:exploring});paint();save();};
 $('explore').onclick=()=>{pause();if(exploring){release();exploring=false;world?.explore(false);}else{exploring=true;world?.explore(true);lookActive=true;world?.canvas.focus?.({preventScroll:true});controls?.request();}paint();save();};
 $('capture').onclick=()=>{lookActive=true;world?.canvas.focus?.({preventScroll:true});controls?.request();paint();save();};
 $('sources').onclick=()=>{pause();release();$('source-dialog').showModal();};$('close-sources').onclick=()=>$('source-dialog').close();
 for(const button of doc.querySelectorAll('[data-move]')){button.onpointerdown=e=>{e.preventDefault();pause(false);touch.add(button.dataset.move);button.setPointerCapture?.(e.pointerId);};button.onpointerup=button.onpointercancel=()=>{touch.delete(button.dataset.move);save();};}
 const interactive=target=>target?.closest?.('input,select,textarea,button,a,dialog')||target?.matches?.('input,select,textarea,button,a,dialog');
 listen(win,'keydown',e=>{if(e.code==='Escape'||e.key==='Escape'){pause();release();return;}if(!exploring||interactive(e.target)||!movementCodes.includes(e.code))return;e.preventDefault();if(!keys.has(e.code))pause(false);keys.add(e.code);});
 listen(win,'keyup',e=>{if(keys.delete(e.code))save();});
 listen(win,'blur',()=>{pause();release();});listen(doc,'visibilitychange',()=>{last=now();if(doc.hidden){pause();release();}});
 function tick(current){if(disposed)return;const dt=bounded((current-last)/1000,0,.05);last=current;if(!doc.hidden){applyVoice();if(exploring){const press=(codes,d)=>codes.some(k=>keys.has(k))||touch.has(d)?1:0;const forward=press(['KeyW','ArrowUp'],'forward')-press(['KeyS','ArrowDown'],'back'),side=press(['KeyD','ArrowRight'],'right')-press(['KeyA','ArrowLeft'],'left'),up=press(['KeyE'],'up')-press(['KeyQ'],'down');if(forward||side||up)world?.move(forward,side,up,dt);}paint(dt);}raf=requestFrame(tick);}
 raf=requestFrame(tick);
 function dispose(){if(disposed)return;save();disposed=true;cancelFrame(raf);controls?.dispose();listeners.forEach(remove=>remove());world?.dispose();player.dispose();}
 listen(win,'pagehide',event=>{save();if(!event?.persisted)dispose();else pause();});
 return {player,world,setProgress,capture,get state(){return {chapter,progress,source,exploring,lookActive,motion,voice,frame,keys:[...keys],touch:[...touch]};},dispose};
}

if(typeof document!=='undefined'&&document.getElementById('app')&&!globalThis.__INTERNET_CONTROLLER_TEST__)createInternetController();
