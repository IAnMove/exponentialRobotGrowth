// A closed teaching model. One unit is carbon mass, not a CO2 molecule or a year.
export const INITIAL=Object.freeze({air:10,land:20,ocean:40,fossil:30});
export const RESERVOIRS=['air','land','ocean','fossil'];
export const FLUXES=[
 {id:'photosynthesis',from:'air',to:'land',name:['Fotosíntesis','Photosynthesis'],color:0x89e7b8},
 {id:'respiration',from:'land',to:'air',name:['Respiración y descomposición','Respiration and decay'],color:0xe8bd80},
 {id:'intoOcean',from:'air',to:'ocean',name:['Entrada al océano','Ocean uptake'],color:0x73d9ed},
 {id:'outOfOcean',from:'ocean',to:'air',name:['Salida del océano','Ocean release'],color:0xa7b5fa},
 {id:'emitted',from:'fossil',to:'air',name:['Combustión fósil','Fossil combustion'],color:0xf59688}
];
export function transfers(p,s,interval){return {
 emitted:Math.min(s.fossil,p.stop&&interval>10?0:p.emissions),
 photosynthesis:.02*s.air*p.uptake,respiration:.01*s.land,
 intoOcean:.02*s.air,outOfOcean:.005*s.ocean
};}
export function carbonRun(p,t=60){
 const states=[{...INITIAL,emitted:0,flows:null}];
 for(let interval=1;interval<=Math.max(0,Math.floor(t));interval++){
  const before=states.at(-1),flows=transfers(p,before,interval),after={...before,flows,emitted:flows.emitted};
  for(const f of FLUXES){after[f.from]-=flows[f.id];after[f.to]+=flows[f.id];}
  states.push(after);
 }
 return states;
}
export function carbonTrace(p,horizon=60){return {params:{...p},horizon,states:carbonRun(p,horizon)};}
export function sampleCarbon(trace,time){
 const continuous=Math.max(0,Math.min(trace.horizon,Number.isFinite(time)?time:0)),interval=Math.floor(continuous),progress=continuous-interval;
 const start=trace.states[interval],end=trace.states[Math.min(interval+1,trace.horizon)],state={};
 for(const id of RESERVOIRS)state[id]=start[id]+(end[id]-start[id])*progress;
 const flows=trace.states[interval+1]?.flows||transfers(trace.params,start,interval+1);
 const reason=state.fossil<1e-9?'empty':trace.params.emissions===0?'off':trace.params.stop&&interval>=10?'stopped':'active';
 return {...state,continuous,interval,progress,nextInterval:interval<trace.horizon?interval+1:null,flows,reason,
  netAir:flows.emitted-flows.photosynthesis+flows.respiration-flows.intoOcean+flows.outOfOcean,
  total:RESERVOIRS.reduce((sum,id)=>sum+state[id],0)};
}
// Cues approximate measured phrase pauses in the existing MiniMax recordings.
export function carbonStoryTime(chapter,progress,language='es'){
 const u=Math.max(0,Math.min(1,progress));
 if(chapter<3){const bounds=[[0,1],[1,5],[5,9]][chapter];return bounds[0]+u*(bounds[1]-bounds[0]);}
 const [duration,instruction,endInstruction,ceased]=language==='en'?[19.332,5.83,7.87,8.59]:[19.296,5.36,7.60,8.23];
 const knots=[[0,9],[instruction/duration,10],[endInstruction/duration,10],[ceased/duration,11],[1,60]];
 for(let i=1;i<knots.length;i++)if(u<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i];return x+(y-x)*(u-a)/(b-a);}
 return 60;
}
