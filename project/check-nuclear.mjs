import assert from 'node:assert/strict';
import {buildNuclearTrace,sampleNuclear,heatBalance} from './site-src/journeys/nuclear-model.js';

const near=(actual,expected,context='',tolerance=1e-9)=>assert(Math.abs(actual-expected)<=tolerance,
 `${context}: ${actual} != ${expected}`);
const powerFields=['fission','sourcePower','decay','heat','electric','rejected'];
const energyFields=['source','prompt','createdDeferred','decay','heat','electric','rejected','pending','initialPending'];
const times=[...Array.from({length:25},(_,i)=>i),.01,.37,1.9,4.999999,5.000001,5.75,7.25,12.5,23.999999];

function ledger(s){
 const e=s.cumulative;
 near(s.heat,s.fission+s.decay,'Immediate and decay heat add to total thermal power');
 near(s.heat,s.electric+s.rejected,'Instantaneous heat conversion ledger');
 near(e.source,e.prompt+e.createdDeferred,'Fission energy is either prompt or deferred');
 near(e.initialPending+e.source,e.heat+e.pending,'Nuclear energy ledger includes the initial bank');
 near(e.initialPending+e.createdDeferred,e.decay+e.pending,'Radioactive products account for all decay heat');
 near(e.heat,e.prompt+e.decay,'Integrated heat source ledger');
 near(e.heat,e.electric+e.rejected,'Integrated thermal conversion ledger');
 for(const name of powerFields)assert(Number.isFinite(s[name])&&s[name]>=0,`Finite non-negative power ${name}`);
 for(const name of energyFields)assert(Number.isFinite(e[name])&&e[name]>=0,`Finite non-negative energy ${name}`);
 assert(s.electric<=s.heat&&s.rejected<=s.heat,'The generator cannot convert more than all available heat');
}

let combinations=0,samples=0;
// All joint slider positions: 9 power x 21 efficiency x 2 shutdown settings.
for(let power=20;power<=100;power+=10)for(let efficiency=20;efficiency<=40;efficiency++)for(const stop of [false,true]){
 const p={power,efficiency,stop},original={...p},trace=buildNuclearTrace(p);
 const saved=JSON.stringify(trace),paused=new Map();
 assert.deepEqual(p,original,'Trace construction never mutates controls');
 assert.deepEqual(trace.params,p);assert.equal(trace.horizon,24);assert.equal(trace.states.length,25);
 assert.equal(trace.states[0].time,0);
 for(const name of energyFields.filter(name=>name!=='initialPending'&&name!=='pending'))assert.equal(trace.states[0].cumulative[name],0);
 near(trace.states[0].cumulative.pending,power*.35,'The initial bank is already present at time zero');
 for(const time of times){
  const s=sampleNuclear(trace,time),stopped=stop&&time>=5;
  assert.equal(s.time,time);assert.equal(s.t,time);assert.equal(s.completed,Math.floor(time));
  near(s.progress,time-Math.floor(time));assert.equal(s.continuous,true);assert.equal(s.active,time<24);
  assert.equal(s.phase,stopped?'shutdown':'operating');assert.equal(s.stopped,stopped);
  assert.equal(s.rodsInsertion,stopped?1:0);near(s.operatingTime,stop?Math.min(time,5):time);
  near(s.phaseTime,stopped?time-5:time);
  if(stopped){
   assert.equal(s.sourcePower,0);assert.equal(s.fission,0);assert.equal(s.electric,0);
   near(s.heat,s.decay);near(s.rejected,s.decay);
   near(s.cumulative.source,power*5);near(s.cumulative.electric,power*efficiency/100*5);
   assert(s.decay>0,'Residual heat never abruptly vanishes at shutdown');
   assert(s.cumulative.pending>0&&s.cumulative.pending<=s.cumulative.initialPending);
  }else{
   assert.equal(s.sourcePower,power);near(s.fission,power*.93);near(s.decay,power*.07);
   near(s.heat,power);near(s.electric,power*efficiency/100);near(s.rejected,power*(1-efficiency/100));
   near(s.cumulative.source,power*time);near(s.cumulative.heat,power*time);
   near(s.cumulative.pending,s.cumulative.initialPending,'Equilibrium bank while operating');
  }
  ledger(s);paused.set(time,s);samples++;
 }
 for(let i=0;i<=24;i++)assert.deepEqual(trace.states[i],sampleNuclear(trace,i),'Integer series is a sample of the same model');
 // Reverse/reordered sampling, repeated pauses and traces share no changing RNG
 // or clock, and no state depends on how the visitor reached the selected step.
 for(const [time,s] of [...paused].reverse())assert.deepEqual(sampleNuclear(trace,time),s,'A seek backwards reconstructs the same state');
 assert.deepEqual(sampleNuclear(trace,1.9),paused.get(1.9),'Paused fractional state replays exactly');
 assert.equal(JSON.stringify(trace),saved,'Sampling never mutates the trace');
 assert.deepEqual(buildNuclearTrace(p),trace,'Building a trace twice is deterministic');
 assert.deepEqual(heatBalance(p,7.25),sampleNuclear(trace,7.25),'Public heatBalance uses the same trace contract');
 combinations++;
}
assert.equal(combinations,378);

