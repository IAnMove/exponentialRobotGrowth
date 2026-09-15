/* Escenario pedagógico: cantidades, horarios, productividad y sustitución son supuestos.
 * Las cuatro familias de componentes están agregadas; no es una lista de materiales de Tesla.
 */
const INDUSTRIES = [
  {name:'Mine',kind:'mine',x:-29,z:-25,humans:10,product:'ore batches',description:'Mineral extraction and preparation. The start of all four component chains.'},
  {name:'Refinery and metals',kind:'refinery',x:-6,z:-25,humans:10,product:'refined batches',description:'Refining and processing. Each batch supplies all four component families in the model.'},
  {name:'Structures',kind:'structure',x:18,z:-25,humans:8,product:'structures',description:'Housings, frames and machined parts. One of four inputs needed to assemble a robot.'},
  {name:'Motors and actuators',kind:'motor',x:33,z:-4,humans:8,product:'motor sets',description:'Motors, transmissions and joints. Robots help build the mechanisms that let them move.'},
  {name:'Batteries',kind:'battery',x:10,z:-4,humans:8,product:'batteries',description:'Battery preparation and assembly. Specialized chemical inputs are assumed available.'},
  {name:'Electronics and sensors',kind:'electronics',x:-13,z:-4,humans:8,product:'electronic sets',description:'Control electronics, wiring and sensors. Specialized manufacturing and equipment are represented in aggregate.'},
  {name:'Logistics hub',kind:'logistics',x:-13,z:19,humans:6,product:'complete kits',description:'Combines a structure, motors, a battery and electronics. No kit leaves without all four families.'},
  {name:'Robot assembly',kind:'assembly',x:11,z:19,humans:10,product:'assembled robots',description:'Kits become robots. People work here initially; newly built robots join later.'},
  {name:'Testing and calibration',kind:'testing',x:33,z:19,humans:6,product:'finished robots',description:'Verification, calibration and commissioning. Only finished robots can join the workforce.'}
];
const HUMAN_TOTAL = INDUSTRIES.reduce((sum,s)=>sum+s.humans,0);
function humanPeriod(hour){hour=((hour%24)+24)%24;return hour>=8&&hour<12||hour>=14&&hour<18?'work':hour>=12&&hour<14?'lunch':hour>=22||hour<6?'sleep':hour>=6&&hour<8?'commute':'rest';}
function robotDuty(hour,id){const h=((hour+id*7)%24+24)%24;return h<2?'charge':h<3?'maintenance':'work';}
function simulateIndustry(policy='network',expansion=true,days=12){
  const START=8,HOURS=days*24-START-1,weights=[4,1,1,1,1,1,4,4];
  const inventory=[12,32,6,6,6,6,6,4],initialMaterial=inventory.reduce((n,x,i)=>n+x*weights[i],0);
  const fleet=Array(9).fill(0),modules=Array(9).fill(2),credit=Array(9).fill(0),projects=Array(9).fill(null);
  const deployments=[],productionEvents=[],frames=[];let pending=[],total=0,retained=0,extracted=0,completedModules=0;
  function staffing(hour){
    const humans=fleet.map((n,i)=>Math.max(0,INDUSTRIES[i].humans-n));
    const active=Array(9).fill(0),charging=Array(9).fill(0),maintenance=Array(9).fill(0);
    deployments.forEach(r=>{if(r.ready>hour)return;const d=robotDuty(hour,r.id);(d==='work'?active:d==='charge'?charging:maintenance)[r.site]++;});
    return {humans,humansWorking:humans.map(n=>humanPeriod(hour)==='work'?n:0),active,charging,maintenance};
  }
  function snapshot(hour,flow=Array(9).fill(0),assigned=Array(9).fill(0),arrivals=Array(9).fill(0),started=[],opened=[],worked=null){
    const staff=staffing(hour),hardware=modules.map(n=>n*3);
    const capacity=staff.active.map((n,i)=>Math.min(hardware[i],(n+staff.humansWorking[i]-Math.min(n,projects[i]?2:0))*.5));
    const dayCapacity=fleet.map((n,i)=>Math.min(hardware[i],(n*21+staff.humans[i]*8)*.5/24));
    const min=Math.min(...dayCapacity),bottlenecks=dayCapacity.map((n,i)=>Math.abs(n-min)<.001?i:-1).filter(i=>i>=0);
    frames.push({step:hour-START,absHour:hour,hour:hour%24,day:Math.floor(hour/24)+1,period:humanPeriod(hour),flow:[...flow],assigned:[...assigned],arrivals:[...arrivals],started,opened,worked,
      ...staff,robots:[...fleet],modules:[...modules],hardware,capacity,dayCapacity,bottlenecks,projects:projects.map(p=>p&&{...p}),inventory:[...inventory],pending:pending.map(r=>({...r})),
      total,retained,exported:total-retained,extracted,completedModules,humanTotal:HUMAN_TOTAL,humansReplaced:HUMAN_TOTAL-staff.humans.reduce((a,n)=>a+n,0),initialMaterial});
  }
  snapshot(START);
  for(let step=0;step<HOURS;step++){
    const hour=START+step,staff=staffing(hour),hardware=modules.map(n=>n*3),started=[],opened=[];
    if(expansion&&policy!=='none'){
      const projected=fleet.map((n,i)=>n+pending.filter(r=>r.site===i).length);
      const candidates=INDUSTRIES.map((_,i)=>i).filter(i=>!projects[i]&&modules[i]<8&&fleet[i]>=4&&projected[i]*21*.5/24>=hardware[i]+.5);
      candidates.sort((a,b)=>hardware[a]-hardware[b]||a-b);
      for(const site of candidates){if(projects.filter(Boolean).length===3)break;projects[site]={started:hour,progress:0,required:12};started.push(site);}
    }
    const builders=staff.active.map((n,i)=>projects[i]?Math.min(2,n):0);
    const cap=staff.active.map((n,i)=>{const raw=Math.min(hardware[i],(n+staff.humansWorking[i]-builders[i])*.5)+credit[i];const whole=Math.floor(raw);credit[i]=raw-whole;return whole;});
    const before=[...inventory],flow=Array(9).fill(0);
    flow[0]=Math.min(50,cap[0]);flow[1]=Math.min(cap[1],before[0]);
    // Four branches share refined materials. Round-robin dispatch avoids consuming stock twice.
    let available=before[1],allocated=true;
    while(available>0&&allocated){allocated=false;for(let k=0;k<4&&available>0;k++){const i=2+(k+hour)%4;if(flow[i]<cap[i]){flow[i]++;available--;allocated=true;}}}
    flow[6]=Math.min(cap[6],...before.slice(2,6));flow[7]=Math.min(cap[7],before[6]);flow[8]=Math.min(cap[8],before[7]);
    inventory[0]+=flow[0]-flow[1];inventory[1]+=4*flow[1]-flow.slice(2,6).reduce((a,n)=>a+n,0);
    for(let i=2;i<6;i++)inventory[i]+=flow[i]-flow[6];inventory[6]+=flow[6]-flow[7];inventory[7]+=flow[7]-flow[8];
    extracted+=flow[0];total+=flow[8];
    projects.forEach((p,i)=>{if(!p)return;p.progress+=builders[i]/2;if(p.progress>=p.required){modules[i]++;projects[i]=null;completedModules++;opened.push(i);}});
    const newHour=hour+1,arrivals=Array(9).fill(0);
    pending=pending.filter(r=>{if(r.ready>newHour)return true;fleet[r.site]++;arrivals[r.site]++;return false;});
    const desiredRetained=policy==='none'?0:Math.floor(total*.7),assigned=Array(9).fill(0);
    let nextRetained=retained;
    const projected=fleet.map((n,i)=>n+pending.filter(r=>r.site===i).length);
    for(let r=retained;r<desiredRetained;r++){
      const eligible=INDUSTRIES.map((_,i)=>i).filter(i=>projected[i]<Math.ceil((expansion?24:modules[i]*3)*24/10.5)+2);
      if(!eligible.length||(policy==='assembly'&&!eligible.includes(7)))break;
      let site=7;
      if(policy==='network')site=eligible.sort((a,b)=>{
        const mean=i=>Math.min(modules[i]*3+(projects[i]?3:0),(projected[i]*21+Math.max(0,INDUSTRIES[i].humans-projected[i])*8)*.5/24);
        return mean(a)-mean(b)||projected[a]-projected[b]||a-b;
      })[0];
      const robot={id:deployments.length,site,slot:projected[site],born:newHour,ready:newHour+2};projected[site]++;assigned[site]++;pending.push(robot);deployments.push(robot);
      nextRetained++;
    }
    if(flow[8])productionEvents.push({hour:newHour,count:flow[8],outgoing:flow[8]-(nextRetained-retained)});
    retained=nextRetained;
    snapshot(newHour,flow,assigned,arrivals,started,opened,{hour,cap,builders,before,active:staff.active,humansWorking:staff.humansWorking});
  }
  return {frames,deployments,productionEvents,days,startHour:START,initialMaterial};
}
if(typeof module!=='undefined')module.exports={INDUSTRIES,HUMAN_TOTAL,humanPeriod,robotDuty,simulateIndustry};
