// Conservative teaching model, not reactor kinetics or a cooling-system design.
// Power is in arbitrary units per teaching step; cumulative quantities are
// energies in arbitrary units. No step is a physical second or hour.
// NRC PWR: https://www.nrc.gov/reactors/power/pwrs
// DOE decay-heat discussion: https://www.energy.gov/documents/doe-hdbk-1012-92vol2
// The initial 7% and one exponential are illustrative, not a calibrated decay
// curve. Real decay heat depends on irradiation history and many radionuclides.
const END=24,SHUTDOWN_STEP=5,DEFERRED_PERCENT=7,DECAY_RATE=.2;

function parameters(p){
 const params={power:p.power??100,efficiency:p.efficiency??33,stop:!!(p.stop??true)};
 if(!Number.isFinite(params.power)||params.power<20||params.power>100)
  throw new RangeError('Illustrative thermal power must be between 20 and 100.');
 if(!Number.isFinite(params.efficiency)||params.efficiency<20||params.efficiency>40)
  throw new RangeError('Illustrative electrical efficiency must be between 20 and 40 percent.');
 return params;
}
function boundedTime(value,horizon){
 const numeric=Number(value);
 return Number.isNaN(numeric)?0:Math.max(0,Math.min(horizon,numeric));
}

export function buildNuclearTrace(p={},horizon=END){
 if(!Number.isFinite(horizon)||!Number.isInteger(horizon)||horizon<0||horizon>END)
  throw new RangeError('Nuclear horizon must be an integer from 0 to 24.');
 const trace={params:parameters(p),horizon,states:[]};
 trace.states=Array.from({length:horizon+1},(_,time)=>sampleNuclear(trace,time));
 return trace;
}

export function sampleNuclear(trace,value){
 const time=boundedTime(value,trace.horizon),completed=Math.floor(time);
 const {power,efficiency,stop}=trace.params;
 const stopped=stop&&time>=SHUTDOWN_STEP;
 const operatingTime=stop?Math.min(time,SHUTDOWN_STEP):time;
 const afterShutdown=stopped?time-SHUTDOWN_STEP:0;
 const decayAtShutdown=power*DEFERRED_PERCENT/100;
 // This bank is nuclear energy still to be released by radioactive products,
 // NOT stored thermal heat, temperature, coolant or the amount of fuel.
 // It starts in an illustrative equilibrium established before the visit.
 const initialPending=decayAtShutdown/DECAY_RATE;
 const survival=Math.exp(-DECAY_RATE*afterShutdown);
 const pending=initialPending*survival;
 const sourcePower=stopped?0:power;
 // Legacy `fission` denotes the immediate heat component, not all energy
 // created by fission. The deferred source is the remainder of sourcePower.
 const fission=stopped?0:power-decayAtShutdown;
 const decay=decayAtShutdown*survival;
 const heat=fission+decay;
 // Deliberate teaching convention: the generator is tripped at shutdown;
 // ideal heat removal continues. Thermal inertia and auxiliary power are
 // omitted; these values are not a universal turbine shutdown transient.
 const electric=stopped?0:power*efficiency/100;
 const rejected=heat-electric;
 const source=power*operatingTime;
 const prompt=(power-decayAtShutdown)*operatingTime;
 const createdDeferred=decayAtShutdown*operatingTime;
 // expm1 retains the small released energy immediately after the stop.
 const decayEnergy=createdDeferred+initialPending*(-Math.expm1(-DECAY_RATE*afterShutdown));
 const heatEnergy=prompt+decayEnergy;
 const electricEnergy=power*efficiency/100*operatingTime;
 const cumulative={source,prompt,createdDeferred,decay:decayEnergy,heat:heatEnergy,
  electric:electricEnergy,rejected:heatEnergy-electricEnergy,pending,initialPending};
 return {time,t:time,continuous:true,completed,progress:time-completed,active:time<trace.horizon,
  phase:stopped?'shutdown':'operating',stopped,fission,sourcePower,decay,heat,electric,rejected,
  rodsInsertion:stopped?1:0,operatingTime,phaseTime:stopped?afterShutdown:time,cumulative};
}

// Preserve the lesson's public entry point without building 25 unused states.
// Fractional times and bounds follow the same reversible 0..24 trace contract.
export function heatBalance(p={},time=0){
 return sampleNuclear({params:parameters(p),horizon:END},time);
}
