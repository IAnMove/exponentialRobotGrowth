// Teaching physics for a Dyson swarm vs a rigid shell. Not a construction plan.
// Luminosity: IAU nominal solar luminosity. Distance: IAU astronomical unit.
export const L_SUN=3.828e26;
export const AU=1.495978707e11;
export const SIGMA=5.670374419e-8;
export const M_JUPITER=1.898e27;
export const ROCK_DENSITY=3000;
export const WORLD_ENERGY_EJ=600;
export const SECONDS_PER_YEAR=365.25*24*3600;
export const WORLD_POWER=WORLD_ENERGY_EJ*1e18/SECONDS_PER_YEAR;
export const KARDASHEV_II=4e26;
export const RING_COUNT=12,PER_RING=80,COLLECTOR_MAX=RING_COUNT*PER_RING;
export const defaults={form:'swarm',coverage:.18,radiusAu:1,playing:false,time:0};

// Independent orbits, not a rigid spherical lattice. Rings first, then panels on each ring.
export function swarmLayout(ringCount=RING_COUNT,perRing=PER_RING){
 const pts=[];
 for(let r=0;r<ringCount;r++){
  const inc=(r/(Math.max(1,ringCount-1))-.5)*1.12,twist=r*.19,rad=1+(r%3-1)*.028;
  for(let i=0;i<perRing;i++){
   const a=twist+i*2*Math.PI/perRing,x=rad*Math.cos(a),z=rad*Math.sin(a),y=0;
   const cy=-z*Math.sin(inc),cz=z*Math.cos(inc);
   pts.push({x,y:cy,z:cz,ring:r});
  }
 }
 return pts;
}
export function visibleCollectors(coverage,max=COLLECTOR_MAX){return Math.max(0,Math.min(max,Math.floor(Math.min(1,Math.max(0,coverage))*max)));}

export function sphereArea(radiusAu){const r=radiusAu*AU;return 4*Math.PI*r*r;}
export function flux(radiusAu){return L_SUN/sphereArea(radiusAu);}
export function capture(coverage){return Math.min(1,Math.max(0,coverage))*L_SUN;}
export function leak(coverage){return L_SUN-capture(coverage);}

// Two-sided collectors: absorbed flux is radiated from both faces.
// A closed shell can radiate to space only from the outer surface.
export function swarmTemperature(radiusAu){return Math.pow(flux(radiusAu)/(2*SIGMA),.25);}
export function shellTemperature(radiusAu){return Math.pow(flux(radiusAu)/SIGMA,.25);}
export function radiatingTemperature(form,coverage,radiusAu){
 return form==='shell'&&coverage>=.999?shellTemperature(radiusAu):swarmTemperature(radiusAu);
}

export function snapshot(s=defaults){
 const coverage=Math.min(1,Math.max(0,s.coverage)),radiusAu=s.radiusAu,form=s.form;
 const area=sphereArea(radiusAu),column=M_JUPITER/area,thickness=column/ROCK_DENSITY;
 const captured=capture(coverage);
 return {
  form,coverage,radiusAu,area,column,thickness,
  flux:flux(radiusAu),captured,leaked:L_SUN-captured,
  temperature:radiatingTemperature(form,coverage,radiusAu),
  swarmTemperature:swarmTemperature(radiusAu),shellTemperature:shellTemperature(radiusAu),
  massUsed:coverage*M_JUPITER,vsWorld:captured/WORLD_POWER,vsSun:coverage,
  collectors:visibleCollectors(coverage),closedShell:form==='shell'&&coverage>=.999
 };
}

export function tickDyson(s,dt){
 if(s.playing&&Number.isFinite(dt)&&dt>0){
  s.time+=dt;s.coverage=Math.min(1,s.coverage+dt*.04);
  if(s.coverage>=1)s.playing=false;
 }
 return s;
}
