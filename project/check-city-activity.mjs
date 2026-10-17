import assert from 'node:assert/strict';
import {createCity,tickCity,STEP,recentCityTasks} from './site-src/city-model.js';
import {createRobotTrace,robotFrameAt} from './site-src/robot-trace.js';

const readers=[recentCityTasks];
for(const prefix of ['','es/','robots/','es/robots/'])readers.push((await import('./dist/'+prefix+'city-model.js')).recentCityTasks);
const cases=[
 {scenario:3,share:.35},{scenario:3,share:0},{scenario:3,share:.1},{scenario:3,share:1},
 ...[0,1,2].map(scenario=>({scenario,share:.35})),
 {scenario:3,share:.35,events:[{time:20.5,type:'share',value:.1},{time:70,type:'share',value:.8},{time:150,type:'share',value:0},{time:180,type:'share',value:1}]}
];
let frames=0,reads=0,oldErrors=0,reserveOnly=0,rewinds=0;
for(const {events=[],...params} of cases){
 const trace=createRobotTrace('city',params,events),state=createCity(params.scenario,params.share),coverage=[0],receipts=[0];
 // Independent oracle: retain every actual engine tick, unlike the chart history.
 for(let tick=0;tick<=trace.horizon/STEP;tick++){
  for(const e of events)if(e.time===tick*STEP)state.share=e.value;
  if(tick===trace.horizon/STEP)break;
  tickCity(state);coverage.push(state.assigned.reduce((a,b)=>a+b,0));receipts.push(state.received);
 }
 const inspect=time=>{
  const frame=robotFrameAt(trace,time),tick=frame.tick,start=Math.max(0,tick-10/STEP),expected=coverage[tick]-coverage[start];
  assert.equal(frame.state.assigned.reduce((a,b)=>a+b,0),coverage[tick],'canonical task count matches the independent engine');
  for(const read of readers){assert.equal(read(frame.identities.assignments,frame.sampledTime),expected);reads++;}
  const previous=frame.state.history.filter(h=>h.time<=frame.sampledTime-10).at(-1);
  if(coverage[tick]-(previous?.covered??0)!==expected)oldErrors++;
  if(!expected&&receipts[tick]>receipts[start]&&frame.state.available>0)reserveOnly++;
  frames++;return {frame,expected};
 };
 for(let tick=0;tick<=trace.horizon/STEP;tick++){
  inspect(tick*STEP);
  if(tick<trace.horizon/STEP&&tick%7===0)inspect(tick*STEP+.03);
 }
 for(let tick=trace.horizon/STEP;tick>=0;tick-=17){inspect(tick*STEP);rewinds++;}
 const end=robotFrameAt(trace,trace.horizon);
 for(const event of end.identities.assignments.slice(0,12)){
  for(const time of [event.assignedAt+10-.01,event.assignedAt+10,event.assignedAt+10+.01])if(time<=trace.horizon)inspect(time);
 }
 // A future assignment must never leak into the counter, even if supplied.
 for(const read of readers)assert.equal(read(Object.freeze([{assignedAt:4,count:3},{assignedAt:4.125,count:2},{assignedAt:14,count:5},{assignedAt:14.125,count:99}].map(Object.freeze)),14),7);
}
assert(oldErrors>100,'the check reproduces the coarse-history bug at many actual instants');
assert(reserveOnly>100,'delivered reserve robots are distinct from newly covered tasks');
console.log(`City activity OK: ${cases.length} real scenarios, ${frames} exact/fractional/boundary frames, ${reads} source/bundle reads, ${rewinds} reverse seeks; ${oldErrors} old-window errors reproduced, ${reserveOnly} reserve-only frames.`);
