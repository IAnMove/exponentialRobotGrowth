import {STATIONS,BUFFER,STEP,createFactory,tick,automate,status,period,forecast,constraint} from './factory-model.js';
import {createFactoryWorld} from './factory-world.js';
import {createNarrator} from './narrator.js';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('en-US');
let state=createFactory(undefined,true),reference=createFactory(),selected=1,playing=false,speed=1,motion=0,last=performance.now(),accumulator=0,uiClock=0;
const baseDay=forecast([0,0,0,0,0]);let planDay=baseDay;
const narrator=createNarrator({toggleHost:document.querySelector('.topbar'),onBegin(){playing=false;updateUI();}});
document.addEventListener('click',e=>{if(e.target.closest('#f-play,#f-reset,#f-automate,#f-lunch,#f-night,#f-day-end,#help,#f-assumptions'))narrator.stop();},true);
let world;
try{world=createFactoryWorld($('factory-canvas'));$('factory-loading').hidden=true;}
catch(error){$('factory-loading').textContent='The 3D world could not start. Controls and comparisons remain available.';console.error(error);}
const labels=[],tabs=[];
STATIONS.forEach((st,i)=>{
  const b=document.createElement('button');b.type='button';b.className='station-label';b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span class="label-name">${st.name}</span><small></small>`;b.setAttribute('aria-label','Select '+st.name);b.addEventListener('click',()=>select(i));$('station-labels').append(b);labels.push(b);
  const tab=document.createElement('button');tab.type='button';tab.className='station-tab';tab.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${st.name}<small></small></span>`;tab.addEventListener('click',()=>{select(i);if(matchMedia('(max-width:760px)').matches)document.querySelector('.station-panel').scrollIntoView({behavior:'smooth',block:'start'});});$('station-tabs').append(tab);tabs.push(tab);
});
for(let i=0;i<16;i++)$('f-queue-dots').append(document.createElement('i'));
function select(i,focus=true,narrate=true){if(focus)$('f-follow-first').checked=false;selected=i;world?.select(i,focus);updateUI();if(focus&&narrate){let code=status(state,i).code;if(code==='starved')code=i===0?'kits':'waiting';if(code==='rest'&&state.robots[i].some(t=>t>state.time))code='arriving';narrator.explain('robot-factory-'+i,'state-'+code);}}
function recalculate(){planDay=forecast(state.robots.map(r=>r.length));}
function updateUI(){
  const hour=(state.time+8)%24,h=Math.floor(hour),m=Math.min(59,Math.floor((hour-h)*60+1e-5)),st=STATIONS[selected],s=status(state,selected),bound=constraint(state);
  updateFirstLoop();$('f-clock').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');$('f-day').textContent='DAY '+String(state.day).padStart(2,'0');$('f-sun').textContent=h>=7&&h<20?'☀':'☾';$('f-period').textContent=period(state.time);
  $('f-run').textContent=playing?'RUNNING':'PAUSED';$('f-play').textContent=playing?'Ⅱ Pause':'▶ Play';$('f-play').setAttribute('aria-label',playing?'Pause factory':'Play factory');$('f-timeline').style.width=(state.time%24)/24*100+'%';
  $('f-today').textContent=fmt(state.today);$('f-reference').textContent=fmt(reference.today);$('f-total').textContent=fmt(state.total)+' since the start'+(state.history.length?' · yesterday '+state.history.at(-1):'');
  $('f-day-result').hidden=!state.history.length;if(state.history.length)$('f-day-result').textContent='Day '+(state.day-1)+' completed: '+state.history.at(-1)+' robots in your factory · '+reference.history.at(-1)+' with humans only.';
  $('f-constraint').textContent=bound.index<0?'Kit supply':STATIONS[bound.index].name;$('f-constraint-note').textContent=bound.index<0?'Up to 160 kits arrive daily from outside.':'Lowest theoretical daily capacity · queues show current waiting';
  $('f-number').textContent=String(selected+1).padStart(2,'0');$('f-station-name').textContent=st.name;$('f-task').textContent=st.task;$('f-status').textContent=s.text;$('f-status').dataset.state=s.code;
  $('f-humans').textContent=2-state.robots[selected].length;$('f-robots').textContent=state.robots[selected].length;$('f-rate').textContent=s.rate.toLocaleString('en-US',{maximumFractionDigits:1});
  $('f-job-label').textContent=state.jobs[selected]===null?'Waiting':s.code==='blocked'?'Output queue full':Math.floor(state.jobs[selected]*100)+' %';$('f-job').style.width=(state.jobs[selected]??0)*100+'%';
  $('f-queue-label').textContent=selected===0?'Available kits':'Parts waiting';$('f-queue').textContent=selected===0?fmt(state.queues[0]):state.queues[selected]+' / '+BUFFER;
  [...$('f-queue-dots').children].forEach((el,i)=>el.classList.toggle('filled',i<(selected===0?Math.ceil(state.queues[0]/20):state.queues[selected])));
  $('f-auto').checked=state.automatic;$('f-stock').textContent=fmt(state.total-state.deployed);$('f-returned').textContent=fmt(state.deployed);$('f-automate').disabled=state.robots[selected].length===2||state.total<=state.deployed;$('f-automate').textContent=state.robots[selected].length===2?'Station automated':state.total<=state.deployed?'Waiting for a finished robot':'+ Add a robot';
  $('f-automation-note').textContent=state.robots[selected].length===2?'Both tasks are covered by robots. Machinery, materials and breaks can still limit this station.':'Uses a finished robot. Covers one human task after 15 simulated minutes.';
  let insight;
  if(s.code==='blocked')insight='The output queue is full. This station must stop until the next one takes parts. Adding another robot here will not resolve the wait.';
  else if(s.code==='rest')insight='No workers are available now. People are resting, and each robot also has a charging and maintenance schedule.';
  else if(s.code==='starved'&&state.time>.8)insight=selected===0?'Kits have run out. The next delivery arrives at 08:00. More robots cannot produce without materials.':'This station is waiting for earlier stages. Its capacity is what it could produce with parts; it is not finished output.';
  else if(selected===bound.index)insight='This station has the lowest daily capacity. Reinforcing it can increase output until another station or supply becomes the limit.';
  else if(bound.index<0)insight='The line already has more capacity than the daily kit supply. Further growth also requires more components from outside.';
  else insight='Speeding up '+st.name.toLowerCase()+' can fill another station\'s queue. The daily limit is at '+STATIONS[bound.index].name.toLowerCase()+'. Watch the robots leaving commissioning.';
  $('f-insight').textContent=insight;
  $('f-base-day').textContent=fmt(baseDay);$('f-plan-day').textContent=fmt(planDay);const max=Math.max(baseDay,planDay,1);$('f-base-bar').style.width=baseDay/max*100+'%';$('f-plan-bar').style.width=planDay/max*100+'%';
  labels.forEach((el,i)=>{el.setAttribute('aria-pressed',selected===i);el.classList.toggle('bottleneck',i===bound.index);el.dataset.status=status(state,i).code;el.querySelector('small').textContent=state.queues[i]+(i===0?' kits':' in queue');tabs[i].setAttribute('aria-pressed',selected===i);tabs[i].querySelector('small').textContent=(2-state.robots[i].length)+' H · '+state.robots[i].length+' R';});
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
 if(state.firstFinished===null){title='People build the first robot.';text='Watch the end of the line. A finished robot can return and help build the next ones.';}
 else if(!first){title='The first robot is complete.';text='You can now assign it to a station or enable automatic deployment. Built does not yet mean working.';}
 else if(state.time<first.ready){title='The first robot returns to the line.';text='Destination: '+STATIONS[first.station].name+'. While in transit, it does not yet add capacity to the station.';}
 else{title='It has now joined the line.';text='Its task is at '+STATIONS[first.station].name+'. Total output still depends on the other stations and on component supply.';}
 $('f-first-title').textContent=title;$('f-first-text').textContent=text;
}
