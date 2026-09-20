import {defaults,snapshot,tickDyson,L_SUN,M_JUPITER,KARDASHEV_II,COLLECTOR_MAX} from './model.js';
import {createDysonWorld} from './world.js';
const es=document.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>document.getElementById(id);
const nf=new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:1}),fmt=x=>nf.format(x);
const sciNf=new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:2,minimumFractionDigits:1});
function sci(x){if(!Number.isFinite(x)||x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x))),m=x/10**e;return sciNf.format(m)+' × 10'+[...String(e)].map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]??'⁻').join('');}
function kelvin(k){return fmt(k)+' K · '+fmt(k-273.15)+' °C';}
let state={...defaults},world,last=performance.now(),domAt=0;
document.title=t('Esfera de Dyson — Enjambre y calor','Dyson sphere — Swarm and heat');
$('app').innerHTML=`<nav class="nav"><a href="../index.html">← Atlas</a><a href="../kardashev/index.html">Kardashev</a><a href="../starlink/index.html">Starlink</a><a href="../spacex/index.html">SpaceX</a><a href="../home/index.html">${t('Hogar','Home')}</a><span><a href="${es?'../../dyson/index.html':'./index.html'}" lang="en">EN</a> / <a href="${es?'./index.html':'../es/dyson/index.html'}" lang="es">ES</a></span></nav>
<header><div><span class="eyebrow">${t('NOTEBOOK 03 · ENERGÍA ESTELAR','NOTEBOOK 03 · STELLAR ENERGY')}</span><h1>${t('No es una cáscara rígida.<br>Es un enjambre.','Not a rigid shell.<br>A swarm.')}</h1></div><p>${t('Dyson (1960) imaginó interceptar la luz de una estrella con colectores en órbitas independientes, no con una bola sólida. Cambia la forma, la cobertura y el radio.','Dyson (1960) imagined intercepting a star’s light with collectors on independent orbits, not a solid ball. Change the form, coverage and radius.')}</p></header>
<section class="dashboard" aria-label="${t('Energía y calor de este modelo','Energy and heat in this model')}">
<article><span>${t('Energía interceptada','Intercepted energy')}</span><strong id="captured"></strong><small id="vs-world"></small></article>
<article><span>${t('Luz que sigue escapando','Starlight still escaping')}</span><strong id="leaked"></strong><div class="split" aria-hidden="true"><i id="split-bar"></i></div><small>${t('El Sol no se apaga; se tapa una fracción del cielo.','The Sun does not go out; a fraction of its sky is blocked.')}</small></article>
<article><span>${t('Temperatura','Temperature')}</span><strong id="temp"></strong><small id="temp-note"></small></article>
</section>
<div class="controls">
<button id="play" class="primary">▶ ${t('Construir cobertura','Grow coverage')}</button>
<button id="reset" aria-label="${t('Reiniciar','Reset')}">↺</button>
<div class="forms" role="group" aria-label="${t('Forma','Form')}">
<button id="form-swarm" aria-pressed="true">${t('Enjambre','Swarm')}</button>
<button id="form-shell" aria-pressed="false">${t('Cáscara rígida','Rigid shell')}</button>
</div>
<label>${t('Cobertura','Coverage')} <output id="cover-value">18%</output><input id="coverage" type="range" min="0" max="100" step="1" value="18"></label>
<label>${t('Radio','Radius')} <output id="radius-value">1 ua</output><input id="radius" type="range" min="40" max="250" step="5" value="100"></label>
</div>
<div class="layout">
<section class="stage">
<div class="scene-caption"><b id="scene-status"></b><span>${t('Anillos = órbitas. La Tierra azul marca 1 ua. Júpiter (beige, más lejos) es la reserva de materia. Sol y planetas no están a escala.','Rings = orbits. Blue Earth marks 1 au. Jupiter (tan, farther out) is the mass reserve. Sun and planets are not to scale.')}</span></div>
<div id="space" role="img" tabindex="0" aria-label="${t('Modelo 3D: Sol, órbita terrestre, enjambre o cáscara. Arrastra, rueda o usa las flechas.','3D model: Sun, Earth orbit, swarm or shell. Drag, scroll or use the arrow keys.')}"></div>
<p id="loading">${t('Preparando el sistema…','Preparing the system…')}</p>
<div class="view-controls"><button id="fit">${t('Centrar','Center')}</button><button id="zoom-out" aria-label="${t('Alejar','Zoom out')}">−</button><button id="zoom-in" aria-label="${t('Acercar','Zoom in')}">+</button></div>
<div class="scene-bottom"><span id="action"></span><strong id="percent"></strong></div>
</section>
<aside>
<span class="eyebrow">${t('QUÉ ESTÁS MOVIENDO','WHAT YOU ARE CHANGING')}</span>
<div class="detail">
<h2 id="form-name"></h2>
<p id="form-detail"></p>
<dl>
<div><dt>${t('Colectores visibles','Visible collectors')}</dt><dd id="collectors"></dd></div>
<div><dt>${t('Flujo a este radio','Flux at this radius')}</dt><dd id="flux"></dd></div>
<div><dt>${t('Enjambre · dos caras','Swarm · two-sided')}</dt><dd id="t-swarm"></dd></div>
<div><dt>${t('Cáscara cerrada · una cara','Closed shell · one face')}</dt><dd id="t-shell"></dd></div>
<div><dt>${t('Si Júpiter se extiende aquí','If Jupiter is spread here')}</dt><dd id="column"></dd></div>
<div><dt>${t('Espesor a 3000 kg/m³','Thickness at 3000 kg/m³')}</dt><dd id="thick"></dd></div>
<div><dt>${t('Masa a esta cobertura','Mass at this coverage')}</dt><dd id="mass"></dd></div>
</dl>
</div>
</aside>
</div>
<section class="principles">
<article><span class="eyebrow">01 · ${t('ENJAMBRE','SWARM')}</span><b>${t('Órbitas, no una bola','Orbits, not a ball')}</b><p>${t('Dyson aclaró que una cáscara o anillo rígido es mecánicamente imposible. Lo que imaginó es una colección suelta de objetos en órbitas independientes. Por eso el 3D dibuja anillos, no una reja esférica.','Dyson clarified that a rigid shell or ring is mechanically impossible. What he envisaged is a loose collection of objects on independent orbits. That is why the 3D view draws rings, not a spherical lattice.')}</p></article>
<article><span class="eyebrow">02 · ${t('EL CALOR SALE','HEAT LEAVES')}</span><b>${t('La energía no desaparece','Energy does not vanish')}</b><p>${t('Lo interceptado acaba irradiándose como calor. Un enjambre radia por las dos caras; una cáscara cerrada solo puede radiar al espacio por fuera, así que queda más caliente. Dyson propuso buscar ese infrarrojo.','Whatever is intercepted is eventually radiated as heat. A swarm radiates from both faces; a closed shell can radiate to space only from the outside, so it runs hotter. Dyson proposed searching for that infrared.')}</p></article>
<article><span class="eyebrow">03 · ${t('LA MATERIA','MASS')}</span><b>${t('Hace falta un planeta','A planet is the raw material')}</b><p>${t('Dyson tomó la masa de Júpiter como orden de magnitud. A 1 ua eso da una capa delgada, no una muralla. No modelamos minería, transporte ni plazos.','Dyson took Jupiter’s mass as the order of magnitude. At 1 au that yields a thin sheet, not a wall. Mining, transport and schedules are not modeled.')}</p></article>
</section>
<details class="assumptions"><summary>${t('Qué estamos suponiendo · números, física y límites','What we assume · numbers, physics and limits')}</summary>
<p>${t('Luminosidad solar 3,828×10²⁶ W (IAU). Unidad astronómica 1,495978707×10¹¹ m. Constante de Stefan–Boltzmann 5,670374419×10⁻⁸ W/m²K⁴. Masa de Júpiter 1,898×10²⁷ kg. Consumo mundial de energía primaria ≈ 600 EJ en 2025, unos 19 TW de potencia media (Energy Institute, Statistical Review 2026). Tipo II de Kardashev (1964): 4×10²⁶ W, del orden de una estrella. Los colectores del 3D son un número didáctico, no un recuento de satélites reales.','Solar luminosity 3.828×10²⁶ W (IAU). Astronomical unit 1.495978707×10¹¹ m. Stefan–Boltzmann constant 5.670374419×10⁻⁸ W/m²K⁴. Jupiter mass 1.898×10²⁷ kg. World primary energy ≈ 600 EJ in 2025, about 19 TW of mean power (Energy Institute, Statistical Review 2026). Kardashev Type II (1964): 4×10²⁶ W, on the order of a star. Collectors in the 3D view are a teaching count, not a real satellite inventory.')}</p>
<p>${t('La cobertura es la fracción geométrica de luz interceptada. No hay albedo: absorbedores perfectos. La temperatura del enjambre no depende de cuántos colectores hay, solo del radio: cada placa ve el mismo flujo y radia por ambas caras. La temperatura de cáscara cerrada solo aplica al 100 %. Una Tierra real intercepta πR² y radia por 4πR², más albedo: su temperatura efectiva (~255 K) no es la de este colector.','Coverage is the geometric fraction of intercepted light. There is no albedo: perfect absorbers. Swarm temperature does not depend on how many collectors there are, only on radius: each plate sees the same flux and radiates from both sides. Closed-shell temperature applies only at 100%. A real Earth intercepts πR² and radiates from 4πR², plus albedo: its effective temperature (~255 K) is not this collector’s.')}</p>
<p>${t('Una cáscara rígida uniforme no sujeta a nadie en su cara interna (teorema de Newton) y es inestable a cualquier desplazamiento. El modelo agranda el Sol y los planetas para que se vean. No es un plan de ingeniería ni una búsqueda SETI.','A uniform rigid shell cannot hold anyone on its inner face (Newton’s shell theorem) and is unstable to any displacement. The model enlarges the Sun and planets so they remain visible. This is not an engineering plan or a SETI search.')} <a href="https://doi.org/10.1126/science.131.3414.1667" target="_blank" rel="noopener">Dyson 1960 · Science ↗</a></p>
</details>
<footer>${t('Atlas · Esfera de Dyson · notebook 03 · 18 septiembre 2026','Atlas · Dyson sphere · notebook 03 · 18 September 2026')}</footer>`;

