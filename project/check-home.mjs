import assert from 'node:assert/strict';
import {CHORES,DURATION,TASK_SECONDS,timeBudget,createHome,tickHome,homeSnapshot,makeHomeTrace,homeFrameAt} from './site-src/home/model.js';

// Independent stated scenario: these are illustrative active minutes, not
// measured robot performance or machine-cycle durations.
const MINUTES=[25,15,35,25,10,20,15],PREFIX=[0,25,40,75,100,110,130,145],TOTAL=145;
const IDS=['floor','dishes','cook','laundry','bed','bath','plan'];
const near=(actual,expected,message,epsilon=1e-8)=>assert(Number.isFinite(actual)&&Math.abs(actual-expected)<epsilon,message||`${actual} != ${expected}`);
assert.equal(DURATION,70);assert.equal(TASK_SECONDS,10);assert.deepEqual(CHORES.map(task=>task.id),IDS);assert.deepEqual(CHORES.map(task=>task.minutes),MINUTES);
let budgetOracles=0,frames=0;
for(const overhead of [0,20])for(let completed=0;completed<=7;completed++){
 const selected=new Set(IDS.slice(0,completed)),budget=timeBudget(CHORES,selected,overhead),support=PREFIX[completed]*overhead/100;
 assert.equal(budget.total,TOTAL);near(budget.delegated,PREFIX[completed]);near(budget.support,support);near(budget.freed,PREFIX[completed]-support);near(budget.remaining,TOTAL-PREFIX[completed]+support);near(budget.remaining+budget.freed,TOTAL);budgetOracles++;
}
// Compatibility remains explicit: legacy callers still see 145 at reset,
// 145/116 freed at the two finishes, and 0/29 human work required.
for(const overhead of [0,20]){
 const state=createHome(overhead);tickHome(state,3);assert.equal(state.time,0,'a paused legacy clock cannot advance');state.playing=true;
 for(const dt of [-1,NaN,Infinity]){const before=state.time;tickHome(state,dt);assert.equal(state.time,before,'invalid elapsed time is ignored');}
 tickHome(state,DURATION+1);const end=homeSnapshot(state);assert.equal(end.done,7);assert.equal(end.complete,true);assert.equal(state.playing,false);near(end.total,TOTAL);near(end.freed,overhead===0?145:116);near(end.remaining,overhead===0?0:29);near(end.support,overhead===0?0:29);
 assert.equal(homeSnapshot(createHome(overhead)).remaining,TOTAL);
}
for(const capacity of ['robots','human'])for(const overhead of [0,20]){
 const trace=makeHomeTrace({capacity,overhead}),initial=homeFrameAt(trace,0),originalTrace=JSON.stringify(trace),identities=initial.objects.map(object=>object.id).sort();
 assert.equal(initial.tasks.length,7);assert.deepEqual(initial.tasks.map(task=>task.id),IDS);assert.equal(new Set(identities).size,identities.length,'physical props have unique persistent identities');assert.equal(initial.objects.filter(object=>object.kind!=='document').length,45,'physical household props remain represented');assert.deepEqual(initial.objects.filter(object=>object.kind==='document').map(object=>object.id).sort(),['plan-approval','plan-draft','plan-input','plan-review'],'planning explicitly represents input, draft, review and approval, separately from the 45 physical props');assert.equal(identities.length,49);
 for(const time of [0,.4,2.5,4.9,7.35,9.999,10,12.7,19.999,20,27.4,30,39.999,40,47.95,50,58.4,60,69.999,70]){
  const frame=homeFrameAt(trace,time),completed=Math.min(7,Math.floor(time/10)),baseline=PREFIX[completed],support=capacity==='robots'?baseline*overhead/100:0,humanSpent=capacity==='human'?baseline:support,freed=capacity==='human'?0:baseline-support;
  assert.equal(frame.tasks.length,7);assert.deepEqual(frame.objects.map(object=>object.id).sort(),identities,'neither washing, cooking nor folding replaces props with unrelated objects');
  const ledger=frame.ledger;assert.equal(ledger.total,TOTAL);near(ledger.completedBaseline,baseline);near(ledger.pendingBaseline,TOTAL-baseline);near(ledger.support,support);near(ledger.humanSpent,humanSpent);near(ledger.freed,freed);near(ledger.humanRequired,TOTAL-freed);near(ledger.pendingBaseline+ledger.humanSpent+ledger.freed,TOTAL,'human work already spent is never reported as reclaimed time');
  assert.deepEqual(homeFrameAt(trace,time),frame,'fractional simulation time has a deterministic physical and accounting state');frames++;
 }
 const final=homeFrameAt(trace,DURATION);assert.equal(final.tasks.length,7);near(final.ledger.pendingBaseline,0);near(final.ledger.freed,capacity==='human'?0:overhead===0?145:116);near(final.ledger.humanSpent,capacity==='human'?145:overhead===0?0:29);
 const partial=homeFrameAt(trace,7.35);homeFrameAt(trace,DURATION);assert.deepEqual(homeFrameAt(trace,7.35),partial,'rewind reconstructs props and work instead of retaining completed future state');assert.equal(JSON.stringify(trace),originalTrace,'seek and replay never mutate the trace');
}
// Physical event timing is checked against independent Euclidean/surface
// geometry and the actual tool pose, rather than trusting a 'contact' label.
const dist=(a,b)=>Math.hypot(...a.map((value,i)=>value-b[i]));
function surfaceDistance(point,object){
 const delta=point.map((value,i)=>value-object.position[i]),angle=object.rotation?.[1]||0,c=Math.cos(angle),sn=Math.sin(angle),local=[delta[0]*c-delta[2]*sn,delta[1],delta[0]*sn+delta[2]*c];
 if(object.size)return Math.hypot(...local.map((value,i)=>Math.max(0,Math.abs(value)-object.size[i]/2)));
 return Math.max(0,dist(point,object.position)-(object.radius||0));
}
const physicalState=object=>({position:object.position,rotation:object.rotation,status:object.status,holder:object.holder,ready:object.ready,visible:object.visible});
let contactOracles=0,phaseOracles=0,futureOracles=0;
for(const capacity of ['robots','human']){
 const trace=makeHomeTrace({capacity,overhead:20}),initial=homeFrameAt(trace,0),initialById=new Map(initial.objects.map(object=>[object.id,object]));
 assert.equal(new Set(trace.contacts.map(contact=>contact.id)).size,trace.contacts.length,'contact events have stable distinct identities');
 for(const [i,contact] of trace.contacts.entries()){
  assert(Number.isFinite(contact.time)&&contact.time>=0&&contact.time<=70);assert(contact.point.every(Number.isFinite));assert(contact.radius>0);if(i)assert(trace.contacts[i-1].time<=contact.time);
  const frame=homeFrameAt(trace,contact.time),before=homeFrameAt(trace,contact.time-1e-6),target=frame.objects.find(object=>object.id===contact.targetId);assert(target,`contact target ${contact.targetId} is represented`);assert(frame.contacts.some(event=>event.id===contact.id));assert(!before.contacts.some(event=>event.id===contact.id),'a future contact cannot be exposed early');
  const effector=contact.tool==='vacuum'?frame.actors.vacuum.position:contact.tool==='cloth-tool'?frame.objects.find(object=>object.id==='cloth-tool').position:frame.actors[contact.actor].hands[contact.tool==='leftHand'?'left':'right'];
  assert(dist(effector,contact.point)<=contact.radius+1e-8,`${contact.id}: the visible effector reaches its declared contact`);assert(surfaceDistance(contact.point,target)<=contact.radius+1e-8,`${contact.id}: contact reaches the actual target surface`);
  if(target.kind==='dirt'||target.kind==='stain'){const old=before.objects.find(object=>object.id===target.id);assert.equal(old.ready,false,'dirt is not removed before tool contact');assert.equal(old.visible,true);assert.equal(target.ready,true);assert.equal(target.visible,false);}
  contactOracles++;
 }
 for(let i=0;i<7;i++)for(const local of [0,.35,1.2,2.7,4.35,6.8,8.9,9.999]){
  const time=i*10+local,frame=homeFrameAt(trace,time);assert.equal(frame.index,i);assert.equal(frame.tasks[i].status,'active');
  for(let j=0;j<7;j++){const task=frame.tasks[j];assert.equal(task.status,j<i?'completed':j===i?'active':'pending');near(task.phase,j<i?1:j>i?0:local/10);if(j>i){for(const object of frame.objects.filter(object=>object.taskId===IDS[j])){assert.deepEqual(physicalState(object),physicalState(initialById.get(object.id)),`pending ${IDS[j]} prop ${object.id} cannot show a future effect`);futureOracles++;}}}
  if(i<1)assert.equal(frame.appliances.dishwasher.running,false);if(i<2)assert.equal(frame.appliances.hob.on,false);if(i<3)assert.equal(frame.appliances.washerDryer.running,false);if(i<6)assert.equal(frame.planning.approved,false);phaseOracles++;
 }
 for(let i=0;i<7;i++){
  const garment=homeFrameAt(trace,37.49).objects.find(object=>object.id==='cloth-'+i);assert.equal(garment.dry,false);assert.equal(garment.folded,false,'a garment cannot be folded while its compressed drying cycle is pending');const after=homeFrameAt(trace,40).objects.find(object=>object.id==='cloth-'+i);assert.equal(after.dry,true);assert.equal(after.folded,true);assert.equal(after.form,'folded');assert.equal(after.holder,'foldboard');assert.equal(after.visible,true);
 }
 for(const time of [16.5,17.4,19.49]){const frame=homeFrameAt(trace,time);assert.equal(frame.appliances.dishwasher.running,true);assert.equal(frame.appliances.dishwasher.compressed,true);assert(frame.objects.filter(object=>/^plate-/.test(object.id)).every(object=>object.holder==='dishwasher'&&!object.ready));}
 for(const [time,stage] of [[34.5,'loading'],[35.5,'washing'],[36.5,'drying'],[37.7,'unloading']])assert.equal(homeFrameAt(trace,time).appliances.washerDryer.phase,stage);
 for(const [id,start,end] of [['plan-input',62,63],['plan-draft',63,66],['plan-review',66,68],['plan-approval',68,69.5]]){const prior=homeFrameAt(trace,start-1e-5).objects.find(object=>object.id===id),active=homeFrameAt(trace,start).objects.find(object=>object.id===id),ready=homeFrameAt(trace,end).objects.find(object=>object.id===id);assert.equal(prior.visible,false);assert.equal(prior.ready,false);assert.equal(active.visible,true);assert.equal(active.ready,false);assert.equal(active.status,'processing');assert.equal(ready.ready,true);}
 const end=homeFrameAt(trace,70);assert(end.objects.every(object=>object.ready),'every physical task result and the approval document finishes, preserving each identity');assert.equal(end.planning.approved,true);assert.equal(end.planning.approvalAssumed,capacity==='robots');assert.equal(end.planning.reviewer,capacity==='human'?'human':'human-support');
}
console.log(`Home physical model: ${contactOracles} independent tool/target/contact-time oracles, ${phaseOracles} seven-task phase states, ${futureOracles} pending-prop invariants, compressed wash/dry/cook and explicit draft/review/approval: OK`);
console.log(`Home model core: ${budgetOracles} independent fixed-minute budget oracles, ${frames} deterministic robot/human/supervision/fractional states, 45 physical prop IDs and four explicit planning document IDs and explicit legacy 145/116/0/29 accounting: OK`);