// Independent interval tests verify integrals against the measured heat rates,
// rather than reproducing the implementation's closed-form cumulative formulas.
function integrate(trace,field,start,end,segments=4000){
 const width=(end-start)/segments;
 let sum=0;
 for(let i=0;i<segments;i++)sum+=sampleNuclear(trace,start+(i+.5)*width)[field]*width;
 return sum;
}
for(const stop of [false,true]){
 const trace=buildNuclearTrace({power:100,efficiency:33,stop});
 for(const [start,end] of [[0,4.7],[5,5.0001],[5,12.7],[12.7,24]]){
  const left=sampleNuclear(trace,start),right=sampleNuclear(trace,end);
  for(const [rate,energy] of [['sourcePower','source'],['fission','prompt'],['decay','decay'],['heat','heat'],['electric','electric'],['rejected','rejected']])
   near(right.cumulative[energy]-left.cumulative[energy],integrate(trace,rate,start,end),`Independent ${rate} interval quadrature`,2e-5);
 }
}

const shutdown=buildNuclearTrace(),epsilon=1e-8;
const before=sampleNuclear(shutdown,5-epsilon),at=sampleNuclear(shutdown,5),after=sampleNuclear(shutdown,5+epsilon);
near(before.fission,93);near(before.decay,7);near(before.heat,100);near(before.electric,33);near(before.rejected,67);
assert.equal(at.fission,0);assert.equal(at.sourcePower,0);assert.equal(at.electric,0);
near(at.decay,7);near(at.heat,7);near(at.rejected,7);near(at.cumulative.pending,35);
// Neither the shutdown event nor rod insertion creates an impulse of energy.
for(const field of energyFields){
 near(before.cumulative[field],at.cumulative[field],`No energy jump at shutdown: ${field}`,1.1e-6);
 near(after.cumulative[field],at.cumulative[field],`No energy jump after shutdown: ${field}`,1.1e-6);
}
const six=sampleNuclear(shutdown,6),seven=sampleNuclear(shutdown,7);
near(six.decay/at.decay,seven.decay/six.decay,'One-step decay ratios stay the same');
near(six.cumulative.pending/at.cumulative.pending,six.decay/at.decay,'Remaining nuclear bank drives decay power');
near(at.cumulative.pending-six.cumulative.pending,six.cumulative.heat-at.cumulative.heat,'Residual heat is spent from the existing bank');
assert(six.decay<at.decay&&seven.decay<six.decay);

// Changing conversion affects electricity/rejected heat only. It never changes
// the core heat, nuclear bank or residual curve, even after the generator trips.
for(const time of [0,4.5,5,5.5,24]){
 const low=heatBalance({power:100,efficiency:20,stop:true},time),high=heatBalance({power:100,efficiency:40,stop:true},time);
 for(const field of ['sourcePower','fission','decay','heat'])near(low[field],high[field]);
 for(const field of ['source','prompt','createdDeferred','decay','heat','pending','initialPending'])near(low.cumulative[field],high.cumulative[field]);
 near(high.electric-low.electric,low.rejected-high.rejected,'Conversion moves energy between output and rejection');
 if(time>=5)assert.equal(high.electric,low.electric);
}
for(const time of [0,1.9,4.999999,5,8.5,24]){
 const full=heatBalance({power:100},time),half=heatBalance({power:50},time);
 for(const field of powerFields)near(full[field],half[field]*2,'Power scales all physical rates');
 for(const field of energyFields)near(full.cumulative[field],half.cumulative[field]*2,'Power scales all energy quantities');
}
const running=heatBalance({stop:false},24);
near(running.sourcePower,100);near(running.heat,100);near(running.cumulative.pending,35);
near(running.cumulative.source,2400);near(running.cumulative.heat,2400);near(running.cumulative.electric,792);

for(const [value,time] of [[-1,0],[-Infinity,0],[NaN,0],[Infinity,24],[30,24]])assert.deepEqual(sampleNuclear(shutdown,value),sampleNuclear(shutdown,time),'Invalid/out-of-range times clamp');
assert.deepEqual(sampleNuclear(shutdown,'1.9'),sampleNuclear(shutdown,1.9),'Numeric timeline input');
assert.equal(sampleNuclear(shutdown,24).progress,0);assert.equal(sampleNuclear(shutdown,24).active,false);
for(const horizon of [0,4,5,8,24]){
 const short=buildNuclearTrace({},horizon);
 assert.equal(short.states.length,horizon+1);assert.deepEqual(short.states,shutdown.states.slice(0,horizon+1).map(s=>({...s,active:s.time<horizon})));
 assert.equal(sampleNuclear(short,30).time,horizon);assert.equal(sampleNuclear(short,horizon).active,false);
}
for(const horizon of [-1,.5,25,NaN,Infinity])assert.throws(()=>buildNuclearTrace({},horizon),RangeError);
for(const power of [-1,0,19,101,NaN,Infinity,'100'])assert.throws(()=>buildNuclearTrace({power}),RangeError);
for(const efficiency of [-1,19,41,NaN,Infinity,'33'])assert.throws(()=>buildNuclearTrace({efficiency}),RangeError);
assert.deepEqual(buildNuclearTrace().params,{power:100,efficiency:33,stop:true});

const originalRandom=Math.random,originalNow=Date.now;
try{
 Math.random=()=>{throw new Error('The analytic reactor model must not consume random numbers.');};
 Date.now=()=>{throw new Error('A paused/seekable reactor state must not depend on the wall clock.');};
 const deterministic=buildNuclearTrace();
 assert.deepEqual(deterministic,shutdown);
 assert.deepEqual(sampleNuclear(deterministic,1.9),sampleNuclear(shutdown,1.9));
 assert.deepEqual(heatBalance({},12.7),sampleNuclear(shutdown,12.7));
}finally{Math.random=originalRandom;Date.now=originalNow;}

console.log(`Nuclear: ${combinations} joint slider settings, ${samples} causal/fractional samples, instantaneous and cumulative energy ledgers, independent heat quadrature, shutdown continuity, equilibrium bank, replay and bounds passed.`);