try{world=createDysonWorld($('space'));$('loading').hidden=true;}catch(e){$('loading').textContent=t('La vista 3D no está disponible. Puedes seguir los contadores y el texto.','The 3D view is unavailable. You can still follow the counters and the text.');console.error(e);}

function setForm(form){state.form=form;$('form-swarm').setAttribute('aria-pressed',String(form==='swarm'));$('form-shell').setAttribute('aria-pressed',String(form==='shell'));paint();}
function paint(){
 const v=snapshot(state);
 $('captured').textContent=sci(v.captured)+' W';
 $('vs-world').textContent=v.captured===0?t('Nada interceptado todavía','Nothing intercepted yet'):t('≈ ','≈ ')+sci(v.vsWorld)+t(' veces el consumo mundial de 2025',' times 2025 world consumption');
 $('leaked').textContent=sci(v.leaked)+' W';
 $('split-bar').style.width=v.coverage*100+'%';
 $('temp').textContent=kelvin(v.temperature);
 $('temp-note').textContent=v.closedShell?t('Cáscara cerrada: solo radia al espacio por fuera.','Closed shell: radiates to space only from the outside.'):t('Placa de dos caras. No cambia al añadir anillos.','Two-sided plate. It does not change as rings are added.');
 $('cover-value').textContent=Math.round(v.coverage*100)+'%';
 $('radius-value').textContent=fmt(v.radiusAu)+' '+(es?'ua':'au');
 $('coverage').value=Math.round(v.coverage*100);
 $('radius').value=Math.round(v.radiusAu*100);
 $('collectors').textContent=v.form==='swarm'?v.collectors+' / '+COLLECTOR_MAX:t('Cáscara continua','Continuous shell');
 $('flux').textContent=fmt(v.flux)+' W/m²';
 $('t-swarm').textContent=kelvin(v.swarmTemperature);
 $('t-shell').textContent=kelvin(v.shellTemperature);
 $('column').textContent=fmt(v.column)+' kg/m² · '+fmt(v.column/10)+' g/cm²';
 $('thick').textContent=fmt(v.thickness)+' m';
 $('mass').textContent=sci(v.massUsed)+' kg · '+fmt(v.massUsed/M_JUPITER)+' M♃';
 $('form-name').textContent=v.form==='swarm'?t('Enjambre de Dyson','Dyson swarm'):t('Cáscara rígida · malentendido habitual','Rigid shell · common misconception');
 $('form-detail').textContent=v.form==='swarm'?t('Anillos de colectores en órbitas distintas. Dyson llamó a esto una «biosfera»: una colección suelta. Tipo II de Kardashev (1964) = ','Rings of collectors on distinct orbits. Dyson called this a “biosphere”: a loose collection. Kardashev Type II (1964) = ')+sci(KARDASHEV_II)+t(' W, del orden de esta estrella (',' W, on the order of this star (')+sci(L_SUN)+' W).':t('Una esfera rígida aparece en la ciencia ficción. Es gravitatoriamente inestable, no se habita por la gravedad de la cáscara, y Dyson la descartó. Aquí crece como un casquete para que se vea el cubrimiento, no porque sea construible.','A rigid sphere appears in fiction. It is gravitationally unstable, is not inhabited by the shell’s gravity, and Dyson rejected it. It grows here as a cap so coverage is visible, not because it can be built.');
 $('scene-status').textContent=state.playing?t('AÑADIENDO ÓRBITAS','ADDING ORBITS'):v.coverage>=1?t('CIELO ESTELAR TAPADO','STELLAR SKY COVERED'):t('EN PAUSA','PAUSED');
 $('action').textContent=t('Arrastra · rueda · flechas · pellizca','Drag · scroll · arrows · pinch');
 $('percent').textContent=Math.round(v.coverage*100)+' %';
 $('play').textContent=state.playing?'Ⅱ '+t('Pausar','Pause'):v.coverage>=1?'↺ '+t('Repetir','Replay'):'▶ '+t('Construir cobertura','Grow coverage');
}
$('play').onclick=()=>{if(state.coverage>=1)state.coverage=0;state.playing=!state.playing;last=performance.now();paint();};
$('reset').onclick=()=>{state={...defaults};world?.fit();paint();};
$('form-swarm').onclick=()=>setForm('swarm');$('form-shell').onclick=()=>setForm('shell');
$('coverage').oninput=e=>{state.playing=false;state.coverage=+e.target.value/100;paint();};
$('radius').oninput=e=>{state.radiusAu=+e.target.value/100;paint();};
$('fit').onclick=()=>{world?.fit();paint();};$('zoom-in').onclick=()=>{world?.zoomBy(1.12);paint();};$('zoom-out').onclick=()=>{world?.zoomBy(1/1.12);paint();};
window.addEventListener('resize',paint);
paint();
function frame(now){
 const dt=Math.min(.1,(now-last)/1000);last=now;
 if(!document.hidden){
  if(state.playing)tickDyson(state,dt);
  world?.render(state,dt);
  if(state.playing&&now-domAt>80){domAt=now;paint();}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
