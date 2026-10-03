import assert from 'node:assert/strict';
import {defaults,simulate,unitCosts,idealDoubling,cleanGrowthState,createGrowthTrace,growthFrameForDay,growthFrameAt,growthPositionForDay,GROWTH_CHAPTER_BOUNDS,GROWTH_CHAPTER_IDS} from './site-src/growth/model.js';
const close=(a,b,label='conservation')=>assert(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
let scenarios=0,dayStates=0,fractionalStates=0,events=0,chapterFrames=0,commissioningFrames=0,sanitized=0,frozen=0;
function immutableFinite(v,seen=new Set()){
 if(typeof v==='number'){assert(Number.isFinite(v),'Trace/frame numbers must be JSON finite');return;}
 if(!v||typeof v!=='object'||seen.has(v))return;
 seen.add(v);assert(Object.isFrozen(v),'All trace/frame subtrees must be immutable');frozen++;
 for(const child of Object.values(v))immutableFinite(child,seen);
}
const baseline=createGrowthTrace();
assert.deepEqual(baseline.rows.slice(0,5).map(r=>[r.fleet,r.made,r.pending,r.bank,r.goods,r.work]),[
 [10,0,0,0,0,210],[10,0,0,147,63,210],[10,1,1,54,126,210],[10,1,1,201,189,210],[11,2,1,108,252,231]
]);
assert.equal(baseline.batches[0].builtDay,1);assert.equal(baseline.batches[0].completedAt,2);assert.equal(baseline.batches[0].readyDay,4);
assert.deepEqual([baseline.batches[0].idStart,baseline.batches[0].idEnd,baseline.batches[0].count],[10,11,1]);
// At zero no today's planned goods have been credited. Half a day is half its budget.
const start=growthFrameForDay(baseline,0),half=growthFrameForDay(baseline,.5);
assert.deepEqual(start.elapsed,{human:0,fixed:0,work:0,growing:0,buildWork:0,goods:0});
assert.equal(start.budget.output,63);assert.equal(start.state.bank,0);assert.equal(start.batches.length,0);
assert.deepEqual(half.elapsed,{human:40,fixed:105,work:105,growing:105,buildWork:73.5,goods:31.5});
assert.equal(half.state.made,0);assert.equal(half.bank,0);assert.equal(half.assemblyWork,73.5);
assert.equal(growthFrameForDay(baseline,1.5).elapsed.goods,94.5);
assert.equal(growthFrameForDay(baseline,1.5).construction.credit,220.5);
assert.equal(growthFrameForDay(baseline,1.9).construction.awaitingDayClose,true);
assert.equal(growthFrameForDay(baseline,1.9).state.made,0,'A finished daily batch is not credited before day close');
assert.equal(growthFrameForDay(baseline,1.9).batches.length,0);
assert.equal(growthFrameForDay(baseline,2).state.made,1);
assert.equal(growthFrameForDay(baseline,2).batches[0].status,'commissioning');
assert.equal(growthFrameForDay(baseline,3).batches[0].commissioningElapsed,1);
assert.equal(growthFrameForDay(baseline,3.999999).state.fleet,10);
assert.equal(growthFrameForDay(baseline,4).state.fleet,11);
assert.equal(growthFrameForDay(baseline,4).batches[0].commissioningElapsed,2);
assert.equal(growthFrameForDay(baseline,4).batches[0].status,'active');

// Narrated construction now closes the first default batch at the stage boundary;
// the next complete stage shows both commissioning days before any new production.
const constructionEnd=growthFrameAt(baseline,2,1),commissionStart=growthFrameAt(baseline,3,0),commissionEnd=growthFrameAt(baseline,3,1);
assert.equal(constructionEnd.time,2);assert.equal(constructionEnd.state.made,1);assert.equal(constructionEnd.state.pending,1);assert.equal(constructionEnd.state.fleet,10);
assert.equal(constructionEnd.batches[0].idStart,10);assert.equal(constructionEnd.batches[0].status,'commissioning');
assert.equal(commissionStart.time,2);assert.deepEqual(commissionStart.state,constructionEnd.state);assert.equal(commissionStart.batches[0].commissioningElapsed,0);
assert.equal(commissionEnd.time,4);assert.equal(commissionEnd.state.fleet,11);assert.equal(commissionEnd.batches[0].status,'active');assert.equal(commissionEnd.batches[0].commissioningElapsed,2);
for(const progress of [0,.125,.25,.5,.75,.875,.999999,1]){
 const f=growthFrameAt(baseline,3,progress),first=f.batches.find(b=>b.idStart===10);
 close(f.time,2+2*progress);close(first.commissioningElapsed,2*progress);
 // The fixed ten-robot line is an independent witness: no added work has elapsed
 // through day4, despite the new robot becoming active exactly at its boundary.
 close(f.elapsed.work,f.elapsed.fixed,'First robot contributes no work before its activation');
 if(progress<1){assert.equal(f.state.fleet,10);assert.equal(first.status,'commissioning');assert(!f.activeBatches.some(b=>b.idStart<=10&&b.idEnd>10));close(f.budget.work,f.budget.fixed);}
 commissioningFrames++;
}
close(growthFrameForDay(baseline,4.5).elapsed.work-growthFrameForDay(baseline,4.5).elapsed.fixed,10.5,'Only the newly active robot supplies these 21h/day × half day');

// Independent resource totals, identities and completed-day transitions across scenarios.
for(const limited of [false,true])for(const reinvest of [0,.7,1])for(const hours of [8,21,24])for(const supply of [0,1500])for(const slots of [0,8,10,11,100]){
 const p={...defaults,days:30,limited,reinvest,hours,supply,slots},t=createGrowthTrace(p);
 const initial=limited?Math.min(10,slots):10;
 assert.equal(t.initialFleet,initial);assert.equal(t.rows.length,31);assert.equal(t.intervals.length,30);
 let work=0,build=0,goods=0,human=0,fixed=0,lastFleet=initial,lastMade=0;
 for(let day=0;day<=30;day++){
  const r=t.rows[day],built=t.batches.filter(b=>b.completedAt<=day),ready=built.filter(b=>b.readyDay<=day);
  const completedCount=built.reduce((n,b)=>n+b.count,0),readyCount=ready.reduce((n,b)=>n+b.count,0);
  assert.equal(r.day,day);assert.equal(r.made,completedCount);assert.equal(r.fleet,initial+readyCount);assert.equal(r.pending,completedCount-readyCount);
  assert.equal(r.fleet+r.pending,initial+r.made);
  assert(Number.isInteger(r.fleet)&&Number.isInteger(r.made)&&Number.isInteger(r.pending));
  assert(r.fleet>=lastFleet&&r.made>=lastMade);lastFleet=r.fleet;lastMade=r.made;
  close(r.goods,goods);close(r.humanTotal,human);close(r.fixedTotal,fixed);close(r.workTotal,work);close(r.buildTotal,build);
  close(r.goods+r.made*240+r.bank,work);close(r.made*240+r.bank,build);
  assert(r.bank>=0&&r.bank<240+1e-8);assert(r.output>=0&&r.buildWork>=0);close(r.work,r.output+r.buildWork);
  const bound=limited?supply:Infinity;
  close(r.human,Math.min(10*8,bound));close(r.fixed,Math.min(10*hours,bound));close(r.work,Math.min(r.fleet*hours,bound));
  if(limited){assert(r.work<=supply);assert(r.fleet+r.pending<=slots);assert(r.buildWork<=Math.max(0,(slots-r.fleet-r.pending)*240-r.bank)+1e-8);}
  if(reinvest===0){assert.equal(r.made,0);assert.equal(r.fleet,initial);close(r.output,r.work);}
  if(day<30){work+=r.work;build+=r.buildWork;goods+=r.output;human+=r.human;fixed+=r.fixed;}
  dayStates++;
 }
 let nextId=initial;
 for(const b of t.batches){
  assert(Number.isInteger(b.count)&&b.count>0);assert.equal(b.idStart,nextId);assert.equal(b.idEnd,b.idStart+b.count);nextId=b.idEnd;
  assert.equal(b.completedAt,b.builtDay+1);assert.equal(b.readyDay,b.builtDay+3);assert(b.builtDay<30);
  const completed=growthFrameForDay(t,b.completedAt),before=growthFrameForDay(t,b.completedAt-1e-6);
  assert(!before.batches.some(x=>x.id===b.id));assert(completed.batches.some(x=>x.id===b.id));
  const readyEvent=t.events.find(x=>x.type==='ready'&&x.batchId===b.id),builtEvent=t.events.find(x=>x.type==='built'&&x.batchId===b.id);
  assert.equal(builtEvent.time,b.builtDay+1);assert.equal(readyEvent.time,b.builtDay+3);events+=2;
 }
 assert.equal(nextId,initial+t.rows[30].made);scenarios++;
}

// The commissioning test is an exact discrete witness, not a doubling-rate approximation.
const fast=createGrowthTrace({...defaults,days:8,hours:24,reinvest:1,buildHours:120,supply:4000});
assert.deepEqual(fast.rows.slice(0,4).map(r=>[r.fleet,r.made,r.pending,r.bank]),[[10,0,0,0],[10,2,2,0],[10,4,4,0],[12,6,4,0]]);
assert.deepEqual([fast.batches[0].builtDay,fast.batches[0].count,fast.batches[0].readyDay],[0,2,3]);
assert.equal(growthFrameForDay(fast,.99999).state.made,0);assert.equal(growthFrameForDay(fast,1).state.made,2);
assert.equal(growthFrameForDay(fast,1).batches[0].commissioningElapsed,0);
assert.equal(growthFrameForDay(fast,2).batches[0].commissioningElapsed,1);assert.equal(growthFrameForDay(fast,3).batches[0].commissioningElapsed,2);
assert.equal(growthFrameForDay(fast,3.5).elapsed.work,864);assert.equal(growthFrameForDay(fast,3.5).state.made,6);
const noRoom=createGrowthTrace({...defaults,days:5,hours:24,reinvest:1,buildHours:120,slots:11,supply:4000});
assert.equal(noRoom.rows[0].buildWork,120);assert.equal(noRoom.rows[0].output,120);
assert.equal(noRoom.batches.length,1);assert.equal(noRoom.rows[1].buildWork,0);assert.equal(noRoom.rows[3].fleet,11);assert.equal(noRoom.rows[3].buildWork,0);
const noSupply=createGrowthTrace({...defaults,supply:0});
assert.equal(noSupply.batches.length,0);assert(noSupply.rows.every(r=>r.work===0&&r.human===0&&r.fixed===0));
assert.equal(growthFrameForDay(noSupply,90).elapsed.work,0);
const stoppedGrowth=createGrowthTrace({...defaults,reinvest:0});assert.equal(stoppedGrowth.batches.length,0);assert.equal(stoppedGrowth.idealDoubling,null);
assert(stoppedGrowth.rows.every(r=>r.fleet===10&&r.output===r.fixed));
const fair=simulate({...defaults,hours:24,shifts:3,reinvest:0});fair.forEach(r=>assert.equal(r.human,r.fixed));
const humanNoRobotSlots=simulate({...defaults,slots:0,shifts:3,supply:4000});
assert.equal(humanNoRobotSlots[0].human,240);assert.equal(humanNoRobotSlots[0].fixed,210);assert.equal(humanNoRobotSlots[0].fleet,0);

// Fractional elapsed counters have no early full-day output or future events; ledger stays closed.
for(const raw of [defaults,{...defaults,reinvest:0},{...defaults,limited:false,hours:24,reinvest:1,buildHours:120},{...defaults,slots:11,supply:4000,reinvest:1,buildHours:120},{...defaults,supply:0}]){
 const t=createGrowthTrace(raw),before=JSON.stringify(t);let last={human:0,fixed:0,work:0,buildWork:0,goods:0};
 for(let tick=0;tick<=720;tick++){
  const time=t.horizon*tick/720,f=growthFrameForDay(t,time),day=Math.floor(time),fraction=time-day,r=t.rows[day];
  assert.equal(f.time,time);assert.equal(f.day,day);assert.equal(f.dayFraction,fraction);assert.equal(f.active,time<t.horizon);
  assert.deepEqual(f.state,{fleet:r.fleet,made:r.made,pending:r.pending,bank:r.bank});
  const active=time<t.horizon;
  for(const [name,total,budget] of [['human','humanTotal','human'],['fixed','fixedTotal','fixed'],['work','workTotal','work'],['buildWork','buildTotal','buildWork'],['goods','goods','output']]){
   const expected=r[total]+(active?fraction*r[budget]:0);close(f.elapsed[name],expected,`${name} elapsed only`);
   assert(f.elapsed[name]+1e-8>=last[name]);last[name]=f.elapsed[name];
  }
  close(f.ledger.work,f.ledger.goods+f.ledger.builtWork+f.ledger.carriedWork+f.ledger.assemblyWork);
  close(f.ledger.buildWork,f.ledger.builtWork+f.ledger.carriedWork+f.ledger.assemblyWork);
  close(f.assemblyWork,(active?r.buildWork:0)*fraction);assert(f.construction.fraction>=0&&f.construction.fraction<=1);
  assert(f.events.every(e=>e.time<=time));assert(f.batches.every(b=>b.completedAt<=time));assert(f.milestones.every(m=>m.time<=time));
  assert.equal(f.pendingBatches.reduce((n,b)=>n+b.count,0),f.state.pending);
  assert.equal(f.activeBatches.reduce((n,b)=>n+b.count,0)+t.initialFleet,f.state.fleet);
  assert.equal(f.costs,t.costs);assert.equal(f.budget.growing,f.budget.work);
  if(!active){assert(Object.values(f.budget).every(x=>x===0));assert.equal(f.potentialBudget.work,r.work);}
  fractionalStates++;
 }
 const saved=growthFrameForDay(t,17.375);for(const time of [90,0,4.9,1,89.999,17.375])growthFrameForDay(t,time);
 assert.deepEqual(growthFrameForDay(t,17.375),saved);assert.equal(JSON.stringify(t),before);
 immutableFinite(t);immutableFinite(saved);
}
// Largest allowed unrestricted scenario is finite, and identities are ranges, not millions of allocations.
const maximum=createGrowthTrace({...defaults,limited:false,hours:24,reinvest:1,buildHours:120});
assert(maximum.rows[90].fleet>1e6);assert.equal(maximum.batches.length,90);assert.equal(maximum.rows.length,91);immutableFinite(maximum);
const zero=createGrowthTrace({days:0});assert.equal(zero.rows.length,1);assert.equal(zero.intervals.length,0);assert.equal(zero.batches.length,0);
assert.equal(growthFrameForDay(zero,40).time,0);assert.equal(growthFrameForDay(zero,40).active,false);assert.equal(growthFrameForDay(zero,40).elapsed.goods,0);

// Fractional control values and minimum/maximum build requirements keep balances
// closed for the entire allowed horizon, including rounded construction boundaries.
for(const limited of [true,false])for(const hours of [1,21.5,24])for(const reinvest of [.05,.7,1])for(const buildHours of [120,127.5,960]){
 for(const supply of limited?[0,.5,1500,4000]:[0])for(const slots of limited?[0,11,200]:[0]){
  const t=createGrowthTrace({...defaults,limited,hours,reinvest,buildHours,supply,slots});
  let work=0,construction=0,goods=0;
  for(let day=0;day<=90;day++){
   const r=t.rows[day];close(r.workTotal,work);close(r.buildTotal,construction);close(r.goods,goods);
   close(r.goods+r.made*buildHours+r.bank,work);close(r.made*buildHours+r.bank,construction);
   assert(r.bank>=0&&r.bank<buildHours+1e-8);assert(Number.isSafeInteger(r.fleet));assert(Number.isSafeInteger(r.made));
   if(limited)assert(r.fleet+r.pending<=slots);
   if(day<90){work+=r.work;construction+=r.buildWork;goods+=r.output;}
   dayStates++;
  }
  const f=growthFrameForDay(t,43.375);close(f.ledger.work,f.ledger.goods+f.ledger.builtWork+f.ledger.carriedWork+f.ledger.assemblyWork);
  scenarios++;
 }
}

// One external clock: chapter mappings meet exactly, including cost held at the final state.
assert.deepEqual(GROWTH_CHAPTER_BOUNDS,[0,1/90,1.5/90,2/90,4/90,1,1]);assert.equal(GROWTH_CHAPTER_IDS.length,6);
for(const horizon of [0,1,37,90]){
 const t=createGrowthTrace({days:horizon});
 for(let chapter=0;chapter<6;chapter++)for(const progress of [0,.2,.5,.999,1]){
  const f=growthFrameAt(t,chapter,progress),expectedTime=horizon*(GROWTH_CHAPTER_BOUNDS[chapter]+(GROWTH_CHAPTER_BOUNDS[chapter+1]-GROWTH_CHAPTER_BOUNDS[chapter])*progress);
  close(f.time,expectedTime);assert.equal(f.chapter,chapter);assert.equal(f.progress,progress);assert.equal(f.chapterId,GROWTH_CHAPTER_IDS[chapter]);
  if(chapter===5)assert.equal(f.time,horizon);chapterFrames++;
 }
 for(let chapter=0;chapter<5;chapter++){close(growthFrameAt(t,chapter,1).time,growthFrameAt(t,chapter+1,0).time);assert.deepEqual(growthFrameAt(t,chapter,1).elapsed,growthFrameAt(t,chapter+1,0).elapsed);}
 for(const time of [0,horizon*.01,horizon*.2,horizon*.8,horizon]){
  const position=growthPositionForDay(t,time,4);close(growthFrameAt(t,position.chapter,position.progress).time,time);
 }
 assert.deepEqual(growthPositionForDay(t,horizon,5),{chapter:5,progress:1});
}
assert.deepEqual(growthPositionForDay(baseline,1,0),{chapter:0,progress:1});
assert.deepEqual(growthPositionForDay(baseline,1,1),{chapter:1,progress:0});
assert.deepEqual(growthPositionForDay(baseline,1.5,1),{chapter:1,progress:1});
assert.deepEqual(growthPositionForDay(baseline,1.5,2),{chapter:2,progress:0});
assert.deepEqual(growthPositionForDay(baseline,2,2),{chapter:2,progress:1});
assert.deepEqual(growthPositionForDay(baseline,2,3),{chapter:3,progress:0});
assert.deepEqual(growthPositionForDay(baseline,4,3),{chapter:3,progress:1});
assert.deepEqual(growthPositionForDay(baseline,4,4),{chapter:4,progress:0});
assert.deepEqual(growthPositionForDay(baseline,90),{chapter:4,progress:1});
assert.deepEqual(growthFrameForDay(baseline,-10).elapsed,start.elapsed);assert.equal(growthFrameForDay(baseline,Infinity).time,0);
assert.equal(growthFrameForDay(baseline,900).time,90);assert.equal(growthFrameAt(baseline,50,90).chapter,5);
assert.throws(()=>growthFrameForDay({},0),RangeError);

// Price assumptions do not fund robot builds and fleet size does not lower unit cost.
const costs=unitCosts(defaults);
assert.equal(costs.human,33);close(costs.robotDaily,60000/(5*365)+3000/365+20+4.2);close(costs.robot,8+(60000/(5*365)+3000/365+20+4.2)/21);
assert(unitCosts({...defaults,installed:120000}).robot>costs.robot);assert(unitCosts({...defaults,hours:8}).robot>costs.robot);
assert(unitCosts({...defaults,wage:50}).human>costs.human);
assert.deepEqual(unitCosts({...defaults,wage:0,installed:0,service:0,power:0,energy:0,supervision:0,material:0}),{human:0,robot:0,robotDaily:0});
const priceChanged=createGrowthTrace({...defaults,installed:500000,wage:200,energy:2,material:1000});
assert.deepEqual(priceChanged.rows,baseline.rows);assert.deepEqual(priceChanged.batches,baseline.batches);assert.notDeepEqual(priceChanged.costs,baseline.costs);
assert.deepEqual(unitCosts({...defaults,slots:0,supply:0,limited:true}),costs);
close(idealDoubling(defaults),Math.log(2)/Math.log(1+.7*21/240));assert.equal(idealDoubling({...defaults,reinvest:0}),Infinity);
assert(growthFrameForDay(baseline,90).costs.robot===growthFrameForDay(baseline,0).costs.robot);

// Restore/slider data is sanitized without altering the caller or introducing NaN/Infinity.
const dirty={days:999,hours:0,shifts:-3,reinvest:4,buildHours:-1,slots:-1,supply:-100,limited:false,wage:-2,installed:Infinity,life:0,service:NaN,power:500,energy:-1,supervision:99999,material:'5.5',alien:{value:1}};
const clean=cleanGrowthState(dirty);
assert.deepEqual([clean.days,clean.hours,clean.shifts,clean.reinvest,clean.buildHours,clean.slots,clean.supply],[90,1,1,1,120,0,0]);
assert.equal(clean.wage,0);assert.equal(clean.installed,60000);assert.equal(clean.life,1);assert.equal(clean.service,3000);assert.equal(clean.power,50);assert.equal(clean.energy,0);assert.equal(clean.supervision,1000);assert.equal(clean.material,5.5);assert.equal(clean.alien,undefined);
for(const bad of [null,undefined,NaN,Infinity,'','   ',false,{},[]]){
 const p=cleanGrowthState({days:bad,hours:bad,reinvest:bad,installed:bad});assert.equal(p.days,90);assert.equal(p.hours,21);assert.equal(p.reinvest,.7);assert.equal(p.installed,60000);
 immutableFinite(createGrowthTrace(p));sanitized++;
}
const original={...defaults},originalBefore=JSON.stringify(original),old=createGrowthTrace(original);simulate(original);unitCosts(original);idealDoubling(original);assert.equal(JSON.stringify(original),originalBefore);
original.reinvest=0;assert.equal(old.params.reinvest,.7);assert(old.batches.length>0);assert.equal(createGrowthTrace(original).batches.length,0);
assert.throws(()=>{old.batches[0].count=999;},TypeError);assert.throws(()=>{old.params.days=10;},TypeError);assert.throws(()=>{defaults.reinvest=0;},TypeError);
console.log(`Growth OK: ${scenarios} scenarios, ${dayStates} start-of-day balances, ${fractionalStates} causal fractional frames, ${events} construction/ready events, ${chapterFrames} contiguous chapter frames, ${commissioningFrames} narrated commissioning frames, ${sanitized} sanitized invalid cases, ${frozen} immutable finite objects checked; legacy and fully used costs preserved.`);
