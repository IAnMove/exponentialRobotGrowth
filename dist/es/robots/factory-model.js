// A deliberately small, deterministic flow model. All quantities are illustrative.
export const STATIONS = [
  {name:'Preparación',short:'Preparar',task:'Preparar estructura, actuadores, batería, controladores y sensores.',humanRate:12,machine:36,color:0x92cfc2},
  {name:'Montaje',short:'Montar',task:'Montar el torso, las extremidades y la estructura del robot.',humanRate:8,machine:28,color:0xffad77},
  {name:'Actuadores y batería',short:'Completar',task:'Instalar actuadores, batería, cableado y mecanismos de movimiento.',humanRate:10,machine:32,color:0x92bde7},
  {name:'Pruebas',short:'Probar',task:'Calibrar sensores, movimiento, control y seguridad del conjunto.',humanRate:5,machine:18,color:0xe1c47c},
  {name:'Puesta en marcha',short:'Activar',task:'Verificar el robot completo y habilitar su incorporación al trabajo.',humanRate:9,machine:32,color:0xb8acdc}
];
export const BUFFER = 16;
export const SUPPLY = 160;
export const STEP = 1 / 120;
export function humanWorking(t){const h=(t+8)%24;return (h>=8&&h<12)||(h>=14&&h<18);}
export function period(t){const h=(t+8)%24;return humanWorking(t)?'Turno humano':h>=12&&h<14?'Pausa para comer':'Descanso humano';}
export function createFactory(config=[0,0,0,0,0],automatic=false){
  return {time:0,day:1,total:0,today:0,history:[],delivered:SUPPLY,queues:[SUPPLY,0,0,0,0],jobs:[null,null,null,null,null],
    robots:config.map(n=>Array.from({length:n},()=>-1)),deployed:0,automatic,lastDeployment:-1,flow:[0,0,0,0,0],completed:[0,0,0,0,0],blockedTime:[0,0,0,0,0]};
}
export function robotDuty(s,i,j){
  if(s.time<s.robots[i][j])return 'arriving';
  const h=(s.time+i*3+j*9)%24;
  return h<2?'charging':h<3?'service':'working';
}
export function capacity(s,i){
  const n=s.robots[i].length,humans=humanWorking(s.time)?2-n:0;
  let robots=0;for(let j=0;j<n;j++)if(robotDuty(s,i,j)==='working')robots++;
  return {humans,robots,rate:Math.min(STATIONS[i].machine,STATIONS[i].humanRate*(humans+robots*1.4))};
}
export function automate(s,i){
  if(!Number.isInteger(i)||i<0||i>=5||s.robots[i].length>=2||s.total-s.deployed<1)return false;
  s.robots[i].push(s.time+.25);s.deployed++;s.lastDeployment=s.time;return true;
}
export function status(s,i){
  const cap=capacity(s,i),job=s.jobs[i];
  if(job!==null&&job>=1&&i<4&&s.queues[i+1]>=BUFFER)return {code:'blocked',text:'Salida llena',...cap};
  if(!cap.rate)return {code:'rest',text:s.robots[i].some(t=>t>s.time)?'Llega el relevo':'Sin personal disponible',...cap};
  if(job===null&&!s.queues[i])return {code:'starved',text:i===0?'Esperando suministro':'Espera piezas',...cap};
  return {code:'working',text:'En producción',...cap};
}
export function tick(s,dt=STEP){
  if(dt<=0||dt>STEP+.0000001)throw new Error('Use fixed steps of at most 30 simulated seconds');
  // Downstream first: a finished item only becomes available to the next job next tick.
  for(let i=4;i>=0;i--){
    const cap=capacity(s,i);s.flow[i]=0;
    if(s.jobs[i]===null&&s.queues[i]>0&&cap.rate>0){s.queues[i]--;s.jobs[i]=0;}
    if(s.jobs[i]===null)continue;
    if(s.jobs[i]<1){s.jobs[i]=Math.min(1,s.jobs[i]+cap.rate*dt);s.flow[i]=cap.rate;}
    if(s.jobs[i]>=1){
      if(i===4){s.total++;s.today++;s.completed[i]++;s.jobs[i]=null;}
      else if(s.queues[i+1]<BUFFER){s.queues[i+1]++;s.completed[i]++;s.jobs[i]=null;}
      else{s.blockedTime[i]+=dt;s.flow[i]=0;}
    }
  }
  s.time+=dt;
  const day=Math.floor((s.time+1e-6)/24)+1;
  if(day>s.day){s.history.push(s.today);s.today=0;s.day=day;const shipment=Math.min(SUPPLY,320-s.queues[0]);s.queues[0]+=shipment;s.delivered+=shipment;}
  if(s.automatic&&s.total>s.deployed&&s.time-s.lastDeployment>=.5){
    const available=STATIONS.map((st,i)=>({i,rate:st.humanRate*((2-s.robots[i].length)*8+s.robots[i].length*21*1.4)})).filter(p=>s.robots[p.i].length<2).sort((a,b)=>a.rate-b.rate);
    if(available.length)automate(s,available[0].i);
  }
}
export function advance(s,hours){const n=Math.round(hours/STEP);for(let i=0;i<n;i++)tick(s);return s;}
export function forecast(config){const s=createFactory(config);advance(s,24);return s.total;}
export function constraint(s){
  // Daily availability, equipment and the external kit supply bound the whole chain.
  const capacities=STATIONS.map((st,i)=>Math.min(st.machine*24,st.humanRate*((2-s.robots[i].length)*8+s.robots[i].length*21*1.4)));
  const minimum=Math.min(SUPPLY,...capacities);
  return {index:minimum===SUPPLY?-1:capacities.indexOf(minimum),capacity:minimum};
}
