import {createFlight,tickFlight,stepAt,nextStep,progress,payloadMass,lightPayloadPenalty,SNAPSHOT,FALCON_STEPS,STARSHIP_STEPS} from './model.js';
import {createSpaceWorld} from './world.js';
const es=document.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>document.getElementById(id);
const nf=new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:0}),fmt=x=>nf.format(x);
let state=createFlight('falcon'),world,last=performance.now(),domAt=0;
document.title=t('SpaceX — Reutilizar el primer tramo','SpaceX — Reuse the first stage');
$('app').innerHTML=`<nav class="nav"><a href="../index.html">← Atlas</a><a href="../starlink/index.html">Starlink</a><a href="../dyson/index.html">${t('Dyson','Dyson')}</a><span><a href="${es?'../../spacex/index.html':'./index.html'}" lang="en">EN</a> / <a href="${es?'./index.html':'../es/spacex/index.html'}" lang="es">ES</a></span></nav>
<header><div><span class="eyebrow">${t('NOTEBOOK 06 · LANZAMIENTO REUTILIZABLE','NOTEBOOK 06 · REUSABLE LAUNCH')}</span><h1>${t('El tramo caro<br>tiene que volver.','The expensive stage<br>has to come back.')}</h1></div><p>${t('Falcon 9 demostró que el primer tramo se puede aterrizar y volver a volar. Starship intenta lo mismo con las dos etapas y una torre que lo coge. Pulsa reproducir y sigue los minutos.','Falcon 9 showed that the first stage can land and fly again. Starship tries the same with both stages and a tower that catches it. Press play and follow the minutes.')}</p></header>
<section class="dashboard">
<article><span>${t('Carga a LEO','Payload to LEO')}</span><strong id="payload"></strong><small id="payload-note"></small></article>
<article><span>${t('Tiempo de vuelo','Mission time')}</span><strong id="clock"></strong><small id="clock-note"></small></article>
<article><span>${t('Reutilización (2026)','Reuse (2026)')}</span><strong>${SNAPSHOT.boosterRecord}×</strong><small>B1067 · ${t('récord de un booster Falcon 9','Falcon 9 booster record')}</small></article>
</section>
<div class="controls">
<button id="play" class="primary">▶ ${t('Lanzar','Launch')}</button>
<button id="reset">↺</button>
<div class="forms">
<button id="v-falcon" aria-pressed="true">Falcon 9</button>
<button id="v-starship" aria-pressed="false">Starship</button>
</div>
<label class="check"><input id="reuse" type="checkbox" checked> ${t('Recuperar el primer tramo','Recover the first stage')}</label>
<label class="check"><input id="loop" type="checkbox"> ${t('Repetir el ciclo','Loop the cycle')}</label>
<label>${t('Velocidad','Speed')} <input id="speed" type="range" min="1" max="20" value="8"><output id="speed-out">8×</output></label>
</div>
<div class="layout">
<section class="stage">
<div class="scene-caption"><b id="status"></b><span>${t('La cámara sigue al vehículo. Arrastra para orbitar. Tiempos típicos, despliegue comprimido.','The camera follows the vehicle. Drag to orbit. Typical times, compressed deployment.')}</span></div>
<div id="space" role="img" aria-label="${t('Lanzamiento 3D de Falcon 9 o Starship','3D Falcon 9 or Starship launch')}"></div>
<p id="loading">${t('Preparando la rampa…','Preparing the pad…')}</p>
<div class="view-controls"><button id="fit">${t('Seguir','Follow')}</button><button id="zoom-out">−</button><button id="zoom-in">+</button></div>
<div class="scene-bottom"><span id="action"></span><strong id="tplus"></strong></div>
<div class="timeline" id="scrub" role="slider" aria-valuemin="0" aria-valuemax="640"><i id="bar"></i></div>
</section>
<aside>
<span class="eyebrow">${t('MINUTOS DEL VUELO','MINUTES OF THE FLIGHT')}</span>
<div id="steps"></div>
<div class="detail">
<h2 id="step-name"></h2>
<p id="step-body"></p>
</div>
</aside>
</div>
<section class="principles">
<article><span class="eyebrow">01 · ${t('EL TRAMO CARO','THE EXPENSIVE STAGE')}</span><b>${t('Nueve Merlin no se tiran','Nine Merlins are not thrown away')}</b><p>${t('El primer tramo es motores, aviónica y estructura. Si aterriza a ~2 m/s a los ocho minutos, el mismo booster puede volar de nuevo. B1067 llevaba 37 vuelos en 2026.','The first stage is engines, avionics and structure. If it lands at ~2 m/s after eight minutes, the same booster can fly again. B1067 had 37 flights in 2026.')}</p></article>
<article><span class="eyebrow">02 · ${t('EL PRECIO DE VOLVER','THE COST OF COMING BACK')}</span><b id="penalty"></b><p>${t('Reservar combustible y aletas para aterrizar resta carga. SpaceX publica ~22.800 kg a LEO en expendable y ~16.800 kg si recupera el booster. La cadencia (165 vuelos Falcon en 2025) es el otro lado de esa cuenta.','Holding propellant and fins for landing cuts payload. SpaceX publishes ~22,800 kg to LEO expendable and ~16,800 kg with booster recovery. Cadence (165 Falcon flights in 2025) is the other side of that ledger.')}</p></article>
<article><span class="eyebrow">03 · ${t('STARSHIP AÚN ENSAYA','STARSHIP STILL ON TRIAL')}</span><b>${t('Dos etapas, una torre','Two stages, one tower')}</b><p>${t('Starship quiere coger el booster con la torre y reentrar la nave. A mediados de 2026 SpaceX lo describía en pruebas (vuelos 12–13, V3), con despliegue de Starlink V3 empezando. No es todavía el ritmo diario.','Starship wants to catch the booster with the tower and reenter the ship. As of mid-2026 SpaceX described it as testing (flights 12–13, V3), with Starlink V3 deployment beginning. It is not yet a daily cadence.')}</p></article>
</section>
<details class="assumptions"><summary>${t('Qué estamos suponiendo · tiempos, mallas y cifras','What we assume · times, meshes and figures')}</summary>
<p>${t('Falcon 9: 70 m, 3,66 m de diámetro, nueve Merlin. Carga LEO 22.800 / 16.800 kg (expendable / reutilizable) según cifras publicadas de SpaceX. Aterrizaje ~2 m/s. Récord de booster B1067: 37 vuelos (agosto 2026). 165 lanzamientos Falcon en 2025; en 2026 el ritmo iba por ~140–155 según fuentes de seguimiento. Éxito de misión ~99,5 %.','Falcon 9: 70 m, 3.66 m diameter, nine Merlins. LEO payload 22,800 / 16,800 kg (expendable / reusable) per published SpaceX figures. Landing ~2 m/s. Booster record B1067: 37 flights (August 2026). 165 Falcon launches in 2025; 2026 was tracking ~140–155 according to tracking sources. Mission success ~99.5%.')}</p>
<p>${t('La línea de tiempo comprime el despliegue de Starlink (en la realidad ~1 h). Las mallas no son CAD. Starship (121 m) es una lectura didáctica de la pila y la captura; los vuelos de 2026 siguen siendo ensayos. Independiente de SpaceX.','The timeline compresses Starlink deployment (about an hour in reality). Meshes are not CAD. Starship (121 m) is a teaching reading of the stack and catch; 2026 flights were still trials. Independent of SpaceX.')}</p>
</details>
<footer>${t('Atlas · SpaceX · notebook 06 · 18 septiembre 2026','Atlas · SpaceX · notebook 06 · 18 September 2026')}</footer>`;

