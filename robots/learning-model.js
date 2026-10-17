// Explanatory measurements, separate from the physical simulation.
export const IDEAL_DOUBLING=20;
export const idealFleet=(time,period=IDEAL_DOUBLING,start=24)=>start*2**(Math.max(0,time)/period);
export function recordDoublings(state){
 const total=state.fleet+state.exported;
 while(total>=24*2**(state.doublings.length+1)){
  const previous=state.doublings.at(-1)?.time??0;
  state.doublings.push({target:24*2**(state.doublings.length+1),time:state.time,duration:state.time-previous});
 }
}
export const CHAIN_INPUTS=[[],[0],[1],[1],[1],[1],[2,3,4,5],[6],[7]];
// Diagnose the interval already credited to this snapshot. The legacy next
// argument is deliberately ignored: future production is not an explanation.
export function explainConstraint(frame,next,industry){
 const worked=frame.worked,flow=Number(frame.flow[industry])||0,sources=[];
 if(!worked)return {kind:'initial',industry,sources,flow,cap:0};
 const cap=worked.cap[industry],available=worked.active[industry]+worked.humansWorking[industry]-worked.builders[industry];
 if(cap<=0)return {kind:available>0?'partial':worked.builders[industry]>0?'building':'staff',industry,sources,flow,cap};
 if(flow<cap&&CHAIN_INPUTS[industry].length){
  const inputs=CHAIN_INPUTS[industry],lowest=Math.min(...inputs.map(k=>worked.before[k]));
  return {kind:'inputs',industry,sources:inputs.filter(k=>worked.before[k]===lowest),flow,cap};
 }
 // A module opened at this boundary was unavailable during the credited hour.
 const hardware=frame.hardware[industry]-(frame.opened?.includes(industry)?3:0);
 return {kind:cap>=hardware?'equipment':'working',industry,sources,flow,cap};
}
