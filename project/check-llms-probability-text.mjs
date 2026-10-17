import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createRun,advance} from './site-src/llms/model.js';
import {llmFrameAt,probabilityPercent} from './site-src/llms/presentation.js';
const readers=[probabilityPercent];
for(const prefix of ['','es/'])readers.push((await import('./dist/'+prefix+'llms/presentation.js')).probabilityPercent);
const literals=[
 [[0,1],0,'0','0'],[[0,1],1,'100','100'],[[.5,.5],0,'50.0','50,0'],
 [[.001,.999],0,'0.1','0,1'],[[.001,.999],1,'99.9','99,9'],
 [[.000999,.999001],0,'< 0.1','< 0,1'],[[.000999,.999001],1,'> 99.9','> 99,9'],
 [[1,1e-20],0,'> 99.9','> 99,9'],[[1,1e-20],1,'< 0.1','< 0,1'],
 [[0,1e-300,1],0,'0','0'],[[0,1e-300,1],1,'< 0.1','< 0,1'],[[0,1e-300,1],2,'> 99.9','> 99,9']
];
let literalReads=0,frames=0,reads=0,oldFalseZeros=0,oldFalseCertainties=0,roundedOnes=0;
for(const read of readers)for(const [values,index,en,es] of literals)for(const lang of ['en','es']){assert.equal(read(Object.freeze(values),index,lang),lang==='es'?es:en);literalReads++;}
const scenarios=[{scenario:'capital'},{scenario:'bank',context:false},{scenario:'bank',context:true},{scenario:'museum',retrieval:false},{scenario:'museum',retrieval:true,source:'current'},{scenario:'museum',retrieval:true,source:'archive'}];
for(const lang of ['es','en'])for(const params of scenarios)for(const temperature of [0,.1,.2,.7,1,2])for(const decoding of ['greedy','sample'])for(const continuation of [false,true]){
 const run=createRun(lang,{...params,temperature,decoding,seed:9942});if(continuation){run.phase=6;advance(run);}run.phase=5;
 const frame=llmFrameAt(run,{progress:1}),ps=frame.decoder.probabilities,before=JSON.stringify(frame);
 for(const [i,p] of ps.entries()){
  const alternative=ps.some((v,j)=>j!==i&&v>0),old=Number((p*100).toFixed(1));
  if(p>0&&old===0)oldFalseZeros++;if(alternative&&old===100)oldFalseCertainties++;if(p===1&&alternative)roundedOnes++;
  for(const read of readers){
   const text=read(ps,i,lang),number=Number(text.replace(/^[<>] /,'').replace(',','.'));
   if(text.startsWith('< '))assert(p>0&&p*100<number,'a lower-bound label must be strictly true');
   else if(text.startsWith('> '))assert(p*100>number,'an upper-end bound must be strictly true');
   else if(number===0)assert.equal(p,0,'0% is reserved for a computed zero');
   else if(number===100)assert(p===1&&!alternative,'100% requires no nonzero alternative');
   else assert(Math.abs(number-p*100)<=.050000001,'ordinary labels retain one-decimal rounding');
   reads++;
  }
 }
 assert.equal(JSON.stringify(frame),before,'formatting never changes logits, probabilities, selection or tensor values');frames++;
}
assert(oldFalseZeros>100&&oldFalseCertainties>50&&roundedOnes>0,'exercise both ordinary rounding and a leading float rounded to one');
for(const values of [[NaN],[Infinity],[-.1],[1.1]])assert.throws(()=>probabilityPercent(values,0),RangeError);
for(const index of [-1,.5,2])assert.throws(()=>probabilityPercent([.5,.5],index),RangeError);
const report={frames,reads,literalReads,oldFalseZeros,oldFalseCertainties,roundedOnes,bundles:readers.length};
if(process.env.LLM_PERCENT_REPORT)writeFileSync(process.env.LLM_PERCENT_REPORT,JSON.stringify(report,null,2));
console.log(`LLM probability text: ${literalReads} literal endpoint/rare/locale checks, ${frames} real decoder frames, ${reads} source/bundle readings; ${oldFalseZeros} false zeros and ${oldFalseCertainties} false certainties prevented, including ${roundedOnes} float-rounded ones; decoder unchanged.`);
