// A causal teaching sequence, not an electronic clock or a propagation-delay
// simulator. null means not yet evaluated/shown; both 0 and 1 are valid bits.
const END = 12;
const gateSchedule = [
 {id:'xor1',operation:'XOR',start:2,end:4,inputWires:{a:'a-xor1',b:'b-xor1'}},
 {id:'and1',operation:'AND',start:2,end:4,inputWires:{a:'a-and1',b:'b-and1'}},
 {id:'xor2',operation:'XOR',start:6,end:8,inputWires:{x:'xor1-xor2',cin:'cin-xor2'}},
 {id:'and2',operation:'AND',start:6,end:8,inputWires:{x:'xor1-and2',cin:'cin-and2'}},
 {id:'or',operation:'OR',start:9,end:10,inputWires:{ab:'and1-or',cx:'and2-or'}}
];
const wireSchedule = [
 {id:'a-xor1',from:'a',to:'xor1',pin:'a',start:0,end:2},
 {id:'b-xor1',from:'b',to:'xor1',pin:'b',start:0,end:2},
 {id:'a-and1',from:'a',to:'and1',pin:'a',start:0,end:2},
 {id:'b-and1',from:'b',to:'and1',pin:'b',start:0,end:2},
 {id:'xor1-xor2',from:'xor1',to:'xor2',pin:'x',start:4,end:6},
 {id:'cin-xor2',from:'cin',to:'xor2',pin:'cin',start:0,end:6},
 {id:'xor1-and2',from:'xor1',to:'and2',pin:'x',start:4,end:6},
 {id:'cin-and2',from:'cin',to:'and2',pin:'cin',start:0,end:6},
 {id:'and1-or',from:'and1',to:'or',pin:'ab',start:4,end:9},
 {id:'and2-or',from:'and2',to:'or',pin:'cx',start:8,end:9},
 {id:'xor2-sum',from:'xor2',to:'sum',pin:'sum',start:8,end:12},
 {id:'or-cout',from:'or',to:'cout',pin:'cout',start:10,end:12}
];

// Preserve the original API and its exact object shape.
export function fullAdder(a,b,carry){
 return {sum:a^b^carry,carry:(a&b)|(carry&(a^b)),xor:a^b};
}
const fraction=(time,start,end)=>Math.max(0,Math.min(1,(time-start)/(end-start)));
function boundedTime(value,horizon){
 const numeric=Number(value);
 return Number.isNaN(numeric)?0:Math.max(0,Math.min(horizon,numeric));
}
function operate(operation,values){
 const [a,b]=values;
 return operation==='XOR'?a^b:operation==='AND'?a&b:a|b;
}

export function buildChipTrace(p={},horizon=END){
 if(!Number.isFinite(horizon)||horizon<0||horizon>END||!Number.isInteger(horizon))
  throw new RangeError('Chip horizon must be an integer from 0 to 12.');
 const params={a:!!(p.a??true),b:!!(p.b??true),carry:!!(p.carry??false)};
 const inputs={a:+params.a,b:+params.b,cin:+params.carry};
 const answer=fullAdder(inputs.a,inputs.b,inputs.cin);
 const expected={sum:answer.sum,cout:answer.carry,binary:`${answer.carry}${answer.sum}`,decimal:inputs.a+inputs.b+inputs.cin};
 const trace={params,inputs,horizon,expected,
  gates:gateSchedule.map(g=>({...g,inputWires:{...g.inputWires}})),
  wires:wireSchedule.map(w=>({...w})),states:[]};
 trace.states=Array.from({length:horizon+1},(_,time)=>sampleChip(trace,time));
 return trace;
}

export function sampleChip(trace,value){
 const time=boundedTime(value,trace.horizon),completed=Math.floor(time);
 const inputs={...trace.inputs},nodes={xor1:null,and1:null,xor2:null,and2:null,or:null,sum:null,cout:null};
 const sourceValue=source=>Object.hasOwn(inputs,source)?inputs[source]:nodes[source];
 const wireById=new Map(trace.wires.map(w=>[w.id,w]));
 // Topological order: a gate only reads signals that have reached its pins.
 const gates=trace.gates.map(g=>{
  const pins=Object.fromEntries(Object.entries(g.inputWires).map(([pin,id])=>{
   const wire=wireById.get(id);
   return [pin,time>=wire.end?sourceValue(wire.from):null];
  }));
  const resolved=time>=g.end&&Object.values(pins).every(bit=>bit!==null);
  const bit=resolved?operate(g.operation,Object.values(pins)):null;
  nodes[g.id]=bit;
  return {id:g.id,operation:g.operation,inputs:pins,value:bit,
   status:resolved?'resolved':time>=g.start?'processing':'waiting',progress:fraction(time,g.start,g.end)};
 });
 const signals=trace.wires.map(w=>{
  const arrived=time>=w.end,active=time>=w.start&&time<w.end;
  return {...w,value:sourceValue(w.from),progress:fraction(time,w.start,w.end),active,arrived,
   status:arrived?'arrived':active?'travelling':'waiting'};
 });
 for(const terminal of ['sum','cout']){
  const signal=signals.find(w=>w.to===terminal);
  if(signal.arrived)nodes[terminal]=signal.value;
 }
 const ready=nodes.sum!==null&&nodes.cout!==null;
 const result=ready?{sum:nodes.sum,cout:nodes.cout,binary:`${nodes.cout}${nodes.sum}`,decimal:nodes.sum+2*nodes.cout,ready:true}:
  {sum:null,cout:null,binary:null,decimal:null,ready:false};
 // Two separate, ideal static demonstrations share A with the adder. The
 // inverter output never drives any of the adder's input wires.
 return {time,continuous:true,completed,progress:time-completed,active:time<trace.horizon,inputs,
  mos:{gateValue:inputs.a,channelOn:!!inputs.a},
  inverter:{pOn:!inputs.a,nOn:!!inputs.a,output:1-inputs.a},
  gates,nodes,signals,result,expected:{...trace.expected}};
}
