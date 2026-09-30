import assert from 'node:assert/strict';
import {buildGridTrace,sampleGrid,lineAtPower,gridRun} from './site-src/journeys/electricity-model.js';

const defaults={sun:28,demand:22,voltage:200};
const near=(a,b,context='',tolerance=1e-8)=>assert(Math.abs(a-b)<=tolerance,`${context}: ${a} != ${b}`);
const cumulative={energyGenerated:'generated',energyServed:'served',energyLoss:'loss',energyCurtailed:'curtailed',energyPotential:'potential',energyUnserved:'unserved',energyCharge:'charge',energyDischarge:'discharge'};
function checkState(state,params){
 near(10+state.energyGenerated,state.energyServed+state.energyLoss+state.stored,'energy conservation including initial battery');
 near(state.energyPotential,state.energyGenerated+state.energyCurtailed,'potential energy ledger');
 near(params.demand*state.time,state.energyServed+state.energyUnserved,'requested energy ledger');
 near(state.stored-10,state.energyCharge-state.energyDischarge,'battery energy ledger');
 assert(state.stored>=-1e-9&&state.stored<=20+1e-9);
 for(const field of ['time','stored',...Object.keys(cumulative)])assert(Number.isFinite(state[field])&&state[field]>=-1e-9,`Finite non-negative snapshot ${field}`);
}
function inspect(trace){
 assert.equal(trace.states.length,trace.horizon+1);assert.equal(trace.hours.length,trace.horizon);
 assert.equal(trace.states[0].time,0);assert.equal(trace.states[0].stored,10);
 for(const field of Object.keys(cumulative))assert.equal(trace.states[0][field],0);
 for(const [i,h] of trace.hours.entries()){
  assert.equal(h.hour,i);assert.equal(h.storedBefore,trace.states[i].stored);assert.equal(h.before,h.storedBefore);assert.equal(h.stored,h.storedAfter);assert.equal(h.available,h.received);
  for(const [field,value] of Object.entries(h))assert(Number.isFinite(value)&&value>=-1e-9,`Finite non-negative interval ${field}`);
  near(h.potential,h.solarPotential+h.windPotential,'available source powers');near(h.generated,h.solar+h.wind,'dispatched source powers');
  near(h.potential,h.generated+h.curtailed,'source curtailment');near(h.generated+h.discharge,h.loss+h.served+h.charge,'bus power conservation');
  near(h.generated-h.loss,h.received,'receiving-side power');near(h.demand,h.served+h.unserved,'demand power ledger');
  near(h.storedAfter-h.storedBefore,h.charge-h.discharge,'storage change per hour');
  assert(h.generated<=h.potential+1e-9&&h.solar<=h.solarPotential+1e-9&&h.wind<=h.windPotential+1e-9);
  assert(h.loss<=h.generated+1e-9&&h.served<=h.demand+1e-9);
  assert(h.charge<=6+1e-9&&h.discharge<=6+1e-9);assert(!(h.charge>0&&h.discharge>0),'No simultaneous charging and discharging');
  assert(h.charge<=20-h.storedBefore+1e-9&&h.discharge<=h.storedBefore+1e-9,'Storage exchange is bounded by room or stock');
  if(h.curtailed>1e-9)assert(h.current<(h.potential*1000/trace.params.voltage),'Curtailed power is not transported');
  const next=trace.states[i+1];assert.equal(next.time,i+1);near(next.stored,h.storedAfter);
  for(const [field,power] of Object.entries(cumulative))near(next[field]-trace.states[i][field],h[power],`Integrated ${field}`);
 }
 for(const state of trace.states)checkState(state,trace.params);
}

// Every joint slider setting: 41 solar x 36 demand x 36 voltage positions.
let cases=0;
for(let sun=0;sun<=40;sun++)for(let demand=10;demand<=45;demand++)for(let voltage=50;voltage<=400;voltage+=10){
 inspect(buildGridTrace({sun,demand,voltage}));cases++;
}
assert.equal(cases,53136);

// Physics comparisons keep the transported power fixed, avoiding dispatch or
// battery differences that would invalidate the exact inverse-square comparison.
for(const power of [0,8,30,44]){
 const low=lineAtPower(power,50),high=lineAtPower(power,100);
 near(low.current,2*high.current,'doubling voltage halves current');near(low.loss,4*high.loss,'doubling voltage quarters heating');
 near(low.received+low.loss,power,'fixed-power line energy');
}
near(lineAtPower(30,50).current,600);near(lineAtPower(30,50).loss,7.2);near(lineAtPower(30,100).current,300);near(lineAtPower(30,100).loss,1.8);
assert.deepEqual(lineAtPower(0,200),{current:0,loss:0,received:0});

