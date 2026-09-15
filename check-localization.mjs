import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as en from './dist/factory-model.js';
import * as es from './dist/es/factory-model.js';
import * as regionEN from './dist/region-model.js';
import * as regionES from './dist/es/region-model.js';
import * as cityEN from './dist/city-model.js';
import * as cityES from './dist/es/city-model.js';
for(const scenario of [0,1,2]){
  const a=cityEN.advanceCity(cityEN.createCity(scenario),120),b=cityES.advanceCity(cityES.createCity(scenario),120);
  assert.deepEqual(a,b,'Language must not change city outcomes');
}
for(const share of [0,.2,.4,.7]){
  const a=regionEN.advanceRegion(regionEN.createRegion(share),120),b=regionES.advanceRegion(regionES.createRegion(share),120);
  assert.deepEqual(a,b,'Language must not change regional outcomes');
}
for(const config of [[0,0,0,0,0],[0,1,0,0,0],[0,0,0,2,0],[2,2,2,2,2]]){
  const a=en.createFactory(config),b=es.createFactory(config);
  for(let t=0;t<6*24/en.STEP;t++){en.tick(a);es.tick(b);}
  assert.deepEqual(a,b,'Language must not change the phone factory simulation');
}
function district(file){const context=vm.createContext({});vm.runInContext(fs.readFileSync(file,'utf8')+';globalThis.run=simulateIndustry;',context);return context.run;}
const runEN=district('dist/industrial-model.js'),runES=district('dist/es/industrial-model.js');
for(const policy of ['network','assembly','none'])for(const expansion of [true,false]){
  const a=runEN(policy,expansion),b=runES(policy,expansion);
  assert.equal(JSON.stringify(a),JSON.stringify(b),'Language must not change industrial outcomes');
}
console.log('EN/ES numerical parity: factory (6 days, 4 setups), district (all 6 strategies): OK');
