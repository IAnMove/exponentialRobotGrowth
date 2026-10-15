export function timeBudget(tasks,selected,overhead){const total=tasks.reduce((n,t)=>n+t.minutes,0),delegated=tasks.filter(t=>selected.has(t.id)).reduce((n,t)=>n+t.minutes,0),support=delegated*overhead/100;return {total,delegated,support,freed:delegated-support,remaining:total-delegated+support};}
// Seconds are presentation time, minutes are illustrative human active work.
export const CHORES=[
 {id:'floor',minutes:25,actor:'vacuum',es:'Aspirar el suelo',en:'Vacuum the floor',room:['Salón','Living room'],position:[-3,2.5],detail:['El aspirador recorre la alfombra y recoge la suciedad. Es una automatización disponible hoy, con límites de acceso y mantenimiento.','The vacuum crosses the rug and collects dirt. This automation exists today, with access and maintenance limits.']},
 {id:'dishes',minutes:15,actor:'robot',es:'Recoger y lavar platos',en:'Clear and wash dishes',room:['Cocina','Kitchen'],position:[-2.3,-1.1],detail:['Un robot retira los platos y carga el lavavajillas. La manipulación general y fiable se supone en este escenario futuro.','A robot clears dishes and loads the dishwasher. Reliable general manipulation is assumed in this future scenario.']},
 {id:'cook',minutes:35,actor:'robot',es:'Preparar la comida',en:'Prepare a meal',room:['Cocina','Kitchen'],position:[-3,-3.1],detail:['El robot prepara ingredientes y sirve una comida. Suponemos destreza, seguridad y una cocina compatible; no es una capacidad universal demostrada.','The robot prepares ingredients and serves a meal. Dexterity, safety and a compatible kitchen are assumed; this is not a proven universal capability.']},
 {id:'laundry',minutes:25,actor:'robot',es:'Lavar y doblar ropa',en:'Wash and fold laundry',room:['Lavadero','Laundry'],position:[2.4,2.8],detail:['La misma ropa pasa del cesto a una lavadora-secadora y se dobla después de secarse. Los ciclos de lavado y secado se comprimen; los 25 minutos representan trabajo humano activo ilustrativo.','The same clothes move from the basket to a washer-dryer and are folded after drying. Wash and dry cycles are compressed; the 25 minutes are an illustrative active-human-work baseline.']},
 {id:'bed',minutes:10,actor:'robot',es:'Hacer la cama',en:'Make the bed',room:['Dormitorio','Bedroom'],position:[3.35,-1.8],detail:['La manta y las dos almohadas se ajustan después de tocarlas por un borde. La escena supone capacidad futura para manipular tejidos y adaptarse al mobiliario.','The blanket and both pillows are adjusted after contact with an edge. The scene assumes future capability to handle fabric and adapt to furniture.']},
 {id:'bath',minutes:20,actor:'robot',es:'Limpiar el baño',en:'Clean the bathroom',room:['Baño','Bathroom'],position:[4.05,2.2],detail:['El robot limpia el lavabo y el suelo. Se supone resistencia al agua, higiene y manejo seguro de productos.','The robot cleans the basin and floor. Water resistance, hygiene and safe handling of products are assumed.']},
 {id:'plan',minutes:15,actor:'ai',es:'Organizar compras y agenda',en:'Plan shopping and schedules',room:['Escritorio','Study'],position:[4.7,-2.4],detail:['La IA prepara una lista y organiza el calendario. Aquí suponemos delegación completa; en un uso actual pueden hacer falta revisión y aprobación.','AI prepares a list and organizes the calendar. Full delegation is assumed here; current use may require review and approval.']}
];
export const TASK_SECONDS=10,DURATION=CHORES.length*TASK_SECONDS;
export function createHome(overhead=0){return {time:0,overhead,playing:false};}
export function tickHome(s,dt){if(s.playing&&Number.isFinite(dt)&&dt>0)s.time=Math.min(DURATION,s.time+dt);if(s.time>=DURATION)s.playing=false;return s;}
export function homeSnapshot(s){const done=Math.min(CHORES.length,Math.floor(s.time/TASK_SECONDS)),index=Math.min(done,CHORES.length-1),phase=s.time>=DURATION?1:(s.time%TASK_SECONDS)/TASK_SECONDS;return {done,index,phase,work:Math.max(0,(phase-.25)/.75),complete:done===CHORES.length,...timeBudget(CHORES,new Set(CHORES.slice(0,done).map(t=>t.id)),s.overhead)};}

// The trace below describes an illustrative choreography, not elapsed appliance
// time or a measured capability of a general-purpose domestic robot. Legacy
// accounting above remains available to the other notebooks.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const copy=v=>Array.isArray(v)?v.map(copy):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)])):v;
function immutable(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(immutable);Object.freeze(v);}return v;}
function angleMix(a,b,u){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;}
function arc(a,b,u,height=.15){const p=mix(a,b,u);p[1]+=Math.sin(Math.PI*u)*height;return p;}