const trace=buildGridTrace(defaults),saved=JSON.stringify(trace),params={...defaults};buildGridTrace(params);assert.deepEqual(params,defaults,'Controls are never mutated');
assert.deepEqual(buildGridTrace(defaults),trace,'The deterministic day replays');
const start=sampleGrid(trace,0);assert.equal(start.stored,10);assert.equal(start.completed,0);assert.equal(start.progress,0);assert(start.active);assert.strictEqual(start.interval,trace.hours[0]);
near(start.generated,8);near(start.received,7.968);near(start.discharge,6);near(start.served,13.968);near(start.unserved,8.032);
const middle=sampleGrid(trace,.5);near(middle.stored,7);near(middle.energyGenerated,4);near(middle.energyServed,6.984);near(middle.energyLoss,.016);
near(sampleGrid(trace,1).stored,4);near(sampleGrid(trace,2).stored,0);assert.equal(sampleGrid(trace,1).hour,1);

for(const params of [defaults,{sun:0,demand:45,voltage:50},{sun:40,demand:10,voltage:400},{sun:40,demand:45,voltage:100}]){
 const day=buildGridTrace(params);
 for(let hour=0;hour<24;hour++)for(const fraction of [0,.01,.37,.5,.999999]){
  const time=hour+fraction,s=sampleGrid(day,time),h=day.hours[hour],base=day.states[hour];
  assert.equal(s.completed,hour);assert.equal(s.hour,hour);near(s.continuous,time);near(s.progress,fraction);assert(s.active);assert.strictEqual(s.interval,h);
  for(const power of ['generated','current','loss','received','served','unserved','charge','discharge','curtailed'])assert.equal(s[power],h[power],'Power stays constant within an hourly interval');
  near(s.stored,base.stored+(h.charge-h.discharge)*fraction,'Fractional battery update');
  for(const [field,power] of Object.entries(cumulative))near(s[field],base[field]+h[power]*fraction,`Fractional ${field}`);
  checkState(s,params);assert.deepEqual(s,sampleGrid(day,time),'Repeated paused sample is identical');
 }
 for(const time of [24,25,Infinity]){
  const end=sampleGrid(day,time);assert.equal(end.completed,24);assert.equal(end.continuous,24);assert.equal(end.progress,0);assert.equal(end.hour,23);assert.equal(end.active,false);assert.strictEqual(end.interval,day.hours[23]);
  for(const field of Object.keys(day.states[24]))assert.equal(end[field],day.states[24][field]);
 }
 for(const time of [-5,-Infinity,NaN]){assert.equal(sampleGrid(day,time).continuous,0);assert.equal(sampleGrid(day,time).stored,10);}
}
// Seeking backwards, reordering samples and pausing cannot change the trace.
for(const time of [21.7,0,24,12.5,1,19.2,.5,4,21.7])sampleGrid(trace,time);
assert.equal(JSON.stringify(trace),saved);
assert.deepEqual(buildGridTrace(defaults,7).hours,trace.hours.slice(0,7),'A shorter horizon preserves the day prefix');

// Full storage causes generation curtailment at the source, not a dump load
// downstream. The dispatched current/loss follow only the actual ~10 MW output.
const surplus=buildGridTrace({sun:40,demand:10,voltage:200}).hours[12];
assert.equal(surplus.storedBefore,20);assert.equal(surplus.charge,0);assert.equal(surplus.discharge,0);
near(surplus.potential,44.01534156465664);near(surplus.generated,10.050506338833465);near(surplus.loss,.05050633883346584);near(surplus.curtailed,33.96483522582317);near(surplus.served,10);
assert(surplus.loss<lineAtPower(surplus.potential,200).loss/10,'Curtailment does not incur loss on ungenerated power');
near(surplus.solar/surplus.solarPotential,surplus.wind/surplus.windPotential,'Explicit proportional dispatch policy');
assert(trace.hours.filter(h=>h.hour<=6||h.hour>=18).every(h=>h.solarPotential===0&&h.solar===0),'Solar generation is zero at night');
const emptyBattery=trace.hours[2];assert.equal(emptyBattery.storedBefore,0);assert.equal(emptyBattery.discharge,0);assert(emptyBattery.unserved>0);

for(const hours of [0,.5,1,12,23,24,100,Infinity])assert.deepEqual(gridRun(defaults,hours),trace.hours.slice(0,Math.min(23,Math.floor(hours))+1),'Inclusive legacy hour-record API');
for(const hours of [-1,NaN,-Infinity])assert.deepEqual(gridRun(defaults,hours),[]);
const zero=buildGridTrace(defaults,0);assert.equal(zero.states.length,1);assert.equal(zero.hours.length,0);assert.equal(sampleGrid(zero,0).stored,10);assert.equal(sampleGrid(zero,0).active,false);assert.equal(sampleGrid(zero,0).interval,null);
assert.throws(()=>buildGridTrace({...defaults,sun:-1}),RangeError);assert.throws(()=>buildGridTrace({...defaults,voltage:0}),RangeError);assert.throws(()=>buildGridTrace(defaults,25),RangeError);assert.throws(()=>buildGridTrace({...defaults,voltage:10}),RangeError);
assert.throws(()=>lineAtPower(-1,200),RangeError);assert.throws(()=>lineAtPower(30,0),RangeError);
console.log(`Electricity: ${cases} joint slider settings, hourly and cumulative energy ledgers, source-side curtailment, inverse dispatch, storage limits, fractional seek/pause, fixed-power voltage comparison and 0–24 hour boundaries: OK`);
