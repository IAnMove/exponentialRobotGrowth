import {createLiveHeader} from '../live/header.js';
import {createLedger} from '../live/metrics.js';
import {idealFleet} from './learning-model.js';
import {TYPES,STEP,COST,WORK,MAX_PROJECTS,SLOTS,createRegion,tickRegion,counts,metrics,startBuild} from './region-model.js';
import {createUrbanWorld} from './urban-world.js';
import {createTerritory,tickTerritory,TOWNS,covered,townCapacity} from './territory-model.js';
import {createNarrator} from './narrator.js';
const $=id=>document.getElementById(id),fmt=(n,d=0)=>n.toLocaleString('en-US',{maximumFractionDigits:d});
let state=createTerritory(.4,true,.35,true),reference=createTerritory(0,false,.35,true),playing=false,speed=1,motion=0,selected=-1,last=performance.now(),accumulator=0,uiTime=0,world,referenceWorld;let mapView='expanded';
let liveLedger=createLedger(),livePoints=[];
const live=createLiveHeader({anchor:'.region-layout',kind:'region',onFinish:()=>$('r-finish').click(),onPlay:()=>$('r-play').click(),onReset:()=>$('r-reset').click()});
function liveRow(){return {time:state.time,total:state.built,reference:reference.built,fleet:state.fleet+state.exported,referenceFleet:reference.fleet+reference.exported,...liveLedger.values()};}
function updateLive(){const row=liveRow();live.update({time:state.time,playing,horizon:state.end,replacement:{done:state.delivered,total:600,tasks:true,full:state.full},points:[...livePoints.filter(p=>p.time<state.time),row],message:limits[state.reason][1]});}
const narrator=createNarrator({toggleHost:document.querySelector('.region-top'),onBegin(){playing=false;update();}});
try{world=createUrbanWorld($('r-canvas'),{regional:true});referenceWorld=createUrbanWorld($('r-reference-canvas'),{regional:true});$('r-loading').hidden=true;}catch(e){$('r-loading').textContent='The 3D world could not start. Controls and comparisons remain available.';console.error(e);}
const labels=[],tabs=[],townLabels=[],townCards=[];let townSelected=-1;
TOWNS.forEach((t,i)=>{for(const overlay of [true,false]){const b=document.createElement('button');b.type='button';b.className=overlay?'region-zone town-zone':'town-card';b.innerHTML='<span>'+t.name+'</span><strong></strong><small></small><i><em></em></i>';b.onclick=()=>selectTown(i);(overlay?$('r-town-labels'):$('r-town-cards')).append(b);(overlay?townLabels:townCards).push(b);}});
const sectors=document.createElement('div');sectors.className='region-sectors';sectors.setAttribute('aria-label','Select an industry');document.querySelector('.region-chain').after(sectors);
TYPES.forEach((t,i)=>{for(const overlay of [true,false]){const b=document.createElement('button');b.type='button';b.className=overlay?'region-zone':'region-sector';b.innerHTML='<b>'+String(i+1).padStart(2,'0')+'</b><span>'+t.name+'</span><small></small>';b.setAttribute('aria-label','Select '+t.name);b.addEventListener('click',()=>select(i*SLOTS));(overlay?$('r-labels'):sectors).append(b);(overlay?labels:tabs).push(b);}});
const limits={
  start:['Initial balance','The region needs to reinforce its entire chain to keep growing.'],
  power:['Not enough electrical power','Demand exceeds generation. Expanding energy lets factories and construction use more of their capacity.'],
  transport:['Transport at capacity','The network cannot move the full potential flow. More logistics capacity connects the expansions.'],
  kits:['Components are missing','Robot factories are waiting for kits. Reinforcing components or their suppliers can unlock them.'],
  material:['Material for the next project','Construction and components share material. Expanding refining can release resources for investment.'],
  land:['The map has a limit','Every plot is occupied. The fleet can keep growing, but regional capacity no longer expands.'],
  machines:['Robots without a workstation','There are more robots than workstations in current facilities. New construction can create useful capacity.'],
  balanced:['The chain moves together','The next expansion needs workers, material and time. Output increases when new capacity enters service.']
};
function chart(element,series,maxTime=state.end){
  const width=320,height=['r-chart','r-rate-chart'].includes(element.id)?130:110,bottom=height-7,peak=Math.max(1,...series.flatMap(s=>s.values.map(p=>p[1]))),left=28,right=316,top=12;
  let svg='';for(let n=0;n<3;n++){const y=top+(bottom-top)*n/2;svg+='<path d="M'+left+' '+y+'H'+right+'" stroke="#718c9e" stroke-opacity=".2"/><text x="0" y="'+(y+3)+'" fill="#91aebe" font-size="9">'+fmt(peak*(1-n/2))+'</text>';}
  series.forEach((s,i)=>{const points=s.values.map(([x,y])=>(left+x/maxTime*(right-left)).toFixed(2)+','+(bottom-y/peak*(bottom-top)).toFixed(2)).join(' ');svg+='<polyline points="'+points+'" fill="none" stroke="'+s.color+'" stroke-width="'+(i?2.5:1.7)+'" '+(i?'':'stroke-dasharray="4 4"')+' stroke-linecap="round" stroke-linejoin="round"/>';});element.innerHTML=svg;
}
function update(){
  updateLive();
  const n=counts(state),m=metrics(state),projects=state.sites.filter(p=>p.status==='building'),limit=limits[state.reason];
  $('r-cycle').textContent='CYCLE '+String(Math.floor(state.time)).padStart(2,'0');$('r-play-state').textContent=playing?'Running':'Paused';$('r-play').textContent=playing?'Ⅱ Pause':state.time>=state.end?'↺ Replay':'▶ Play';$('r-progress').style.width=state.time/state.end*100+'%';
  updateLearning();$('r-fleet').textContent=fmt(state.fleet+state.exported);$('r-fleet-note').textContent='24 initial + '+fmt(state.built)+' new';$('r-buildings').textContent=n.reduce((a,b)=>a+b,0);$('r-projects').textContent=projects.length+' construction projects';$('r-rate').textContent=fmt(state.flow[3],1);$('r-multiple').textContent=fmt(reference.flow[3],1)+' / cycle without new facilities';
  $('r-working').textContent=fmt(m.working)+' in production';$('r-builders').textContent=fmt(m.builders)+' building';$('r-idle').textContent=fmt(m.idle)+' available';$('r-share-label').textContent=Math.round(state.share*100)+' %';
  $('r-gain').textContent=fmt((state.fleet+state.exported)/(reference.fleet+reference.exported),2)+'×';$('r-chart-end').textContent='Cycle '+Math.floor(state.time)+' / '+state.end;
  const curves=[{values:[[0,24],...reference.urbanHistory.map(p=>[p.time,p.total])],color:'#839eaf'},{values:[[0,24],...state.urbanHistory.map(p=>[p.time,p.total])],color:'#a7e0cf'}];if($('r-ideal').checked)curves.push({values:[[0,24],...state.urbanHistory.map(p=>[p.time,idealFleet(p.time)])],color:'#c5a5ff'});chart($('r-chart'),curves);$('r-chart').setAttribute('aria-label','Fleet: '+fmt(state.fleet+state.exported)+'; without new facilities: '+fmt(reference.fleet+reference.exported));chart($('r-rate-chart'),[{values:[[0,0],...reference.urbanHistory.map(h=>[h.time,h.rate])],color:'#839eaf'},{values:[[0,0],...state.urbanHistory.map(h=>[h.time,h.rate])],color:'#a7e0cf'}]);
  $('r-limit').textContent=limit[0];$('r-limit-note').textContent=limit[1];
  for(const [id,ratio] of [['power',m.energyDemand/m.power],['log',m.freight/Math.max(.001,m.transport)]]){$('r-'+id+'-label').textContent=fmt(ratio*100)+' %';$('r-'+id+'-bar').style.width=Math.min(100,ratio*100)+'%';$('r-'+id+'-bar').classList.toggle('over',ratio>1);}
  const event=state.events.at(-1);$('r-event').textContent=state.time>=state.end?'Scenario complete. Compare fleets and try a different investment.':event?(event.event==='opened'?'New facility opened: ':'Construction started: ')+TYPES[event.type].name+'. '+(event.event==='opened'?'The capacity is now available.':'The material has been reserved.'):'24 robots. Six facilities. A new scale.';
  TYPES.forEach((t,i)=>{for(const b of [labels[i],tabs[i]]){b.querySelector('small').textContent=n[i]+' / 6 '+(projects.some(p=>p.type===i)?' · building':'');b.setAttribute('aria-pressed',String(selected>=0&&Math.floor(selected/SLOTS)===i));}});
  $('r-delivery-value').textContent=Math.round(state.delivery*100)+' %';$('r-urban-total').textContent=state.delivered;$('r-in-transit').textContent=state.shipments.length;$('r-depot').textContent=state.depot;$('r-industrial-fleet').textContent=state.fleet;
  state.towns.forEach((t,i)=>{const total=t.tasks.reduce((a,b)=>a+b,0),n=covered(t);for(const b of [townLabels[i],townCards[i]]){b.querySelector('strong').textContent=fmt(n/total*100,1)+' %';b.querySelector('small').textContent=n+' / '+total+' · '+t.reserved+' '+ 'on the way';b.querySelector('em').style.width=n/total*100+'%';b.setAttribute('aria-pressed',String(townSelected===i));}});
  if(townSelected>=0)inspectTown();if(selected>=0)inspect();
}
function inspect(){const p=state.sites[selected],t=TYPES[p.type];$('r-selected-name').textContent=t.name+' · '+String(p.slot+1).padStart(2,'0');$('r-selected-description').textContent=t.description;$('r-selected-state').textContent=p.status==='open'?'OPERATING FACILITY':p.status==='building'?'CONSTRUCTION · '+fmt(p.progress/WORK*100)+' %':'AVAILABLE PLOT';
  const full=state.sites.filter(p=>p.status==='building').length>=MAX_PROJECTS;$('r-build').hidden=p.status!=='empty';$('r-build').disabled=state.material<COST||full||state.time>=state.end;$('r-build').textContent=full?'Three projects in progress':state.material<COST?'Not enough material':'Build here · 48';
  const projectOrder=state.sites.filter(site=>site.status==='building').indexOf(p),projectWorkers=Math.max(0,Math.min(4,metrics(state).builders-projectOrder*4));
  $('r-build-note').textContent=p.status==='building'?fmt(projectWorkers)+' robots on this project · '+fmt(WORK-p.progress,1)+' work units remaining.':p.status==='empty'?'Cost: 48 material batches. Work: 24 units. Assign robots to construction to make progress.':'Installed capacity. Output depends on workers, energy and supplies.';
  $('r-enter').hidden=p.status!=='open';$('r-output').textContent=fmt(state.flow[p.type],1);$('r-site-unit').textContent=t.unit;
  chart($('r-site-chart'),[{values:[[0,0],...reference.history.map(h=>[h.time,h.flow[p.type]])],color:'#839eaf'},{values:[[0,0],...state.history.map(h=>[h.time,h.flow[p.type]])],color:'#a7e0cf'}]);$('r-site-chart').setAttribute('aria-label',t.name+': '+fmt(state.flow[p.type],1)+' '+t.unit);
  $('r-ore').textContent=fmt(state.ore,1);$('r-material').textContent=fmt(state.material,1);$('r-kits').textContent=fmt(state.kits,1);
}
function select(i,narrate=true){if(i<0)return;if(i>=36){selectTown(i-36,narrate);return;}townSelected=-1;$('r-town-inspector').hidden=true;selected=i;$('r-inspector').hidden=false;cameraAction('select',i);update();const p=state.sites[i];if(narrate)narrator.explain('region-'+p.type,p.status==='building'?'region-project':p.status==='open'?'region-operation':null);if(narrate&&matchMedia('(max-width:760px)').matches)$('r-inspector').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
function step(){liveLedger.add(STEP,{sites:counts(state).reduce((a,b)=>a+b,0)},{sites:counts(reference).reduce((a,b)=>a+b,0)});tickTerritory(state);tickTerritory(reference);if(!livePoints.length||state.time-livePoints.at(-1).time>=1-1e-7)livePoints.push(liveRow());if(state.time>=state.end)playing=false;}
function reset(){narrator.stop();liveLedger=createLedger();livePoints=[];state=createTerritory(Number($('r-share').value)/100,$('r-auto').checked,Number($('r-delivery').value)/100,$('r-scenario').value==='full');reference=createTerritory(0,false,Number($('r-delivery').value)/100,$('r-scenario').value==='full');townSelected=-1;$('r-town-inspector').hidden=true;playing=false;motion=0;accumulator=0;selected=-1;$('r-inspector').hidden=true;cameraAction('select',-1,false);cameraAction('fit');update();}
document.addEventListener('click',e=>{if(e.target.closest('#r-play,#r-jump,#r-reset,#r-build,#r-close,#r-help,#r-assumptions'))narrator.stop();},true);
$('r-play').onclick=()=>{if(state.time>=state.end)reset();playing=!playing;last=performance.now();update();};$('r-speed').onchange=e=>speed=Number(e.target.value);$('r-reset').onclick=reset;$('r-scenario').onchange=reset;$('r-finish').onclick=()=>{narrator.stop();playing=false;while(state.time<state.end)step();update();};
$('r-jump').onclick=()=>{playing=false;for(let i=0;i<10/STEP&&state.time<state.end;i++)step();update();};$('r-share').oninput=e=>{narrator.stop();state.share=Number(e.target.value)/100;update();};$('r-auto').onchange=e=>{narrator.stop();state.auto=e.target.checked;update();};
$('r-build').onclick=()=>{if(startBuild(state,selected)){playing=true;last=performance.now();update();}};$('r-close').onclick=()=>{selected=-1;$('r-inspector').hidden=true;cameraAction('select',-1,false);cameraAction('fit');update();};$('r-enter').onclick=()=>location.href='./district.html';
$('r-delivery').oninput=e=>{narrator.stop();state.delivery=reference.delivery=Number(e.target.value)/100;update();};
$('r-plus').onclick=()=>cameraAction('zoomBy',1.25);$('r-minus').onclick=()=>cameraAction('zoomBy',.8);$('r-fit').onclick=()=>cameraAction('fit');
function help(){playing=false;update();$('r-about').showModal();}$('r-help').onclick=help;$('r-assumptions').onclick=help;$('r-close-help').onclick=()=>$('r-about').close();$('r-explain').onclick=()=>{$('r-about').close();narrator.explain('region-overview');};
const surface=$('r-canvas');
for(const [element,source] of [[$('r-canvas'),()=>world],[$('r-reference-canvas'),()=>referenceWorld]]){
 const pointers=new Map();let moved=false,start=null,pinch=0;
 element.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});element.setPointerCapture(e.pointerId);if(pointers.size===1){start={x:e.clientX,y:e.clientY};moved=false;}else{moved=true;const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
 element.addEventListener('pointermove',e=>{const before=pointers.get(e.pointerId);if(!before)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)linkedCamera(source(),'zoomBy',d/pinch);pinch=d;moved=true;}else{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)moved=true;if(moved)linkedCamera(source(),'pan',e.clientX-before.x,e.clientY-before.y);}});
 element.addEventListener('pointerup',e=>{if(!moved&&pointers.size===1)select(source()?.pick(e.clientX,e.clientY)??-1);pointers.delete(e.pointerId);pinch=0;});element.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);moved=true;pinch=0;});element.addEventListener('wheel',e=>{e.preventDefault();linkedCamera(source(),'zoomBy',Math.exp(-e.deltaY*.001));},{passive:false});
}
$('r-compare').onchange=updateMapMode;$('r-view-expanded').onclick=()=>{mapView='expanded';updateMapMode();};$('r-view-fixed').onclick=()=>{mapView='fixed';updateMapMode();};$('r-ideal').onchange=()=>{narrator.stop();update();};$('r-growth-explain').onclick=()=>narrator.explain('region-growth-lesson');
function linkedCamera(source,method,...args){if(!source)return;source[method](...args);for(const w of [world,referenceWorld])if(w&&w!==source)w.setView(source.getView());}
function cameraAction(method,...args){linkedCamera(matchMedia('(max-width:760px)').matches&&mapView==='fixed'&&$('r-compare').checked?referenceWorld:world,method,...args);}
function updateMapMode(){const on=$('r-compare').checked;if(!on)mapView='expanded';$('r-map-board').classList.toggle('compare-maps',on);$('r-map-board').classList.toggle('view-fixed',on&&mapView==='fixed');document.querySelector('.comparison-titles').classList.toggle('solo',!on);$('r-view-expanded').setAttribute('aria-pressed',String(mapView==='expanded'));$('r-view-fixed').setAttribute('aria-pressed',String(mapView==='fixed'));$('r-view-fixed').disabled=!on;}
function updateLearning(){
 $('r-map-total').textContent=fmt(state.fleet+state.exported);$('r-ref-total').textContent=fmt(reference.fleet+reference.exported);$('r-ideal-key').hidden=!$('r-ideal').checked;
 $('r-doublings').innerHTML=[48,96,192,384,768].map(target=>{const a=state.doublings.find(d=>d.target===target),b=reference.doublings.find(d=>d.target===target);return '<div class="doubling-row"><b>'+target+'</b><span>'+(a?fmt(a.duration,1)+' cycles':'—')+'</span><small>'+(b?fmt(b.duration,1)+' cycles':'—')+'</small></div>';}).join('');
}
updateMapMode();
document.addEventListener('visibilitychange',()=>last=performance.now());update();
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden){if(playing){accumulator+=dt*speed;motion+=dt*Math.min(speed,2);while(accumulator>=STEP&&state.time<state.end){step();accumulator-=STEP;}}uiTime+=dt;if(uiTime>.25){update();uiTime=0;}const scale=world?.render(state,motion)??1;if($('r-compare').checked)referenceWorld?.render(reference,motion);$('r-scale').textContent=scale===1?'Each figure represents one robot':'Urban figures: up to '+scale+' tasks · vehicles: delivery batches';labels.forEach((b,i)=>{if(!world){b.hidden=true;return;}const p=world.project(i);b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=p.x<25||p.x>surface.clientWidth-25||p.y<65||p.y>surface.clientHeight-85;});townLabels.forEach((b,i)=>{if(!world){b.hidden=true;return;}const p=world.projectTown(i);b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=p.x<30||p.x>surface.clientWidth-30||p.y<65||p.y>surface.clientHeight-85;});}requestAnimationFrame(frame);}requestAnimationFrame(frame);

document.addEventListener('narration-focus',e=>{if(/^region-\d+$/.test(e.detail))select(Number(e.detail.split('-')[1])*SLOTS,false);});

function selectTown(i,narrate=true){selected=-1;townSelected=i;$('r-inspector').hidden=true;$('r-town-inspector').hidden=false;cameraAction('select',36+i);update();if(narrate)narrator.explain('region-city-'+i);}
function inspectTown(){const i=townSelected,t=state.towns[i],n=covered(t),total=t.tasks.reduce((a,b)=>a+b,0);$('r-town-name').textContent=TOWNS[i].name;$('r-town-human').textContent=total-n;$('r-town-robot').textContent=n;$('r-town-travel').textContent=t.travel+' cycles in transit · '+t.reserved+' robots in transit';chart($('r-town-chart'),[{values:[[0,0],...reference.urbanHistory.map(h=>[h.time,h.covered[i]])],color:'#839eaf'},{values:[[0,0],...state.urbanHistory.map(h=>[h.time,h.covered[i]])],color:'#70e1c6'}]);}
document.addEventListener('narration-focus',e=>{if(/^region-city-\d+$/.test(e.detail))selectTown(Number(e.detail.split('-')[2]),false);});
