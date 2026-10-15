// Reversible architectural choreography. 0–100 is presentation time, not T+,
// altitude, orbital mechanics, telemetry or a prediction of a real flight.
export const G0=9.81,F9_HEIGHT=70,F9_DIAM=3.7,STARSHIP_HEIGHT=124;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const mix=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u),add=(a,b)=>a.map((x,i)=>x+b[i]);
const smooth=u=>{u=clamp(u);return u*u*(3-2*u);};
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const SOURCES=freeze({
 falcon:{url:'https://www.spacex.com/vehicles/falcon-9/fairing',checked:'2026-10-03',scope:'Published dimensions, installed engines and advertised maximum capacity; not reusable performance.'},
 falconGuide:{url:'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf',date:'2025-05-09',scope:'Architecture, pneumatic separation and mission-dependent performance. Sample timelines are not universal.'},
 starship:{url:'https://new.spacex.com/vehicles/starship',checked:'2026-10-03',scope:'Published 124 m architecture: 72 m booster, 52 m ship, 9 m diameter, 33 + 6 installed engines.'},
 starshipV3:{url:'https://www.spacex.com/updates/reusability',date:'2026-05-12',scope:'Introducing Starship V3: three Super Heavy grid fins and an integrated hot-stage structure.'},
 tests:{url:'https://www.spacex.com/updates/reusability',scope:'Hot staging, booster return/catch and ship entry demonstrations. Choreography is not one measured test or a routine operational mission.'}
});
// Legacy fields retained; unsupported reusable performance and records are null.
export const PAYLOAD=freeze({leoMaximum:22800,leoExpend:22800,leoReuse:null,gtoMaximum:8300,gtoExpend:8300,reusePenalty:null,scope:'Advertised maximum; mission-specific reusable performance is unknown.'});
export const SNAPSHOT=freeze({date:'2026-10-03',falconFlights2025:null,falconFlights2026pace:null,boosterRecord:null,boosterId:null,successRate:null,starshipTests:null,scope:'No cadence, reliability or flight-record statistic is modeled.'});
export const HARDWARE=freeze({
 falcon:{id:'falcon',heightM:70,diameterM:3.7,visualScale:.1,boosterHeight:4.50,upperHeight:1.19,fairingHeight:1.31,diameter:.37,fairingDiameter:.52,boosterEngines:9,upperEngines:1,centerEngineIndices:[0],upperAttach:[0,4.50,0],fairingAttach:[0,1.19,0],payloadLocal:[0,1.70,0],boosterNozzleExit:[0,0,0],upperNozzleExit:[0,-.10,0],legFootLocal:[0,-.10,0],legFootRadius:.65,gridFins:4,landingLegs:4,fairing:true,proportionScope:'Stage subdivisions are schematic; published total height and diameter set the scale.'},
 starship:{id:'starship',reference:'Published V3 architecture, with illustrative mechanisms rather than engineering CAD.',heightM:124,diameterM:9,boosterHeightM:72,upperHeightM:52,visualScale:.1,boosterHeight:7.20,upperHeight:5.20,diameter:.90,boosterEngines:33,upperEngines:6,centerEngineIndices:[30,31,32],upperSeaLevelEngines:3,upperVacuumEngines:3,upperSeaLevelIndices:[0,1,2],upperVacuumIndices:[3,4,5],upperAttach:[0,7.20,0],payloadLocal:[0,3.30,0],boosterNozzleExit:[0,0,0],upperNozzleExit:[0,-.10,0],catchPinLocal:[0,7.10,0],shipWaterContactLocal:[0,-.10,0],gridFins:3,landingLegs:0,fairing:false,proportionScope:'Published dimensions and V3 fin count. Catch anchors and recovery-engine subsets are schematic; exact configurations vary by vehicle/test.'}
});
export const SPACE_LAYOUT=freeze({
 visualScale:.1,coordinateMeaning:'One scene unit per ten metres for hardware only; flight distances are independently compressed visual coordinates.',
 falcon:{launch:[0,.20,0],ASDS:{point:[16,.25,0],deckY:.25},RTLS:{point:[-6.5,.15,0],deckY:.15},waterY:0},
 starship:{launch:[0,.90,0],tower:{point:[0,11,0],catchPlaneY:11,catchPinLocal:[0,7.10,0]},splashdown:{point:[34,0,0],waterY:0}}
});
export const FLIGHT_LAYOUT=SPACE_LAYOUT;
export const FLIGHT_CHAPTERS=freeze([{id:'hardware',start:0,end:8},{id:'ascent',start:8,end:50},{id:'return',start:50,end:85},{id:'result',start:85,end:100}]);
export const FLIGHT_EVENTS=freeze({
 falcon:{ignition:7.5,liftoff:8,meco:28,separation:30,upperIgnition:32,boostbackStart:34,boostbackEnd:44,fairingStart:38,fairingClear:43,entryStart:58,entryEnd:65,seco:72,landingStart:78,touchdown:84,deployStart:92,deployEnd:98},
 starship:{ignition:7.5,liftoff:8,meco:27,hotStage:27,separation:30,boostbackStart:32,boostbackEnd:43,shipCutoff:55,landingStart:74,catch:82,entryStart:85,entryEnd:93,flipStart:93,flipEnd:96,shipLandingStart:93,splashdown:99}
});
const step=(t,id,es,en,body)=>({t,id,es,en,body});
export const FALCON_STEPS=freeze([
 step(0,'pad','Arquitectura en la rampa','Architecture on the pad',['Dos etapas y nueve más un motor. Las dimensiones totales son publicadas; el recorrido es un esquema.','Two stages and nine plus one engine. Total dimensions are published; the path is schematic.']),
 step(8,'liftoff','Despegue','Liftoff',['Los motores encienden antes de liberar el vehículo. Este reloj no indica T+ real.','Engines ignite before release. This clock is not real T+.']),
 step(28,'meco','Corte de motores','Engine cutoff',['La primera etapa apaga sus motores antes de separar las etapas.','The first stage shuts down before stage separation.']),
 step(30,'stage','Separación','Separation',['La etapa superior se aleja antes de encender su motor de vacío.','The upper stage moves clear before its vacuum engine starts.']),
 step(38,'fairing','Separación de la cofia','Fairing separation',['Las mitades se apartan; su recuperación marítima no se simula.','Both halves move apart; their ocean recovery is not simulated.']),
 step(58,'entry','Retorno de la etapa','Stage return',['El perfil de barcaza sigue mar adentro sin boostback; el regreso a tierra añade ese encendido.','The droneship profile continues downrange without boostback; return to land adds that burn.']),
 step(78,'landing','Encendido final','Final burn',['Solo los perfiles recuperables despliegan patas y realizan este encendido.','Only recoverable profiles deploy legs and perform this burn.']),
 step(84,'landed','Resultado de la primera etapa','First-stage outcome',['Recuperar una etapa no recupera la etapa superior ni demuestra un nuevo lanzamiento sin inspección.','Recovering one stage does not recover the upper stage or demonstrate a new launch without inspection.']),
 step(92,'deploy','Carga ilustrativa','Illustrative payload',['Se libera después de la cofia y el corte superior, sin masa reutilizable ni órbita calculada.','Release follows fairing separation and upper-stage cutoff, with no reusable mass or calculated orbit.'])
]);
export const STARSHIP_STEPS=freeze([
 step(0,'stack','Super Heavy y Starship','Super Heavy and Starship',['Arquitectura publicada: 124 metros y 33 más seis motores instalados.','Published architecture: 124 metres and 33 plus six installed engines.']),
 step(8,'liftoff','Ascenso','Ascent',['Secuencia ilustrativa de pruebas, no reproducción exacta ni misión operativa.','Illustrative test sequence, not an exact replay or operational mission.']),
 step(27,'hotstage','Separación en caliente','Hot staging',['La nave enciende mientras el booster conserva un subconjunto de motores.','The ship ignites while the booster runs a subset of its engines.']),
 step(32,'return','Retorno del booster','Booster return',['Los motores de retorno mostrados son simbólicos; el subconjunto cambia según el vuelo.','Depicted return engines are symbolic; the subset depends on the flight.']),
 step(74,'landing','Frenado del booster','Booster braking',['La torre sostiene los puntos de captura del booster.','The tower supports the booster catch points.']),
 step(82,'catch','Captura','Catch',['Solo el booster se considera recuperado. La nave sigue una trayectoria de prueba.','Only the booster counts as recovered. The ship follows a test trajectory.']),
 step(85,'reentry','Entrada de la nave','Ship entry',['Escudo y alerones en una entrada esquemática, sin cálculo térmico ni orbital.','Heatshield and flaps in schematic entry, without thermal or orbital calculation.']),
 step(93,'ship-landing','Giro y amerizaje','Flip and splashdown',['El encendido participa en el giro y el descenso. Amerizar no equivale a recuperar o capturar la nave.','The burn participates in the flip and descent. Splashdown does not mean recovering or catching the ship.'])
]);
export function stepAt(steps,t){let s=steps[0];for(const x of steps)if(t>=x.t)s=x;return s;}
export function nextStep(steps,t){return steps.find(x=>x.t>t)||null;}
export function progress(steps,t){return clamp(finite(t)/(steps.at(-1)?.t||1));}
export function payloadMass(reuse){return reuse?null:PAYLOAD.leoMaximum;}
export function lightPayloadPenalty(){return null;}
export function tickFlight(s,dt){if(s.playing&&Number.isFinite(dt)&&dt>0){s.time=Math.min(s.duration,s.time+dt*s.speed);if(s.time>=s.duration){s.playing=false;if(s.loop){s.flights+=1;s.time=0;s.playing=true;}}}return s;}
export function createFlight(vehicle='falcon'){const star=vehicle==='starship';return {vehicle:star?'starship':'falcon',time:0,playing:false,speed:8,reuse:true,recovery:star?'tower':'droneship',loop:false,flights:1,steps:star?STARSHIP_STEPS:FALCON_STEPS,duration:100};}
// Legacy return-phase flag; it does not imply an active boostback burn.
export function boosterBack(s){return s.reuse!==false&&s.recovery!=='expendable'&&s.time>=(s.vehicle==='starship'?32:30);}
export function landed(s){return s.reuse!==false&&s.recovery!=='expendable'&&s.time>=(s.vehicle==='starship'?82:84);}