export const HOME_LAYOUT=immutable({
 bounds:{min:[-6,0,-5],max:[6,3.1,5]},
 supports:{table:.85,worktop:.94,foldboard:.90,bed:.70},
 actorStart:[-.55,0,4.2],humanIdle:[-5.1,0,2.85],robotIdle:[-.55,0,-2.7],vacuumDock:[-.55,.13,3.5],
 anchors:{table:[-2.8,0,-1.1],dishwasher:[-1.6,0,-3.65],prep:[-3.4,0,-3.65],stove:[-4.3,0,-3.65],basket:[2.6,0,3.05],washer:[1.35,0,3.2],fold:[1.9,0,2.65],bedSide:[2.70,0,-2.75],bathSink:[4.7,0,1.85],bathFloor:[4.15,0,2.7],desk:[4.7,0,-2.35]},
 appliances:{dishwasher:[-1.6,.5,-4.45],washerDryer:[1.35,.5,3.95],hob:[-4.3,.98,-4.4],pot:[-4.3,1.12,-4.4],prepboard:[-3.4,.99,-4.15],foldboard:[1.9,.90,1.9],sink:[4.7,.93,1],desk:[4.7,.90,-3]},
 bed:{blanket:[1.25,.74,-2.65],pillows:[[1.08,.81,-3.75],[1.95,.81,-3.75]]}
});

// Local times within each ten-second chapter. Cycles are deliberately labelled
// compressed; the 145-minute baseline counts active human work, not these waits.
export const HOME_PHASES=immutable({
 floor:[['approach',0,1],['vacuum',1,9],['park',9,10]],
 dishes:[['travel',0,1],['pick',1,2.5],['carry',2.5,4.5],['load',4.5,6.5],['wash',6.5,9.5,true],['finish',9.5,10]],
 cook:[['travel',0,1],['prepare',1,3],['carry-to-pot',3,4],['load-pot',4,5],['cook',5,6.5,true],['serve',6.5,7],['carry-meal',7,9],['place-meal',9,9.6],['finish',9.6,10]],
 laundry:[['travel',0,2],['pick',2,3.2],['carry',3.2,4],['load',4,5],['wash',5,6.25,true],['dry',6.25,7.5,true],['unload',7.5,8],['carry-to-fold',8,8.5],['fold',8.5,9.75],['finish',9.75,10]],
 bed:[['travel',0,2],['blanket',2,4],['approach-pillows',4,5.3],['pillow-left',5.3,6.4],['pillow-right',6.4,7.9],['return',7.9,9],['finish',9,10]],
 bath:[['travel',0,2],['pick-cloth',2,2.3],['wipe-sink',2.3,5],['approach-floor',5,6],['wipe-floor',6,9],['park-cloth',9,9.7],['finish',9.7,10]],
 plan:[['travel',0,2],['input',2,3],['draft',3,6],['review',6,8],['approve',8,9.5],['finish',9.5,10]]
});

const dirtPositions=[...Array.from({length:6},(_,i)=>[-4.5+i*.58,.105,1.2]),...Array.from({length:6},(_,i)=>[-4.5+i*.58,.105,3.2]),...Array.from({length:3},(_,i)=>[-4.5,.105,1.65+i*.5]),...Array.from({length:3},(_,i)=>[-1.6,.105,1.65+i*.5])];
const platePositions=Array.from({length:5},(_,i)=>[-3.32+(i%2)*.57,.89+Math.floor(i/2)*.045,-1.70-Math.floor(i/2)*.025]);
const ingredientPositions=Array.from({length:4},(_,i)=>[-3.75+i*.2,1.04,-4.15]);
const clothPositions=Array.from({length:7},(_,i)=>[2.45+(i%2)*.27,.65+Math.floor(i/2)*.06,3.65]);
const bathPositions=[[4.5,.95,1.25],[4.7,.95,1.25],[4.9,.95,1.25],[4.1,.105,2.7],[4.3,.105,2.7],[4.5,.105,2.7]];
const spec=(id,kind,taskId,position,extra={})=>({id,kind,taskId,position,rotation:[0,0,0],...extra});
export const HOME_OBJECTS=immutable([
 ...dirtPositions.map((p,i)=>spec(`dirt-${i}`,'dirt','floor',p,{radius:.035})),
 ...platePositions.map((p,i)=>spec(`plate-${i}`,'plate','dishes',p,{radius:.17,size:[.34,.035,.34]})),
 ...ingredientPositions.map((p,i)=>spec(`ingredient-${i}`,'ingredient','cook',p,{size:[.18,.17,.18]})),
 spec('meal-plate','plate','cook',[-4.3,1.01,-4.10],{radius:.23,size:[.46,.035,.46]}),
 ...clothPositions.map((p,i)=>spec(`cloth-${i}`,'clothing','laundry',p,{rotation:[0,i*.3,0],size:[.32,.10,.23]})),
 spec('blanket','blanket','bed',[1.37,.74,-2.55],{rotation:[0,.20,0],size:[2.15,.055,1.8]}),
 spec('pillow-0','pillow','bed',[1.35,.81,-3.65],{rotation:[0,-.25,0],size:[.85,.15,.5]}),
 spec('pillow-1','pillow','bed',[2.0,.83,-3.55],{rotation:[0,.20,0],size:[.85,.15,.5]}),
 ...bathPositions.map((p,i)=>spec(`bath-stain-${i}`,'stain','bath',p,{radius:.035,surface:i<3?'sink':'floor'})),
 spec('cloth-tool','cloth','bath',[4.1,.91,1.25],{size:[.20,.025,.15]}),
 ...['input','draft','review','approval'].map((s,i)=>spec(`plan-${s}`,'document','plan',[4.7,.96+i*.005,-2.9],{size:[.38,.01,.28]}))
]);

