import {LESSONS} from '../journeys/catalog.js';
import {spawn,rooms,exhibits,stepVisitor,lookDelta,focusedExhibit,portalCrossing,restorePose,roomAt,standAt,routeTo,portalPose,yawLookingAt,SPEED} from './model.js';
import {createMuseum} from './world.js';
import {immersiveHref} from '../immersive/catalog.js';
import {NotebookPlayer} from '../playback/player.js';
import {VOICES} from './voices.js';
const es=document.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.title=t('Atlas · Un museo de mundos','Atlas · A museum of worlds');
const title=e=>es?e.es:e.en;
const explanations={lunar:t('Envía una semilla industrial a la Luna y compara crecimiento ideal con límites de componentes y energía.','Send an industrial seed to the Moon and compare ideal growth with component and power constraints.'),llms:t('Sigue una pregunta desde los tokens hasta la respuesta. Ocho estaciones, matrices que puedes inspeccionar y guía de voz.','Follow a question from tokens to an answer. Eight stations, inspectable matrices and a voice guide.'),mente:t('Explora cómo representamos percepción, memoria y pensamiento.','Explore representations of perception, memory and thought.'),modelos:t('Conoce distintas familias de modelos y sus formas de procesar información.','Meet model families and their different ways of processing information.'),robots:t('Trabajo, producción y crecimiento: descubre el efecto de multiplicar los robots.','Work, production and growth: discover what multiplying robots changes.'),terafab:t('Recorre las etapas de una fábrica de semiconductores.','Follow the stages of a semiconductor factory.'),home:t('Una casa y las tareas que podrían asumir robots e inteligencia artificial.','A home and the tasks robots and AI could take on.'),growth:t('Compara crecimiento lineal y exponencial con números visibles.','Compare linear and exponential growth with visible numbers.'),dyson:t('Imagina cómo una civilización podría recoger energía de su estrella.','Imagine how a civilization could collect energy from its star.'),kardashev:t('Del planeta a la galaxia: una escala basada en energía.','From planet to galaxy: a scale based on energy.'),starlink:t('Satélites, órbitas y comunicación alrededor de la Tierra.','Satellites, orbits and communication around Earth.'),spacex:t('Del lanzamiento a la órbita: vehículos e infraestructura espacial.','From launch to orbit: spacecraft and space infrastructure.')};
for(const [id,l] of Object.entries(LESSONS))explanations[id]=l.challenge[es?0:1];
document.body.classList.add('museum-awaiting');
const worldCount=exhibits.filter(e=>immersiveHref(e.id)).length;
const finePointer=globalThis.matchMedia?.('(pointer: fine)').matches??false;
$('app').innerHTML=`<div id="view" tabindex="0" aria-label="${t('Museo 3D: camina y mira para elegir un cuadro','3D museum: walk and look to choose a painting')}"></div><div class="cross" aria-hidden="true"></div>
<header class="top"><a class="brand" href="../index.html">ATLAS <span>${t('MUSEO DE MUNDOS','MUSEUM OF WORLDS')}</span></a><div id="where"></div><nav><a id="page-language" href="${es?'../../museo/index.html':'../es/museo/index.html'}">${es?'EN':'ES'}</a><button id="mouse">${t('Activar ratón','Enable mouse look')}</button><button id="map-toggle" aria-expanded="false" aria-controls="map">${t('Plano y cuadros','Map & paintings')}</button></nav></header>
<section class="room-context" aria-label="${t('Sala actual','Current gallery')}"><span class="eyebrow" id="room-number"></span><h1 id="room-name"></h1><p id="room-subtitle"></p><button id="narrate">${t('Escuchar esta sala','Listen to this gallery')} ▶</button></section><div class="route-status" id="route-status" role="status"></div>
<aside id="map" class="map" hidden><div class="map-head"><div><span class="eyebrow">ATLAS / ${exhibits.length} ${t('CUADROS','PAINTINGS')}</span><h2>${t('Elige tu recorrido','Choose your path')}</h2></div><button id="map-close" aria-label="${t('Cerrar plano','Close map')}">×</button></div><p class="map-intro">${t('Te llevamos caminando. El ratón sigue siendo tuyo.','We walk you there. You keep control of the view.')}</p><svg id="floorplan" viewBox="-25 -24 50 52" role="img" aria-label="${t('Cuatro salas conectadas por el atrio; el punto blanco eres tú','Four galleries connected by an atrium; the white dot is you')}">${rooms.map(r=>`<rect x="${r.minX}" y="${r.minZ}" width="${r.maxX-r.minX}" height="${r.maxZ-r.minZ}" fill="${r.color}25" stroke="${r.color}" stroke-width=".2"/><text x="${r.x}" y="${r.z}" fill="${r.color}" text-anchor="middle" font-size="1.45">${r.id==='industry'?t('Industria','Industry'):title(r)}</text>`).join('')}<circle id="map-player" cx="0" cy="5" r=".6" fill="white"/><path id="map-direction" d="M0 0 L0 -2" stroke="white" stroke-width=".2"/></svg>
<div class="room-list">${rooms.slice(1).map(r=>`<section><button class="room-link" data-room="${r.id}" style="--accent:${r.color}"><span>${title(r)}</span><small>${r.subtitle[es?0:1]} →</small></button><div class="painting-list">${exhibits.filter(e=>e.room===r.id).map(e=>`<button data-painting="${e.id}"><span>${e.id==='llms'?'LLMs · ':''}${title(e)}</span><small>${immersiveHref(e.id)?t('3D transitable','Walkable 3D'):'Web'}</small></button>`).join('')}</div></section>`).join('')}</div><button id="to-atrium">${t('Volver al atrio','Back to the atrium')}</button></aside>
<aside id="card" class="card" hidden><div class="card-top"><span class="eyebrow" id="card-num"></span><span class="badge" id="card-mode"></span></div><h1 id="card-name"></h1><p id="card-description"></p><div class="actions"><button class="primary" id="enter-3d">${t('Entrar en 3D','Enter 3D')} <span>↗</span></button><a id="web" href="../index.html">${t('Notebook web','Web notebook')} →</a></div><p class="availability" id="availability"></p></aside>
<footer class="bottom"><p id="help">${(finePointer?t('WASD / flechas: caminar · ratón: mirar · E: entrar · Esc: pausar y soltar','WASD / arrows: walk · mouse: look · E: enter · Esc: pause and release'):t('WASD / flechas · Arrastra para mirar · Pulsa un cuadro para acercarte · E para entrar','WASD / arrows · Drag to look · Select a painting to approach · E to enter'))}</p><button id="tour">${t('Visita guiada','Guided visit')} →</button><button id="stop" hidden>${t('Detener paseo','Stop walking')}</button><label><input id="instant" type="checkbox" ${reduced?'checked':''}> ${t('Sin desplazamientos','Instant travel')}</label><label><input id="follow-narration" type="checkbox" checked> ${t('Seguir salas de la voz','Follow narrated galleries')}</label></footer>
<div id="stick" class="stick" role="group" aria-label="${t('Joystick para caminar','Walking joystick')}"><i id="stick-knob"></i><span>↑</span></div><div id="transition" aria-hidden="true"><span id="transition-name"></span></div>
<section id="welcome" class="welcome"><article><span class="eyebrow">ATLAS · ${t('UN MUSEO DE MUNDOS','A MUSEUM OF WORLDS')}</span><h1>${t('Una idea.<br>Todo un mundo.','One idea.<br>A whole world.')}</h1><div class="welcome-counts"><span>4 ${t('salas','galleries')}</span><span>${exhibits.length} ${t('cuadros','paintings')}</span><span>${worldCount} ${t('mundos transitables','walkable worlds')}</span></div><p>${t('Pasea por cuatro salas y descubre veinte cuadros. Los marcos iluminados abren mundos transitables: puedes entrar por dentro o elegir el notebook web.','Wander through four galleries and discover twenty paintings. Illuminated frames open walkable worlds: step inside or choose the web notebook.')}</p><div class="actions"><button id="start" class="primary">${t('Entrar al museo','Enter the museum')} →</button><button id="start-llms">${t('Llévame a LLMs','Take me to LLMs')}</button></div><small>${t('WASD o joystick para caminar. Ratón o arrastre para mirar. Abajo puedes pausar, leer y mover el tiempo de la voz.','WASD or joystick to walk. Mouse look or drag to look around. Below, pause, read along and seek the narration.')}</small></article></section>`;

