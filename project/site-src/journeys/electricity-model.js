import {clamp} from './common.js';

const RESISTANCE=20,CAPACITY=20,POWER_LIMIT=6,INITIAL_STORED=10,EPSILON=1e-10;
const ENERGY_FIELDS={energyGenerated:'generated',energyServed:'served',energyLoss:'loss',energyCurtailed:'curtailed',energyPotential:'potential',energyUnserved:'unserved',energyCharge:'charge',energyDischarge:'discharge'};
const clean=x=>Math.abs(x)<EPSILON?0:x;

// Equivalent unity-power-factor AC circuit: RMS voltage in kV, power in MW,
// current in A and resistive loss in MW. This is not a three-phase load flow.
export function lineAtPower(powerMW,voltageKV){
 if(!Number.isFinite(powerMW)||powerMW<0||!Number.isFinite(voltageKV)||voltageKV<=0)throw new RangeError('Line power must be non-negative and voltage must be positive.');
 const current=powerMW*1000/voltageKV,loss=current*current*RESISTANCE/1e6,received=powerMW-loss;
 if(received<-EPSILON)throw new RangeError('Requested line power exceeds the equivalent circuit operating range.');
 return {current,loss,received:clean(received)};
}

function initialState(){return {time:0,stored:INITIAL_STORED,...Object.fromEntries(Object.keys(ENERGY_FIELDS).map(field=>[field,0]))};}

export function buildGridTrace(p={},horizon=24){
 const params={sun:p.sun??28,demand:p.demand??22,voltage:p.voltage??200};
 if(!Number.isFinite(params.sun)||params.sun<0||!Number.isFinite(params.demand)||params.demand<0||!Number.isFinite(params.voltage)||params.voltage<=0)throw new RangeError('Solar power and demand must be non-negative; transmission voltage must be positive.');
 if(!Number.isFinite(horizon)||horizon<0||horizon>24)throw new RangeError('The daily horizon must be between zero and 24 hours.');
 horizon=Math.floor(horizon);
 const states=[initialState()],hours=[];
 for(let hour=0;hour<horizon;hour++){
  const before=states.at(-1),storedBefore=before.stored;
  // Synthetic profiles. Values are hourly mean powers, not measured weather.
  const solarPotential=hour>6&&hour<18?params.sun*Math.sin((hour-6)*Math.PI/12):0;
  const windPotential=8+4*Math.sin(hour*.4),potential=solarPotential+windPotential;
  const a=RESISTANCE/(params.voltage*params.voltage);
  // The inverse dispatch uses the increasing, positive-voltage-drop branch.
  // All lesson slider combinations remain below this limit (52 MW < 62.5 MW).
  if(potential>1/(2*a)+EPSILON)throw new RangeError('Potential generation exceeds the monotonic range of this teaching circuit.');
  const receivedPotential=lineAtPower(potential,params.voltage).received;
  const targetReceived=Math.min(receivedPotential,params.demand+Math.min(POWER_LIMIT,CAPACITY-storedBefore));
  const generated=targetReceived===receivedPotential?potential:Math.min(potential,2*targetReceived/(1+Math.sqrt(Math.max(0,1-4*a*targetReceived))));
  const {current,loss,received}=lineAtPower(generated,params.voltage);
  const excess=clean(received-params.demand),charge=Math.min(POWER_LIMIT,CAPACITY-storedBefore,Math.max(0,excess));
  const discharge=Math.min(POWER_LIMIT,storedBefore,Math.max(0,-excess));
  const supplied=received+discharge,served=Math.abs(supplied-params.demand)<EPSILON?params.demand:Math.min(params.demand,supplied),unserved=clean(params.demand-served);
  const curtailed=clean(Math.max(0,potential-generated)),storedAfter=clamp(storedBefore+charge-discharge,0,CAPACITY);
  // Explicit synthetic policy: solar and wind share dispatch/curtailment in
  // proportion to their available powers. Curtailment is never sent down-line.
  const solar=potential>0?generated*solarPotential/potential:0,wind=generated-solar;
  const record={hour,solarPotential,windPotential,potential,solar,wind,generated,curtailed,current,loss,received,available:received,demand:params.demand,served,unserved,charge,discharge,storedBefore,storedAfter,before:storedBefore,stored:storedAfter};
  hours.push(record);
  const state={time:hour+1,stored:storedAfter};
  // Each interval lasts one hour, so its mean MW adds the same number of MWh.
  for(const [field,power] of Object.entries(ENERGY_FIELDS))state[field]=before[field]+record[power];
  states.push(state);
 }
 return {params,horizon,states,hours};
}

export function sampleGrid(trace,time){
 const value=Number(time),continuous=clamp(Number.isNaN(value)?0:value,0,trace.horizon),completed=Math.floor(continuous),progress=continuous-completed;
 const start=trace.states[completed],end=trace.states[Math.min(completed+1,trace.horizon)],snapshot={time:continuous};
 for(const field of ['stored',...Object.keys(ENERGY_FIELDS)])snapshot[field]=start[field]+(end[field]-start[field])*progress;
 const interval=trace.hours[Math.min(completed,trace.horizon-1)]??null;
 const empty={hour:null,solarPotential:0,windPotential:0,potential:0,solar:0,wind:0,generated:0,curtailed:0,current:0,loss:0,received:0,available:0,demand:0,served:0,unserved:0,charge:0,discharge:0,storedBefore:INITIAL_STORED,storedAfter:INITIAL_STORED,before:INITIAL_STORED,stored:INITIAL_STORED};
 // Stock/cumulative fields override the interval's end-of-hour stored alias.
 // At the horizon, powers describe the last mean interval; active is false.
 return {...(interval??empty),...snapshot,completed,continuous,progress,interval,active:completed<trace.horizon};
}

// Legacy API: hour records from zero through the inclusive selected hour.
// Values use corrected source-side curtailment, not the old downstream surplus.
export function gridRun(p,hours=23){
 const end=Math.min(23,Math.floor(Number(hours)));if(Number.isNaN(end)||end<0)return [];
 return buildGridTrace(p,end+1).hours;
}