const key=(time,position,angle=0)=>({time,position,angle});
function pathAt(keys,t){if(t<=keys[0].time)return {position:keys[0].position.slice(),angle:keys[0].angle};for(let i=1;i<keys.length;i++)if(t<=keys[i].time){const a=keys[i-1],b=keys[i],u=smooth((t-a.time)/(b.time-a.time));return {position:mix(a.position,b.position,u),angle:a.angle+(b.angle-a.angle)*u};}return {position:keys.at(-1).position.slice(),angle:keys.at(-1).angle};}
function rotateZ(v,a){const c=Math.cos(a),s=Math.sin(a);return [v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]];}
const worldPoint=(p,local)=>add(p.position,rotateZ(local,p.angle));
function part(id,p,status,attachedTo=null,visible=true){return {id,position:p.position.slice(),rotation:[0,0,p.angle],quaternion:[0,0,Math.sin(p.angle/2),Math.cos(p.angle/2)],status,attachedTo,visible};}
function engine(installedCount,phase,firing=false,activeCount=0,representativeIndices=[]){return {installedCount,phase,firing,activeCount,representativeIndices:firing?representativeIndices:[],subsetSchematic:firing&&activeCount===null,throttle:firing?1:0};}
function enginesAt(trace,t){
 let b,u;
 if(trace.vehicle==='starship'){
  b=t<7.5?engine(33,'off'):t<27?engine(33,'ascent',true,33,Array.from({length:33},(_,i)=>i)):t<30?engine(33,'hot-stage-subset',true,null,trace.hardware.centerEngineIndices):t>=32&&t<43?engine(33,'boostback',true,null,trace.hardware.centerEngineIndices):t>=74&&t<82?engine(33,'landing-burn',true,null,trace.hardware.centerEngineIndices):engine(33,t>=82?'caught':'coast');
  u=t>=27&&t<55?engine(6,'ascent',true,6,[0,1,2,3,4,5]):t>=93&&t<99?engine(6,'landing-burn',true,null,[0,1,2]):engine(6,t<27?'off':t>=99?'splashdown':'coast');
 }else{
  const reusable=trace.recovery!=='expendable';
  b=t<7.5?engine(9,'off'):t<28?engine(9,'ascent',true,9,[0,1,2,3,4,5,6,7,8]):trace.recovery==='rtls'&&t>=34&&t<44?engine(9,'boostback',true,null,[0,1,2]):reusable&&t>=58&&t<65?engine(9,'entry-burn',true,null,[0]):reusable&&t>=78&&t<84?engine(9,'landing-burn',true,null,[0]):engine(9,t<30?'cutoff':t>=84?reusable?'landed':'expended':'coast');
  u=t>=32&&t<72?engine(1,'ascent',true,1,[0]):engine(1,t<32?'off':'coast');
 }
 return {booster:b,upper:u};
}
function kinematics(trace,t){
 const star=trace.vehicle==='starship',h=trace.hardware,stack=pathAt(trace.paths.stack,t),bp=t<30?stack:pathAt(trace.paths.booster,t),up=t<30?{position:worldPoint(stack,h.upperAttach),angle:stack.angle}:pathAt(trace.paths.upper,t),engines=enginesAt(trace,t);
 const booster=part('booster',bp,t<8?'on-mount':t<30?'attached-ascent':star?t>=82?'caught':'returning':t>=84?trace.recovery==='expendable'?'expended':'landed':trace.recovery==='expendable'?'ballistic':'returning',null,!(trace.recovery==='expendable'&&t>=84));
 const upper=part('upper',up,t<30?'attached':star?t>=99?'splashed-down':t>=85?'entry':t>=55?'coast':'ascent':t>=72?'coast':'ascent',t<30?'booster':null);
 for(const [p,e] of [[booster,engines.booster],[upper,engines.upper]]){p.engineMask=Array.from({length:e.installedCount},(_,i)=>e.representativeIndices.includes(i));p.throttle=e.throttle;p.plumeRepresentative=e.subsetSchematic;}
 const pp={position:worldPoint(up,h.payloadLocal),angle:up.angle};
 if(!star&&t>=92){const q=smooth((t-92)/6);pp.position=add(pp.position,rotateZ([.8*q,1.5*q,.6*q],up.angle));}
 const payload=part('payload',pp,star?'carried':t<92?'carried':t<98?'deploying':'deployed',star||t<92?'upper':null);
 payload.deploymentProgress=star?0:smooth((t-92)/6);
 const fairings=[0,1].map(i=>{
  const base={position:worldPoint(up,h.fairingAttach||[0,0,0]),angle:up.angle};
  if(star)return part(i?'fairing-right':'fairing-left',base,'not-installed',null,false);
  if(t<38)return part(i?'fairing-right':'fairing-left',base,'attached','upper');
  const initial=pathAt(trace.paths.upper,38),start={position:worldPoint(initial,h.fairingAttach),angle:initial.angle},sign=i?1:-1,p=pathAt([key(38,start.position,start.angle),key(43,add(start.position,[sign*1.1,-.2,sign*.7]),start.angle+sign*.4),key(70,[18+sign*3,.3,sign*4],start.angle+sign*1.2)],t);
  return part(i?'fairing-right':'fairing-left',p,t>=70?'outside-modeled-flight':'jettisoned',null,t<70);
 });
 return {booster,upper,payload,fairings,engines,boosterPose:bp,upperPose:up};
}
function eventList(vehicle,recovery){
 const entries=vehicle==='starship'?[
 ['ignition',7.5,'engine','booster'],['liftoff',8,'release','stack'],['meco',27,'engine-subset','booster'],['hot-staging',27,'engine','upper'],['stage-separated',30,'separation','upper'],['boostback-start',32,'engine','booster'],['boostback-end',43,'engine-off','booster'],['ship-cutoff',55,'engine-off','upper'],['booster-landing-burn',74,'engine','booster'],['booster-caught',82,'contact','booster'],['ship-entry',85,'entry','upper'],['ship-flip',93,'attitude','upper'],['ship-landing-burn',93,'engine','upper'],['ship-splashdown',99,'contact','upper']
 ]:[
 ['ignition',7.5,'engine','booster'],['liftoff',8,'release','stack'],['meco',28,'engine-off','booster'],['stage-separated',30,'separation','upper'],['upper-ignition',32,'engine','upper'],...(recovery==='rtls'?[['boostback-start',34,'engine','booster'],['boostback-end',44,'engine-off','booster']]:[]),['fairing-jettison',38,'separation','fairings'],['fairing-clear',43,'clearance','fairings'],...(recovery!=='expendable'?[['entry-burn-start',58,'engine','booster'],['entry-burn-end',65,'engine-off','booster']]:[]),['upper-cutoff',72,'engine-off','upper'],...(recovery!=='expendable'?[['landing-burn',78,'engine','booster'],['booster-landed',84,'contact','booster']]:[['booster-expended',84,'disposal','booster']]),['payload-deploy-start',92,'deployment','payload'],['payload-deploy-complete',98,'deployment-complete','payload']
 ];
 return entries.map(([id,time,type,partId])=>({id,time,type,partId})).sort((a,b)=>a.time-b.time);
}
export function makeFlightTrace(params={}){
 const vehicle=params.vehicle==='starship'?'starship':'falcon',recovery=vehicle==='starship'?'tower':['droneship','rtls','expendable'].includes(params.recovery)?params.recovery:params.reuse===false?'expendable':'droneship',hardware=HARDWARE[vehicle],layout=SPACE_LAYOUT[vehicle];
 const trace={params:{vehicle,recovery},vehicle,recovery,hardware,layout,horizon:100,chapters:FLIGHT_CHAPTERS,events:eventList(vehicle,recovery),sources:SOURCES,assumptions:{clock:'presentation units, not seconds or T+',trajectory:'continuous illustrative paths, not orbital or atmospheric simulation',recoverySubset:'symbolic nozzle subsets; exact counts depend on mission and vehicle',throttle:'on/off visual plume intensity, not measured engine throttle',payload:'generic object; no asserted mass, count or target orbit',falconReusePerformance:'unknown: no fixed mass penalty',starship:'published architecture and representative test mechanisms, not engineering CAD, a single actual test or routine operational mission',fairingRecovery:'not simulated',reuseTurnaround:'inspection/refurbishment not simulated'}};
 const launch=layout.launch,stack=[key(0,launch),key(8,launch),key(15,[.2,7,0],-.05),key(28,[4,24,0],-.28),key(30,[4.8,26,0],-.30)],split=pathAt(stack,30),upperStart=worldPoint(split,hardware.upperAttach);
 if(vehicle==='starship'){
  const caughtRoot=add(layout.tower.point,hardware.catchPinLocal.map(v=>-v)),splashRoot=add(layout.splashdown.point,hardware.shipWaterContactLocal.map(v=>-v));
  trace.paths={stack,booster:[key(30,split.position,-.30),key(32,[5.4,28,0],Math.PI/2),key(43,[2.5,32,0],Math.PI/2),key(58,[.5,17,0],.1),key(74,[0,5.5,0]),key(82,caughtRoot),key(100,caughtRoot)],upper:[key(30,upperStart,-.30),key(32,[8,35,0],-.5),key(55,[26,47,0],-Math.PI/2),key(85,[34,38,0],Math.PI/2),key(93,[34,7,0],Math.PI/2),key(96,[34,2.7,0]),key(99,splashRoot),key(100,splashRoot)]};
 }else{
  const site=recovery==='rtls'?layout.RTLS:layout.ASDS,target=add(site.point,[0,.10,0]);
  const booster=recovery==='expendable'?[key(30,split.position,-.30),key(44,[10,32,0],1.8),key(65,[19,12,0],2.6),key(84,[24,.3,0],2.8),key(100,[24,.3,0],2.8)]:recovery==='rtls'?[key(30,split.position,-.30),key(34,[6,28,0],Math.PI/2),key(44,[2,32,0],Math.PI/2),key(58,[-4.5,19,0]),key(65,[-5.7,12,0]),key(78,[-6.5,2.8,0]),key(84,target),key(100,target)]:[key(30,split.position,-.30),key(36,[7.5,29,0],Math.PI/2),key(44,[10,32,0],Math.PI/2),key(58,[14.2,19,0]),key(65,[15,12,0]),key(78,[16,2.8,0]),key(84,target),key(100,target)];
  trace.paths={stack,booster,upper:[key(30,upperStart,-.30),key(32,[8,35,0],-.5),key(50,[20,41,0],-1),key(72,[34,44,0],-Math.PI/2),key(85,[39,44,0],-Math.PI/2),key(100,[42,44,0],-Math.PI/2)]};
 }
 trace.events=trace.events.map(e=>e.id==='booster-landed'?{...e,point:(recovery==='rtls'?layout.RTLS:layout.ASDS).point,localPoint:hardware.legFootLocal}:e.id==='booster-caught'?{...e,point:layout.tower.point,localPoint:hardware.catchPinLocal}:e.id==='ship-splashdown'?{...e,point:layout.splashdown.point,localPoint:hardware.shipWaterContactLocal}:e);
 trace.states=Array.from({length:101},(_,time)=>flightFrameAt(trace,time));
 return freeze(trace);
}
export const makeTrace=makeFlightTrace;
function smokeSamples(trace,t){
 const samples=[];
 for(let i=0;i<12;i++){
  const age=.25+i*.75,emitted=t-age;if(emitted<7.5)continue;
  const s=kinematics(trace,emitted);
  for(const id of ['booster','upper']){
   const e=s.engines[id];if(!e.firing)continue;
   const p=id==='booster'?s.boosterPose:s.upperPose,exit=worldPoint(p,trace.hardware[id==='booster'?'boosterNozzleExit':'upperNozzleExit']);
   samples.push({id:id+'-'+i,partId:id,emitted,age,position:add(exit,[Math.sin(i*2.1)*age*.04,age*.04,Math.cos(i*1.7)*age*.03]),power:clamp(1-age/9),ground:emitted<9,kind:emitted<9?'launch-smoke':id==='upper'&&e.phase==='ascent'?'exhaust-glow':'exhaust',phase:e.phase});
  }
 }
 return samples;
}
export function flightFrameAt(trace,time=0){
 const t=clamp(finite(time),0,100),star=trace.vehicle==='starship',s=kinematics(trace,t),chapter=t<8?0:t<50?1:t<85?2:3,ch=FLIGHT_CHAPTERS[chapter],recoverable=trace.recovery!=='expendable',recovered=star?t>=82:recoverable&&t>=84;
 const site=star?'tower':trace.recovery==='rtls'?'RTLS':trace.recovery==='droneship'?'ASDS':'none',surface=star?trace.layout.tower.point:trace.recovery==='rtls'?trace.layout.RTLS.point:trace.layout.ASDS.point;
 const landing={site,contact:!!recovered,point:surface.slice(),deckY:star?null:surface[1],localPoint:(star?trace.hardware.catchPinLocal:trace.hardware.legFootLocal).slice(),upperContact:star&&t>=99,upperPoint:star?trace.layout.splashdown.point.slice():null};
 const finsDeploy=recoverable?smooth((t-30)/8):0,legsDeploy=!star&&recoverable?smooth((t-78)/5):0,tower={armsClosure:star?smooth((t-79)/3):0,contact:star&&t>=82,point:star?trace.layout.tower.point.slice():null};
 const parts={booster:s.booster,upper:s.upper,payload:s.payload,fairingLeft:s.fairings[0],fairingRight:s.fairings[1]},recoveryState={site,phase:recovered?star?'caught':'landed':recoverable?s.engines.booster.phase:'not-planned',planned:recoverable,recovered:!!recovered,boosterRecovered:!!recovered,upperRecovered:false,upperSplashdown:star&&t>=99,fairingRecoveryModeled:false};
 return freeze({time:t,t,continuous:true,completed:Math.floor(t),progress:t/100,active:t<100,vehicle:trace.vehicle,recovery:trace.recovery,chapter,chapterProgress:clamp((t-ch.start)/(ch.end-ch.start)),phase:ch.id,parts,bodies:{booster:parts.booster,upper:parts.upper},fairings:s.fairings,payload:parts.payload,payloadDeploy:parts.payload.deploymentProgress,engines:s.engines,hardware:trace.hardware,finsDeploy,finDeploy:finsDeploy,legsDeploy,landing,tower,recoveryState,result:{recoveredStages:recovered?1:0,totalStages:2,boosterRecovered:!!recovered,upperRecovered:false,payloadDeployed:!star&&t>=98,upperSplashdown:star&&t>=99,complete:t>=100},effects:{smokeSamples:smokeSamples(trace,t)},events:trace.events.filter(e=>e.time<=t),assumptions:trace.assumptions});
}
export const frameAt=flightFrameAt;