function timedRoute(points,start,end){
 const lengths=points.slice(1).map((p,i)=>distance(points[i],p)),total=lengths.reduce((a,b)=>a+b,0);let d=0;
 return points.map((p,i)=>{if(i)d+=lengths[i-1];return {time:total?start+(end-start)*d/total:start,position:p.slice()};});
}
function atRoute(route,t){
 if(t<=route[0].time)return route[0].position.slice();
 for(let i=1;i<route.length;i++)if(t<=route[i].time){const a=route[i-1],b=route[i];return mix(a.position,b.position,clamp((t-a.time)/(b.time-a.time||1)));}
 return route.at(-1).position.slice();
}
function makeVacuumRoute(){return [
 ...timedRoute([HOME_LAYOUT.vacuumDock,[-.55,.13,3.2],[-4.5,.13,3.2]],0,1),
 ...timedRoute([[-4.5,.13,3.2],[-4.5,.13,1.2],[-1.6,.13,1.2],[-1.6,.13,3.2],[-4.5,.13,3.2]],1,9).slice(1),
 ...timedRoute([[-4.5,.13,3.2],[-.55,.13,3.2],HOME_LAYOUT.vacuumDock],9,10).slice(1)
 ];}
function firstContact(route,target,radius){
 // First entry into a circle in the floor plane, not a percentage-based delete.
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],dx=b.position[0]-a.position[0],dz=b.position[2]-a.position[2],x=a.position[0]-target[0],z=a.position[2]-target[2],A=dx*dx+dz*dz,B=2*(x*dx+z*dz),C=x*x+z*z-radius*radius;
  if(C<=0)return {time:a.time,point:a.position.slice()};
  const discriminant=B*B-4*A*C;if(A&&discriminant>=0){const u=(-B-Math.sqrt(discriminant))/(2*A);if(u>=0&&u<=1)return {time:a.time+(b.time-a.time)*u,point:mix(a.position,b.position,u)};}
 }
 return null;
}
function humanFloorRoute(vacuum){
 // Follow the same floor path by distance, rather than by a fixed delay in
 // seconds (which would separate the hand and tool whenever speed changes).
 const lengths=vacuum.slice(1).map((p,i)=>distance(p.position,vacuum[i].position)),cumulative=[0];lengths.forEach(d=>cumulative.push(cumulative.at(-1)+d));
 const extended=[HOME_LAYOUT.actorStart,...vacuum.map(p=>[p.position[0],0,p.position[2]])],extendedLengths=extended.slice(1).map((p,i)=>distance(p,extended[i])),extendedCumulative=[0];extendedLengths.forEach(d=>extendedCumulative.push(extendedCumulative.at(-1)+d));
 const times=new Set(vacuum.map(p=>p.time));
 extendedCumulative.slice(1).forEach(d=>{for(let i=1;i<cumulative.length;i++)if(d>=cumulative[i-1]&&d<=cumulative[i]){times.add(vacuum[i-1].time+(vacuum[i].time-vacuum[i-1].time)*(d-cumulative[i-1])/(cumulative[i]-cumulative[i-1]));break;}});
 const distanceAt=t=>{for(let i=1;i<vacuum.length;i++)if(t<=vacuum[i].time)return cumulative[i-1]+lengths[i-1]*clamp((t-vacuum[i-1].time)/(vacuum[i].time-vacuum[i-1].time));return cumulative.at(-1);};
 return [...times].sort((a,b)=>a-b).map(time=>{const d=distanceAt(time);let position=extended.at(-1);for(let i=1;i<extended.length;i++)if(d<=extendedCumulative[i]){position=mix(extended[i-1],extended[i],clamp((d-extendedCumulative[i-1])/(extendedLengths[i-1]||1)));break;}return {time,position};});
}
function bodyRoute(capacity,vacuum){
 const a=HOME_LAYOUT.anchors,out=[];let last=HOME_LAYOUT.actorStart.slice(),lastYaw=Math.PI;
 function push(time,position,yaw=lastYaw){const record={time,position:position.slice(),yaw};if(out.length&&Math.abs(out.at(-1).time-time)<1e-9)out[out.length-1]=record;else out.push(record);last=position.slice();lastYaw=yaw;}
 function move(start,end,points,endYaw){
  const route=timedRoute([last,...points],start,end);
  route.forEach((r,i)=>{const yaw=i===0?lastYaw:i<route.length-1?Math.atan2(route[i+1].position[0]-r.position[0],route[i+1].position[2]-r.position[2]):endYaw;push(r.time,r.position,yaw);});
 }
 push(0,last,Math.PI);
 if(capacity==='human'){
  const following=humanFloorRoute(vacuum);following.slice(1).forEach((p,i)=>{const n=following[i+2]?.position||p.position;push(p.time,p.position,Math.atan2(n[0]-p.position[0],n[2]-p.position[2]));});
 }else push(10,last,Math.PI);
 move(10,11,[[-.8,0,3.2],[-.8,0,-.6],a.table],Math.PI);push(12.5,a.table,Math.PI);
 move(12.5,14.5,[[-1.15,0,-1.1],[-1.15,0,-3.45],a.dishwasher],Math.PI);push(20,a.dishwasher,Math.PI);
 move(20,21,[a.prep],Math.PI);push(23.46,a.prep,Math.PI);move(23.46,24,[a.stove],Math.PI);push(26.5,a.stove,Math.PI);
 push(27,a.stove,Math.PI);
 move(27,29,[[-1.15,0,-3.65],[-1.15,0,-1.1],a.table],Math.PI);push(30,a.table,Math.PI);
 move(30,32,[[-.55,0,-1],[.55,0,-1],[1.65,0,-.6],[1.65,0,1.3],[2.6,0,1.3],a.basket],0);push(33.2,a.basket,0);
 move(33.2,34,[a.washer],0);push(38,a.washer,0);move(38,38.5,[[1.9,0,2.95],a.fold],Math.PI);push(40,a.fold,Math.PI);
 move(40,42,[[2.70,0,2.65],[2.70,0,1.3],[1.65,0,1.3],[1.65,0,-.55],[2.70,0,-.55],a.bedSide],-Math.PI/2);push(44,a.bedSide,-Math.PI/2);
 move(44,45.3,[[2.70,0,-4.62],[1.08,0,-4.62]],0);push(46.4,[1.08,0,-4.62],0);
 move(46.4,46.8,[[1.95,0,-4.62]],0);push(47.9,[1.95,0,-4.62],0);
 move(47.9,49,[[2.70,0,-4.62],[2.70,0,-1.1]],0);push(50,[2.70,0,-1.1],0);
 move(50,52,[[2.70,0,-1],[3.45,0,-1],[4.6,0,-1],[4.6,0,.3],[3.5,0,.3],[3.5,0,1.85],a.bathSink],Math.PI);push(55,a.bathSink,Math.PI);
 move(55,56,[a.bathFloor],Math.PI/2);push(60,a.bathFloor,Math.PI/2);
 move(60,62,[a.bathSink,[3.5,0,1.85],[3.5,0,.3],[4.6,0,.3],[4.6,0,-1.1],a.desk],Math.PI);push(70,a.desk,Math.PI);
 return out;
}
function bodyAt(route,t){
 let a=route[0],b=a;
 for(let i=1;i<route.length;i++){b=route[i];if(t<=b.time)break;a=b;}
 const u=b.time>a.time?clamp((t-a.time)/(b.time-a.time)):0;
 return {position:mix(a.position,b.position,u),yaw:angleMix(a.yaw,b.yaw,u)};
}
function handAt(trace,t,side='left'){
 const p=bodyAt(trace.bodyRoute,t),c=Math.cos(p.yaw),s=Math.sin(p.yaw),x=side==='left'?-.16:.16;
 return add(p.position,[x*c+.43*s,1.10,-x*s+.43*c]);
}
function heldAt(trace,t,offset=[0,0,0]){return add(handAt(trace,t,'left'),offset);}
const plateRack=i=>[-1.84+i*.12,.55,-4.35];
function contact(trace,taskId,objectId,time,point,tool='rightHand',radius=.035,targetId=objectId){return {id:`${objectId}:${tool}:${time.toFixed(6)}`,taskId,objectId,targetId,time,point:point.slice(),targetPoint:point.slice(),targetOffset:[0,0,0],actor:trace.params.capacity==='human'?'human':taskId==='floor'?'vacuum':'robot',tool,radius};}
function transportPosition(trace,source,pickStart,pickEnd,placeStart,placeEnd,destination,time,offset=[0,0,0]){
 if(time<=pickStart)return source.slice();
 if(time<pickEnd)return arc(source,heldAt(trace,time,offset),clamp((time-pickStart)/(pickEnd-pickStart)),.12);
 if(time<=placeStart)return heldAt(trace,time,offset);
 if(time<placeEnd)return arc(heldAt(trace,time,offset),destination,clamp((time-placeStart)/(placeEnd-placeStart)),.12);
 return destination.slice();
}
function transferActions(trace){
 const actions=[],sources=Object.fromEntries(HOME_OBJECTS.map(o=>[o.id,o]));
 const addAction=(id,start,end,position,targetOffset=[0,0,0])=>actions.push({id,start,end,position,targetOffset});
 for(let i=0;i<5;i++){
  const o=sources[`plate-${i}`],offset=[0,.045*i,0],dest=plateRack(i);
  addAction(o.id,11+i*.3,11.22+i*.3,t=>arc(o.position,heldAt(trace,t,offset),clamp((t-11-i*.3)/.22),.12));
  addAction(o.id,14.5+i*.4,14.8+i*.4,t=>arc(heldAt(trace,t,offset),dest,clamp((t-14.5-i*.4)/.3),.12));
 }
 for(let i=0;i<4;i++){
  const o=sources[`ingredient-${i}`],prep=[-3.61+i*.14,1.03,-4.15],pot=[-4.42+i*.08,1.14,-4.32],offset=[(i-1.5)*.06,.03,0];
  addAction(o.id,21+i*.45,21.35+i*.45,t=>arc(o.position,prep,clamp((t-21-i*.45)/.35),.08));
  addAction(o.id,23+i*.12,23.10+i*.12,t=>arc(prep,heldAt(trace,t,offset),clamp((t-23-i*.12)/.10),.08));
  addAction(o.id,24+i*.18,24.16+i*.18,t=>arc(heldAt(trace,t,offset),pot,clamp((t-24-i*.18)/.16),.08));
  addAction(o.id,26.5+i*.12,26.60+i*.12,t=>arc(pot,[-4.3+(i-1.5)*.075,1.08,-4.10],clamp((t-26.5-i*.12)/.10),.08));
 }
 const meal=sources['meal-plate'];
 addAction(meal.id,27,27.2,t=>arc(meal.position,heldAt(trace,t),clamp((t-27)/.2),.12));
 addAction(meal.id,29,29.6,t=>arc(heldAt(trace,t),[-3,.89,-1.70],clamp((t-29)/.6),.12));
 for(let i=0;i<7;i++){
  const o=sources[`cloth-${i}`],offset=[0,.035*i,0],washer=[1.35+(i%2)*.04,.5+Math.floor(i/2)*.04,3.91],fold=[1.9,.945+i*.065,2.06];
  addAction(o.id,32+i*.14,32.12+i*.14,t=>arc(o.position,heldAt(trace,t,offset),clamp((t-32-i*.14)/.12),.10));
  addAction(o.id,34+i*.10,34.09+i*.10,t=>arc(heldAt(trace,t,offset),washer,clamp((t-34-i*.10)/.09),.10));
  addAction(o.id,37.5+i*.06,37.555+i*.06,t=>arc(washer,heldAt(trace,t,offset),clamp((t-37.5-i*.06)/.055),.10));
  addAction(o.id,38.5+i*.16,38.63+i*.16,t=>arc(heldAt(trace,t,offset),fold,clamp((t-38.5-i*.16)/.13),.10));
 }
 const beds=[['blanket',42.5,44,HOME_LAYOUT.bed.blanket,[1.025,0,0]],['pillow-0',45.3,46.4,HOME_LAYOUT.bed.pillows[0],[0,0,-.20]],['pillow-1',46.8,47.9,HOME_LAYOUT.bed.pillows[1],[0,0,-.20]]];
 beds.forEach(([id,start,end,dest,offset])=>addAction(id,start,end,t=>{const u=clamp((t-start)/(end-start)),yaw=sources[id].rotation[1]*(1-u),c=Math.cos(yaw),s=Math.sin(yaw),worldOffset=[offset[0]*c+offset[2]*s,offset[1],-offset[0]*s+offset[2]*c];return add(mix(sources[id].position,dest,u),worldOffset);},offset));
 return actions.sort((a,b)=>a.start-b.start||a.end-b.end);
}

