import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import * as F from './site-src/factory-model.js';
import * as R from './site-src/region-model.js';
import * as C from './site-src/city-model.js';
import * as T from './site-src/territory-model.js';
import {createRobotTrace,robotFrameAt,robotChapterWindows,bindRobotIndustry} from './site-src/robot-trace.js';
const context={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('site-src/industrial-model.js','utf8'),context);const D=context.module.exports;bindRobotIndustry(D);
const close=(a,b)=>assert(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`),sum=a=>a.reduce((n,v)=>n+v,0),plain=x=>JSON.parse(JSON.stringify(x));
let traces=0,canonicalStates=0,conservations=0,fractionalFrames=0,identityCases=0,windowCases=0,rejected=0;
function finiteFrozen(v,seen=new Set()){
 if(typeof v==='number'){assert(Number.isFinite(v));return;}
 if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);assert(Object.isFrozen(v));for(const x of Object.values(v))finiteFrozen(x,seen);
}
function conservation(kind,f){
 const s=f.state;
 if(kind==='factory'){
  assert.equal(s.delivered,sum(s.queues)+s.jobs.filter(x=>x!==null).length+s.total);
  assert.equal(sum(s.robots.map(a=>a.length)),sum(f.trace.params.config)+s.deployed);
  assert.equal(f.identities.finished.count,s.total-s.deployed);
  for(let i=0;i<5;i++){
   const entered=i===0?s.delivered:s.completed[i-1];assert.equal(entered,s.completed[i]+s.queues[i]+(s.jobs[i]===null?0:1));
   assert(s.queues[i]>=0);if(i)assert(s.queues[i]<=16);
   assert.equal(f.identities.queues[i].idEnd-f.identities.queues[i].idStart,s.queues[i]);
   if(s.jobs[i]!==null){assert.equal(f.identities.jobs[i].id,`product-${s.completed[i]}`);assert.equal(f.identities.jobs[i].progress,s.jobs[i]);assert(s.jobs[i]>=0&&s.jobs[i]<=1);}
  }
  assert.equal(f.identities.deployments.length,s.deployed);assert.equal(new Set(f.identities.deployments.map(r=>r.id)).size,s.deployed);
  f.identities.deployments.forEach((r,i)=>{assert.equal(r.id,`product-${i}`);assert(i<s.total);close(r.ready-r.depart,.25);assert.equal(r.status,f.sampledTime+1e-9>=r.ready?'deployed':'arriving');});
  close(f.ledger.siteTime,5*f.sampledTime);close(f.ledger.referenceSiteTime,5*f.sampledTime);assert.equal(f.ledger.referenceRobotHours,0);
 }else if(kind==='district'){
  close(sum(s.inventory.map((n,i)=>n*[4,1,1,1,1,1,4,4][i]))+4*s.total,s.initialMaterial+4*s.extracted);
  assert.equal(s.retained,s.pending.length+sum(s.robots));assert.equal(s.total,s.retained+s.exported);
  assert.equal(f.identities.deployments.length,s.retained);assert(f.identities.deployments.every(r=>r.born<=s.absHour));
 }else{
  const industry=kind==='city'?s.industry:s;
  close(industry.ore+industry.material+2*industry.kits+2*industry.partial+2*industry.built+industry.spent,248+industry.extracted);
  assert.equal(industry.fleet+industry.exported,24+industry.built);assert(industry.ore>=0&&industry.material>=-1e-9&&industry.kits>=-1e-9);
  assert(industry.partial>=-1e-8&&industry.partial<1+1e-8);
  const assignments=f.identities.assignments;assert(assignments.every(a=>a.assignedAt<=f.sampledTime));
  assert(f.identities.shipments.every(p=>p.depart<=f.sampledTime&&p.ready>f.sampledTime+1e-8));
  assert.equal(new Set(assignments.flatMap(a=>Array.from({length:a.count},(_,j)=>a.idStart+j))).size,sum(assignments.map(a=>a.count)));
  if(kind==='city'){
   assert.equal(s.dispatched,industry.exported);assert.equal(s.dispatched,s.received+sum(s.pending.map(p=>p.count)));assert.equal(s.received,sum(s.assigned)+s.available);
   assert.equal(sum(assignments.map(a=>a.count)),sum(s.assigned));assert.equal(sum(f.identities.availableRanges.map(r=>r.idEnd-r.idStart)),s.available);
   for(let sector=0;sector<6;sector++){const ranges=assignments.filter(a=>a.sector===sector).sort((a,b)=>a.firstTask-b.firstTask);let next=0;for(const a of ranges){assert.equal(a.firstTask,next);assert.equal(a.idEnd-a.idStart,a.count);next+=a.count;}assert.equal(next,s.assigned[sector]);assert(s.assigned[sector]<=C.eligible(s)[sector]);}
   assert.equal(sum(f.reference.assigned),0,'Human-task reference never delegates urban tasks');assert.equal(f.reference.industry.auto,false);assert.equal(f.reference.industry.share,0);
  }else{
   assert.equal(industry.exported,s.depot+s.delivered+sum(s.shipments.map(p=>p.count)));assert.equal(sum(assignments.map(a=>a.count)),s.delivered);
   for(let town=0;town<3;town++){
    const actual=s.towns[town];assert.equal(actual.reserved,sum(s.shipments.filter(p=>p.town===town).map(p=>p.count)));assert.equal(sum(actual.assigned),actual.received);
    for(let sector=0;sector<6;sector++){const ranges=assignments.filter(a=>a.town===town&&a.sector===sector).sort((a,b)=>a.firstTask-b.firstTask);let next=0;for(const a of ranges){assert.equal(a.firstTask,next);next+=a.count;}assert.equal(next,actual.assigned[sector]);}
   }
  }
  assert.equal(f.ledger.humanHours,0,'Industrial robot-hours are not urban task-hours');identityCases++;
 }
 conservations++;
}
function executeCanonical(kind,p,horizon){
 let state,reference;
 if(kind==='factory'){state=F.createFactory(p.config,p.automatic);reference=F.createFactory();}
 else if(kind==='city'){state=C.createCity(p.scenario,p.share);reference=C.createCity(p.scenario,p.share);reference.industry=R.createRegion(0,false);reference.industry.end=horizon;reference.industry.exportShare=p.share;}
 else {state=T.createTerritory(p.share,p.auto,p.delivery,p.scenario==='full');reference=T.createTerritory(0,false,p.delivery,p.scenario==='full');}
 return{state,reference};
}
function apply(kind,pair,e){
 if(e.type==='set')for(const [key,v]of Object.entries(e.changes)){pair.state[key]=v;if(kind==='city'&&key==='share'||kind==='region'&&key==='delivery')pair.reference[key]=v;}
 else if(e.type==='automate')F.automate(pair.state,e.index);else R.startBuild(pair.state,e.index);
}
function directStep(kind,pair){if(kind==='factory'){F.tick(pair.state);F.tick(pair.reference);}else if(kind==='city'){C.tickCity(pair.state);pair.reference.industry.exportShare=pair.reference.share;R.tickRegion(pair.reference.industry);}else{T.tickTerritory(pair.state);T.tickTerritory(pair.reference);}}
const cases=[
 ['factory',{automatic:false},[]],['factory',{automatic:true},[]],['factory',{config:[1,0,2,0,1],automatic:true},[]],['factory',{days:7,automatic:false},[]],
 ['factory',{automatic:false},[{time:0,type:'automate',index:3},{time:.3333,type:'automate',index:3},{time:2.01,type:'automatic',value:true},{time:8.04,type:'automatic',value:false}]],
 ['city',{scenario:3,share:.35},[]],['city',{scenario:1,share:0},[]],['city',{scenario:0,share:1},[]],
 ['city',{scenario:3,share:0},[{time:10.01,type:'share',value:.6},{time:35.1,type:'share',value:.1}]],
 ['region',{scenario:'full',auto:true,share:.4,delivery:.35},[]],['region',{scenario:'mixed',auto:false,share:0,delivery:1},[]],
 ['region',{scenario:'full',auto:false,share:.4,delivery:0},[{time:0,type:'build',index:7},{time:0,type:'build',index:7},{time:3.1,type:'share',value:.8},{time:9.1,type:'auto',value:true},{time:18.05,type:'delivery',value:.5},{time:60,type:'auto',value:false}]]
];
for(const[kind,params,events]of cases){
 const callerParams=plain(params),callerEvents=plain(events),trace=createRobotTrace(kind,params,events),pair=executeCanonical(kind,trace.params,trace.horizon),ticks=Math.round(trace.horizon/trace.step);
 let cursor=0;
 for(let i=0;i<=ticks;i++){
  while(cursor<trace.events.length&&trace.events[cursor].tick===i)apply(kind,pair,trace.events[cursor++]);
  if(i===0||i===ticks||i%Math.max(1,Math.floor(ticks/22))===0||trace.events.some(e=>e.tick===i)){
   const f=robotFrameAt(trace,i*trace.step);assert.deepEqual(plain(f.state),plain(pair.state),`${kind} state matches real engine`);assert.deepEqual(plain(f.reference),plain(pair.reference),`${kind} reference matches real engine`);
   conservation(kind,f);finiteFrozen(f);canonicalStates++;
   if(i<ticks){const fractional=robotFrameAt(trace,(i+.49)*trace.step);assert.deepEqual(plain(fractional.state),plain(f.state));assert.equal(fractional.tick,i);close(fractional.fraction,.49);assert.equal(fractional.sampledTime,i*trace.step);fractionalFrames++;}
  }
  if(i<ticks)directStep(kind,pair);
 }
 assert.deepEqual(params,callerParams);assert.deepEqual(events,callerEvents);
 const saved=robotFrameAt(trace,Math.min(19.173,trace.horizon));for(const time of[trace.horizon,0,9.1,19.173,5])robotFrameAt(trace,time);assert.deepEqual(plain(robotFrameAt(trace,Math.min(19.173,trace.horizon))),plain(saved));
 const reloaded=createRobotTrace(kind,plain(trace.params),plain(trace.events));assert.deepEqual(plain(robotFrameAt(reloaded,saved.time)),plain(saved),'Replay can be restored from only parameters and intervention history');
 assert(trace.summary.checkpoints<=(kind==='factory'?337:151));assert(trace.summary.maxReplayTicks<=(kind==='factory'?59:15));
 assert.equal(robotFrameAt(trace,trace.horizon+100).time,trace.horizon);assert.equal(robotFrameAt(trace,trace.horizon).active,false);assert.equal(robotFrameAt(trace,trace.horizon).fraction,0);
 assert.equal(robotFrameAt(trace,-10).time,0);traces++;
}
for(const policy of['none','assembly','network'])for(const expand of[false,true]){
 const trace=createRobotTrace('district',{policy,expand}),run=D.simulateIndustry(policy,expand),reference=D.simulateIndustry('none',false);
 for(const step of[0,1,2,8,25,90,200,279]){
  const f=robotFrameAt(trace,step);assert.deepEqual(plain(f.state),plain(run.frames[step]));assert.deepEqual(plain(f.reference),plain(reference.frames[step]));conservation('district',f);canonicalStates++;
  if(step<279){assert.deepEqual(plain(robotFrameAt(trace,step+.75).state),plain(f.state));fractionalFrames++;}
 }
 const restored=createRobotTrace('district',plain(trace.params));assert.deepEqual(plain(robotFrameAt(trace,112.5)),plain(robotFrameAt(restored,112.5)));traces++;
}

// Independent witnesses and ledgers: quantized process events, not smooth fictitious counts.
const factory=createRobotTrace('factory'),zero=robotFrameAt(factory,0),end=robotFrameAt(factory,24);
assert.equal(zero.state.total,0);assert.equal(zero.state.delivered,160);assert.deepEqual(zero.state.queues,[160,0,0,0,0]);
assert.equal(end.state.total,160);assert.equal(end.reference.total,77);assert.equal(end.state.deployed,10);assert.equal(end.replacement.done,10);
assert.equal(end.identities.deployments[0].station,3);assert.equal(end.identities.deployments[0].id,'product-0');close(end.state.firstFinished,.325);close(end.state.firstReturn.ready,.575);
assert.equal(robotFrameAt(factory,.32499).state.total,0);assert.equal(robotFrameAt(factory,.325).state.total,1);
assert.equal(robotFrameAt(factory,.57499).identities.deployments[0].status,'arriving');assert.equal(robotFrameAt(factory,.575).identities.deployments[0].status,'deployed');
const seeded=createRobotTrace('factory',{config:[2,2,2,2,2]});assert.equal(robotFrameAt(seeded,0).replacement.done,10);assert.equal(robotFrameAt(seeded,0).state.total,0);assert.equal(robotFrameAt(seeded,0).identities.seeds.length,10);
const manual=createRobotTrace('factory',{automatic:false},[{time:0,type:'automate',index:0},{time:.3333,type:'automate',index:3}]);
assert.equal(robotFrameAt(manual,0).interventions[0].applied,false);assert.equal(robotFrameAt(manual,.3333).state.deployed,0);assert.equal(robotFrameAt(manual,manual.events[1].time).state.deployed,1);
assert.equal(robotFrameAt(manual,manual.events[1].time).interventions[1].applied,true);assert.equal(robotFrameAt(manual,manual.events[1].time).interventions[1].requestedTime,.3333);
const build=createRobotTrace('region',{auto:false,share:0,delivery:0},[{time:0,type:'build',index:7}]);
const building=robotFrameAt(build,0);assert.equal(building.state.sites[7].status,'building');assert.equal(building.state.material,72);assert.equal(building.state.spent,48);
assert.equal(robotFrameAt(build,10).state.sites[7].progress,0,'No builders means a manually started project remains unfinished');
const fullCity=robotFrameAt(createRobotTrace('city'),300),fullRegion=robotFrameAt(createRobotTrace('region'),300);
assert.equal(fullCity.replacement.done,600);assert.equal(fullRegion.replacement.done,600);
assert(fullCity.state.industry.exported>=600);assert(fullRegion.state.exported>=600);
assert.equal(sum(robotFrameAt(createRobotTrace('city',{scenario:1}),120).state.assigned),271);
assert.equal(robotFrameAt(createRobotTrace('region',{scenario:'mixed'}),120).state.delivered,265);
// Recompute legacy hours from pre-tick staffing independently at a small exact horizon.
const hoursTrace=createRobotTrace('factory',{automatic:false}),hoursFactory=F.createFactory(),count=Math.round(2/F.STEP);let human=0;
for(let i=0;i<count;i++){human+=(F.humanWorking(hoursFactory.time)?10:0)*F.STEP;F.tick(hoursFactory);}
close(robotFrameAt(hoursTrace,2).ledger.humanHours,human);assert.equal(robotFrameAt(hoursTrace,2).ledger.robotHours,0);close(robotFrameAt(hoursTrace,2).ledger.siteTime,10);

// All real tour keys are mapped. Adjacent narratives advance one monotonic trace;
// explicitly marked comparison/replay extras may restart the same model.
for(const kind of['factory','district','city','region']){
 const trace=createRobotTrace(kind),w=robotChapterWindows(trace);
 const keys=kind==='factory'?['guide-factory',...Array.from({length:5},(_,i)=>`robot-factory-${i}`)]:kind==='district'?['guide-district',...Array.from({length:14},(_,i)=>`district-${i}`)]:kind==='city'?['guide-city',...Array.from({length:6},(_,i)=>`city-${i}`)]:['region-overview',...Array.from({length:3},(_,i)=>`region-city-${i}`),...Array.from({length:6},(_,i)=>`region-${i}`)];
 let previous=0;
 for(const key of keys){assert(w[key],key);close(w[key].start,previous);assert(w[key].end>=w[key].start&&w[key].end<=trace.horizon);previous=w[key].end;windowCases++;}
 if(kind==='factory'){assert.equal(w['guide-factory'].end,0);close(w['robot-factory-4'].end,trace.summary.firstReturn.ready);assert.equal(w['factory-first-loop'].restart,true);close(w['factory-first-loop'].end,trace.summary.firstReturn.ready+2);assert(w['factory-first-loop'].end<24,'the first handover stays visible for most of its own explanation');close(w['factory-limits'].start,w['factory-first-loop'].end);assert.equal(w['factory-limits'].end,trace.horizon);}
 else close(previous,trace.horizon);
 for(const id of kind==='district'?['district-chain-lesson','district-productivity-lesson']:kind==='region'?['region-growth-lesson']:[]){assert.equal(w[id].start,0);assert.equal(w[id].end,trace.horizon);assert.equal(w[id].restart,true);windowCases++;}
}
for(const fn of[
 ()=>createRobotTrace('bad'),()=>createRobotTrace('city',{},[{time:-1,type:'share',value:.5}]),()=>createRobotTrace('city',{},[{time:1,type:'scenario',value:0}]),
 ()=>createRobotTrace('factory',{},[{time:1,type:'automate',index:5}]),()=>createRobotTrace('region',{},[{time:1,type:'build',index:36}]),
 ()=>createRobotTrace('region',{},[{time:Infinity,type:'auto',value:true}]),()=>createRobotTrace('district',{},[{time:0,type:'set',changes:{policy:'none'}}]),
 ()=>robotFrameAt(plain(factory),1),()=>bindRobotIndustry({})
]){assert.throws(fn,RangeError);rejected++;}
const dirty=createRobotTrace('factory',{config:[-5,10,NaN],automatic:false,horizon:Infinity});assert.deepEqual(dirty.params.config,[0,2,0,0,0]);assert.equal(dirty.horizon,24);
assert.equal(createRobotTrace('region',{share:Infinity,delivery:-1}).params.delivery,0);
assert(JSON.stringify(createRobotTrace('factory',{days:7})).length<10000,'Persisted descriptor excludes tick snapshots and historical engine clones');
assert.throws(()=>{end.state.total=999;},TypeError);assert.throws(()=>{factory.events.push({});},TypeError);
console.log(`Robot trace OK: ${traces} real-engine scenarios, ${canonicalStates} canonical/reference snapshots, ${conservations} independent inventories, ${fractionalFrames} no-early-event fractions, ${identityCases} urban identity ledgers, ${windowCases} continuous narrative windows, ${rejected} invalid inputs; manual history, reload, seek and bounded checkpoints verified.`);