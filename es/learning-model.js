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
export function explainConstraint(frame,next,industry){
 const cap=next?.worked?.cap?.[industry]??Math.floor(frame.capacity[industry]);
 const flow=next?.flow?.[industry]??frame.flow[industry];
 if(cap<=0)return {kind:frame.capacity[industry]>0?'working':'staff',industry,sources:[]};
 if(flow<cap&&CHAIN_INPUTS[industry].length){
  const inputs=CHAIN_INPUTS[industry],lowest=Math.min(...inputs.map(k=>frame.inventory[k]));
  return {kind:'inputs',industry,sources:inputs.filter(k=>frame.inventory[k]===lowest),flow,cap};
 }
 if(frame.capacity[industry]>=frame.hardware[industry])return {kind:'equipment',industry,sources:[],flow,cap};
 return {kind:'working',industry,sources:[],flow,cap};
}
