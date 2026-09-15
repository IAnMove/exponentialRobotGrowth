import assert from 'node:assert/strict';
import {createRegion,tickRegion,advanceRegion,startBuild,counts,metrics,STEP,END,WORK,COST} from './dist/region-model.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const runs=[];
for(const share of [0,.1,.2,.4,.7]){
  const s=createRegion(share);let previousFleet=24,previousBuildings=6;
  for(let i=0;i<END/STEP;i++){
    tickRegion(s);
    close(s.ore+s.material+2*s.kits+s.spent+2*(s.built+s.partial),248+s.extracted);
    assert(s.ore>=-1e-8&&s.ore<=400+1e-8&&s.material>=-1e-8&&s.material<=400+1e-8&&s.kits>=-1e-8&&s.kits<=80+1e-8);
    assert(s.reserve>=0&&s.reserve<=s.material+1e-8&&s.reserve<=COST);
    assert.equal(s.fleet,24+s.built);assert(s.fleet>=previousFleet);previousFleet=s.fleet;
    const facilities=counts(s).reduce((a,b)=>a+b,0);assert(facilities>=previousBuildings);previousBuildings=facilities;
    assert(facilities<=36);assert(s.sites.filter(p=>p.status==='building').length<=3);
    for(const p of s.sites){assert(p.progress>=0&&p.progress<=WORK);assert(p.workers<=4);if(p.status==='empty')assert.equal(p.progress,0);}
    const m=metrics(s);assert(m.builders+m.working<=s.fleet);assert(m.energyFactor>0&&m.energyFactor<=1);assert(m.transportFactor>0&&m.transportFactor<=1);
    assert(s.flow.every(x=>Number.isFinite(x)&&x>=0));
  }
  const final=JSON.stringify(s);tickRegion(s);assert.equal(JSON.stringify(s),final,'The scenario stops exactly at its endpoint');
  runs.push(s);
}
const reference=runs[0],high=runs.at(-1);
assert.deepEqual(counts(reference),[1,1,1,1,1,1]);assert.equal(reference.spent,0);
assert(high.history.find(h=>h.time>=30).fleet<reference.history.find(h=>h.time>=30).fleet,'Investment has a visible early opportunity cost');
assert(high.fleet>reference.fleet*2,'Completed expansions must create useful later capacity');
assert.equal(high.reason,'land');assert(high.idle>0,'Finite facilities must eventually limit useful deployment');
const manual=createRegion(.4,false),before=manual.material;
assert(startBuild(manual,1));assert.equal(manual.material,before-COST);assert(!startBuild(manual,1));assert(!startBuild(manual,0));
manual.share=0;advanceRegion(manual,3);assert.equal(manual.sites[1].progress,0,'No construction workers means no progress');
manual.share=.4;advanceRegion(manual,8);assert.equal(manual.sites[1].status,'open');
const constrained=createRegion(0,false);constrained.fleet=200;for(const p of constrained.sites)if(p.type<4)p.status='open';
const low=metrics(constrained);assert(low.energyFactor<1&&low.transportFactor<1);
for(const p of constrained.sites)if(p.type>=4)p.status='open';
const expanded=metrics(constrained);assert(expanded.energyFactor>low.energyFactor);assert(expanded.transportFactor>low.transportFactor);
console.log(JSON.stringify({checks:'Material conservation, bounded stocks, work delays, reinvestment tradeoff, finite plots, electricity and transport constraints, manual construction and endpoint: OK',reference:reference.fleet,highInvestment:high.fleet,facilities:counts(high).reduce((a,b)=>a+b,0)}));
