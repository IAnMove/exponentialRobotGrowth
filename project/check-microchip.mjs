import assert from 'node:assert/strict';
import {buildChipTrace,sampleChip,fullAdder} from './site-src/journeys/microchip-model.js';

const wireIds=['a-xor1','b-xor1','a-and1','b-and1','xor1-xor2','cin-xor2','xor1-and2','cin-and2','and1-or','and2-or','xor2-sum','or-cout'];
const milestones={xor1:[2,4],and1:[2,4],xor2:[6,8],and2:[6,8],or:[9,10]};
const boundaryTimes=[0,.5,1.999999,2,3.5,3.999999,4,5.999999,6,7.999999,8,8.999999,9,9.999999,10,11.999999,12];
const independentAnswer=(a,b,c)=>{
 const decimal=a+b+c;
 return {sum:decimal%2,carry:Math.floor(decimal/2),xor:Number(a!==b)};
};
const bitOrNull=bit=>assert(bit===null||bit===0||bit===1,`Invalid logical value ${bit}`);

let checked=0;
for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)for(let cin=0;cin<=1;cin++){
 const params={a:!!a,b:!!b,carry:!!cin},original={...params},trace=buildChipTrace(params);
 const answer=independentAnswer(a,b,cin),expected={sum:answer.sum,cout:answer.carry,binary:`${answer.carry}${answer.sum}`,decimal:a+b+cin};
 assert.deepEqual(fullAdder(a,b,cin),answer,'Original fullAdder numeric API');
 assert.deepEqual(fullAdder(!!a,!!b,!!cin),answer,'Original fullAdder boolean API');
 assert.deepEqual(params,original,'Building a trace does not mutate controls');
 assert.equal(trace.horizon,12);assert.equal(trace.states.length,13);
 assert.deepEqual(trace.inputs,{a,b,cin});assert.deepEqual(trace.expected,expected);
 assert.deepEqual(trace.wires.map(w=>w.id),wireIds);assert.equal(new Set(wireIds).size,12);
 assert.equal(trace.gates.length,5);
 const topology=new Map(trace.gates.map(g=>[g.id,g]));
 for(const wire of trace.wires){
  assert(wire.end>wire.start);
  if(topology.has(wire.from))assert(wire.start>=topology.get(wire.from).end,'No wire starts before its producing gate finishes');
  if(topology.has(wire.to))assert(wire.end<=topology.get(wire.to).start,'Both inputs arrive before gate processing');
 }
 for(const gate of trace.gates){
  const incoming=trace.wires.filter(w=>w.to===gate.id);
  assert.equal(incoming.length,2,'Exactly two separate inputs per gate');
  assert.deepEqual(Object.keys(gate.inputWires).sort(),incoming.map(w=>w.pin).sort());
 }
 for(const source of ['a','b','cin','xor1'])assert.equal(trace.wires.filter(w=>w.from===source).length,2,`Correct fanout ${source}`);
 assert(!trace.wires.some(w=>w.from==='inverter'||w.from==='not-a'),'Inverter is a separate demonstration');

 const saved=JSON.stringify(trace),sampled=new Map();
 for(const time of [...boundaryTimes,...Array.from({length:49},(_,i)=>i/4)]){
  const s=sampleChip(trace,time);sampled.set(time,s);checked++;
  assert.equal(s.time,time);assert.equal(s.completed,Math.floor(time));assert.equal(s.progress,time-Math.floor(time));
  assert.equal(s.continuous,true);assert.equal(s.active,time<12);
  assert.deepEqual(s.inputs,{a,b,cin});assert.deepEqual(s.expected,expected);
  assert.deepEqual(s.mos,{gateValue:a,channelOn:!!a});assert.deepEqual(s.inverter,{pOn:!a,nOn:!!a,output:1-a});
  assert.equal(s.signals.length,12);
  for(const signal of s.signals){
   bitOrNull(signal.value);assert(signal.progress>=0&&signal.progress<=1);
   assert.equal(signal.active,time>=signal.start&&time<signal.end);
   assert.equal(signal.arrived,time>=signal.end);
   assert.equal(signal.status,signal.arrived?'arrived':signal.active?'travelling':'waiting');
   if(signal.active||signal.arrived)assert.notEqual(signal.value,null,'Every travelling bit is already resolved, including 0');
   const source=topology.get(signal.from);
   if(source&&time<source.end)assert.equal(signal.value,null,'Unresolved sources do not advertise future answers');
   if(signal.arrived)assert.equal(signal.progress,1);
   if(time<=signal.start)assert.equal(signal.progress,0);
  }
  for(const gate of s.gates){
   bitOrNull(gate.value);Object.values(gate.inputs).forEach(bitOrNull);
   const [start,end]=milestones[gate.id];
   assert.equal(gate.status,time<start?'waiting':time<end?'processing':'resolved');
   assert.equal(gate.progress,Math.max(0,Math.min(1,(time-start)/(end-start))));
   for(const [pin,value] of Object.entries(gate.inputs)){
    const wire=s.signals.find(w=>w.to===gate.id&&w.pin===pin);
    assert.equal(value,wire.arrived?wire.value:null,'Gate input is a received signal');
   }
   if(time<end)assert.equal(gate.value,null,'Processing does not prematurely resolve output');
   else{
    const [x,y]=Object.values(gate.inputs);
    const truth=gate.operation==='XOR'?Number(x!==y):gate.operation==='AND'?Number(x===1&&y===1):Number(x===1||y===1);
    assert.equal(gate.value,truth,'Every resolved operation satisfies its truth table');
   }
   assert.equal(s.nodes[gate.id],gate.value);
  }
  if(time<12){
   assert.equal(s.nodes.sum,null);assert.equal(s.nodes.cout,null);
   assert.deepEqual(s.result,{sum:null,cout:null,binary:null,decimal:null,ready:false});
  }else{
   assert.deepEqual(s.result,{...expected,ready:true});
   assert.equal(s.nodes.sum,answer.sum);assert.equal(s.nodes.cout,answer.carry);
   assert.equal(s.nodes.sum+2*s.nodes.cout,a+b+cin,'Arithmetic agrees with full-adder truth table');
  }
 }
 for(const [time,s] of [...sampled].reverse())assert.deepEqual(sampleChip(trace,time),s,'Seeking backwards reconstructs the same state');
 assert.equal(JSON.stringify(trace),saved,'Sampling never mutates the trace');
 assert.deepEqual(buildChipTrace(params),trace,'Replay builds an identical trace');
 for(let i=0;i<=12;i++)assert.deepEqual(trace.states[i],sampleChip(trace,i),'Integer series uses causal snapshots');
 for(const [time,end] of [[-1,0],[NaN,0],[-Infinity,0],[Infinity,12],[15,12]])assert.deepEqual(sampleChip(trace,time),sampleChip(trace,end),'Out-of-range samples clamp');
 assert.deepEqual(sampleChip(trace,'6.5'),sampleChip(trace,6.5),'Numeric timeline input');
 const short=buildChipTrace(params,8);
 assert.equal(short.states.length,9);assert.equal(sampleChip(short,12).time,8);assert.equal(sampleChip(short,8).active,false);
 assert.equal(sampleChip(short,8).nodes.xor2,answer.sum);assert.equal(sampleChip(short,8).result.ready,false,'A short horizon does not accelerate the display wires');
}