$('page-language').href+=location.search;
let player={...spawn},world,started=false,last=performance.now(),path=[],destination=null,arrival=null,portal=null,selected=null,tourStep=-1,drag=null,uiTime=0;
let autoAim=true,freeLook=false,wasLocked=false,pointerLast=null,notebook,notebookReady=false,holdPose=false,changingVoice=false,restored=false,savedEntry='';
let velocity={forward:0,strafe:0};
const keys=new Set(),stick={id:null,x:0,y:0,ox:0,oy:0},frameTimes=[];
const entryId=()=>new URLSearchParams(location.search).get('pieza')||location.hash.slice(1);
const locked=()=>!!world&&document.pointerLockElement===world.dom;
const controls=target=>target.closest?.('input,select,textarea');
const roomIndex=id=>VOICES[notebook?.language||(es?'es':'en')].findIndex(c=>c.id===id);
const roomPose=id=>id==='hall'?{...spawn}:({mind:{x:0,z:-13,yaw:0,pitch:.08},industry:{x:-14,z:1,yaw:Math.PI/2,pitch:.08},cosmos:{x:14,z:1,yaw:0,pitch:.08},life:{x:0,z:17,yaw:Math.PI,pitch:.08}}[id]);
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=null;velocity={forward:0,strafe:0};drag=null;pointerLast=null;$('stick-knob').style.transform='translate(-50%,-50%)';}
function stopWalk(pauseVoice=true){path=[];destination=null;arrival=null;resetInput();if(pauseVoice)notebook?.pause();$('stop').hidden=true;$('route-status').textContent='';}
function renderMouse(){const active=locked()||freeLook;$('mouse').textContent=active?(locked()?t('Ratón capturado · Esc','Mouse captured · Esc'):t('Ratón activo · Esc','Mouse look active · Esc')):t('Activar ratón','Enable mouse look');$('mouse').setAttribute('aria-pressed',String(active));document.body.classList.toggle('looking',active);}
function releaseLook(){freeLook=false;pointerLast=null;document.exitPointerLock?.();renderMouse();}
function lockLook(){if(!finePointer||portal||!world)return;freeLook=true;$('view').focus?.();renderMouse();try{Promise.resolve(world.lookLock?.()).catch(()=>{if(freeLook)$('route-status').textContent=t('Ratón activo sobre la escena · Esc para soltar','Mouse look active over the scene · Esc to release');renderMouse();});}catch{renderMouse();}}
function mapOpen(open){$('map').hidden=!open;$('map-toggle').setAttribute('aria-expanded',String(open));if(open){stopWalk();releaseLook();}}
function begin(autoplay=false){started=true;$('welcome').hidden=true;document.body.classList.remove('museum-awaiting');paint();if(autoplay&&notebook&&!notebook.running)notebook.toggle();}
function moveTo(target,label,callback=null){
 stopWalk();mapOpen(false);autoAim=true;arrival=callback;path=routeTo(player,target);destination=path.at(-1);
 if(!path.length){const done=arrival;arrival=null;destination=null;done?.();return;}
 if($('instant').checked){player={...player,...destination};path=[];destination=null;const done=arrival;arrival=null;done?.();paint();notebook?.save();return;}
 $('route-status').textContent=t('Caminando hacia ','Walking to ')+label;$('stop').hidden=false;
}
function narrateRoom(id){const i=roomIndex(id);if(i<0)return;holdPose=true;notebook.stage(i,true);holdPose=false;}
function approach(e,narrate=false){if(!e)return;begin();moveTo(standAt(e),title(e),()=>{if(narrate)narrateRoom(e.room);});}
function enterPainting(e){
 const href=e&&immersiveHref(e.id);if(!href||portal)return;
 if(focusedExhibit(player,24)?.id!==e.id){approach(e);return;}
 if(Math.hypot(player.x-e.x,player.z-e.z)>(e.stand||3.2)+.5){approach(e);return;}
 stopWalk();mapOpen(false);releaseLook();portal={exhibit:e,href:href+'&entrance=painting',from:{...player},elapsed:0,duration:reduced?.25:1.65,progress:0};
 notebook?.save();$('transition-name').textContent=title(e);document.body.classList.add('crossing');
}
function cancelPortal(){if(!portal)return;player={...portal.from};portal=null;document.body.classList.remove('crossing');$('transition').style.opacity='0';paint();notebook?.save();}
function paint(){
 const room=roomAt(player.x,player.z)||rooms[0],index=rooms.indexOf(room),count=exhibits.filter(e=>e.room===room.id).length;
 $('where').textContent=`${exhibits.length} ${t('cuadros','paintings')} · ${worldCount} ${t('mundos','worlds')}`;
 Object.assign($('where').dataset,{x:player.x.toFixed(3),z:player.z.toFixed(3),yaw:String(player.yaw),pitch:String(player.pitch),room:room.id});
 $('room-number').textContent=index?`${String(index).padStart(2,'0')} / 04 · ${count} ${t('CUADROS','PAINTINGS')}`:t('TU PUNTO DE PARTIDA','YOUR STARTING POINT');
 $('room-name').textContent=title(room);$('room-subtitle').textContent=room.subtitle[es?0:1];$('room-name').style.color=room.color;
 $('narrate').textContent=notebook?.running&&notebook.current?.id===room.id?t('Pausar voz de sala','Pause gallery voice'):t('Escuchar esta sala','Listen to this gallery')+' ▶';
 $('map-player').setAttribute('cx',player.x);$('map-player').setAttribute('cy',player.z);$('map-direction').setAttribute('transform',`translate(${player.x} ${player.z}) rotate(${-player.yaw*180/Math.PI})`);
 selected=started&&!portal?focusedExhibit(player,5.5):null;$('card').hidden=!selected;
 if(selected){const available=!!immersiveHref(selected.id);$('card-num').textContent=title(room)+' / '+selected.num;$('card-name').textContent=title(selected);$('card-description').textContent=explanations[selected.id];$('card-mode').textContent=available?t('3D TRANSITABLE','WALKABLE 3D'):'NOTEBOOK WEB';$('enter-3d').hidden=!available;$('web').href=selected.href;$('availability').textContent=available?t('E para entrar · o camina hacia el lienzo','E to enter · or walk toward the canvas'):t('Abre su explicación desde el notebook web.','Open its explanation in the web notebook.');}
}
try{world=createMuseum($('view'),es);}catch(error){$('welcome').innerHTML=`<article><h1>${t('Abre los notebooks web','Open the web notebooks')}</h1><p>${t('Este navegador no ha podido iniciar la vista 3D.','This browser could not start the 3D view.')}</p><a href="../index.html">Atlas →</a></article>`;console.error(error);}
notebook=new NotebookPlayer({id:'museum',autoplay:false,getClips:language=>VOICES[language],
 capture:()=>({pose:portal?portal.from:{...player},started,instant:$('instant').checked,followNarration:$('follow-narration').checked,entry:entryId()}),
 restore(saved){if(!saved)return;player=restorePose(saved.pose);started=saved.started===true;restored=true;savedEntry=typeof saved.entry==='string'?saved.entry:'';$('instant').checked=typeof saved.instant==='boolean'?saved.instant:reduced;$('follow-narration').checked=saved.followNarration!==false;},
 onLanguage(){changingVoice=notebookReady;},
 onSync(s){if(!s||!notebookReady)return;if(s.reason==='seek'&&!holdPose&&!changingVoice&&$('follow-narration').checked){stopWalk(false);player={...roomPose(s.id)};begin();}changingVoice=false;paint();}
});
notebookReady=true;
$('narrate').onclick=()=>{begin();const id=(roomAt(player.x,player.z)||rooms[0]).id;if(notebook.running&&notebook.current?.id===id)notebook.pause();else if(notebook.current?.id===id)notebook.toggle();else narrateRoom(id);paint();};
$('follow-narration').onchange=()=>notebook.save();$('instant').onchange=()=>notebook.save();
$('start').onclick=()=>{begin(true);lockLook();};$('start-llms').onclick=()=>approach(exhibits.find(e=>e.id==='llms'));
$('map-toggle').onclick=()=>mapOpen($('map').hidden);$('map-close').onclick=()=>mapOpen(false);
$('stop').onclick=()=>{tourStep=-1;stopWalk();$('tour').textContent=t('Visita guiada','Guided visit')+' →';};
$('enter-3d').onclick=()=>{paint();enterPainting(selected);};
$('mouse').onclick=()=>{begin();mapOpen(false);if(locked()||freeLook)releaseLook();else lockLook();};
document.addEventListener('pointerlockchange',()=>{const now=locked();if(wasLocked&&!now)freeLook=false;wasLocked=now;pointerLast=null;renderMouse();});
$('to-atrium').onclick=()=>{begin();moveTo(spawn,t('Atrio','Atrium'));};
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{begin();const r=rooms.find(r=>r.id===b.dataset.room);moveTo(roomPose(r.id),title(r));});
document.querySelectorAll('[data-painting]').forEach(b=>b.onclick=()=>approach(exhibits.find(e=>e.id===b.dataset.painting)));
const tour=['internet','electricity','kardashev','cell'];
$('tour').onclick=()=>{tourStep=(tourStep+1)%tour.length;approach(exhibits.find(e=>e.id===tour[tourStep]),true);$('tour').textContent=(tourStep===tour.length-1?t('Repetir visita','Repeat visit'):t('Siguiente sala','Next gallery'))+' →';};
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){cancelPortal();stopWalk();mapOpen(false);releaseLook();return;}
 if(!started||controls(e.target)||portal)return;
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!keys.has(e.code)){if(path.length)stopWalk();else notebook.pause();keys.add(e.code);}}
 if(e.code==='KeyE'&&!e.repeat){paint();enterPainting(selected);}
 if(e.code==='KeyN'&&!e.repeat&&tourStep>=0)$('tour').click();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function look(dx,dy){if(portal||!started||!Number.isFinite(dx)||!Number.isFinite(dy))return;autoAim=false;Object.assign(player,lookDelta(player.yaw,player.pitch,dx,dy));}