export function makeHomeTrace(params={}){
 const capacity=(params.capacity??params.actorMode)==='human'?'human':'robots',overhead=clamp(number(params.overhead,0),0,100),vacuumRoute=makeVacuumRoute();
 const trace={params:{capacity,actorMode:capacity,overhead},horizon:DURATION,taskSeconds:TASK_SECONDS,objectSpecs:HOME_OBJECTS,layout:HOME_LAYOUT,phases:HOME_PHASES,vacuumRoute,bodyRoute:bodyRoute(capacity,vacuumRoute),contacts:[],assumptions:{baselineMinutes:145,minuteMeaning:'illustrative active human work',clockMeaning:'reversible presentation time',compressedCycles:['dishwashing','cooking','washing','drying'],generalManipulation:'assumed future capability',planningApproval:'scenario assumption, not a demonstrated autonomous capability'}};
 const actions=transferActions(trace);
 actions.forEach(a=>{const taskId=HOME_OBJECTS.find(o=>o.id===a.id).taskId;[a.start,a.end].forEach(time=>trace.contacts.push({...contact(trace,taskId,a.id,time,a.position(time)),targetOffset:a.targetOffset.slice()}));});
 dirtPositions.forEach((p,i)=>{const hit=firstContact(vacuumRoute.filter(p=>p.time>=1),p,.23);if(hit)trace.contacts.push({...contact(trace,'floor',`dirt-${i}`,hit.time,hit.point,'vacuum',.235),targetPoint:p.slice(),actor:capacity==='human'?'human':'vacuum'});});
 const clothPath=[{time:52.3,position:HOME_OBJECTS.find(o=>o.id==='cloth-tool').position},...bathPositions.slice(0,3).map((p,i)=>({time:52.7+i*.95,position:p})),{time:56,position:[4.1,.105,2.35]},...bathPositions.slice(3).map((p,i)=>({time:56.5+i*1.1,position:p})),{time:59,position:bathPositions[5]},{time:59.7,position:[4.1,.28,2.7]}];
 trace.clothRoute=clothPath;
 trace.contacts.push(contact(trace,'bath','cloth-tool',52.3,clothPath[0].position));
 bathPositions.forEach((p,i)=>{const time=i<3?52.7+i*.95:56.5+(i-3)*1.1;trace.contacts.push(contact(trace,'bath',`bath-stain-${i}`,time,p,'cloth-tool',.08));});
 trace.contacts.push(contact(trace,'bath','cloth-tool',59.7,clothPath.at(-1).position));
 trace.contacts.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
 return immutable(trace);
}

