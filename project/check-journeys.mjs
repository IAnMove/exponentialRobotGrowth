import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,walk,poseAt} from './site-src/journeys/common.js';
import {fullAdder} from './site-src/journeys/microchip.js';
import {gridRun} from './site-src/journeys/electricity.js';
import {translate} from './site-src/journeys/cell.js';
import {spread} from './site-src/journeys/ideas.js';
import {heatBalance} from './site-src/journeys/nuclear.js';
import {carbonRun} from './site-src/journeys/carbon.js';
import {evolve} from './site-src/journeys/evolution.js';
import {JOURNEY_IDS,immersiveHref} from './site-src/immersive/catalog.js';
import {exhibits} from './site-src/museo/model.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
assert.deepEqual(Object.keys(LESSONS),JOURNEY_IDS);
for(const l of Object.values(LESSONS)){
 assert.equal(l.steps.length,4);assert(l.sources.length>=2);assert.equal(l.limitations.length,2);
 const cases=[defaults(l),...l.controls.flatMap(c=>[c.type==='toggle'?false:c.min,c.type==='toggle'?true:c.max].map(value=>({...defaults(l),[c.id]:value})))];
 for(const p of cases)for(let t=0;t<=l.horizon;t++){const m=l.evaluate(p,t);assert.equal(m.metrics.length,3);assert(m.series.every(s=>s.values.length===t+1&&s.values.every(Number.isFinite)));for(const v of Object.values(m))if(typeof v==='number')assert(Number.isFinite(v));}
 assert(immersiveHref(l.id).includes(`topic=${l.id}&mode=immersive`));assert(exhibits.find(e=>e.id===l.id)?.href.endsWith(`topic=${l.id}`));
 for(const lang of ['es','en']){
  const src=readFileSync(`site-src/journeys/voices-${l.id}.js`,'utf8'),json=JSON.parse(src.match(/export const VOICES = ([\s\S]*?);\r?\nconst base/)[1]);
  assert.equal(json[lang].length,4);
  json[lang].forEach((clip,i)=>{assert.equal(clip.text,l.steps[i].text[lang==='es'?0:1]);assert(clip.duration>3);assert(existsSync('dist/audio/'+clip.file));});
 }
}
const net=LESSONS.internet,p=defaults(net),normal=net.evaluate(p,30),cut=net.evaluate({...p,cut:true},30);assert(cut.delay>normal.delay);assert.equal(normal.unique,normal.packets);assert.equal(net.evaluate({...p,loss:true},30).unique,normal.packets);
for(const loss of [false,true]){let previous=0;for(let t=0;t<=30;t++){const s=net.evaluate({...p,loss},t);assert(s.unique>=previous&&s.unique<=s.packets);previous=s.unique;}}
for(const voltage of [50,200,400])for(const demand of [10,22,45])for(const sun of [0,28,40])for(const h of gridRun({voltage,demand,sun},23)){assert(h.stored>=0&&h.stored<=20);assert(h.served<=demand);near(h.generated+h.discharge,h.served+h.loss+h.charge+h.curtailed);near(h.stored,h.before+h.charge-h.discharge);}
assert(gridRun({sun:28,demand:22,voltage:400},12)[12].loss<gridRun({sun:28,demand:22,voltage:50},12)[12].loss);
for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){const s=fullAdder(a,b,c);assert.equal(s.sum+2*s.carry,a+b+c);}
assert.deepEqual(translate(['AUG','GCU','UUU','GAA','UAA']),['Met','Ala','Phe','Glu']);assert.deepEqual(translate(['AUG','GCU','UUC','GAA','UAA']),translate(['AUG','GCU','UUU','GAA','UAA']));assert.equal(translate(['AUG','GCU','UAA','GAA','UAA']).length,2);
assert.equal(spread({contacts:2,probability:100,bridges:false},24).known.size,16);assert.equal(spread({contacts:2,probability:100,bridges:true},24).known.size,64);assert.equal(spread({contacts:4,probability:0,bridges:true},24).known.size,1);
const reactor={power:100,efficiency:33,stop:true};assert.equal(heatBalance(reactor,5).fission,0);assert(heatBalance(reactor,5).heat>0);for(let t=0;t<=24;t++){const h=heatBalance(reactor,t);near(h.heat,h.electric+h.rejected);}assert(heatBalance(reactor,24).heat<heatBalance(reactor,5).heat);
for(const emissions of [0,.5,2])for(const uptake of [.5,1,2])for(const stop of [false,true])for(const h of carbonRun({emissions,uptake,stop},60)){near(h.air+h.land+h.ocean+h.fossil,100);assert(Math.min(h.air,h.land,h.ocean,h.fossil)>=0);}
near(carbonRun({emissions:0,uptake:1,stop:false},60).at(-1).air,10);assert(carbonRun({emissions:.5,uptake:1,stop:true},11)[11].air>10);
const neutral={advantage:0,mutation:0,drift:false,seed:41};evolve(neutral,80).forEach(f=>near(f,.5));assert(evolve({...neutral,advantage:.2},80).at(-1)>.99);assert(evolve({...neutral,advantage:-.2},80).at(-1)<.01);assert.notDeepEqual(evolve({...neutral,drift:true,seed:1},80),evolve({...neutral,drift:true,seed:2},80));
for(let i=0;i<4;i++){const p=poseAt(i),s=walk(p,1,0,.05),d=walk(p,1,1,.05);near(Math.hypot(s.x-p.x,s.z-p.z),Math.hypot(d.x-p.x,d.z-p.z));assert(s.x<p.x);}
console.log('Eight journeys: all model/control extremes, energy and carbon conservation, truth table, codons, finite cascades, decay heat, selection/drift, voice transcripts and museum destinations: OK');
