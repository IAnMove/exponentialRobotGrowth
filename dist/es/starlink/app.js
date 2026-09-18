import {SHELLS,SNAPSHOT,geoOneWayMs,leoOneWayMs,footprintKm,sampleCount} from './model.js';
import {createStarlinkWorld} from './world.js';
const es=document.documentElement.lang==='es',t=(a,b)=>es?a:b,$=id=>document.getElementById(id);
const nf=new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:1}),fmt=x=>nf.format(x);
const enabled=new Set(SHELLS.map(s=>s.id));
let state={playing:true,speed:40,lat:41.4,lon:-3.7,lasers:true,showCoverage:false,spin:false},world,last=performance.now(),domAt=0,lastRoute=null;
document.title=t('Starlink — Cobertura y láseres','Starlink — Coverage and lasers');
$('app').innerHTML=`<nav class="nav"><a href="../index.html">← Atlas</a><a href="../spacex/index.html">SpaceX</a><a href="../dyson/index.html">${t('Dyson','Dyson')}</a><span><a href="${es?'../../starlink/index.html':'./index.html'}" lang="en">EN</a> / <a href="${es?'./index.html':'../es/starlink/index.html'}" lang="es">ES</a></span></nav>
<header><div><span class="eyebrow">${t('NOTEBOOK 05 · RED EN ÓRBITA BAJA','NOTEBOOK 05 · LOW-EARTH NETWORK')}</span><h1>${t('No es un satélite.<br>Es una malla que se mueve.','Not one satellite.<br>A moving mesh.')}</h1></div><p>${t('Starlink cubre la Tierra con miles de satélites bajos. Cada uno ve un parche pequeño y móvil. Por eso hacen falta tantos, y por eso los láseres entre satélites importan sobre el océano.','Starlink covers Earth with thousands of low satellites. Each one sees a small moving patch. That is why so many are needed, and why lasers between satellites matter over the ocean.')}</p></header>
<section class="dashboard">
<article><span>${t('Flota real (sept. 2026)','Real fleet (Sept 2026)')}</span><strong>${fmt(SNAPSHOT.active)}</strong><small>${t('Activos según seguimiento independiente · no es el recuento del 3D','Active per independent tracking · not the 3D count')}</small></article>
<article><span>${t('Satélites sobre el usuario','Satellites over the user')}</span><strong id="inview">—</strong><small id="elev-note"></small></article>
<article><span>${t('Ida de la luz','One-way light time')}</span><strong id="light">—</strong><small id="geo-note"></small></article>
</section>
<div class="controls">
<button id="play" class="primary">Ⅱ ${t('Pausar órbitas','Pause orbits')}</button>
<button id="reset">↺</button>
<label class="check"><input id="lasers" type="checkbox" checked> ${t('Enlaces láser entre satélites','Laser links between satellites')}</label>
<label class="check"><input id="cover" type="checkbox"> ${t('Mapa de cobertura','Coverage map')}</label>
<label>${t('Latitud del usuario','User latitude')} <output id="lat-out">41°</output><input id="lat" type="range" min="-75" max="75" value="41"></label>
<label>${t('Longitud','Longitude')} <output id="lon-out">-4°</output><input id="lon" type="range" min="-180" max="180" value="-4"></label>
</div>
<div class="presets">${[{lat:0,lon:-20,es:'Golfo de Guinea · océano',en:'Gulf of Guinea · ocean'},{lat:78,lon:15,es:'Svalbard · polar',en:'Svalbard · polar'},{lat:-45,lon:170,es:'Nueva Zelanda',en:'New Zealand'},{lat:19,lon:-155,es:'Hawái · océano',en:'Hawaii · ocean'}].map((p,i)=>`<button data-preset="${i}">${es?p.es:p.en}</button>`).join('')}</div>
<div class="layout">
<section class="stage">
<div class="scene-caption"><b id="status"></b><span>${t('Clic en la Tierra para colocar al usuario. Amarillo: antena. Azul: pasarelas. El 3D es un muestreo, no los 11.000.','Click Earth to place the user. Yellow: dish. Blue: gateways. The 3D view is a sample, not all 11,000.')}</span></div>
<div id="space" tabindex="0" role="img" aria-label="${t('Tierra y constelación Starlink','Earth and Starlink constellation')}"></div>
<p id="loading">${t('Preparando la constelación…','Preparing the constellation…')}</p>
<div class="view-controls"><button id="fit">${t('Centrar','Center')}</button><button id="zoom-out">−</button><button id="zoom-in">+</button></div>
<div class="scene-bottom"><span id="action"></span><strong id="sample"></strong></div>
</section>
<aside>
<span class="eyebrow">${t('CÓMO VIAJA EL PAQUETE','HOW THE PACKET TRAVELS')}</span>
<ol class="path" id="path-steps"></ol>
<p id="path-note"></p>
<span class="eyebrow">${t('CAPAS ORBITALES','ORBITAL SHELLS')}</span>
<div id="shells"></div>
</aside>
</div>
<section class="principles">
<article><span class="eyebrow">01 · LEO ≠ GEO</span><b id="p1"></b><p>${t('Un satélite geoestacionario está a 35.786 km: solo la luz ya impone ~119 ms de ida. Starlink vuela a unos cientos de km, así que el retardo de la luz es de unos 2 ms. El precio es que cada satélite cubre poco suelo y se mueve.','A geostationary satellite sits at 35,786 km: light alone imposes ~119 ms one way. Starlink flies a few hundred km up, so light delay is about 2 ms. The cost is that each satellite covers little ground and keeps moving.')}</p></article>
<article><span class="eyebrow">02 · ${t('POR QUÉ MILES','WHY THOUSANDS')}</span><b id="p2"></b><p>${t('La huella de un satélite a 480 km, con 25° de elevación mínima, es del orden de mil km. Para que siempre haya uno encima hace falta una malla densa, y capas con distinta inclinación para el ecuador y los polos.','The footprint of a satellite at 480 km, with a 25° minimum elevation, is on the order of a thousand km. To always have one overhead you need a dense mesh, and shells of different inclination for the equator and the poles.')}</p></article>
<article><span class="eyebrow">03 · ${t('LÁSER O TUBERÍA','LASER OR BENT PIPE')}</span><b>${t('El océano decide','The ocean decides')}</b><p>${t('Sin láser, el satélite que te ve tiene que ver también una pasarela en tierra (tubo doblado). Sobre el Atlántico eso falla. Con láser el paquete salta de satélite en satélite hasta una pasarela. SpaceX llama a eso space lasers; cada V2 Mini lleva varios enlaces de ~200 Gb/s.','Without lasers, the satellite that sees you must also see a ground gateway (bent pipe). Over the Atlantic that fails. With lasers the packet hops satellite to satellite until a gateway. SpaceX calls these space lasers; each V2 Mini carries several ~200 Gb/s links.')}</p></article>
</section>
<details class="assumptions"><summary>${t('Qué estamos suponiendo · recuentos, órbitas y el 3D','What we assume · counts, orbits and the 3D view')}</summary>
<p>${t('Flota activa 11.118, en órbita 11.133, lanzados 12.935 (Jonathan McDowell, 13 sept 2026). El 3D dibuja un muestreo (~','Active fleet 11,118, in orbit 11,133, launched 12,935 (Jonathan McDowell, 13 Sept 2026). The 3D view draws a sample (~')+sampleCount(null)+t(' objetos) para que se lea. No es un TLE en vivo ni un mapa de capacidad.',' objects) so it stays readable. It is not a live TLE set or a capacity map.')}</p>
<p>${t('Capas didácticas: 53° y 43° cerca de 480 km (bajada de 2026 desde ~550 km), 70° a ~570 km, polar 97,6° a ~560 km. Elevación mínima 25°. Las pasarelas son tres puntos representativos, no el mapa real de ground stations. El enrutado láser es un greedy hacia la pasarela más cercana, no el protocolo de Starlink.','Teaching shells: 53° and 43° near 480 km (2026 lowering from ~550 km), 70° at ~570 km, polar 97.6° at ~560 km. Minimum elevation 25°. Gateways are three representative points, not the real ground-station map. Laser routing is a greedy walk toward the nearest gateway, not Starlink’s protocol.')}</p>
<p>${t('No modelamos lluvia, interferencia, cupo de haces ni el terminal de usuario de fase. Independiente de SpaceX.','Rain, interference, beam slots and the phased-array dish are not modeled. Independent of SpaceX.')} <a href="https://space-safety.starlink.com/docs/space-safety-articles/constellation_altitudes/" target="_blank" rel="noopener">Starlink · altitudes ↗</a></p>
</details>
<footer>${t('Atlas · Starlink · notebook 05 · 18 septiembre 2026','Atlas · Starlink · notebook 05 · 18 September 2026')}</footer>`;