function stepsHtml(){const steps=state.vehicle==='starship'?STARSHIP_STEPS:FALCON_STEPS;return steps.map((s,i)=>`<button data-step="${i}"><i>${fmtTime(s.t)}</i><span>${es?s.es:s.en}</span></button>`).join('');}
function fmtTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return 'T+'+m+':' + String(s).padStart(2,'0');}
$('steps').innerHTML=stepsHtml();
try{world=createSpaceWorld($('space'));$('loading').hidden=true;}catch(e){$('loading').textContent=t('La vista 3D no está disponible.','The 3D view is unavailable.');console.error(e);}

function paint(){
 const step=stepAt(state.steps,state.time),nx=nextStep(state.steps,state.time);
 $('payload').textContent=fmt(payloadMass(state.reuse))+' kg';
 $('payload-note').textContent=state.reuse?t('Con recuperación del booster','With booster recovery'):t('Expendable · se tira el primer tramo','Expendable · first stage is thrown away');
 $('clock').textContent=fmtTime(state.time);
 $('clock-note').textContent=nx?t('Siguiente: ','Next: ')+(es?nx.es:nx.en):t('Final del perfil didáctico','End of the teaching profile');
 $('penalty').textContent='−'+fmt(lightPayloadPenalty())+' kg';
 $('status').textContent=state.playing?t('VUELO','FLIGHT'):t('EN LA RAMPA / PAUSA','ON PAD / PAUSED');
 $('action').textContent=es?step.es:step.en;
 $('tplus').textContent=fmtTime(state.time);
 $('bar').style.width=progress(state.steps,state.time)*100+'%';
 $('step-name').textContent=es?step.es:step.en;
 $('step-body').textContent=step.body[es?0:1];
 $('play').textContent=state.playing?'Ⅱ '+t('Pausar','Pause'):state.time>=state.duration?'↺ '+t('Repetir','Replay'):'▶ '+t('Lanzar','Launch');
 $('speed-out').textContent=state.speed+'×';
 document.querySelectorAll('[data-step]').forEach((b,i)=>b.setAttribute('aria-current',String(state.steps[i].id===step.id)));
}
$('play').onclick=()=>{if(state.time>=state.duration)state.time=0;state.playing=!state.playing;last=performance.now();paint();};
$('reset').onclick=()=>{state=createFlight(state.vehicle);state.reuse=$('reuse').checked;state.loop=$('loop').checked;state.speed=+$('speed').value;world?.fit();paint();};
$('v-falcon').onclick=()=>{state=createFlight('falcon');state.reuse=$('reuse').checked;state.speed=+$('speed').value;$('v-falcon').setAttribute('aria-pressed','true');$('v-starship').setAttribute('aria-pressed','false');$('steps').innerHTML=stepsHtml();bindSteps();paint();};
$('v-starship').onclick=()=>{state=createFlight('starship');state.reuse=$('reuse').checked;state.speed=+$('speed').value;$('v-falcon').setAttribute('aria-pressed','false');$('v-starship').setAttribute('aria-pressed','true');$('steps').innerHTML=stepsHtml();bindSteps();paint();};
$('reuse').onchange=e=>{state.reuse=e.target.checked;paint();};
$('loop').onchange=e=>state.loop=e.target.checked;
$('speed').oninput=e=>{state.speed=+e.target.value;paint();};
function bindSteps(){document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{state.time=state.steps[+b.dataset.step].t;state.playing=false;paint();});}
bindSteps();
$('fit').onclick=()=>{world?.fit();paint();};$('zoom-in').onclick=()=>world?.zoomBy(1.12);$('zoom-out').onclick=()=>world?.zoomBy(1/1.12);
$('scrub').onclick=e=>{const r=$('scrub').getBoundingClientRect();state.time=state.duration*Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));state.playing=false;paint();};
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(!document.hidden){if(state.playing)tickFlight(state,dt);world?.render(state);if(now-domAt>80){domAt=now;paint();}}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
paint();world?.render(state);
