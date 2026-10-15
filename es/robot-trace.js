// Replay adapters over the existing engines. No simulation rule is replaced here.
import * as Factory from './factory-model.js';
import * as Region from './region-model.js';
import * as City from './city-model.js';
import * as Territory from './territory-model.js';
const privateRuns=new WeakMap();
let industryEngine;
export function bindRobotIndustry(engine){const fn=typeof engine==='function'?engine:engine?.simulateIndustry;if(typeof fn!=='function')throw new RangeError('Canonical simulateIndustry required');industryEngine=fn;}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const child of Object.values(v))freeze(child);return Object.freeze(v);}
function clone(v){if(!v||typeof v!=='object')return v;return Array.isArray(v)?v.map(clone):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));}
const sum=a=>a.reduce((n,x)=>n+x,0),num=(v,d)=>{if(v===null||typeof v==='boolean'||(typeof v!=='number'&&typeof v!=='string')||v==='')return d;const n=Number(v);return Number.isFinite(n)?n:d;};
const bound=(v,d,a,b,whole=false)=>{const n=Math.max(a,Math.min(b,num(v,d)));return whole?Math.floor(n):n;};
function paramsFor(kind,raw={}){
 if(kind==='factory')return freeze({automatic:raw.automatic!==false,config:Array.from({length:5},(_,i)=>bound(raw.config?.[i],0,0,2,true)),horizon:bound(raw.horizon??(raw.days===undefined?24:num(raw.days,1)*24),24,24,168)});
 if(kind==='district')return freeze({policy:['none','assembly','network'].includes(raw.policy)?raw.policy:'network',expand:raw.expand!==false,days:bound(raw.days,12,1,30,true)});
 if(kind==='city')return freeze({scenario:bound(raw.scenario,3,0,3,true),share:bound(raw.share,.35,0,1)});
 if(kind==='region'){const scenario=raw.scenario==='mixed'||raw.scenario===false?'mixed':'full';return freeze({share:bound(raw.share,.4,0,1),auto:raw.auto!==false,delivery:bound(raw.delivery,.35,0,1),scenario});}
 throw new RangeError('Unknown robot trace kind');
}
function cleanEvents(kind,raw,horizon,step){
 if(!Array.isArray(raw)||raw.length>1000)throw new RangeError('At most 1000 interventions required');
 const allowed=kind==='factory'?['automatic']:kind==='city'?['share']:kind==='region'?['share','auto','delivery']:[];
 return freeze(raw.map((e,i)=>{
  if(!e||e.time===null||!Number.isFinite(Number(e.time))||Number(e.time)<0||Number(e.time)>horizon)throw new RangeError('Intervention time out of range');
  const requestedTime=Number(e.requestedTime??e.time);if(!Number.isFinite(requestedTime)||requestedTime<0||requestedTime>horizon)throw new RangeError('Requested intervention time out of range');
  const tick=Math.min(Math.round(horizon/step),Math.ceil(requestedTime/step-1e-9)),time=tick*step,order=Number.isInteger(e.order)&&e.order>=0&&e.order<1000?e.order:i;
  let type=e.type||e.action,changes;
  if(type==='set'){changes=e.changes||e.params;if(!changes||typeof changes!=='object'||!Object.keys(changes).length)throw new RangeError('Intervention changes required');}
  else if(allowed.includes(type)){changes={[type]:e.value};type='set';}
  if(type==='set'){
   const cleaned={};for(const [key,value]of Object.entries(changes)){
    if(!allowed.includes(key))throw new RangeError('Unsupported live parameter; create a new scenario trace');
    cleaned[key]=['automatic','auto'].includes(key)?value===true:bound(value,0,0,1);
   }
   return {id:e.id===undefined?`intervention-${i}`:String(e.id),order,requestedTime,time,tick,type,changes:cleaned};
  }
  if(type==='automate'&&kind==='factory'||type==='build'&&kind==='region'){
   const index=Number(e.index??e.station);if(!Number.isInteger(index)||index<0||index>=(kind==='factory'?5:36))throw new RangeError('Intervention index out of range');
   return {id:e.id===undefined?`intervention-${i}`:String(e.id),order,requestedTime,time,tick,type,index};
  }
  throw new RangeError('Unsupported intervention');
 }).sort((a,b)=>a.tick-b.tick||a.order-b.order));
}
const ledgerZero=()=>({humanHours:0,robotHours:0,referenceHumanHours:0,referenceRobotHours:0,siteTime:0,referenceSiteTime:0});
function staff(kind,state){
 if(kind==='factory')return {humans:sum(Factory.STATIONS.map((_,i)=>Factory.status(state,i).humans)),robots:sum(state.robots.map(a=>a.length)),sites:5};
 if(kind==='district')return {humans:sum(state.humansWorking),robots:sum(state.robots),sites:sum(state.modules)};
 const industrial=kind==='city'?state.industry:state;return {humans:0,robots:industrial.fleet,sites:sum(Region.counts(industrial))};
}
function addHours(ledger,dt,a,b){ledger.humanHours+=dt*a.humans;ledger.robotHours+=dt*a.robots;ledger.referenceHumanHours+=dt*b.humans;ledger.referenceRobotHours+=dt*b.robots;ledger.siteTime+=dt*a.sites;ledger.referenceSiteTime+=dt*b.sites;}
function newMeta(){return {deployments:[],exports:[],shipments:[],assignments:[],outcomes:[],availableIDs:[],pendingIDs:[],nextExport:0};}
function pushAvailable(meta,r){meta.availableIDs.push({idStart:r.idStart,idEnd:r.idEnd});}
function takeIds(meta,count){
 const ranges=[];while(count>0){const first=meta.availableIDs[0];if(!first)throw new Error('Canonical assignment without a received robot');const n=Math.min(count,first.idEnd-first.idStart);ranges.push({idStart:first.idStart,idEnd:first.idStart+n,count:n});first.idStart+=n;count-=n;if(first.idStart===first.idEnd)meta.availableIDs.shift();}return ranges;
}
function newDeployments(before,state,meta){
 let ordinal=before.deployed;
 state.robots.forEach((slots,station)=>{for(let slot=before.lengths[station];slot<slots.length;slot++){meta.deployments.push({id:`product-${ordinal}`,ordinal,station,slot,depart:state.time,ready:slots[slot]});ordinal++;}});
}
function factoryBefore(s){return {deployed:s.deployed,lengths:s.robots.map(a=>a.length)};}
function urbanBefore(kind,s){const i=kind==='city'?s.industry:s;return {exported:i.exported,built:i.built,assigned:kind==='city'?[...s.assigned]:s.towns.map(t=>[...t.assigned]),shipments:kind==='region'?s.shipments.map(p=>({...p})):[]};}
function urbanAfter(kind,before,s,meta){
 const industry=kind==='city'?s.industry:s,time=industry.time,newExports=industry.exported-before.exported;
 if(newExports){const range={idStart:before.exported,idEnd:industry.exported,count:newExports,depart:time,builtIdStart:before.built};meta.exports.push(range);if(kind==='city'){const shipment={...range,id:`shipment-${before.exported}`,ready:time+1};meta.shipments.push(shipment);meta.pendingIDs.push(shipment);}}
 if(kind==='city'){
  meta.pendingIDs=meta.pendingIDs.filter(r=>{if(r.ready>time+1e-8)return true;pushAvailable(meta,r);return false;});
  for(let sector=0;sector<6;sector++){const count=s.assigned[sector]-before.assigned[sector];if(!count)continue;let firstTask=before.assigned[sector];for(const range of takeIds(meta,count)){meta.assignments.push({...range,sector,firstTask,assignedAt:time});firstTask+=range.count;}}
 }else{
  const dispatched=s.shipments.filter(p=>Math.abs(p.depart-time)<1e-8);
  // FIFO attribution gives persistent identities to the engine's aggregate depot/shipments.
  for(const p of dispatched){const r={id:`shipment-${meta.nextExport}`,idStart:meta.nextExport,idEnd:meta.nextExport+1,count:1,town:p.town,depart:p.depart,ready:p.ready};meta.nextExport++;meta.shipments.push(r);meta.pendingIDs.push(r);}
  const arrivals=meta.pendingIDs.filter(r=>r.ready<=time+1e-8);meta.pendingIDs=meta.pendingIDs.filter(r=>r.ready>time+1e-8);
  const delta=s.towns.map((t,town)=>t.assigned.map((n,sector)=>n-before.assigned[town][sector]));
  for(const arrival of arrivals){const sector=delta[arrival.town].findIndex(n=>n>0);if(sector<0)throw new Error('Arrival without canonical task assignment');const already=meta.assignments.filter(a=>a.town===arrival.town&&a.sector===sector).reduce((n,a)=>n+a.count,0);meta.assignments.push({idStart:arrival.idStart,idEnd:arrival.idEnd,count:1,town:arrival.town,sector,firstTask:already,assignedAt:time});delta[arrival.town][sector]--;}
 }
}
function tickPair(kind,pair,step){
 const {state,reference,ledger,meta}=pair;addHours(ledger,step,staff(kind,state),staff(kind,reference));
 if(kind==='factory'){const before=factoryBefore(state);Factory.tick(state);Factory.tick(reference);newDeployments(before,state,meta);}
 else if(kind==='city'){const before=urbanBefore(kind,state);City.tickCity(state);reference.industry.exportShare=reference.share;Region.tickRegion(reference.industry);urbanAfter(kind,before,state,meta);}
 else {const before=urbanBefore(kind,state);Territory.tickTerritory(state);Territory.tickTerritory(reference);urbanAfter(kind,before,state,meta);}
}
function applyEvent(kind,pair,event){
 const {state,reference,meta}=pair;let applied=true;
 if(event.type==='set'){
  for(const [key,value]of Object.entries(event.changes)){state[key]=value;if(kind==='city'&&key==='share'||kind==='region'&&key==='delivery')reference[key]=value;}
 }else if(event.type==='automate'){const before=factoryBefore(state);applied=Factory.automate(state,event.index);if(applied)newDeployments(before,state,meta);}
 else applied=Region.startBuild(state,event.index);
 meta.outcomes.push({id:event.id,time:event.time,requestedTime:event.requestedTime,type:event.type,index:event.index??null,changes:event.changes??null,applied});
}
const logKey=(path,key)=>['history','events','urbanHistory','doublings'].includes(key)||path==='meta'&&['deployments','exports','shipments','assignments','outcomes'].includes(key);
function compact(value,stores,path='',counts={}){
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map((v,i)=>compact(v,stores,`${path}.${i}`,counts));
 const out={};for(const [key,v]of Object.entries(value)){const next=path?`${path}.${key}`:key;if(Array.isArray(v)&&logKey(path,key)){stores.set(next,v);counts[next]=v.length;}else out[key]=compact(v,stores,next,counts);}return out;
}
function checkpoint(pair,tick,stores){const logs={};return {tick,tree:compact(pair,stores,'',logs),logs};}
function hydrate(point,stores){const result=clone(point.tree);for(const [path,count]of Object.entries(point.logs)){const keys=path.split('.'),last=keys.pop();let target=result;for(const key of keys)target=target[key];target[last]=stores.get(path).slice(0,count);}return result;}
function initialPair(kind,p,horizon){
 let state,reference;
 if(kind==='factory'){state=Factory.createFactory(p.config,p.automatic);reference=Factory.createFactory();}
 else if(kind==='city'){state=City.createCity(p.scenario,p.share);reference=City.createCity(p.scenario,p.share);reference.industry=Region.createRegion(0,false);reference.industry.end=horizon;reference.industry.exportShare=p.share;}
 else {state=Territory.createTerritory(p.share,p.auto,p.delivery,p.scenario==='full');reference=Territory.createTerritory(0,false,p.delivery,p.scenario==='full');}
 return {state,reference,ledger:ledgerZero(),meta:newMeta(),eventCursor:0};
}
function windowsFor(kind,summary,horizon){
 const clamp=t=>Math.max(0,Math.min(horizon,t)),map={};
 if(kind==='factory'){
  map['guide-factory']={start:0,end:0};
  const first=summary.firstFinished??Math.min(1,horizon),ends=summary.firstPassage||[];
  for(let i=0;i<5;i++)map[`robot-factory-${i}`]={start:clamp(i?ends[i-1]??first*i/5:0),end:clamp(i===4?Math.max(first,summary.firstReturn?.ready??first):ends[i]??first*(i+1)/5)};
  map['factory-first-loop']={start:0,end:Math.min(horizon,summary.firstReturn?summary.firstReturn.ready+2:24),restart:true};
  map['factory-limits']={start:map['factory-first-loop'].end,end:horizon};
  map['factory-day']={start:0,end:Math.min(24,horizon)};map['factory-night']={start:Math.min(10,horizon),end:Math.min(24,horizon)};
 }else{
  const intro=clamp(kind==='district'?summary.firstProduced??Math.min(2,horizon):summary.firstArrival??summary.firstProduced??Math.min(2,horizon));
  const ids=kind==='district'?Array.from({length:14},(_,i)=>`district-${i}`):kind==='city'?Array.from({length:6},(_,i)=>`city-${i}`):[...Array.from({length:3},(_,i)=>`region-city-${i}`),...Array.from({length:6},(_,i)=>`region-${i}`)];
  map[kind==='region'?'region-overview':`guide-${kind}`]={start:0,end:intro};
  for(let i=0;i<ids.length;i++)map[ids[i]]={start:intro+(horizon-intro)*i/ids.length,end:intro+(horizon-intro)*(i+1)/ids.length};
  for(const id of kind==='district'?['district-chain-lesson','district-productivity-lesson']:kind==='region'?['region-growth-lesson']:[])map[id]={start:0,end:horizon,restart:true};
 }
 return freeze(map);
}
export function createRobotTrace(kind,rawParams={},rawEvents=[]){
 const params=paramsFor(kind,rawParams),step=kind==='factory'?Factory.STEP:kind==='district'?1:Region.STEP;
 const horizon=kind==='factory'?Math.floor(params.horizon/step)*step:kind==='district'?params.days*24-9:kind==='city'?(params.scenario===3?City.FULL_END:Region.END):(params.scenario==='full'?City.FULL_END:Region.END);
 const interventions=cleanEvents(kind,rawEvents,horizon,step);if(kind==='district'&&interventions.length)throw new RangeError('District scenario changes restart the canonical run');
 let internal,summary;
 if(kind==='district'){
  const engine=industryEngine||globalThis.simulateIndustry;if(typeof engine!=='function')throw new Error('Bind the canonical industrial engine before creating a district trace');
  const run=engine(params.policy,params.expand,params.days),reference=engine('none',false,params.days),ledgers=[ledgerZero()];
  for(let i=1;i<run.frames.length;i++){const ledger={...ledgers[i-1]};addHours(ledger,1,staff(kind,run.frames[i-1]),staff(kind,reference.frames[i-1]));ledgers.push(ledger);}
  summary={firstProduced:run.productionEvents[0]?run.productionEvents[0].hour-run.startHour:null,firstArrival:run.deployments[0]?run.deployments[0].ready-run.startHour:null,total:run.frames.at(-1).total,referenceTotal:reference.frames.at(-1).total};
  internal={run:freeze(run),reference:freeze(reference),ledgers:freeze(ledgers),cache:new Map()};
 }else{
  const stores=new Map(),pair=initialPair(kind,params,horizon),points=[],stride=kind==='factory'?60:16,ticks=Math.round(horizon/step);let firstProduced=null,firstArrival=null,fullyCovered=kind==='factory'&&sum(params.config)===10?0:null;
  const firstPassage=Array(5).fill(null);
  for(let tick=0;tick<=ticks;tick++){
   while(pair.eventCursor<interventions.length&&interventions[pair.eventCursor].tick===tick)applyEvent(kind,pair,interventions[pair.eventCursor++]);
   if(tick%stride===0||tick===ticks)points.push(checkpoint(pair,tick,stores));
   if(tick===ticks)break;
   tickPair(kind,pair,step);
   const s=pair.state;if(kind==='factory'){s.completed.forEach((n,i)=>{if(n&&firstPassage[i]===null)firstPassage[i]=s.time;});if(firstProduced===null&&s.total)firstProduced=s.time;if(fullyCovered===null&&sum(s.robots.map(a=>a.length))===10)fullyCovered=(tick+1)*step;}
   else {const covered=kind==='city'?sum(s.assigned):s.delivered;if(firstProduced===null&&(kind==='city'?s.industry.built:s.built))firstProduced=(tick+1)*step;if(firstArrival===null&&covered)firstArrival=(tick+1)*step;if(fullyCovered===null&&covered===600)fullyCovered=(tick+1)*step;}
  }
  for(const value of stores.values())freeze(value);points.forEach(freeze);
  const s=pair.state,r=pair.reference;
  summary={firstProduced,firstArrival,fullyCovered,total:kind==='factory'?s.total:kind==='city'?s.industry.built:s.built,referenceTotal:kind==='factory'?r.total:kind==='city'?r.industry.built:r.built,firstFinished:kind==='factory'?s.firstFinished:null,firstReturn:kind==='factory'?clone(s.firstReturn):null,firstPassage:kind==='factory'?firstPassage:null,checkpoints:points.length,maxReplayTicks:stride-1};
  internal={points,stores,stride,cache:new Map()};
 }
 const trace=freeze({kind,params,horizon,step,events:interventions,summary,windows:windowsFor(kind,summary,horizon),scope:{fraction:'Only observation phase between completed engine ticks; inventories, assignments and products never advance early.',identity:'FIFO identity attribution to aggregate objects; engine counts and event times are unchanged.',growth:'Capacity, staffing, materials, energy, logistics and finite task limits prevent claims of sustained exponential growth.',hours:'Installed robot-hours include charge, arrival and idle time; these are not effective output hours.',cityReference:'Industrial engine without facility expansion; the reference city retains 600 human tasks.'}});
 privateRuns.set(trace,internal);return trace;
}
const FACTORY_POSITIONS=[[-11,-4],[-2,-4],[7,-4],[7,5],[-2,5]],CONTACT_HEIGHTS=[.35,.95,1.10,1.50,.95];
function identitiesFor(kind,pair,sampledTime){
 const {state:s,meta}=pair;
 if(kind==='factory')return {
  jobs:s.jobs.map((progress,i)=>progress===null?null:{id:`product-${s.completed[i]}`,ordinal:s.completed[i],station:i,progress,formStage:i,position:[FACTORY_POSITIONS[i][0],.18,FACTORY_POSITIONS[i][1]],toolTargets:[-.35,.35].map(dx=>[FACTORY_POSITIONS[i][0]+dx,CONTACT_HEIGHTS[i],FACTORY_POSITIONS[i][1]+.5])}),
  queues:s.queues.map((count,i)=>{const idStart=s.completed[i]+(s.jobs[i]===null?0:1);return {count,idStart,idEnd:idStart+count,prefix:'product-'};}),
  finished:{count:s.total-s.deployed,idStart:s.deployed,idEnd:s.total,prefix:'product-'},
  seeds:s.robots.flatMap((slots,station)=>slots.map((ready,slot)=>ready<0?{id:`seed-${station}-${slot}`,station,slot}:null).filter(Boolean)),
  deployments:meta.deployments.map(r=>({...r,status:sampledTime+1e-9>=r.ready?'deployed':'arriving'}))
 };
 if(kind==='district')return {};
 return {exports:meta.exports,shipments:meta.pendingIDs.map(r=>({...r,id:`export-${r.idStart}`,status:'in-transit'})),assignments:meta.assignments,availableRanges:meta.availableIDs};
}
function metricsFor(kind,state,reference){
 if(kind==='factory')return {total:state.total,referenceTotal:reference.total,fleet:sum(state.robots.map(a=>a.length)),referenceFleet:0,replacement:{done:sum(state.robots.map(a=>a.length)),total:10},inventory:{delivered:state.delivered,queued:sum(state.queues),inProcess:state.jobs.filter(x=>x!==null).length,finished:state.total},rate:sum(state.flow)};
 if(kind==='district')return {total:state.total,referenceTotal:reference.total,fleet:sum(state.robots),referenceFleet:0,replacement:{done:state.humansReplaced,total:state.humanTotal},inventory:{weighted:sum(state.inventory.map((n,i)=>n*[4,1,1,1,1,1,4,4][i])),initial:state.initialMaterial,extracted:state.extracted,finished:state.total},rate:state.flow[8]};
 const s=kind==='city'?state.industry:state,r=kind==='city'?reference.industry:reference;
 return {total:s.built,referenceTotal:r.built,fleet:s.fleet+s.exported,referenceFleet:r.fleet+r.exported,replacement:{done:kind==='city'?sum(state.assigned):state.delivered,total:600,tasks:true,full:kind==='city'?state.scenario===3:state.full},inventory:{ore:s.ore,material:s.material,kits:s.kits,partial:s.partial,spent:s.spent,extracted:s.extracted,initial:80+120+2*24},rate:s.flow[3]};
}
export function robotFrameAt(trace,requestedTime=0){
 const run=privateRuns.get(trace);if(!run)throw new RangeError('A live robot trace descriptor is required; restore with createRobotTrace');
 const time=Math.max(0,Math.min(trace.horizon,num(requestedTime,0))),tick=Math.min(Math.round(trace.horizon/trace.step),Math.floor(time/trace.step+1e-9)),sampledTime=tick*trace.step;
 const key=tick;let pair=run.cache.get(key);
 if(!pair){
  if(trace.kind==='district'){const i=tick;pair={state:run.run.frames[i],reference:run.reference.frames[i],ledger:run.ledgers[i],meta:newMeta()};}
  else {const point=run.points[Math.min(Math.floor(tick/run.stride),run.points.length-1)];pair=hydrate(point,run.stores);for(let i=point.tick;i<tick;i++){tickPair(trace.kind,pair,trace.step);while(pair.eventCursor<trace.events.length&&trace.events[pair.eventCursor].tick===i+1)applyEvent(trace.kind,pair,trace.events[pair.eventCursor++]);}freeze(pair);}
  run.cache.set(key,pair);if(run.cache.size>8)run.cache.delete(run.cache.keys().next().value);
 }
 const measured=metricsFor(trace.kind,pair.state,pair.reference),ledger={...pair.ledger};let ids=identitiesFor(trace.kind,pair,sampledTime);
 if(trace.kind==='district')ids={deployments:run.run.deployments.filter(r=>r.born<=pair.state.absHour).map(r=>({...r,robotId:`district-robot-${r.id}`,depart:r.born-run.run.startHour,readyAt:r.ready-run.run.startHour,status:r.ready<=pair.state.absHour?'deployed':'arriving'})),productionEvents:run.run.productionEvents.filter(e=>e.hour<=pair.state.absHour)};
 const production={total:measured.total,reference:measured.referenceTotal,unit:'completed robots'};
 return freeze({trace,time,sampledTime,tick,fraction:time>=trace.horizon?0:Math.max(0,(time-sampledTime)/trace.step),active:time<trace.horizon,state:pair.state,reference:pair.reference,ledger,hours:ledger,...measured,production,identities:ids,interventions:pair.meta.outcomes,unit:trace.kind==='factory'||trace.kind==='district'?'hours':'illustrative-cycles',day:trace.kind==='factory'?pair.state.day:trace.kind==='district'?pair.state.day:null,observationOnly:true});
}
export function robotChapterWindows(trace){if(!privateRuns.has(trace))throw new RangeError('A live robot trace is required');return trace.windows;}
