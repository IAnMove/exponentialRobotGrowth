import {strict as assert} from 'node:assert';
import {createLedger,laborCost,fixedCost,taskCost,laborIndex,fixedIndex,taskIndex,districtRows} from './site-src/live/metrics.js';
import model from './industrial-model.js';
const ledger=createLedger();ledger.add(8,{humans:10,robots:0},{humans:10,robots:0});
assert.equal(laborIndex({total:80,reference:80,...ledger.values()}),100);
ledger.add(16,{humans:0,robots:10},{humans:0,robots:0});
assert.equal(laborIndex({total:240,reference:80,...ledger.values()},.2),100*112/240);
assert.equal(laborIndex({total:0,reference:0,...ledger.values()}),null);
assert.equal(fixedIndex({total:20,reference:10,siteTime:60,referenceSiteTime:60}),50);
assert.equal(taskIndex(300,600,.2),60);assert.equal(taskIndex(300,600,1.5),125);
const ref=model.simulateIndustry('none',false),run=model.simulateIndustry();const rows=districtRows(run.frames,ref.frames);
assert.equal(rows[0].humanHours,0);assert.equal(rows[24].referenceHumanHours,74*8);
assert(rows.every((r,i)=>r.total===run.frames[i].total&&r.reference===ref.frames[i].total));
assert(rows.every((r,i)=>!i||r.robotHours>=rows[i-1].robotHours));
// Independent worked example: 80 paid human hours + 160 robot hours at 20%
// costs 112 normalized units for 240 robots; the baseline costs 1 unit/robot.
const example=Object.freeze({total:240,reference:80,humanHours:80,robotHours:160,referenceHumanHours:80,referenceRobotHours:0});
const breakdown=laborCost(example,.2);
assert.deepEqual(breakdown,{cost:112,units:240,referenceCost:80,referenceUnits:80,perUnit:112/240,referencePerUnit:1,index:100*112/240});
assert(Object.isFrozen(breakdown));
for(const factor of [.001,2,1000]){
 const scaled=Object.fromEntries(Object.entries(example).map(([k,v])=>[k,v*factor]));
 assert(Math.abs(laborCost(scaled,.2).index-breakdown.index)<1e-10,'changing the ledger scale must not change the unit-cost comparison');
}
for(const row of [{...example,total:0},{...example,reference:0},{...example,referenceHumanHours:0}])assert.equal(laborCost(row).index,null);
assert.equal(laborCost({...example,total:0}).perUnit,null);
assert.equal(laborCost({...example,reference:0}).referencePerUnit,null);
// Expanding facilities before output catches up can double the fixed burden.
assert.equal(fixedCost({total:20,reference:10,siteTime:240,referenceSiteTime:60}).index,200);
assert.equal(fixedCost({total:20,reference:10,siteTime:0,referenceSiteTime:0}).index,null);
assert.equal(taskCost(600,600,.2).cost,120);
assert.equal(taskCost(600,600,.2).index,20);
assert.equal(taskCost(600,600,1.5).index,150);
assert.equal(taskCost(0,600,1.5).index,100);
assert.equal(taskCost(0,0).index,null);
console.log('Live cost indices and worked accounting: equal baseline, idle-time charge, missing comparisons, scale invariance, increasing costs, task limits and district ledger parity OK');
