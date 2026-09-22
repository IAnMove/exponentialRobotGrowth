import assert from 'node:assert/strict';
import {defaults,simulate,unitCosts,idealDoubling} from './site-src/growth/model.js';
import {waferAt,stages} from './site-src/terafab/process-model.js';
import {timeBudget} from './site-src/home/model.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const limited of [true,false])for(const reinvest of [0,.7,1])for(const hours of [8,21,24]){
 const p={...defaults,limited,reinvest,hours},rows=simulate(p);let work=0,build=0;
 for(const r of rows){
  assert.equal(r.fleet+r.pending,10+r.made,'Every robot must be built before it exists');
  near(r.goods+r.made*p.buildHours+r.bank,work);near(r.made*p.buildHours+r.bank,build);
  assert(r.output>=-1e-8);assert(r.bank>=-1e-8&&r.bank<p.buildHours+1e-8);
  if(limited){assert(r.work<=p.supply);assert(r.fleet+r.pending<=p.slots);}
  if(reinvest===0){assert.equal(r.fleet,10);near(r.output,r.fixed);}
  work+=r.work;build+=r.buildWork;
 }
}
const equal=simulate({...defaults,reinvest:0,hours:24,shifts:3});equal.forEach(r=>near(r.human,r.fixed));
const one=simulate({...defaults,reinvest:1,hours:24,buildHours:120});assert.equal(one[1].fleet,10);assert.equal(one[2].fleet,10);assert.equal(one[3].fleet,12);
const rows=simulate(defaults);let outputSum=0,humanSum=0;
for(const r of rows){outputSum+=r.output;humanSum+=r.human;near(r.goodsToDate,outputSum);near(r.humanToDate,humanSum);}
assert.equal(rows.at(-1).goodsToDate,outputSum,'Cumulative goods must include the visible day');
const humansIgnoreSlots=simulate({...defaults,slots:8,supply:5000,shifts:3,hours:21,limited:true});
assert.equal(humansIgnoreSlots[0].human,240,'Robot parking slots must not cap human-shift hours');
assert.equal(humansIgnoreSlots[0].fleet,8);
assert.equal(humansIgnoreSlots[0].work,8*21);
humansIgnoreSlots.forEach(r=>assert(r.fleet+r.pending<=8));
assert(!Number.isFinite(idealDoubling({...defaults,reinvest:0})));
assert(unitCosts({...defaults,installed:120000}).robot>unitCosts(defaults).robot);
assert(unitCosts({...defaults,hours:8}).robot>unitCosts(defaults).robot);
assert.equal(waferAt(3).film.filter(Boolean).length,9,'Exposure must not etch the film');
assert.equal(waferAt(4).resist.filter(Boolean).length,6);assert.equal(waferAt(4).film.filter(Boolean).length,9,'Development removes resist, not film');
assert.equal(waferAt(5).film.filter(Boolean).length,6);assert.equal(waferAt(5).resist.filter(Boolean).length,6);
assert.equal(waferAt(6).resist.filter(Boolean).length,0);assert.deepEqual(waferAt(5).film,waferAt(6).film);
for(let i=0;i<stages.length;i++){const w=waferAt(i);if(w.packaged)assert(w.diced&&w.probed);if(w.finalTest)assert(w.packaged);}
const tasks=[{id:'a',minutes:30},{id:'b',minutes:40}];near(timeBudget(tasks,new Set(['a']),20).freed,24);near(timeBudget(tasks,new Set(['a','b']),100).freed,0);near(timeBudget(tasks,new Set(),0).remaining,70);
console.log('Growth work/material-equivalent conservation, commissioned fleets, fair shifts, cost sensitivity, wafer transformations and net household time: OK');
