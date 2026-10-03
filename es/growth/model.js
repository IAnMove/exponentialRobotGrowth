// Conservation model for a hypothetical automatable task. Work, prices and days are
// editable teaching assumptions, not humanoid measurements or adoption forecasts.
function freeze(value){
 if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
 for(const child of Object.values(value))freeze(child);
 return Object.freeze(value);
}
export const defaults=freeze({days:90,hours:21,shifts:1,reinvest:.7,buildHours:240,slots:100,supply:1500,limited:true,wage:25,installed:60000,life:5,service:3000,power:1,energy:.2,supervision:20,material:8});
// The default first batch closes at day 2; its two full commissioning days are
// shown in chapter 3 before it becomes productive at day 4.
export const GROWTH_CHAPTER_BOUNDS=freeze([0,1/90,1.5/90,2/90,4/90,1,1]);
export const GROWTH_CHAPTER_IDS=freeze(['same-task','hours','reinvestment','commissioning','fleet','cost']);
function numeric(value,fallback){
 if(value===null||typeof value==='boolean'||(typeof value!=='number'&&typeof value!=='string')||(typeof value==='string'&&!value.trim()))return fallback;
 const n=Number(value);return Number.isFinite(n)?n:fallback;
}
export function cleanGrowthState(raw=defaults){
 const source=raw&&typeof raw==='object'?raw:{};
 const value=(key,min,max,whole=false)=>{const n=Math.max(min,Math.min(max,numeric(source[key],defaults[key])));return whole?Math.floor(n):n;};
 return freeze({
  days:value('days',0,90,true),hours:value('hours',1,24),shifts:value('shifts',1,3,true),
  reinvest:value('reinvest',0,1),buildHours:value('buildHours',120,960),slots:value('slots',0,200,true),supply:value('supply',0,4000),
  limited:typeof source.limited==='boolean'?source.limited:defaults.limited,
  wage:value('wage',0,200),installed:value('installed',0,500000),life:value('life',1,20),service:value('service',0,100000),
  power:value('power',0,50),energy:value('energy',0,2),supervision:value('supervision',0,1000),material:value('material',0,1000)
 });
}
function run(raw){
 const p=cleanGrowthState(raw),initialFleet=p.limited?Math.min(10,p.slots):10;
 let fleet=initialFleet,bank=0,pending=[],made=0,goods=0,humanTotal=0,fixedTotal=0,workTotal=0,buildTotal=0;
 const rows=[],batches=[];
 for(let day=0;day<=p.days;day++){
  fleet+=pending.filter(batch=>batch.readyDay===day).reduce((n,batch)=>n+batch.count,0);
  pending=pending.filter(batch=>batch.readyDay>day);
  const pendingCount=pending.reduce((n,batch)=>n+batch.count,0);
  const supply=p.limited?p.supply:Infinity;
  // The fixed ten-robot reference is separate from the growing line's installed slots.
  // Supply/work-equivalent limits apply equally to all three scenarios; slots never cap people.
  const human=Math.min(10*8*p.shifts,supply),fixed=Math.min(10*p.hours,supply),work=Math.min(fleet*p.hours,supply);
  const room=p.limited?Math.max(0,p.slots-fleet-pendingCount):Infinity;
  const buildWork=Math.min(work*p.reinvest,Math.max(0,room*p.buildHours-bank)),output=work-buildWork;
  rows.push({day,fleet,human,fixed,output,goods,goodsToDate:goods+output,humanTotal,humanToDate:humanTotal+human,fixedTotal,fixedToDate:fixedTotal+fixed,made,bank,pending:pendingCount,work,buildWork,workTotal,buildTotal,limited:work+1e-6<fleet*p.hours});
  if(day===p.days)break;
  goods+=output;humanTotal+=human;fixedTotal+=fixed;workTotal+=work;buildTotal+=buildWork;
  const credit=bank+buildWork;
  // Only correct round-off within a few machine ulps at an integer construction boundary.
  const tolerance=8*Number.EPSILON*Math.max(1,credit,p.buildHours);
  const count=Math.floor((credit+tolerance)/p.buildHours);
  bank=credit-count*p.buildHours;
  if(bank<0&&bank>=-tolerance)bank=0;
  if(count){
   const idStart=initialFleet+made;
   const batch={id:`batch-${day}`,builtDay:day,completedAt:day+1,readyDay:day+3,count,idStart,idEnd:idStart+count};
   batches.push(batch);pending.push(batch);made+=count;
  }
 }
 return {params:p,initialFleet,rows,batches};
}
// Legacy rows retain their original definition: counters at the START of each day,
// plus its full planned work and goodsToDate. Frame elapsed counters never use ToDate early.
export function simulate(p=defaults){return freeze(run(p).rows);}
export function unitCosts(raw=defaults){
 const p=cleanGrowthState(raw),depreciation=p.installed/(p.life*365),service=p.service/365,supervision=p.supervision,energy=p.power*p.energy*p.hours;
 const robotDaily=depreciation+service+supervision+energy;
 return freeze({human:p.material+p.wage,robot:p.material+robotDaily/p.hours,robotDaily});
}
// Ideal divisible capacity with instantaneous commissioning and no bottlenecks.
export function idealDoubling(raw=defaults){
 const p=cleanGrowthState(raw);return p.reinvest>0?Math.log(2)/Math.log1p(p.reinvest*p.hours/p.buildHours):Infinity;
}
export function createGrowthTrace(raw=defaults){
 const result=run(raw),{params,rows,batches,initialFleet}=result;
 const events=batches.flatMap(batch=>[
  {id:`${batch.id}-built`,type:'built',time:batch.completedAt,batchId:batch.id,count:batch.count,idStart:batch.idStart,idEnd:batch.idEnd},
  {id:`${batch.id}-ready`,type:'ready',time:batch.readyDay,batchId:batch.id,count:batch.count,idStart:batch.idStart,idEnd:batch.idEnd}
 ]).sort((a,b)=>a.time-b.time||(a.type==='ready'?-1:1));
 const ideal=idealDoubling(params);
 const milestones=initialFleet>0?[2,4,8,16,32,64].flatMap(factor=>{const row=rows.find(r=>r.fleet>=initialFleet*factor);return row?[{time:row.day,factor,fleet:row.fleet,threshold:initialFleet*factor}]:[];}):[];
 return freeze({
  ...result,horizon:params.days,intervals:rows.slice(0,params.days),events,milestones,
  seedRange:{idStart:0,idEnd:initialFleet,count:initialFleet},fixedFleet:10,humanWorkers:10*params.shifts,
  costs:unitCosts(params),idealDoubling:Number.isFinite(ideal)?ideal:null,
  scope:{
   work:'One generic good per effective working hour for either person or robot. Building uses the same work-equivalent resource; no detailed autonomous supply chain is assumed.',
   fractions:'Uniform interpolation of a day budget, not a physical shift schedule. Whole robots are credited only at the day boundary.',
   commissioning:'Production day closes at builtDay+1, followed by two full days; active at builtDay+3.',
   costs:'Separate editable full-utilization cost scenario per unit; constant with fleet size, not used to fund construction.',
   days:'Example days, not a forecast of robot adoption.',
   fixed:'The fixed ten-robot reference uses the same supply limit but is separate from the growing line slot count.'
  }
 });
}
function budgetOf(row){return {human:row.human,fixed:row.fixed,work:row.work,growing:row.work,buildWork:row.buildWork,output:row.output};}
function checkedTrace(trace){if(!trace?.params||!Array.isArray(trace.rows)||!Number.isFinite(trace.horizon))throw new RangeError('A growth trace is required');return trace;}
function timeOf(trace,time){return Math.max(0,Math.min(trace.horizon,numeric(time,0)));}
export function growthFrameForDay(trace,dayProgress=0){
 checkedTrace(trace);
 const time=timeOf(trace,dayProgress),day=Math.min(trace.horizon,Math.floor(time)),dayFraction=time-day,active=time<trace.horizon;
 const row=trace.rows[day],potentialBudget=budgetOf(row),budget=active?potentialBudget:{human:0,fixed:0,work:0,growing:0,buildWork:0,output:0};
 const today={human:budget.human*dayFraction,fixed:budget.fixed*dayFraction,work:budget.work*dayFraction,growing:budget.work*dayFraction,buildWork:budget.buildWork*dayFraction,goods:budget.output*dayFraction};
 const elapsed={human:row.humanTotal+today.human,fixed:row.fixedTotal+today.fixed,work:row.workTotal+today.work,growing:row.workTotal+today.work,buildWork:row.buildTotal+today.buildWork,goods:row.goods+today.goods};
 const state={fleet:row.fleet,made:row.made,bank:row.bank,pending:row.pending},assemblyWork=today.buildWork,constructionCredit=state.bank+assemblyWork;
 const batches=trace.batches.filter(batch=>batch.completedAt<=time).map(batch=>{
  const commissioned=time>=batch.readyDay,commissioningElapsed=Math.max(0,Math.min(2,time-batch.completedAt));
  return {...batch,status:commissioned?'active':'commissioning',commissioned,commissioningElapsed,commissioningProgress:commissioningElapsed/2};
 });
 const constrained=trace.params.limited,supplyLimited=constrained&&row.work+1e-6<row.fleet*trace.params.hours,slotsFull=constrained&&row.fleet+row.pending>=trace.params.slots;
 return freeze({
  trace,params:trace.params,time,day,dayFraction,active,state,budget,potentialBudget,today,elapsed,
  fleet:state.fleet,made:state.made,pending:state.pending,bank:state.bank,assemblyWork,constructionCredit,
  construction:{nextRobotId:`robot-${trace.initialFleet+state.made}`,nextId:trace.initialFleet+state.made,carriedWork:state.bank,workToday:assemblyWork,credit:constructionCredit,fraction:Math.min(1,constructionCredit/trace.params.buildHours),awaitingDayClose:active&&constructionCredit>=trace.params.buildHours},
  batches,activeBatches:batches.filter(batch=>batch.commissioned),pendingBatches:batches.filter(batch=>!batch.commissioned),
  events:trace.events.filter(event=>event.time<=time),milestones:trace.milestones.filter(m=>m.time<=time),
  seedRange:trace.seedRange,fixedFleet:trace.fixedFleet,humanWorkers:trace.humanWorkers,
  ledger:{work:elapsed.work,goods:elapsed.goods,builtWork:state.made*trace.params.buildHours,carriedWork:state.bank,assemblyWork,buildWork:elapsed.buildWork},
  bottlenecks:{supply:supplyLimited,slots:slotsFull,noReinvestment:trace.params.reinvest===0,commissioning:state.pending>0},
  costs:trace.costs,idealDoubling:trace.idealDoubling
 });
}
export function growthFrameAt(trace,chapter=0,progress=0){
 checkedTrace(trace);
 const index=Math.floor(Math.max(0,Math.min(5,numeric(chapter,0)))),p=Math.max(0,Math.min(1,numeric(progress,0)));
 const start=GROWTH_CHAPTER_BOUNDS[index]*trace.horizon,end=GROWTH_CHAPTER_BOUNDS[index+1]*trace.horizon;
 return freeze({...growthFrameForDay(trace,start+(end-start)*p),chapter:index,chapterId:GROWTH_CHAPTER_IDS[index],progress:p,chapterStart:start,chapterEnd:end});
}
export function growthPositionForDay(trace,dayProgress,preferredChapter=4){
 checkedTrace(trace);const time=timeOf(trace,dayProgress),preferred=Math.floor(Math.max(0,Math.min(5,numeric(preferredChapter,4))));
 if(preferred===5&&time===trace.horizon)return freeze({chapter:5,progress:1});
 if(time===trace.horizon)return freeze({chapter:4,progress:1});
 const bounds=GROWTH_CHAPTER_BOUNDS.map(x=>x*trace.horizon);
 let chapter=preferred<5&&time>=bounds[preferred]&&time<=bounds[preferred+1]?preferred:bounds.slice(0,5).findIndex((start,i)=>time>=start&&time<bounds[i+1]);
 if(chapter<0)chapter=0;
 const span=bounds[chapter+1]-bounds[chapter];
 return freeze({chapter,progress:span?(time-bounds[chapter])/span:0});
}