// Zero is a travelling low-voltage signal, not an absence of a packet or an
// unknown result. At t=1 all six input branches actively carry known zeros.
const zeros=buildChipTrace({a:false,b:false,carry:false});
const zeroPackets=sampleChip(zeros,1).signals.filter(s=>s.active);
assert.equal(zeroPackets.length,6);assert(zeroPackets.every(s=>s.value===0));
assert.equal(sampleChip(zeros,4).nodes.xor1,0);assert.equal(sampleChip(zeros,4).nodes.and1,0);
assert.equal(sampleChip(zeros,8).nodes.xor2,0);assert.equal(sampleChip(zeros,8).nodes.and2,0);
assert.equal(sampleChip(zeros,10).nodes.or,0);assert.equal(sampleChip(zeros,10).nodes.cout,null);
assert.equal(sampleChip(zeros,12).result.binary,'00');

assert.deepEqual(buildChipTrace().inputs,{a:1,b:1,cin:0},'Default controls');
assert.equal(buildChipTrace({},0).states.length,1);
assert.equal(sampleChip(buildChipTrace({},0),1).time,0);
for(const horizon of [-1,.5,13,NaN,Infinity])assert.throws(()=>buildChipTrace({},horizon),RangeError);

console.log(`Microchip: all 8 truth-table rows, ${checked} causal/fractional samples, 12 directed wires, zero signals, replay and bounds passed.`);
