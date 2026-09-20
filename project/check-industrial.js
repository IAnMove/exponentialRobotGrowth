const assert=require('node:assert/strict');
const {simulateIndustry,humanPeriod,robotDuty,HUMAN_TOTAL}=require('./industrial-model');
assert.equal(humanPeriod(12),'lunch');assert.equal(humanPeriod(23),'sleep');assert.equal(humanPeriod(9),'work');
for(let id=0;id<24;id++){const d=Array.from({length:24},(_,h)=>robotDuty(h,id));assert.equal(d.filter(x=>x==='work').length,21);assert.equal(d.filter(x=>x==='charge').length,2);assert.equal(d.filter(x=>x==='maintenance').length,1);}
const results={};
for(const policy of ['network','assembly','none'])for(const expansion of [true,false]){
  const run=simulateIndustry(policy,expansion),weights=[4,1,1,1,1,1,4,4];results[policy+expansion]=run;
  for(const s of run.frames){
    assert.equal(s.robots.reduce((a,n)=>a+n,0)+s.pending.length,s.retained,'Conservación de robots');
    assert.equal(s.humans.reduce((a,n)=>a+n,0)+s.humansReplaced,HUMAN_TOTAL,'Las personas dejan tareas, no desaparecen');
    assert.equal(s.active.reduce((a,n)=>a+n,0)+s.charging.reduce((a,n)=>a+n,0)+s.maintenance.reduce((a,n)=>a+n,0),s.robots.reduce((a,n)=>a+n,0));
    assert.equal(s.inventory.reduce((n,x,i)=>n+x*weights[i],0)+4*s.total,s.initialMaterial+4*s.extracted,'Conservación de insumos a través de las ramas');
    assert(s.inventory.every(x=>x>=0));assert(s.pending.every(r=>r.ready>s.absHour));assert(s.projects.filter(Boolean).length<=3);
    if(s.period!=='work')assert(s.humansWorking.every(n=>n===0),'Comidas y descanso afectan al trabajo humano');
    if(s.worked){s.flow.forEach((n,i)=>assert(n<=s.worked.cap[i]));assert(s.flow[6]<=Math.min(...s.worked.before.slice(2,6)),'Montaje requiere las cuatro familias');}
  }
  const last=run.frames.at(-1);console.log(policy,{expansion,total:last.total,retained:last.retained,replaced:last.humansReplaced,expansions:last.completedModules,nightProduction:run.frames.filter(s=>s.worked&&humanPeriod(s.worked.hour)==='sleep').reduce((a,s)=>a+s.flow[8],0)});
}
assert.equal(results.nonetrue.frames.at(-1).retained,0);
assert(results.networktrue.frames.at(-1).total>results.assemblytrue.frames.at(-1).total);
assert(results.networktrue.frames.some(s=>s.period==='sleep'&&s.flow[8]>0));
console.log('Turnos, recargas, sustitución, cadenas de componentes y conservación: OK');
