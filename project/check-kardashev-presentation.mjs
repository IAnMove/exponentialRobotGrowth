import assert from 'node:assert/strict';
import {MIN_K,HUMAN_POWER,SOLAR_POWER,powerAt,indexAt,multiplier,yearsAtGrowth} from './site-src/kardashev/model.js';
import {kardashevFrameAt} from './site-src/kardashev/presentation.js';
const near=(a,b)=>assert(Math.abs(a-b)/Math.max(1,Math.abs(b))<1e-10,`${a} != ${b}`);
let frames=0;
for(let i=0;i<=300;i++)for(const source of ['manual','narration','growth'])for(const inspect of [false,true]){
 const k=MIN_K+(3-MIN_K)*i/300,state={k,motion:123.456,playing:source==='growth'},before=JSON.stringify(state),f=kardashevFrameAt(state,{source,inspect,chapter:4,progress:.63,highlight:'panels'});
 assert.equal(JSON.stringify(state),before);assert(Object.isFrozen(f)&&Object.isFrozen(f.samples));assert.equal(Object.isFrozen(state),false);
 near(f.k,k);near(f.power,10**(10*k+6));near(f.vsHuman,f.power/HUMAN_POWER);near(f.solarEquivalent,f.power/SOLAR_POWER);near(f.fractionOfNext*f.targetPower,f.power);near(f.fractionOfNext*f.remainingFactor,1);
 assert.equal(f.tier,Math.floor(k));assert.equal(f.view,inspect?'satellite':k<1.35?'planet':k<2.35?'star':'galaxy');
 assert.equal(f.samples.illustrative,true);assert.equal(f.samples.representsPowerFraction,false);assert(f.samples.collectors>=8&&f.samples.collectors<=f.samples.collectorCapacity);assert(f.samples.systems>=0&&f.samples.systems<=f.samples.systemCapacity);
 assert.deepEqual(kardashevFrameAt(state,{source,inspect,chapter:4,progress:.63,highlight:'panels'}),f);frames++;
}
const middle=kardashevFrameAt({k:1.675});assert.equal(middle.samples.collectors,864);near(middle.fractionOfNext,10**(-3.25));assert(Math.abs(middle.fractionOfNext-middle.samples.collectors/middle.samples.collectorCapacity)>.49);
const before=kardashevFrameAt({k:2.4}),threshold=kardashevFrameAt({k:3});assert.equal(before.tier,2);assert.equal(before.nextTargetReached,false);near(before.remainingFactor,1e6);assert.equal(threshold.tier,3);assert.equal(threshold.nextTargetReached,true);near(threshold.remainingFactor,1);near(threshold.solarEquivalent,1e36/3.828e26);
const human=kardashevFrameAt({k:MIN_K});near(human.fractionOfNext,.002);near(human.remainingFactor,500);near(indexAt(powerAt(2)),2);near(multiplier(1.1,1.2),10);
for(const rate of [0,.01,2,10,100]){const years=yearsAtGrowth(MIN_K,1,rate);if(rate===0)assert.equal(years,Infinity);else near((1+rate/100)**years,500);}
for(const value of [NaN,Infinity,-Infinity,'2']){assert.throws(()=>powerAt(value),RangeError);assert.throws(()=>kardashevFrameAt({k:value}),RangeError);}
assert.throws(()=>powerAt(100),RangeError);assert.throws(()=>powerAt(-100),RangeError);assert.throws(()=>multiplier(0,100),RangeError);assert.throws(()=>yearsAtGrowth(1,2,NaN),RangeError);
for(const settings of [{progress:NaN},{chapter:5},{source:'unknown'},{highlight:'fake'}])assert.throws(()=>kardashevFrameAt({k:2},settings),RangeError);
assert.throws(()=>kardashevFrameAt({k:2,motion:-1}),RangeError);
console.log(`Kardashev presentation: ${frames} immutable reversible frames, threshold/ratio/compound-growth oracles and explicit separation of illustrative sample counts from power: OK`);
