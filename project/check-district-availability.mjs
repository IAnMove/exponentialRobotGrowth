import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{simulateIndustry}=require('./industrial-model.js');
const bundles=await Promise.all(['','es/','robots/','es/robots/'].map(prefix=>import('./dist/'+prefix+'activity.js')));
const inputs=[[],[0],[1],[1],[1],[1],[2,3,4,5],[6],[7]],counts={};let frames=0,statuses=0,changedHistory=0;
for(const policy of ['none','assembly','network'])for(const expansion of [false,true]){
 const run=simulateIndustry(policy,expansion,30),before=JSON.stringify(run);
 for(const f of run.frames){frames++;for(let i=0;i<9;i++){
  const result=bundles.map(({processStatus})=>processStatus(f,null,i)),s=result[0],cap=f.capacity[i],stock=inputs[i].length?Math.min(...inputs[i].map(k=>f.inventory[k])):Infinity;
  statuses++;counts[s.code]=(counts[s.code]||0)+1;
  for(const r of result){assert.equal(r.code,s.code);assert.equal(r.color,s.color);assert.equal(r.rate,f.flow[i]);}
  const enoughForSelf=stock>=cap,poolDemand=f.capacity.slice(2,6).reduce((n,c)=>n+c,0),constructing=!!f.projects[i]&&f.active[i]>0;
  switch(s.code){
   case 'rest':assert(cap<=0&&!constructing);break;
   case 'waiting':assert(cap>0&&inputs[i].some(k=>f.inventory[k]===0));break;
   case 'supply':assert(cap>0&&stock>0&&stock<cap);break;
   case 'shared':assert(cap>0&&enoughForSelf&&i>=2&&i<=5&&stock<poolDemand);break;
   case 'building':assert(constructing&&(cap<=0||enoughForSelf));break;
   case 'full':assert(cap>=f.hardware[i]&&enoughForSelf&&!constructing);break;
   case 'ready':assert(cap>0&&cap<f.hardware[i]&&enoughForSelf&&!constructing);break;
   default:assert.fail('Unknown current availability '+s.code);
  }
  if(cap>0&&enoughForSelf&&i>=2&&i<=5&&stock<poolDemand)assert.equal(s.code,'shared');
  const altered={...f,flow:Array(9).fill(999),worked:{hour:-999,cap:Array(9).fill(999),before:Array(8).fill(0)}};
  for(const {processStatus}of bundles){const changed=processStatus(altered,{flow:Array(9).fill(999)},i);assert.deepEqual({...changed,rate:0},{...processStatus(f,null,i),rate:0},'past/future output cannot alter resources available now');assert.equal(changed.rate,999,'observed output remains a separate channel');changedHistory++;}
 }}
 assert.equal(JSON.stringify(run),before,'availability never mutates the simulation');
}
for(const {processStatus}of bundles){
 const human=simulateIndustry('none',false),initial=human.frames[0];
 for(let i=0;i<9;i++){assert.equal(processStatus(initial,null,i).code,'ready');assert.equal(processStatus(initial,null,i).rate,0);}
 const shift=human.frames[6];assert.equal(shift.hour,14);assert.equal(shift.flow[0],0);assert.equal(processStatus(shift,null,0).code,'ready','staff returning after lunch is ready without inventing completed output');
 const lunch=human.frames[4];assert(lunch.flow[0]>0);assert.equal(processStatus(lunch,null,0).code,'rest','past production cannot supply a current shift');
 const built=structuredClone(initial);built.capacity[0]=0;built.active[0]=2;built.projects[0]={progress:1,required:12};assert.equal(processStatus(built,null,0).code,'building','robots reserved for construction are not described as off shift');
 const shared=simulateIndustry('network',true,30).frames[94];assert.equal(shared.inventory[1],25);assert.equal(shared.capacity.slice(2,6).reduce((n,c)=>n+c,0),34);for(let i=2;i<=5;i++)assert.equal(processStatus(shared,null,i).code,'shared');
}
assert(Object.keys(counts).length===7);console.log(JSON.stringify({check:'district availability',frames,statuses,bundles:bundles.length,changedHistory,counts,initial:'ready with zero completed output',shift:'current crew',shared:'pool shortage without predicting allocation',immutable:true}));
