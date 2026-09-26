import {createExperience} from './world.js';
import {STOPS,SPAWN,poseAt,nearestStop,walk,travelPose} from './model.js';
import {IMMERSIVE} from './catalog.js';
import {createRun,advance} from '../llms/model.js';
import {StepGuide,narrationId} from '../llms/guide.js';
import {VOICES} from '../llms/voices.js';
import {guideProgress,cueAt,OPERATIONS} from '../llms/flow.js';
const es=document.documentElement.lang==='es',lang=es?'es':'en',t=(a,b)=>es?a:b,$=id=>document.getElementById(id);
const requested=new URLSearchParams(location.search).get('experience')||'llms';
document.title=t('Dentro de una respuesta · Atlas 3D','Inside an answer · Atlas 3D');
if(!Object.hasOwn(IMMERSIVE,requested)){
  $('app').innerHTML=`<section class="fallback"><h1>${t('Esta experiencia inmersiva aún no está disponible.','This immersive experience is not available yet.')}</h1><a class="button" href="../index.html">← Atlas</a></section>`;
}else{
  $('app').innerHTML=`<div id="world"></div><div class="crosshair" aria-hidden="true"></div>
  <nav class="topbar"><div class="brand">ATLAS / LLMs <small>${t('DENTRO DE UNA RESPUESTA','INSIDE AN ANSWER')}</small></div><a class="button" href="../museo/index.html?pieza=llms">${t('← Museo','← Museum')}</a><a class="button" href="../llms/index.html">${t('Versión web','Web version')}</a><label>${t('Voz','Voice')} <select id="language"><option value="es" ${es?'selected':''}>ES</option><option value="en" ${es?'':'selected'}>EN</option></select></label><button id="lock">${t('Mirar con ratón','Mouse look')}</button></nav>
  <div class="compass" id="position"></div><div class="inspect" id="inspect" hidden></div>
  <section class="panel"><span class="eyebrow" id="chapter"></span><h1 id="title"></h1><p id="description"></p><div class="actions"><button class="primary" id="tour">${t('Guiarme','Guide me')}</button><button id="listen">${t('Escuchar','Listen')}</button><button id="next">${t('Siguiente →','Next →')}</button></div><div class="progress"><i id="progress"></i></div><div class="status" id="status" role="status"></div><div class="options"><label><input id="voice" type="checkbox" checked> MiniMax</label><label><input id="motion" type="checkbox" ${matchMedia('(prefers-reduced-motion: reduce)').matches?'checked':''}> ${t('Sin viajes de cámara','Instant travel')}</label></div><details><summary>${t('Texto de la explicación','Explanation text')}</summary><p id="transcript"></p></details><p class="help">${t('WASD / flechas: caminar · arrastrar: mirar · E: escuchar · Esc: pausar y liberar el ratón. Caminar detiene la guía.','WASD / arrows: walk · drag: look · E: listen · Esc: pause and release the mouse. Walking stops the guide.')}</p></section>
  <aside class="map"><header>${t('EL RECORRIDO','THE JOURNEY')}</header>${STOPS.map(s=>`<button data-stop="${s.index}" title="${s.titles[es?0:1]}"><b>${s.index+1}</b><span>${s.titles[es?2:3]}</span></button>`).join('')}<p id="visited"></p><p>${t('Geometría didáctica. No es el interior físico de un ordenador. Pesos y respuestas de ejemplo.','Teaching geometry, not the physical inside of a computer. Synthetic weights and curated answers.')}</p></aside>
  <div class="touch" aria-label="${t('Caminar','Walk')}"><button data-move="forward" aria-label="${t('Adelante','Forward')}">↑</button><button data-move="left" aria-label="${t('Izquierda','Left')}">←</button><button data-move="right" aria-label="${t('Derecha','Right')}">→</button><button data-move="back" aria-label="${t('Atrás','Back')}">↓</button></div>
  <div class="welcome" id="welcome"><article><span class="eyebrow">ATLAS · ${t('EXPERIENCIA INMERSIVA 01','IMMERSIVE EXPERIENCE 01')}</span><h2>${t('Cruza el cuadro.<br>Sigue una pregunta.','Step through the frame.<br>Follow a question.')}</h2><p>${t('Ocho estaciones a escala humana: camina entre tokens, acércate a las matrices y sigue la señal dorada hasta que aparece una respuesta.','Eight human-scale stations: walk among tokens, approach the matrices and follow the gold signal until an answer appears.')}</p><div class="actions"><button class="primary" id="start-tour">${t('Entrar con guía','Enter with a guide')}</button><button id="start-free">${t('Explorar libremente','Explore freely')}</button></div><p class="small">${t('La guía te lleva a cada punto y espera a que termine la voz. Puedes interrumpirla caminando o elegir una estación.','The guide takes you to each stop and waits for narration to finish. Walk to interrupt it, or choose a station.')}</p><a href="../llms/index.html">${t('Prefiero el notebook web →','I prefer the web notebook →')}</a></article></div>`;
  const limitation=document.createElement('p');limitation.className='small';limitation.textContent=t('Representación didáctica: pesos sintéticos y respuestas preparadas. No representa el interior físico de un ordenador.','Teaching representation: synthetic weights and curated answers. This is not the physical inside of a computer.');$('welcome').querySelector('article').append(limitation);document.querySelector('.panel details').append(limitation.cloneNode(true));
  const collapse=document.createElement('button');collapse.id='collapse';collapse.textContent=t('Ver más escenario ↙','More scene ↙');collapse.setAttribute('aria-expanded','true');document.querySelector('.panel').prepend(collapse);collapse.onclick=()=>{const compact=document.querySelector('.panel').classList.toggle('compact');collapse.textContent=compact?t('Mostrar explicación ↗','Show explanation ↗'):t('Ver más escenario ↙','More scene ↙');collapse.setAttribute('aria-expanded',String(!compact));};
  let run=createRun(lang),player={...SPAWN},world,guide,travel=null,guided=false,started=false,last=performance.now(),uiTime=0,voiceLanguage=lang,drag=null;
  const keys=new Set(),touch=new Set(),visited=new Set();
  function getClip(){return VOICES[voiceLanguage].find(c=>c.id===narrationId(run));}
  function refresh(){
    const s=STOPS[run.phase],clip=guide?.clip||getClip();$('chapter').textContent=`${String(run.phase+1).padStart(2,'0')} / 08 · ${t('LLMs INMERSIVO','IMMERSIVE LLMs')}`;$('title').textContent=s.titles[es?0:1];
    const descriptions=[t('Las instrucciones y la pregunta forman la entrada. Pulsa una tarjeta para inspeccionarla.','Instructions and your question form the input. Select a card to inspect it.'),t('Una fuente añade texto al contexto. Este ejemplo de la capital no consulta documentos externos.','A source adds text to context. This capital example does not retrieve external documents.'),t('Cada bloque es una pieza del texto, con su identificador. Todavía no es una respuesta.','Each block is a text piece with an identifier. It is not an answer yet.'),t('Embeddings + posición → vectores. Acércate y pulsa las celdas para leer sus números.','Embeddings + position → vectors. Approach and select cells to read their numbers.'),t('Q, K y V, máscara causal, mezcla y transformaciones. Sigue las operaciones que explica la voz.','Q, K and V, causal masking, mixing and transformations. Follow the narrated operations.'),t('La altura representa probabilidad de continuación, no probabilidad de verdad.','Height represents continuation probability, not probability of truth.'),t('La siguiente transición emite un único token. Los pesos no cambian.','The next transition emits one token. Weights do not change.'),run.done?t('Fin de secuencia. Puedes volver al museo o repetir.','End of sequence. Return to the museum or replay.'):t('Lo escrito vuelve al contexto. Siguiente token repite el cálculo. Respuesta: ','The output returns to context. Next token repeats the computation. Answer: ')+(run.generated.join('')||'…')];
    $('description').textContent=descriptions[run.phase];$('transcript').textContent=clip.text;
    $('tour').textContent=guided?t('Pausar guía','Pause guide'):t('Guiarme','Guide me');$('listen').textContent=guide?.running?t('Pausar voz','Pause voice'):t('Escuchar','Listen');$('next').textContent=run.done?t('Reiniciar','Restart'):run.phase===7?t('Siguiente token →','Next token →'):t('Siguiente →','Next →');
    $('visited').textContent=`${visited.size} / 8 ${t('estaciones visitadas','stations visited')}`;
    document.querySelectorAll('[data-stop]').forEach(b=>{b.setAttribute('aria-current',String(+b.dataset.stop===run.phase));b.classList.toggle('visited',visited.has(+b.dataset.stop));});
  }
  function halt(){guided=false;travel=null;guide.pause();keys.clear();touch.clear();refresh();}
  function arrive(audio){visited.add(run.phase);travel=null;world.update(run);refresh();if(audio)guide.enter();}
  function go(index,audio=true){
    guide.stop();if(index===7&&run.generated.length===0){run.phase=6;advance(run);}else run.phase=index;
    $('inspect').hidden=true;world.update(run);refresh();const target=poseAt(index);
    if($('motion').checked){player=target;arrive(audio);}else travel={from:{...player},to:target,elapsed:0,duration:Math.max(.8,Math.min(3.5,Math.hypot(target.x-player.x,target.z-player.z)/9)),audio};
  }
  function next(){if(run.done){run=createRun(lang);visited.clear();go(0);return;}advance(run);go(run.phase);}
  guide=new StepGuide({getClip,onAdvance:()=>false,onChange:refresh,gap:3});guide.automatic=false;
  try{world=createExperience($('world'),{es,onInspect(info){halt();$('inspect').hidden=false;$('inspect').textContent=info.text;}});world.update(run);}
  catch(error){$('app').innerHTML=`<section class="fallback"><h1>${t('El modo 3D no está disponible en este navegador.','3D mode is unavailable in this browser.')}</h1><a class="button" href="../llms/index.html">${t('Abrir experiencia web','Open web experience')}</a></section>`;console.error(error);}
  if(world){
    function start(auto){started=true;$('welcome').hidden=true;guided=auto;const fade=document.createElement('div');fade.className='fade';document.body.append(fade);fade.addEventListener('animationend',()=>fade.remove(),{once:true});go(0,auto);}
    $('start-tour').onclick=()=>start(true);$('start-free').onclick=()=>start(false);
    $('tour').onclick=()=>{if(guided){halt();return;}guided=true;go(run.phase);};
    $('listen').onclick=()=>{if(travel)return;if(guide.running)guide.pause();else if(guide.state==='ready')guide.replay();else guide.resume();};
    $('next').onclick=()=>{guided=false;next();};
    for(const b of document.querySelectorAll('[data-stop]'))b.onclick=()=>{guided=false;go(+b.dataset.stop);};
    $('language').onchange=e=>{voiceLanguage=e.target.value;const running=guide.running;guide.stop();if(running)guide.enter();refresh();};
    $('voice').onchange=e=>guide.setEnabled(e.target.checked);
    $('lock').onclick=()=>{const result=world.canvas.requestPointerLock?.();result?.catch?.(()=>{ $('status').textContent=t('Arrastra la escena para mirar.','Drag the scene to look.');});};
    const activeControl=target=>target.closest?.('input,select,textarea');
    window.addEventListener('keydown',e=>{if(!started||activeControl(e.target))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!keys.has(e.code)&& (travel||guide.running||guided))halt();keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat){e.preventDefault();go(nearestStop(player).index);}if(e.code==='Escape'){halt();document.exitPointerLock?.();}});
    window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',halt);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();last=performance.now();});
    world.canvas.addEventListener('pointerdown',e=>{if(!started||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};world.canvas.setPointerCapture(e.pointerId);});
    function look(dx,dy){if(travel||guided)halt();player.yaw-=dx*.003;player.pitch=Math.max(-.8,Math.min(.8,player.pitch-dy*.003));}
    window.addEventListener('mousemove',e=>{if(document.pointerLockElement===world.canvas)look(e.movementX,e.movementY);});
    world.canvas.addEventListener('pointermove',e=>{if(!drag||document.pointerLockElement)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;if(drag.moved)look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;});
    world.canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved)world.inspect(e.clientX,e.clientY);drag=null;});world.canvas.addEventListener('pointercancel',()=>{drag=null;});
    for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{e.preventDefault();halt();touch.add(b.dataset.move);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>touch.delete(b.dataset.move);}
    window.addEventListener('pagehide',e=>{halt();guide.stop();if(!e.persisted)world.dispose();});
    refresh();
    if(new URLSearchParams(location.search).get('entrance')==='painting')start(false);
    function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!document.hidden){
        if(travel){travel.elapsed+=dt;player=travelPose(travel.from,travel.to,travel.elapsed/travel.duration);if(travel.elapsed>=travel.duration)arrive(travel.audio);}
        else if(started){const input={forward:Number(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('back')),strafe:Number(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'))};player=walk(player,input,dt);}
        guide.tick(dt);
        if(guided&&guide.state==='ready'){if(run.phase===7){guided=false;$('status').textContent=t('Recorrido completo. Puedes seguir con otro token o explorar.','Tour complete. Continue with another token or explore.');refresh();}else next();}
        const clip=guide.clip||getClip(),progress=guideProgress(guide,clip);world.render(player,dt,progress,guide.running,cueAt(clip.cues,progress*clip.duration));
        uiTime+=dt;if(uiTime>.15){uiTime=0;const near=nearestStop(player);$('position').textContent=`${t('Cerca de','Near')} ${near.index+1} · ${player.x.toFixed(1)}, ${player.z.toFixed(1)} m`;$('position').dataset.x=player.x;$('position').dataset.z=player.z;$('progress').style.width=progress*100+'%';
          const states={loading:t('Cargando voz…','Loading voice…'),speaking:t('Escuchando','Listening'),reading:t('Tiempo de lectura','Reading time'),waiting:t('Observa · siguiente paso en ','Observe · next stop in ')+Math.ceil(guide.remaining)+' s',ready:t('Explicación terminada','Explanation finished'),paused:t('En pausa · explora libremente','Paused · explore freely'),idle:t('Explora o escucha este punto','Explore or listen here'),error:t('Voz no disponible. Reintenta o desactiva MiniMax.','Voice unavailable. Retry or disable MiniMax.'),blocked:t('Pulsa Escuchar para permitir el audio','Press Listen to allow audio')};
          $('status').textContent=travel?t('Siguiendo el recorrido…','Following the route…'):run.phase===7&&guide.state==='ready'?t('Recorrido completo. Sigue con otro token o explora.','Tour complete. Continue with another token or explore.'):states[guide.state]||'';
          if(run.phase===4&&guide.running){const cue=cueAt(clip.cues,progress*clip.duration);$('status').textContent+=` · ${OPERATIONS[cue.index].name[es?0:1]}`;}
        }
      }requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
  }
}
