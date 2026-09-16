import {STATIONS,BUFFER,STEP,createFactory,tick,automate,status,period,forecast,constraint} from './factory-model.js';
import {createFactoryWorld} from './factory-world.js';
import {createNarrator} from './narrator.js';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('es-ES');
let state=createFactory(undefined,true),reference=createFactory(),selected=1,playing=false,speed=1,motion=0,last=performance.now(),accumulator=0,uiClock=0;
const baseDay=forecast([0,0,0,0,0]);let planDay=baseDay;
const narrator=createNarrator({toggleHost:document.querySelector('.topbar'),onBegin(){playing=false;updateUI();}});
document.addEventListener('click',e=>{if(e.target.closest('#f-play,#f-reset,#f-automate,#f-lunch,#f-night,#f-day-end,#help,#f-assumptions'))narrator.stop();},true);
let world;
try{world=createFactoryWorld($('factory-canvas'));$('factory-loading').hidden=true;}
catch(error){$('factory-loading').textContent='No se pudo iniciar el mundo 3D. Los controles y la comparación siguen disponibles.';console.error(error);}
const labels=[],tabs=[];
STATIONS.forEach((st,i)=>{
  const b=document.createElement('button');b.type='button';b.className='station-label';b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span class="label-name">${st.name}</span><small></small>`;b.setAttribute('aria-label','Seleccionar '+st.name);b.addEventListener('click',()=>select(i));$('station-labels').append(b);labels.push(b);
  const tab=document.createElement('button');tab.type='button';tab.className='station-tab';tab.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${st.name}<small></small></span>`;tab.addEventListener('click',()=>{select(i);if(matchMedia('(max-width:760px)').matches)document.querySelector('.station-panel').scrollIntoView({behavior:'smooth',block:'start'});});$('station-tabs').append(tab);tabs.push(tab);
});
for(let i=0;i<16;i++)$('f-queue-dots').append(document.createElement('i'));
function select(i,focus=true,narrate=true){if(focus)$('f-follow-first').checked=false;selected=i;world?.select(i,focus);updateUI();if(focus&&narrate){let code=status(state,i).code;if(code==='starved')code=i===0?'kits':'waiting';if(code==='rest'&&state.robots[i].some(t=>t>state.time))code='arriving';narrator.explain('robot-factory-'+i,'state-'+code);}}
function recalculate(){planDay=forecast(state.robots.map(r=>r.length));}
function updateUI(){
  const hour=(state.time+8)%24,h=Math.floor(hour),m=Math.min(59,Math.floor((hour-h)*60+1e-5)),st=STATIONS[selected],s=status(state,selected),bound=constraint(state);
  updateFirstLoop();$('f-clock').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');$('f-day').textContent='DÍA '+String(state.day).padStart(2,'0');$('f-sun').textContent=h>=7&&h<20?'☀':'☾';$('f-period').textContent=period(state.time);
  $('f-run').textContent=playing?'EN MARCHA':'EN PAUSA';$('f-play').textContent=playing?'Ⅱ Pausar':'▶ Reproducir';$('f-play').setAttribute('aria-label',playing?'Pausar fábrica':'Reproducir fábrica');$('f-timeline').style.width=(state.time%24)/24*100+'%';
  $('f-today').textContent=fmt(state.today);$('f-reference').textContent=fmt(reference.today);$('f-total').textContent=fmt(state.total)+' desde el inicio'+(state.history.length?' · ayer '+state.history.at(-1):'');
  $('f-day-result').hidden=!state.history.length;if(state.history.length)$('f-day-result').textContent='Día '+(state.day-1)+' completado: '+state.history.at(-1)+' robots en tu fábrica · '+reference.history.at(-1)+' solo con humanos.';
  $('f-constraint').textContent=bound.index<0?'Suministro de kits':STATIONS[bound.index].name;$('f-constraint-note').textContent=bound.index<0?'Entran hasta 160 kits al día del exterior.':'Menor capacidad diaria teórica · las colas muestran las esperas actuales';
  $('f-number').textContent=String(selected+1).padStart(2,'0');$('f-station-name').textContent=st.name;$('f-task').textContent=st.task;$('f-status').textContent=s.text;$('f-status').dataset.state=s.code;
  $('f-humans').textContent=2-state.robots[selected].length;$('f-robots').textContent=state.robots[selected].length;$('f-rate').textContent=s.rate.toLocaleString('es-ES',{maximumFractionDigits:1});
  $('f-job-label').textContent=state.jobs[selected]===null?'En espera':s.code==='blocked'?'Salida llena':Math.floor(state.jobs[selected]*100)+' %';$('f-job').style.width=(state.jobs[selected]??0)*100+'%';
  $('f-queue-label').textContent=selected===0?'Kits disponibles':'Piezas esperando';$('f-queue').textContent=selected===0?fmt(state.queues[0]):state.queues[selected]+' / '+BUFFER;
  [...$('f-queue-dots').children].forEach((el,i)=>el.classList.toggle('filled',i<(selected===0?Math.ceil(state.queues[0]/20):state.queues[selected])));
  $('f-auto').checked=state.automatic;$('f-stock').textContent=fmt(state.total-state.deployed);$('f-returned').textContent=fmt(state.deployed);$('f-automate').disabled=state.robots[selected].length===2||state.total<=state.deployed;$('f-automate').textContent=state.robots[selected].length===2?'Puesto robotizado':state.total<=state.deployed?'Esperando un robot terminado':'+ Incorporar un robot';
  $('f-automation-note').textContent=state.robots[selected].length===2?'Las dos tareas tienen relevo. La maquinaria, los materiales y las pausas aún pueden limitar el puesto.':'Usa un robot ya terminado. Cubre una tarea humana tras 15 minutos simulados.';
  let insight;
  if(s.code==='blocked')insight='La salida está llena. Este puesto tiene que parar hasta que el siguiente retire piezas. Añadir aquí otro robot no resuelve esa espera.';
  else if(s.code==='rest')insight='En este momento no hay personal disponible. Los humanos descansan y cada robot también tiene su horario de recarga y mantenimiento.';
  else if(s.code==='starved'&&state.time>.8)insight=selected===0?'Se han agotado los kits. El siguiente suministro llega a las 08:00. Más robots no pueden fabricar sin materiales.':'Este puesto espera a los anteriores. La capacidad que ves es lo que podría hacer con piezas; no es producción terminada.';
  else if(selected===bound.index)insight='Este puesto tiene la menor capacidad diaria de la línea. Reforzarlo puede aumentar la salida, hasta que el límite pase a otro puesto o al suministro.';
  else if(bound.index<0)insight='La línea ya tiene más capacidad que el suministro diario de kits. Para seguir creciendo también harían falta más componentes del exterior.';
  else insight='Acelerar '+st.name.toLowerCase()+' puede llenar la cola de otro puesto. El límite diario está en '+STATIONS[bound.index].name.toLowerCase()+'. Mira los robots que salen de puesta en marcha.';
  $('f-insight').textContent=insight;
  $('f-base-day').textContent=fmt(baseDay);$('f-plan-day').textContent=fmt(planDay);const max=Math.max(baseDay,planDay,1);$('f-base-bar').style.width=baseDay/max*100+'%';$('f-plan-bar').style.width=planDay/max*100+'%';
  labels.forEach((el,i)=>{el.setAttribute('aria-pressed',selected===i);el.classList.toggle('bottleneck',i===bound.index);el.dataset.status=status(state,i).code;el.querySelector('small').textContent=state.queues[i]+(i===0?' kits':' en cola');tabs[i].setAttribute('aria-pressed',selected===i);tabs[i].querySelector('small').textContent=(2-state.robots[i].length)+' H · '+state.robots[i].length+' R';});
}
function step(){const before=state.deployed;tick(state);tick(reference);if(state.deployed!==before)recalculate();}
function jumpTo(target){const ticks=Math.round((target-state.time)/STEP);for(let n=0;n<ticks;n++)step();accumulator=0;updateUI();}
$('f-auto').addEventListener('change',e=>{narrator.stop();state.automatic=e.target.checked;updateUI();});
document.addEventListener('narration-focus',e=>{if(e.detail.startsWith('robot-factory-'))select(Number(e.detail.split('-').at(-1)),true,false);});
$('f-play').addEventListener('click',()=>{playing=!playing;last=performance.now();updateUI();});
$('f-speed').addEventListener('change',e=>speed=Number(e.target.value));
$('f-automate').addEventListener('click',()=>{if(automate(state,selected)){recalculate();playing=true;last=performance.now();updateUI();}});
$('f-reset').addEventListener('click',()=>{state=createFactory(undefined,true);reference=createFactory();playing=false;accumulator=0;recalculate();world?.fit();$('f-follow-first').checked=true;select(1,false);});
$('f-lunch').addEventListener('click',()=>{const day=Math.floor(state.time/24),at=day*24+5;jumpTo(at>state.time?at:at+24);});
$('f-night').addEventListener('click',()=>{const day=Math.floor(state.time/24),at=day*24+15;jumpTo(at>state.time?at:at+24);});
$('f-day-end').addEventListener('click',()=>{jumpTo(state.day*24);playing=false;updateUI();});
$('f-plus').addEventListener('click',()=>{$('f-follow-first').checked=false;world?.zoomBy(1.25);});$('f-minus').addEventListener('click',()=>{$('f-follow-first').checked=false;world?.zoomBy(.8);});$('f-fit').addEventListener('click',()=>{$('f-follow-first').checked=false;world?.fit();});
function help(){playing=false;updateUI();$('factory-about').showModal();}
$('help').addEventListener('click',help);$('f-assumptions').addEventListener('click',help);$('f-close-help').addEventListener('click',()=>$('factory-about').close());
const pointers=new Map();let moved=false,startPoint=null,lastPinch=0;
const surface=$('factory-canvas');
surface.addEventListener('pointerdown',()=>{$('f-follow-first').checked=false;});
$('f-first-explain').onclick=()=>narrator.explain('factory-first-loop');
surface.addEventListener('pointerdown',e=>{if(e.button!==0)return;surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){startPoint={x:e.clientX,y:e.clientY};moved=false;}else{moved=true;const p=[...pointers.values()];lastPinch=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);}});
surface.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const p=[...pointers.values()],d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);if(lastPinch>0)world?.zoomBy(d/lastPinch);lastPinch=d;moved=true;}else{if(startPoint&&Math.hypot(e.clientX-startPoint.x,e.clientY-startPoint.y)>6)moved=true;if(moved)world?.pan(dx,dy);}});
surface.addEventListener('pointerup',e=>{if(!moved&&pointers.size===1){const i=world?.pick(e.clientX,e.clientY);if(i!==undefined)select(i);}pointers.delete(e.pointerId);lastPinch=0;});
surface.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);moved=true;lastPinch=0;});surface.addEventListener('wheel',e=>{e.preventDefault();$('f-follow-first').checked=false;world?.zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});
document.addEventListener('visibilitychange',()=>{last=performance.now();});
function frame(now){const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
  if(!document.hidden){if(playing){accumulator+=dt*speed*.32;while(accumulator>=STEP){step();accumulator-=STEP;}motion+=dt*Math.min(speed,2);}else motion+=dt*.25;
    uiClock+=dt;if(uiClock>.15){updateUI();uiClock=0;}
    world?.render(state,motion,constraint(state).index,$('f-follow-first').checked);labels.forEach((b,i)=>{if(!world){b.hidden=true;return;}const p=world.project(i),w=surface.clientWidth,h=surface.clientHeight;b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=p.x<20||p.x>w-20||p.y<75||p.y>h-48;});
  }requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);

function updateFirstLoop(){const first=state.firstReturn;let title,text;
 if(state.firstFinished===null){title='Las personas construyen el primer robot.';text='Observa la salida de la línea. Un robot terminado podrá volver y ayudar a fabricar los siguientes.';}
 else if(!first){title='El primer robot está terminado.';text='Ya puedes incorporarlo a un puesto o activar el relevo automático. Fabricado no significa todavía trabajando.';}
 else if(state.time<first.ready){title='El primer robot regresa a la línea.';text='Destino: '+STATIONS[first.station].name+'. Durante el traslado todavía no aumenta la capacidad del puesto.';}
 else{title='Ya está incorporado a la línea.';text='Su tarea está en '+STATIONS[first.station].name+'. La salida total sigue dependiendo de los otros puestos y del suministro de componentes.';}
 $('f-first-title').textContent=title;$('f-first-text').textContent=text;
}
