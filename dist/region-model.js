// All units and durations are illustrative. No calendar dates or GDP estimates.
export const TYPES=[
  {name:'Extraction',unit:'ore / cycle',color:0xdab68c,rate:12,description:'Mines supply refineries. More facilities need more ore.'},
  {name:'Refining',unit:'material / cycle',color:0xedb07b,rate:8,description:'Refined material is shared between components and construction. Investing consumes resources too.'},
  {name:'Robot components',unit:'kits / cycle',color:0x8ccebb,rate:4,description:'Groups structures, actuators, batteries and electronics. Two material batches form one kit.'},
  {name:'Robot factories',unit:'robots / cycle',color:0xb0cbea,rate:4,description:'One kit becomes one robot. New robots can produce or build more facilities.'},
  {name:'Power generation',unit:'energy / cycle',color:0xe8d68e,rate:36,description:'Available power limits the whole region. The electrical grid has to grow too.'},
  {name:'Regional transport',unit:'loads / cycle',color:0xc3b2db,rate:36,description:'Connects extraction, processing and assembly. A saturated network slows every facility.'}
];
export const STEP=.125,END=120,COST=48,WORK=24,MAX_PROJECTS=3,SLOTS=6;
export function createRegion(share=.4,auto=true){return {time:0,fleet:24,built:0,partial:0,share,auto,ore:80,material:120,kits:24,reserve:0,extracted:0,spent:0,sites:TYPES.flatMap((_,type)=>Array.from({length:SLOTS},(_,slot)=>({type,slot,status:slot===0?'open':'empty',progress:0,workers:0}))),history:[],events:[],flow:Array(6).fill(0),builders:0,working:24,idle:0,energyFactor:1,transportFactor:1,energyDemand:0,power:36,freight:0,reason:'start'};}
export const counts=s=>TYPES.map((_,i)=>s.sites.filter(p=>p.type===i&&p.status==='open').length);
export function startBuild(s,index){const p=s.sites[index];if(!p||p.status!=='empty'||s.material<COST||s.sites.filter(p=>p.status==='building').length>=MAX_PROJECTS||s.time>=END)return false;s.material-=COST;s.reserve=Math.min(s.material,Math.max(0,s.reserve-COST));s.spent+=COST;p.status='building';p.progress=0;s.events.push({time:s.time,type:p.type,event:'started'});return true;}
function nextType(s){
  const n=TYPES.map((_,i)=>s.sites.filter(p=>p.type===i&&p.status!=='empty').length);
  // Plan the suppliers together. Energy and transport reserve is physical capacity,
  // not a growth multiplier. Tie order prioritizes material for the next buildings.
  const target=Math.max(...n.slice(0,4));
  if(n[4]<SLOTS&&n[4]*36<(n.reduce((a,b)=>a+b,0)*5.2+10))return 4;
  if(n[5]<SLOTS&&n[5]*36<target*28)return 5;
  const options=[1,0,2,3].filter(i=>n[i]<SLOTS);
  if(options.length)return options.reduce((a,b)=>n[a]<=n[b]?a:b);
  return [4,5].find(i=>n[i]<SLOTS)??-1;
}
export function metrics(s){
  const n=counts(s),projects=s.sites.filter(p=>p.status==='building');
  const budget=Math.floor(s.fleet*s.share);
  const builders=Math.min(budget,projects.length*4);
  const jobs=n.reduce((a,b)=>a+b,0)*4,working=Math.min(s.fleet-builders,jobs),staff=working/jobs;
  const energyDemand=working*.8+builders*.8+n.reduce((a,b)=>a+b,0)*2;
  const power=n[4]*36,energyFactor=Math.min(1,power/Math.max(1,energyDemand));
  const potentials=TYPES.slice(0,4).map((t,i)=>t.rate*n[i]*staff*energyFactor);
  const freight=potentials.reduce((a,b)=>a+b,0),transport=n[5]*36*staff;
  return {n,builders,working,idle:s.fleet-builders-working,staff,energyDemand,power,energyFactor,freight,transport,transportFactor:Math.min(1,transport/Math.max(.001,freight)),potentials};
}
export function tickRegion(s,dt=STEP){
  if(!(dt>0&&dt<=STEP))throw new Error('Use a bounded simulation step');
  if(s.time>=END)return;
  dt=Math.min(dt,END-s.time);
  if(s.auto&&s.share>0){
    const planned=Math.min(MAX_PROJECTS,Math.floor(s.fleet*s.share/4));
    while(s.sites.filter(p=>p.status==='building').length<planned&&s.material>=COST){
      const type=nextType(s),i=s.sites.findIndex(p=>p.type===type&&p.status==='empty');
      if(i<0||!startBuild(s,i))break;
    }
  }
  const m=metrics(s);Object.assign(s,{builders:m.builders,working:m.working,idle:m.idle,energyDemand:m.energyDemand,power:m.power,energyFactor:m.energyFactor,transportFactor:m.transportFactor,freight:m.freight});
  const rates=m.potentials.map(x=>x*m.transportFactor),flow=Array(6).fill(0);
  // Downstream first: inventory is conserved and new inputs wait until next tick.
  flow[3]=Math.min(s.kits,rates[3]*dt);s.kits-=flow[3];s.partial+=flow[3];
  const finished=Math.floor(s.partial+1e-9);s.partial-=finished;s.built+=finished;s.fleet+=finished;
  if(s.share===0||!s.sites.some(p=>p.status==='empty'))s.reserve=0;
  flow[2]=Math.max(0,Math.min(Math.max(0,s.material-s.reserve)/2,rates[2]*dt,80-s.kits));s.material-=2*flow[2];s.kits+=flow[2];
  flow[1]=Math.max(0,Math.min(s.ore,rates[1]*dt,400-s.material));s.ore-=flow[1];s.material+=flow[1];
  if(s.share>0&&s.sites.some(p=>p.status==='empty'))s.reserve=Math.min(COST,s.material,s.reserve+flow[1]*s.share);
  flow[0]=Math.max(0,Math.min(rates[0]*dt,400-s.ore));s.ore+=flow[0];s.extracted+=flow[0];
  flow[4]=Math.min(m.power,m.energyDemand)*dt;flow[5]=flow.slice(0,4).reduce((a,b)=>a+b,0);
  s.flow=flow.map(x=>x/dt);
  let available=m.builders;
  for(const p of s.sites){p.workers=0;if(p.status!=='building')continue;p.workers=Math.min(4,available);available-=p.workers;p.progress=Math.min(WORK,p.progress+p.workers*m.energyFactor*dt);if(p.progress>=WORK){p.status='open';p.workers=0;s.events.push({time:s.time+dt,type:p.type,event:'opened'});}}
  s.time+=dt;
  s.reason=s.sites.every(p=>p.status==='open')?'land':m.energyFactor<.99?'power':m.transportFactor<.99?'transport':s.kits<1?'kits':s.share>0&&s.material<COST?'material':m.idle>0?'machines':'balanced';
  if(!s.history.length||s.time-s.history.at(-1).time>=1-1e-8||s.time>=END)s.history.push({time:s.time,fleet:s.fleet,built:s.built,buildings:counts(s).reduce((a,b)=>a+b,0),flow:[...s.flow],counts:counts(s),builders:m.builders});
}
export function advanceRegion(s,cycles){for(let n=0;n<Math.round(cycles/STEP);n++)tickRegion(s);return s;}
