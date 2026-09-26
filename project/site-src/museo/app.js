import {spawn,rooms,exhibits,stepVisitor,lookDelta,nearestExhibit,roomAt,standAt,routeTo,portalPose,yawLookingAt,SPEED} from './model.js';
import {createMuseum} from './world.js';
import {immersiveHref} from '../immersive/catalog.js';
import {StepGuide} from '../llms/guide.js';
import {VOICES} from './voices.js';
const es=document.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.title=t('Atlas · Un museo de mundos','Atlas · A museum of worlds');
const title=e=>es?e.es:e.en;
const explanations={llms:t('Sigue una pregunta desde los tokens hasta la respuesta. Ocho estaciones, matrices que puedes inspeccionar y guía de voz.','Follow a question from tokens to an answer. Eight stations, inspectable matrices and a voice guide.'),mente:t('Explora cómo representamos percepción, memoria y pensamiento.','Explore representations of perception, memory and thought.'),modelos:t('Conoce distintas familias de modelos y sus formas de procesar información.','Meet model families and their different ways of processing information.'),robots:t('Trabajo, producción y crecimiento: descubre el efecto de multiplicar los robots.','Work, production and growth: discover what multiplying robots changes.'),terafab:t('Recorre las etapas de una fábrica de semiconductores.','Follow the stages of a semiconductor factory.'),home:t('Una casa y las tareas que podrían asumir robots e inteligencia artificial.','A home and the tasks robots and AI could take on.'),growth:t('Compara crecimiento lineal y exponencial con números visibles.','Compare linear and exponential growth with visible numbers.'),dyson:t('Imagina cómo una civilización podría recoger energía de su estrella.','Imagine how a civilization could collect energy from its star.'),kardashev:t('Del planeta a la galaxia: una escala basada en energía.','From planet to galaxy: a scale based on energy.'),starlink:t('Satélites, órbitas y comunicación alrededor de la Tierra.','Satellites, orbits and communication around Earth.'),spacex:t('Del lanzamiento a la órbita: vehículos e infraestructura espacial.','From launch to orbit: spacecraft and space infrastructure.')};
$('app').innerHTML=`<div id="view" tabindex="0" aria-label="${t('Museo 3D: arrastra para mirar y pulsa un cuadro para acercarte','3D museum: drag to look and select a painting to approach')}"></div><div class="cross" aria-hidden="true"></div>
<header class="top"><a class="brand" href="../index.html">ATLAS <span>${t('MUSEO DE MUNDOS','MUSEUM OF WORLDS')}</span></a><div id="where"></div><nav><a href="${es?'../../museo/index.html':'../es/museo/index.html'}">${es?'EN':'ES'}</a><button id="mouse">${t('Mirar con ratón','Mouse look')}</button><button id="map-toggle" aria-expanded="false" aria-controls="map">${t('Plano y cuadros','Map & paintings')}</button></nav></header>
<div class="route-status" id="route-status" role="status"></div>
<aside id="map" class="map" hidden><div class="map-head"><div><span class="eyebrow">ATLAS / 01</span><h2>${t('Elige tu recorrido','Choose your path')}</h2></div><button id="map-close" aria-label="${t('Cerrar plano','Close map')}">×</button></div><svg id="floorplan" viewBox="-25 -24 50 34" role="img" aria-label="${t('Tres salas conectadas por el atrio; el punto blanco eres tú','Three galleries connected by an atrium; the white dot is you')}">${rooms.map(r=>`<rect x="${r.minX}" y="${r.minZ}" width="${r.maxX-r.minX}" height="${r.maxZ-r.minZ}" fill="${r.color}25" stroke="${r.color}" stroke-width=".2"/><text x="${r.x}" y="${r.z}" fill="${r.color}" text-anchor="middle" font-size="1.45">${r.id==='industry'?t('Industria','Industry'):title(r)}</text>`).join('')}<circle id="map-player" cx="0" cy="5" r=".6" fill="white"/><path id="map-direction" d="M0 0 L0 -2" stroke="white" stroke-width=".2"/></svg>
<div class="room-list">${rooms.slice(1).map(r=>`<section><button class="room-link" data-room="${r.id}" style="--accent:${r.color}"><span>${title(r)}</span><small>${r.subtitle[es?0:1]} →</small></button><div class="painting-list">${exhibits.filter(e=>e.room===r.id).map(e=>`<button data-painting="${e.id}"><span>${e.id==='llms'?'LLMs · ':''}${title(e)}</span><small>${immersiveHref(e.id)?'3D':'Web'}</small></button>`).join('')}</div></section>`).join('')}</div><button id="to-atrium">${t('Volver al atrio','Back to the atrium')}</button></aside>
<aside id="card" class="card" hidden><div class="card-top"><span class="eyebrow" id="card-num"></span><span class="badge" id="card-mode"></span></div><h1 id="card-name"></h1><p id="card-description"></p><div class="actions"><button class="primary" id="enter-3d">${t('Entrar en el cuadro','Enter the painting')} <span>↗</span></button><a id="web" href="../index.html">${t('Notebook web','Web notebook')} →</a></div><p class="availability" id="availability"></p></aside>
<footer class="bottom"><p id="help">${t('WASD / flechas · Arrastra para mirar · Pulsa un cuadro para acercarte · E para entrar','WASD / arrows · Drag to look · Select a painting to approach · E to enter')}</p><button id="tour">${t('Visita guiada','Guided visit')} →</button><button id="stop" hidden>${t('Detener paseo','Stop walking')}</button><label><input id="instant" type="checkbox" ${reduced?'checked':''}> ${t('Sin desplazamientos','Instant travel')}</label></footer>
<div id="stick" class="stick" role="group" aria-label="${t('Joystick para caminar','Walking joystick')}"><i id="stick-knob"></i><span>↑</span></div><div id="transition" aria-hidden="true"><span id="transition-name"></span></div>
<section id="welcome" class="welcome"><article><span class="eyebrow">ATLAS · ${t('UN MUSEO DE MUNDOS','A MUSEUM OF WORLDS')}</span><h1>${t('Las ideas tienen<br>un lugar.','Ideas have<br>a place.')}</h1><p>${t('Pasea por tres salas. Descubre un tema en cada cuadro. El marco iluminado de LLMs es una puerta: puedes atravesarlo y explorar su mundo en 3D.','Wander through three galleries. Discover a topic in every painting. The glowing LLM frame is a doorway: step through and explore its 3D world.')}</p><div class="actions"><button id="start" class="primary">${t('Entrar al museo','Enter the museum')} →</button><button id="start-llms">${t('Llévame a LLMs','Take me to LLMs')}</button></div><small>${t('Camina con WASD o el joystick. Arrastra para mirar. También puedes elegir un cuadro desde el plano.','Walk with WASD or the joystick. Drag to look. You can also choose a painting from the map.')}</small></article></section>`;
let player={...spawn},world,started=false,last=performance.now(),path=[],destination=null,arrival=null,portal=null,selected=null,tourStep=-1,drag=null,uiTime=0,velocity={forward:0,strafe:0};
const keys=new Set(),stick={id:null,x:0,y:0,ox:0,oy:0};
const voiceHost=document.createElement('aside');voiceHost.className='museum-audio';voiceHost.innerHTML=`<div><button id="narrate">${t('Escuchar sala','Listen to gallery')}</button><select id="voice-language" aria-label="${t('Idioma de la voz','Voice language')}"><option value="es" ${es?'selected':''}>ES</option><option value="en" ${es?'':'selected'}>EN</option></select></div><span id="voice-state" role="status"></span><details><summary>${t('Texto de la voz','Voice transcript')}</summary><p id="voice-transcript"></p></details>`;$('app').append(voiceHost);
let voiceLanguage=es?'es':'en';
const getClip=()=>VOICES[voiceLanguage].find(c=>c.id===(roomAt(player.x,player.z)?.id||'hall'));
function renderVoice(){const clip=guide.clip||getClip();$('voice-transcript').textContent=clip.text;$('narrate').textContent=guide.running?t('Pausar voz','Pause voice'):t('Escuchar sala','Listen to gallery');$('voice-state').textContent=({loading:t('Cargando…','Loading…'),speaking:'MiniMax',paused:t('En pausa','Paused'),error:t('No se pudo cargar. Pulsa para reintentar.','Could not load. Press to retry.'),blocked:t('Pulsa escuchar para permitir el audio.','Press listen to allow audio.')})[guide.state]||'';}
const guide=new StepGuide({getClip,onAdvance:()=>false,onChange:renderVoice});guide.automatic=false;
$('narrate').onclick=()=>{if(guide.running)guide.pause();else if(guide.state==='ready')guide.replay();else guide.resume();};$('voice-language').onchange=e=>{voiceLanguage=e.target.value;const active=guide.running;guide.stop();if(active)guide.enter();renderVoice();};
try{world=createMuseum($('view'),es);}catch(error){$('welcome').innerHTML=`<article><h1>${t('Abre los notebooks web','Open the web notebooks')}</h1><p>${t('Este navegador no ha podido iniciar la vista 3D.','This browser could not start the 3D view.')}</p><a href="../index.html">Atlas →</a></article>`;console.error(error);}
const controls=target=>target.closest?.('input,select,textarea');
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=null;velocity={forward:0,strafe:0};$('stick-knob').style.transform='translate(-50%,-50%)';}
function stopWalk(){path=[];destination=null;arrival=null;resetInput();guide.pause();$('stop').hidden=true;$('route-status').textContent='';}
function mapOpen(open){$('map').hidden=!open;$('map-toggle').setAttribute('aria-expanded',String(open));if(open){stopWalk();document.exitPointerLock?.();}}
function begin(){started=true;$('welcome').hidden=true;}
function moveTo(target,label,callback=null){
  stopWalk();mapOpen(false);arrival=callback;path=routeTo(player,target);destination=path.at(-1);
  if(!path.length){arrival?.();arrival=null;destination=null;return;}
  if($('instant').checked){player={...player,...destination};arrival?.();arrival=null;destination=null;path=[];paint();return;}
  $('route-status').textContent=t('Caminando hacia ','Walking to ')+label;$('stop').hidden=false;
}
function approach(e,narrate=false){begin();selected=e;moveTo(standAt(e),title(e),()=>{selected=e;if(narrate)guide.enter();});}
function enterPainting(e){
  const href=e&&immersiveHref(e.id);if(!href||portal)return;
  if(Math.hypot(player.x-e.x,player.z-e.z)>(e.stand||3.2)+.5){approach(e);return;}
  stopWalk();mapOpen(false);document.exitPointerLock?.();portal={exhibit:e,href:href+'&entrance=painting',from:{...player},elapsed:0,duration:reduced?.25:1.65,progress:0};
  $('transition-name').textContent=title(e);document.body.classList.add('crossing');
}
function paint(){
  const room=roomAt(player.x,player.z)||rooms[0];$('where').textContent=title(room);$('where').dataset.x=player.x.toFixed(3);$('where').dataset.z=player.z.toFixed(3);$('where').dataset.room=room.id;
  if(guide.clip&&guide.clip.id!==room.id)guide.stop();
  $('map-player').setAttribute('cx',player.x);$('map-player').setAttribute('cy',player.z);$('map-direction').setAttribute('transform',`translate(${player.x} ${player.z}) rotate(${-player.yaw*180/Math.PI})`);
  const near=nearestExhibit(player.x,player.z,-Math.sin(player.yaw),-Math.cos(player.yaw),5.5);
  selected=near;$('card').hidden=!near||!!portal||!started;
  if(near){const available=!!immersiveHref(near.id);$('card-num').textContent=title(rooms.find(r=>r.id===near.room))+' / '+near.num;$('card-name').textContent=title(near);$('card-description').textContent=explanations[near.id];$('card-mode').textContent=available?t('MUNDO 3D','3D WORLD'):'NOTEBOOK';$('enter-3d').hidden=!available;$('web').href=near.href;$('availability').textContent=available?t('Pulsa E o entra por el marco. Puedes volver al mismo cuadro.','Press E or step through the frame. You can return to this painting.'):t('Experiencia web disponible. El interior inmersivo se construirá en una próxima etapa.','Web experience available. Its immersive interior will be built in a future stage.');}
}
$('start').onclick=begin;$('start-llms').onclick=()=>approach(exhibits.find(e=>e.id==='llms'));
$('map-toggle').onclick=()=>mapOpen($('map').hidden);$('map-close').onclick=()=>mapOpen(false);
$('stop').onclick=()=>{tourStep=-1;stopWalk();$('tour').textContent=t('Visita guiada','Guided visit')+' →';};
$('enter-3d').onclick=()=>enterPainting(selected);
$('mouse').onclick=()=>{begin();mapOpen(false);Promise.resolve(world?.lookLock()).catch(()=>{$('route-status').textContent=t('Arrastra la escena para mirar.','Drag the scene to look.');});};
$('to-atrium').onclick=()=>{begin();moveTo(spawn,t('Atrio','Atrium'));};
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{begin();const r=rooms.find(r=>r.id===b.dataset.room);moveTo({x:r.x,z:r.z,yaw:r.id==='industry'?Math.PI/2:r.id==='cosmos'?-Math.PI/2:0,pitch:.08},title(r));});
document.querySelectorAll('[data-painting]').forEach(b=>b.onclick=()=>approach(exhibits.find(e=>e.id===b.dataset.painting)));
const tour=['llms','robots','kardashev'];$('tour').onclick=()=>{tourStep=(tourStep+1)%tour.length;approach(exhibits.find(e=>e.id===tour[tourStep]),true);$('tour').textContent=(tourStep===tour.length-1?t('Repetir visita','Repeat visit'):t('Siguiente sala','Next gallery'))+' →';};
window.addEventListener('keydown',e=>{
  if(!started||controls(e.target)||portal)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(path.length)stopWalk();keys.add(e.code);}
  if(e.code==='KeyE'&&!e.repeat)enterPainting(selected);
  if(e.code==='Escape'){stopWalk();mapOpen(false);document.exitPointerLock?.();}
});window.addEventListener('keyup',e=>keys.delete(e.code));
function look(dx,dy){if(portal)return;if(path.length)stopWalk();Object.assign(player,lookDelta(player.yaw,player.pitch,dx,dy));}
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===world?.dom)look(e.movementX,e.movementY);});
$('view').addEventListener('pointerdown',e=>{if(!started||portal||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};$('view').setPointerCapture(e.pointerId);});
$('view').addEventListener('pointermove',e=>{if(!drag||document.pointerLockElement)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;if(drag.moved)look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;});
$('view').addEventListener('pointerup',e=>{if(drag&&!drag.moved&&!portal){const hit=world?.pick(e.clientX,e.clientY);if(hit?.exhibit){if(selected?.id===hit.exhibit.id&&immersiveHref(selected.id))enterPainting(selected);else approach(hit.exhibit);}else if(hit?.point)moveTo(hit.point,t('ese punto','that point'));}drag=null;});
$('view').addEventListener('pointercancel',()=>{drag=null;});
$('stick').addEventListener('pointerdown',e=>{e.preventDefault();begin();stopWalk();stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;$('stick').setPointerCapture(e.pointerId);});
$('stick').addEventListener('pointermove',e=>{if(stick.id!==e.pointerId)return;const x=(e.clientX-stick.ox)/36,y=(stick.oy-e.clientY)/36,n=Math.max(1,Math.hypot(x,y));stick.x=x/n;stick.y=y/n;$('stick-knob').style.transform=`translate(calc(-50% + ${stick.x*28}px),calc(-50% - ${stick.y*28}px))`;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(event,resetInput);
window.addEventListener('blur',stopWalk);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWalk();last=performance.now();});
window.addEventListener('pagehide',()=>{stopWalk();guide.stop();if(portal){player={...portal.from};portal=null;document.body.classList.remove('crossing');$('transition').style.opacity=0;}});
window.addEventListener('pageshow',()=>{last=performance.now();});
function request(){const id=new URLSearchParams(location.search).get('pieza')||location.hash.slice(1);const e=exhibits.find(e=>e.id===id);if(e){player=standAt(e);begin();paint();}}
request();renderVoice();window.addEventListener('hashchange',request);
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!document.hidden&&world){
    if(!portal)guide.tick(dt);
    if(portal){portal.elapsed+=dt;portal.progress=Math.min(1,portal.elapsed/portal.duration);player=portalPose(portal.from,portal.exhibit,portal.progress);$('transition').style.opacity=String(Math.max(0,(portal.progress-.62)/.38));if(portal.progress===1&&!portal.navigating){portal.navigating=true;location.assign(portal.href);}}
    else if(started){
      if(path.length){const p=path[0],dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),step=Math.min(d,SPEED*dt);
        if(d>.025){player.x+=dx/d*step;player.z+=dz/d*step;const targetYaw=d<3&&path.length===1&&p.yaw!==undefined?p.yaw:yawLookingAt(dx,dz);player.yaw+=Math.atan2(Math.sin(targetYaw-player.yaw),Math.cos(targetYaw-player.yaw))*Math.min(1,dt*5);player.pitch+=(.04-player.pitch)*dt*3;}
        if(d<.08){player.x=p.x;player.z=p.z;path.shift();if(!path.length){if(p.yaw!==undefined)player.yaw=p.yaw;if(p.pitch!==undefined)player.pitch=p.pitch;arrival?.();arrival=null;destination=null;$('stop').hidden=true;$('route-status').textContent='';}}
      }else{const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+stick.y,s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x;const a=1-Math.exp(-dt*14);velocity.forward+=(f-velocity.forward)*a;velocity.strafe+=(s-velocity.strafe)*a;Object.assign(player,stepVisitor(player,{x:-Math.sin(player.yaw),z:-Math.cos(player.yaw)},{x:Math.cos(player.yaw),z:-Math.sin(player.yaw)},velocity,dt));
        const threshold=nearestExhibit(player.x,player.z,-Math.sin(player.yaw),-Math.cos(player.yaw),.8);if(f>.3&&threshold&&immersiveHref(threshold.id))enterPainting(threshold);
      }
    }
    world.render(player,selected?.id,dt,portal,destination);uiTime+=dt;if(uiTime>.1){uiTime=0;paint();}
  }requestAnimationFrame(frame);
}requestAnimationFrame(frame);