function taskFrame(task,index,time){
 const start=index*TASK_SECONDS,u=clamp(time-start,0,TASK_SECONDS),status=time>=start+TASK_SECONDS?'completed':time>=start?'active':'pending',stages=HOME_PHASES[task.id];
 const s=stages.find(s=>u<s[2])||stages.at(-1),stageProgress=clamp((u-s[1])/(s[2]-s[1]));
 return {id:task.id,index,minutes:task.minutes,status,phase:u/TASK_SECONDS,localTime:u,stage:status==='pending'?'pending':status==='completed'?'completed':s[0],operation:s[0],stageProgress,compressed:!!s[3],start,end:start+TASK_SECONDS};
}
function objectState(o){return {...copy(o),visible:true,status:'pending',holder:null,ready:false};}
function transportStatus(time,pickStart,pickEnd,placeStart,placeEnd,source,destination){return time<pickStart?source:time<pickEnd?'picking':time<placeStart?'carried':time<placeEnd?'placing':destination;}
function heldBy(time,pickStart,pickEnd,placeStart,placeEnd,sourceHolder,destinationHolder,actor){return time<pickStart?sourceHolder:time<pickEnd?`${actor}.rightHand`:time<placeStart?`${actor}.leftHand`:time<placeEnd?`${actor}.rightHand`:destinationHolder;}
function appliance(phase,running,progress,ready,doorOpen=false){return {phase,running,cycleProgress:clamp(progress),ready,doorOpen,compressed:running};}