$('shells').innerHTML=SHELLS.map(s=>`<label class="shell" style="--c:#${s.color.toString(16).padStart(6,'0')}"><input type="checkbox" data-shell="${s.id}" checked><span><b>${es?s.es:s.en}</b><small>${s.detail[es?0:1]}</small></span></label>`).join('');
const presets=[{lat:0,lon:-20},{lat:78,lon:15},{lat:-45,lon:170},{lat:19,lon:-155}];
try{world=createStarlinkWorld($('space'));world.setOnPlace((lat,lon)=>{state.lat=lat;state.lon=lon;$('lat').value=Math.round(lat);$('lon').value=Math.round(lon);});$('loading').hidden=true;}catch(e){$('loading').textContent=t('La vista 3D no está disponible.','The 3D view is unavailable.');console.error(e);}

function paint(route){
 const r=route||lastRoute;lastRoute=r;
 $('lat-out').textContent=Math.round(state.lat)+'°';$('lon-out').textContent=Math.round(state.lon)+'°';
 $('play').textContent=state.playing?'Ⅱ '+t('Pausar órbitas','Pause orbits'):'▶ '+t('Mover órbitas','Run orbits');
 $('status').textContent=state.playing?t('CONSTELACIÓN EN MOVIMIENTO','CONSTELLATION MOVING'):t('EN PAUSA','PAUSED');
 $('sample').textContent=sampleCount(enabled)+' '+t('satélites en el muestreo','satellites in the sample');
 $('p1').textContent=fmt(geoOneWayMs())+' ms GEO · '+fmt(leoOneWayMs(480))+' ms LEO';
 $('p2').textContent='~'+fmt(footprintKm(480))+' km';
 if(!r)return;
 $('inview').textContent=String(r.inView||0);
 $('elev-note').textContent=r.elevation!=null?t('En vista (mín. 25°) · el que sirve está a ','In view (min. 25°) · serving sat at ')+fmt(r.elevation)+'°':t('Ningún satélite de la muestra supera 25°','No sample satellite is above 25°');
 $('light').textContent=r.ms?fmt(r.ms)+' ms':'—';
 $('geo-note').textContent=t('Solo la luz, ida. GEO serían ~','Light only, one way. GEO would be ~')+fmt(geoOneWayMs())+' ms.';
 const labels={user:t('Antena del usuario','User dish'),uplink:t('Subida al satélite','Uplink to satellite'),laser:t('Salto láser','Laser hop'),gateway:t('Bajada a pasarela y a internet','Down to gateway and the internet')};
 $('path-steps').innerHTML=r.hops.map((h,i)=>`<li><i>${String(i+1).padStart(2,'0')}</i>${labels[h.kind]||h.kind}${h.gw?' · '+(es?h.gw.es:h.gw.en):''}</li>`).join('')||`<li>${t('Sin visibilidad','No visibility')}</li>`;
 $('path-note').textContent=!r.ok&&r.reason==='none'?t('Con estas capas no hay satélite sobre ese punto. Prueba otra latitud o enciende la capa polar.','With these shells no satellite is over that point. Try another latitude or enable the polar shell.'):!r.ok&&r.reason==='gateway'?t('Hay satélite, pero sin láser no ve una pasarela. Eso es el tubo doblado sobre el mar.','A satellite is there, but without lasers it cannot see a gateway. That is bent-pipe over the sea.'):r.mode==='laser-mesh'?t('El paquete sube, salta por láser y baja a una pasarela. Así se cubre el océano.','The packet goes up, hops by laser and comes down at a gateway. That is how the ocean is covered.'):t('El mismo satélite ve al usuario y a la pasarela: tubo doblado, sin malla.','The same satellite sees the user and the gateway: bent pipe, no mesh.');
 $('action').textContent=r.mode==='laser-mesh'?t('Malla láser · paquete en tránsito','Laser mesh · packet in transit'):r.mode==='bent-pipe'?t('Tubo doblado · una sola vista','Bent pipe · single view'):t('Arrastra la Tierra · mueve al usuario','Drag Earth · move the user');
}
function syncShells(){world?.setConstellation(enabled);}
$('play').onclick=()=>{state.playing=!state.playing;paint(lastRoute);};
$('reset').onclick=()=>{state={playing:true,speed:40,lat:41.4,lon:-3.7,lasers:true,showCoverage:false,spin:false};$('lasers').checked=true;$('cover').checked=false;$('lat').value=41;$('lon').value=-4;SHELLS.forEach(s=>{enabled.add(s.id);document.querySelector(`[data-shell="${s.id}"]`).checked=true;});syncShells();world?.fit();};
$('lasers').onchange=e=>state.lasers=e.target.checked;
$('cover').onchange=e=>state.showCoverage=e.target.checked;
$('lat').oninput=e=>state.lat=+e.target.value;$('lon').oninput=e=>state.lon=+e.target.value;
document.querySelectorAll('[data-shell]').forEach(b=>b.onchange=()=>{if(b.checked)enabled.add(b.dataset.shell);else enabled.delete(b.dataset.shell);syncShells();});
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const p=presets[+b.dataset.preset];state.lat=p.lat;state.lon=p.lon;$('lat').value=p.lat;$('lon').value=p.lon;});
$('fit').onclick=()=>world?.fit();$('zoom-in').onclick=()=>world?.zoomBy(1.12);$('zoom-out').onclick=()=>world?.zoomBy(1/1.12);
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden){const info=world?.render(state,dt);if(info&&(state.playing||now-domAt>120)){domAt=now;paint(info.route);}}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
paint();
