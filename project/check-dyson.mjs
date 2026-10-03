import assert from 'node:assert/strict';
import * as m from './site-src/dyson/model.js';
const near=(a,b,rel=2e-11,abs=1e-12)=>assert(Math.abs(a-b)<=abs+rel*Math.max(Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const finiteTree=x=>{if(typeof x==='number')assert(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finiteTree);};
const frozen=x=>{if(x&&typeof x==='object'){assert(Object.isFrozen(x));Object.values(x).forEach(frozen);}};
let frames=0,balances=0,poses=0,invalid=0;
// Independent IAU/SI oracles, not snapshot self-comparisons.
near(m.flux(1),3.828e26/(4*Math.PI*149597870700**2));near(m.flux(1),1361,0,.3);
const area=4*Math.PI*149597870700**2,sigma=5.670374419e-8;
near(m.swarmTemperature(1),(m.L_SUN/area/(2*sigma))**.25);near(m.shellTemperature(1),(m.L_SUN/area/sigma)**.25);
near(m.swarmTemperature(1)/m.swarmTemperature(4),2);assert.equal(m.radiatingTemperature('shell',.5,1),null);
near(m.WORLD_POWER,600e18/(365.25*86400));assert.equal(m.snapshot().worldReference.scope,'Rounded illustrative energy reference; not a measured year.');
for(const coverage of [0,.001,.18,.5,1])for(const radiusAu of [.4,1,2.5])for(const efficiency of [0,.3,.6])for(const emissivity of [.2,1])for(const surfaceDensity of [.1,10])for(let chapter=0;chapter<6;chapter++)for(const progress of [0,.371,1]){
 const raw={coverage,radiusAu,efficiency,emissivity,surfaceDensity,form:'swarm'},f=m.dysonFrameAt(raw,chapter,progress),l=f.ledger;frames++;finiteTree(f);frozen(f);
 const expected=chapter<2?0:chapter===2?coverage*progress:chapter===5?1:coverage;
 near(f.coverage,expected);near(l.intercepted,expected*3.828e26);near(l.escaped+l.intercepted,l.stellar);near(l.electrical+l.directHeat,l.intercepted);near(l.workHeat,l.electrical);near(l.eventualHeat+l.escaped,l.stellar);balances+=4;
 near(f.materialMass,surfaceDensity*expected*4*Math.PI*(radiusAu*149597870700)**2);near(f.panelSample.incoming,3.828e26/(4*Math.PI*(radiusAu*149597870700)**2));near(f.panelSample.electrical,f.panelSample.incoming*efficiency);near(f.panelSample.eventualHeat,f.panelSample.incoming);assert.equal(f.actualSwarmTemperature,null);assert.equal(f.sampleCount,Math.floor(expected*960));assert.equal(f.params.coverage,coverage);
 if(chapter===5){assert(f.closedShell);assert.equal(f.form,'shell');assert.equal(f.shellTheorem.restoringAcceleration,0);}else assert.equal(f.form,'swarm');
 assert.deepEqual(m.dysonFrameAt(raw,chapter,progress),f,'arbitrary replay returns identical state');
}
const layout=m.swarmLayout();assert.equal(layout.length,960);assert.equal(new Set(layout.map(x=>x.id)).size,960);assert.equal(new Set(layout.map(x=>x.ring)).size,12);frozen(layout);
for(let i=0;i<960;i++)for(const radius of [.4,1,2.5]){
 const p=m.panelPose(i,radius,.371),r=p.radiusAu;poses++;finiteTree(p);frozen(p);near(Math.hypot(...p.position),r);near(Math.hypot(...p.normal),1);near(Math.hypot(...p.quaternion),1);near(p.normal.reduce((a,x,j)=>a+x*p.position[j],0),-r);
 near(p.periodSeconds,2*Math.PI*Math.sqrt((r*149597870700)**3/1.3271244e20));
 const period=m.panelPose(i,radius,.371+p.periodYears);p.position.forEach((v,j)=>near(v,period.position[j]));
 const q=p.quaternion,[x,y,z,w]=q,normal=[2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y)];normal.forEach((v,j)=>near(v,p.normal[j]));
 const next=m.panelPose(i,radius,.371+p.periodYears*1e-5),vel=next.position.map((v,j)=>v-p.position[j]),angular=[p.position[1]*vel[2]-p.position[2]*vel[1],p.position[2]*vel[0]-p.position[0]*vel[2],p.position[0]*vel[1]-p.position[1]*vel[0]];assert(angular.reduce((a,v,j)=>a+v*p.orbitNormal[j],0)>0,'same prograde Kepler direction');
}
for(const T of [200,331,394,5772]){
 const peak=m.wienPeak(T);near(peak*T,2.897771955e-3,1e-7);near(m.blackbodyNormalized(peak,T),1);assert(m.blackbodyNormalized(peak*.9,T)<1&&m.blackbodyNormalized(peak*1.1,T)<1);
 const n=14000,lo=peak/100,hi=peak*1000,h=Math.log(hi/lo)/n;let integral=0,last=lo;
 for(let i=1;i<=n;i++){const next=lo*Math.exp(i*h);integral+=(m.spectralPowerDensity(last,T)+m.spectralPowerDensity(next,T))*(next-last)/2;last=next;}near(integral,1,0,8e-6);
 const lambda=peak,x=6.62607015e-34*299792458/(lambda*1.380649e-23*T),oracle=2*6.62607015e-34*299792458**2/(lambda**5*Math.expm1(x));near(m.blackbodyRadiance(lambda,T),oracle);
}
for(const c of [0,.18,1]){const s=m.dysonSpectrum(c,331);frozen(s);near(s.weights.star+s.weights.heat,1);s.combined.forEach((v,i)=>near(v,s.star[i]+s.heat[i]));if(c===0)assert(s.heat.every(x=>x===0));if(c===1)assert(s.star.every(x=>x===0));}
const j=m.snapshot({coverage:1,surfaceDensity:1,form:'shell'});near(j.massUsed,area);assert(j.massUsed<m.M_JUPITER/1000);near(j.jupiterSheet.column,m.M_JUPITER/area);near(j.jupiterSheet.thickness,m.M_JUPITER/area/3000);assert.notEqual(j.massUsed,j.jupiterSheet.mass);
for(const eta of[0,.3,.6])for(const radius of[.4,1,2.5]){const p=m.isolatedPanelSample(radius,eta,.6);near(2*.6*sigma*p.temperature**4,p.directHeat);near(2*.6*sigma*p.passiveTemperature**4,p.incoming);near(p.temperature/p.passiveTemperature,(1-eta)**.25);near(m.dysonFrameAt({radiusAu:radius,efficiency:eta,emissivity:.6},3,.5).spectrum.heatTemperature,p.passiveTemperature);}
near(m.spectrumPlotY(.001),1/3);near(m.spectrumPlotY(.1),2/3);assert.equal(m.spectrumPlotY(0),0);assert.equal(m.spectrumPlotY(10),1);
for(const key of ['coverage','radiusAu','efficiency','emissivity','surfaceDensity'])for(const bad of [null,NaN,Infinity,'',false,{},[]]){assert.throws(()=>m.cleanDysonState({[key]:bad}));invalid++;}
for(const fn of [()=>m.sphereArea(1e-300),()=>m.flux(1e-300),()=>m.panelPose(0,1e-300),()=>m.sphereArea(1e300),()=>m.panelPose(0,1e300),()=>m.swarmTemperature(1,0),()=>m.blackbodyRadiance(1e-12,1e308),()=>m.swarmLayout(1001,1001),()=>m.dysonFrameAt({},6),()=>m.dysonFrameAt({},.5),()=>m.shellRestoringAcceleration(1,1)]){assert.throws(fn);invalid++;}
finiteTree(m.swarmTemperature(1,1e-320));assert.deepEqual(m.swarmLayout(1e308,0),[]);assert.deepEqual(m.swarmLayout(0,1e308),[]);
assert.deepEqual(m.cleanDysonState({radiusAu:0,coverage:-1,efficiency:2,emissivity:2,surfaceDensity:100}),{form:'swarm',coverage:0,radiusAu:.4,efficiency:.6,emissivity:1,surfaceDensity:10});
const a={...m.defaults,coverage:0,playing:true},b={...a};m.tickDyson(a,100);for(let i=0;i<200;i++)m.tickDyson(b,.5);near(a.time,b.time);assert.deepEqual({...a,time:0},{...b,time:0});assert.equal(a.time,25);
console.log(`Dyson: ${frames} reversible frames, ${balances} independent balances, ${poses} Kepler normals/periods, analytic Planck integrals and ${invalid} invalid inputs: OK`);