export function homeFrameAt(trace,time=0){
 const t=clamp(number(time),0,trace.horizon),done=Math.min(CHORES.length,Math.floor(t/TASK_SECONDS)),index=Math.min(done,CHORES.length-1),actor=trace.params.capacity==='human'?'human':'robot',objects=HOME_OBJECTS.map(objectState),byId=Object.fromEntries(objects.map(o=>[o.id,o]));
 const body=bodyAt(trace.bodyRoute,t),vacuum=atRoute(trace.vacuumRoute,clamp(t,0,10)),hands={left:handAt(trace,t,'left'),right:handAt(trace,t,'right')};
 const actions=transferActions(trace),action=actions.find(a=>t>=a.start&&t<=a.end);
 if(action)hands.right=action.position(t);
 else{
  // Approach/retract the hand instead of snapping it at the first contact.
  const next=actions.find(a=>a.start>t),prev=actions.filter(a=>a.end<t).at(-1);
  if(next&&prev&&next.start-prev.end<=.24)hands.right=mix(prev.position(prev.end),next.position(next.start),clamp((t-prev.end)/(next.start-prev.end)));
  else if(next&&next.start-t<.12)hands.right=mix(hands.right,next.position(next.start),clamp(1-(next.start-t)/.12));
  else if(prev&&t-prev.end<.12)hands.right=mix(prev.position(prev.end),hands.right,clamp((t-prev.end)/.12));
 }
 const completedBaseline=CHORES.slice(0,done).reduce((s,c)=>s+c.minutes,0),support=trace.params.capacity==='robots'?completedBaseline*trace.params.overhead/100:0,humanSpent=trace.params.capacity==='human'?completedBaseline:support,freed=completedBaseline-humanSpent,pendingBaseline=145-completedBaseline;
 const ledger={total:145,completedBaseline,pendingBaseline,humanSpent,support,freed,humanRequired:pendingBaseline+humanSpent,creditedAtTaskCompletion:true};
 dirtPositions.forEach((p,i)=>{const o=byId[`dirt-${i}`],hit=trace.contacts.find(c=>c.objectId===o.id);o.status=hit&&t>=hit.time?'collected':'dirty';o.ready=o.status==='collected';o.visible=!o.ready;o.holder=o.ready?'vacuum-bin':'floor';o.contactTime=hit?.time??null;});
 for(let i=0;i<5;i++){
  const o=byId[`plate-${i}`],p=HOME_OBJECTS.find(s=>s.id===o.id).position,start=11+i*.3,end=11.22+i*.3,place=14.5+i*.4,loaded=14.8+i*.4,dest=plateRack(i);
  o.position=transportPosition(trace,p,start,end,place,loaded,dest,t,[0,.045*i,0]);o.rotation=[0,0,Math.PI/2*clamp((t-place)/(loaded-place))];o.status=transportStatus(t,start,end,place,loaded,'on-table','loaded');if(t>=16.5&&t<19.5)o.status='washing';if(t>=19.5)o.status='clean';o.holder=heldBy(t,start,end,place,loaded,'table','dishwasher',actor);o.ready=t>=19.5;o.pickupTime=start;o.placeTime=loaded;
 }
 const meal=byId['meal-plate'],mealSource=HOME_OBJECTS.find(o=>o.id===meal.id).position;
 meal.position=transportPosition(trace,mealSource,27,27.2,29,29.6,[-3,.89,-1.70],t);meal.status=transportStatus(t,27,27.2,29,29.6,t<26.6?'empty':'prepared-meal','served');meal.holder=heldBy(t,27,27.2,29,29.6,'counter','table',actor);meal.ready=t>=29.6;meal.pickupTime=27;meal.placeTime=29.6;
 for(let i=0;i<4;i++){
  const o=byId[`ingredient-${i}`],source=HOME_OBJECTS.find(s=>s.id===o.id).position,prep=[-3.61+i*.14,1.03,-4.15],pot=[-4.42+i*.08,1.14,-4.32],offset=[(i-1.5)*.06,.03,0],prepare=21+i*.45,prepared=21.35+i*.45,pick=23+i*.12,picked=23.10+i*.12,place=24+i*.18,placed=24.16+i*.18,serve=26.5+i*.12,served=26.60+i*.12;
  o.position=t<=prepare?source.slice():t<prepared?arc(source,prep,clamp((t-prepare)/.35),.08):t<pick?prep.slice():t<placed?transportPosition(trace,prep,pick,picked,place,placed,pot,t,offset):t<serve?pot.slice():t<served?arc(pot,add(meal.position,[(i-1.5)*.075,.07,0]),clamp((t-serve)/.1),.08):add(meal.position,[(i-1.5)*.075,.07,0]);
  o.status=t<prepare?'raw':t<prepared?'preparing':t<pick?'prepared':t<placed?'carried':t<25?'in-pot':t<26.5?'cooking':t<served?'cooked':'served';o.holder=t<prepare?'counter':t<prepared?`${actor}.rightHand`:t<pick?'prepboard':t<placed?heldBy(t,pick,picked,place,placed,'prepboard','pot',actor):t<serve?'pot':t<served?`${actor}.rightHand`:'meal-plate';o.ready=t>=served;o.pickupTime=prepare;o.preparedTime=prepared;o.potTime=placed;o.cookedTime=26.5;o.servedTime=served;
 }
 for(let i=0;i<7;i++){
  const o=byId[`cloth-${i}`],source=HOME_OBJECTS.find(s=>s.id===o.id).position,offset=[0,.035*i,0],washer=[1.35+(i%2)*.04,.5+Math.floor(i/2)*.04,3.91],fold=[1.9,.945+i*.065,2.06],pick=32+i*.14,picked=32.12+i*.14,load=34+i*.1,loaded=34.09+i*.1,unload=37.5+i*.06,unloaded=37.555+i*.06,foldStart=38.5+i*.16,folded=38.63+i*.16;
  o.position=t<unload?transportPosition(trace,source,pick,picked,load,loaded,washer,t,offset):transportPosition(trace,washer,unload,unloaded,foldStart,folded,fold,t,offset);
  o.status=t<pick?'in-basket':t<loaded?'carried':t<35?'loaded':t<36.25?'washing':t<37.5?'drying':t<unload?'dry':t<foldStart?'carried-dry':t<folded?'folding':'folded';o.holder=t<unload?heldBy(t,pick,picked,load,loaded,'basket','washer-dryer',actor):heldBy(t,unload,unloaded,foldStart,folded,'washer-dryer','foldboard',actor);o.wet=t>=36.25&&t<37.5;o.dry=t>=37.5;o.folded=t>=folded;o.ready=o.folded;o.foldProgress=clamp((t-foldStart)/(folded-foldStart));o.form=o.folded?'folded':'loose';o.rotation=mix(HOME_OBJECTS.find(s=>s.id===o.id).rotation,[0,0,0],o.foldProgress);o.pickupTime=pick;o.loadTime=loaded;o.dryTime=37.5;o.foldTime=folded;
 }
 const beds=[['blanket',42.5,44,HOME_LAYOUT.bed.blanket],['pillow-0',45.3,46.4,HOME_LAYOUT.bed.pillows[0]],['pillow-1',46.8,47.9,HOME_LAYOUT.bed.pillows[1]]];
 beds.forEach(([id,start,end,dest])=>{const o=byId[id],source=HOME_OBJECTS.find(s=>s.id===id),u=clamp((t-start)/(end-start));o.position=mix(source.position,dest,u);o.rotation=mix(source.rotation,[0,0,0],u);o.status=t<start?'untidy':t<end?'adjusting':'tidy';o.ready=t>=end;o.holder=t>=start&&t<end?`${actor}.rightHand`:'bed';o.contactTime=start;o.placeTime=end;});
 const cloth=byId['cloth-tool'];cloth.position=t<52.3?cloth.position:atRoute(trace.clothRoute,t);cloth.status=t<52.3?'on-caddy':t<59?'wiping':t<59.7?'parking':'parked';cloth.holder=t<52.3?'caddy':t<59.7?`${actor}.rightHand`:'bucket';cloth.ready=t>=59.7;cloth.pickupTime=52.3;cloth.placeTime=59.7;
 if(t>=52.18&&t<=59.7){const u=clamp((t-52.18)/.12);hands.right=t<52.3?mix(hands.right,cloth.position,u):cloth.position.slice();}
 else if(t>59.7&&t<59.82)hands.right=mix(cloth.position,hands.right,(t-59.7)/.12);
 bathPositions.forEach((p,i)=>{const o=byId[`bath-stain-${i}`],c=trace.contacts.find(c=>c.objectId===o.id);o.ready=t>=c.time;o.visible=!o.ready;o.status=o.ready?'cleaned':'dirty';o.holder=o.ready?'cloth-tool':o.surface;o.contactTime=c.time;});
 if(trace.params.capacity==='human'&&t<=10){hands.right=[vacuum[0],1.05,vacuum[2]];}
 else if(trace.params.capacity==='human'&&t<10.12)hands.right=mix([vacuum[0],1.05,vacuum[2]],hands.right,(t-10)/.12);
 const crouch=Math.max(0,...[[14.5,16.4],[32,32.96],[34,34.69],[37.5,37.915],[42.5,44],[45.3,47.9],[55,59.7]].map(([a,b])=>Math.min(clamp((t-a+.12)/.12),clamp((b+.12-t)/.12))));
 const posture=crouch>0?'crouch':'standing';
 const activeActor={...body,hands,active:t<70&&(trace.params.capacity==='human'||t>=10&&t<62),heldIds:objects.filter(o=>o.holder?.startsWith(`${actor}.`)).map(o=>o.id),posture,crouch,lean:crouch,taskId:CHORES[index].id};
 const idle=(position,yaw=Math.PI)=>({position:position.slice(),yaw,hands:{left:add(position,[-.16*Math.cos(yaw)+.43*Math.sin(yaw),1.10,.16*Math.sin(yaw)+.43*Math.cos(yaw)]),right:add(position,[.16*Math.cos(yaw)+.43*Math.sin(yaw),1.10,-.16*Math.sin(yaw)+.43*Math.cos(yaw)])},active:false,heldIds:[],posture:'standing',crouch:0,lean:0,taskId:null});
 const actors={human:actor==='human'?activeActor:idle(HOME_LAYOUT.humanIdle,Math.PI/2),robot:actor==='robot'?activeActor:idle(HOME_LAYOUT.robotIdle),vacuum:{position:vacuum,yaw:0,hands:null,active:t<10,heldIds:objects.filter(o=>o.holder==='vacuum-bin').map(o=>o.id),taskId:'floor',mode:trace.params.capacity==='human'?'human-operated':'autonomous',radius:.31}};
 const appliances={
  dishwasher:appliance(t<14.5?'idle':t<16.5?'loading':t<19.5?'washing':'finished',t>=16.5&&t<19.5,(t-16.5)/3,t>=19.5,t>=14.5&&t<16.5),
  washerDryer:{...appliance(t<34?'idle':t<35?'loading':t<36.25?'washing':t<37.5?'drying':t<38?'unloading':'finished',t>=35&&t<37.5,t<36.25?(t-35)/1.25:(t-36.25)/1.25,t>=37.5,t>=34&&t<35||t>=37.5&&t<38),wet:t>=36.25&&t<37.5,dry:t>=37.5},
  hob:{phase:t<24?'idle':t<25?'loading':t<26.5?'cooking':'finished',on:t>=25&&t<26.5,heatProgress:clamp((t-25)/1.5),ready:t>=26.5,compressed:t>=25&&t<26.5}
 };
 const planning={stage:t<62?'pending':t<63?'input':t<66?'draft':t<68?'review':t<69.5?'approve':'approved',inputReady:t>=63,draftReady:t>=66,reviewReady:t>=68,approved:t>=69.5,approvalAssumed:trace.params.capacity==='robots',reviewRequired:trace.params.capacity==='human'||trace.params.overhead>0,reviewer:trace.params.capacity==='human'?'human':trace.params.overhead>0?'human-support':'assumed-autonomous',progress:clamp((t-62)/7.5)};
 ['input','draft','review','approval'].forEach((s,i)=>{const o=byId[`plan-${s}`],start=[62,63,66,68][i],end=[63,66,68,69.5][i];o.visible=t>=start;o.status=t<start?'pending':t<end?'processing':'ready';o.ready=t>=end;o.holder='desk';o.progress=clamp((t-start)/(end-start));});
 return immutable({time:t,t,capacity:trace.params.capacity,actorMode:trace.params.capacity,params:trace.params,continuous:true,completed:done,index,phase:t>=70?1:t%10/10,done,complete:t>=70,active:t<70,tasks:CHORES.map((c,i)=>taskFrame(c,i,t)),actors,objects,appliances,planning,ledger,contacts:trace.contacts.filter(c=>c.time<=t),assumptions:trace.assumptions});
}