window.addEventListener('mousemove',e=>{if(locked())look(e.movementX,e.movementY);});
$('view').addEventListener('pointerdown',e=>{if(!started||portal||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};$('view').setPointerCapture(e.pointerId);});
$('view').addEventListener('pointermove',e=>{
 if(locked()||portal)return;
 if(freeLook&&e.pointerType!=='touch'){
  const previous=pointerLast;pointerLast={x:e.clientX,y:e.clientY};if(!previous)return;
  const dx=Number.isFinite(e.movementX)?e.movementX:e.clientX-previous.x,dy=Number.isFinite(e.movementY)?e.movementY:e.clientY-previous.y;
  if(drag&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;
  look(dx,dy);pointerLast={x:e.clientX,y:e.clientY};return;
 }
 if(!drag)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;
 if(drag.moved)look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;
});
$('view').addEventListener('pointerleave',()=>pointerLast=null);
$('view').addEventListener('pointerup',e=>{
 if(drag&&!drag.moved&&!portal){const r=$('view').getBoundingClientRect(),hit=locked()||freeLook?world?.pick(r.left+r.width/2,r.top+r.height/2):world?.pick(e.clientX,e.clientY);
  if(hit?.exhibit){paint();if(selected?.id===hit.exhibit.id&&immersiveHref(selected.id))enterPainting(selected);else approach(hit.exhibit);}else if(hit?.point)moveTo(hit.point,t('ese punto','that point'));
 }drag=null;
});
$('view').addEventListener('pointercancel',()=>{drag=null;});
$('stick').addEventListener('pointerdown',e=>{e.preventDefault();begin();stopWalk();stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;$('stick').setPointerCapture(e.pointerId);});
$('stick').addEventListener('pointermove',e=>{if(stick.id!==e.pointerId)return;const x=(e.clientX-stick.ox)/36,y=(stick.oy-e.clientY)/36,n=Math.max(1,Math.hypot(x,y));stick.x=x/n;stick.y=y/n;$('stick-knob').style.transform=`translate(calc(-50% + ${stick.x*28}px),calc(-50% - ${stick.y*28}px))`;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(event,resetInput);
window.addEventListener('blur',()=>{stopWalk();releaseLook();notebook.save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWalk();releaseLook();notebook.save();}last=performance.now();});
window.addEventListener('pagehide',()=>{stopWalk();releaseLook();cancelPortal();notebook.save();});
window.addEventListener('pageshow',()=>{last=performance.now();resetInput();paint();});
function request(initial=false){const e=exhibits.find(e=>e.id===entryId());if(!e||initial&&restored&&started&&savedEntry===e.id)return;player=standAt(e);begin();if(notebook.current?.id!==e.room){holdPose=true;notebook.stage(roomIndex(e.room),false);holdPose=false;}else notebook.pause();}
request(true);if(started)begin();paint();renderMouse();window.addEventListener('hashchange',()=>request());
function frame(now){const rawDt=Math.max(0,(now-last)/1000),dt=Math.min(.05,rawDt);last=now;
 if(!document.hidden&&world){
  if(portal){portal.elapsed+=dt;portal.progress=Math.min(1,portal.elapsed/portal.duration);player=portalPose(portal.from,portal.exhibit,portal.progress);$('transition').style.opacity=String(Math.max(0,(portal.progress-.62)/.38));if(portal.progress===1&&!portal.navigating){portal.navigating=true;location.assign(portal.href);}}
  else if(started){
   if(path.length){const p=path[0],dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),step=Math.min(d,SPEED*dt);
    if(d>.025){player.x+=dx/d*step;player.z+=dz/d*step;if(autoAim){const targetYaw=d<3&&path.length===1&&p.yaw!==undefined?p.yaw:yawLookingAt(dx,dz);player.yaw+=Math.atan2(Math.sin(targetYaw-player.yaw),Math.cos(targetYaw-player.yaw))*Math.min(1,dt*5);player.pitch+=(.04-player.pitch)*dt*3;}}
    if(d<.08){player.x=p.x;player.z=p.z;path.shift();if(!path.length){if(autoAim){if(p.yaw!==undefined)player.yaw=p.yaw;if(p.pitch!==undefined)player.pitch=p.pitch;}destination=null;$('stop').hidden=true;$('route-status').textContent='';const done=arrival;arrival=null;done?.();notebook.save();}}
   }else{const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+stick.y,s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x,a=1-Math.exp(-dt*14);
    velocity.forward+=(f-velocity.forward)*a;velocity.strafe+=(s-velocity.strafe)*a;const before={...player};Object.assign(player,stepVisitor(player,{x:-Math.sin(player.yaw),z:-Math.cos(player.yaw)},{x:Math.cos(player.yaw),z:-Math.sin(player.yaw)},velocity,dt));
    if(f>.3){const crossed=portalCrossing(before,player);if(crossed)enterPainting(crossed);}
   }
  }
  selected=started&&!portal?focusedExhibit(player,5.5):null;world.render(player,selected?.id,dt,portal,destination);
  if(rawDt>0&&rawDt<.25){frameTimes.push(rawDt*1000);if(frameTimes.length>120)frameTimes.shift();}
  uiTime+=dt;if(uiTime>.1){uiTime=0;paint();const times=[...frameTimes].sort((a,b)=>a-b);if(times.length){$('view').dataset.frameMedian=times[Math.floor(times.length*.5)].toFixed(2);$('view').dataset.frameP95=times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(2);}if(world.stats)Object.assign($('view').dataset,{drawCalls:String(world.stats.calls),triangles:String(world.stats.triangles),textures:String(world.stats.textures)});}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
