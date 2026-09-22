export const STOPS=[
  ['Tu pregunta','Your question','Contexto','Context'],
  ['La fuente externa','The external source','Consultar','Retrieve'],
  ['El túnel de tokens','The token tunnel','Tokens','Tokens'],
  ['La sala de vectores','The vector room','Vectores','Vectors'],
  ['El motor de atención','The attention engine','Atención','Attention'],
  ['Las continuaciones posibles','Possible continuations','Probabilidades','Probabilities'],
  ['La salida de un token','One token leaves','Elegir','Choose'],
  ['El camino de vuelta','The return path','Repetir','Repeat']
].map((titles,index)=>({index,titles,x:-6,z:-index*14}));
export const SPAWN={x:0,z:6,yaw:Math.PI/2,pitch:.08};
export const obstacles=STOPS.map(s=>({minX:-9.5,maxX:-3.3,minZ:s.z-5.2,maxZ:s.z+5.2}));
export function poseAt(index){return {x:0,z:STOPS[index].z,yaw:Math.PI/2,pitch:.1};}
export function nearestStop(player){let best=0,d=Infinity;for(const s of STOPS){const value=Math.hypot(player.x,s.z-player.z);if(value<d){d=value;best=s.index;}}return {index:best,distance:d};}
export function walk(player,input,dt){
  const length=Math.max(1,Math.hypot(input.forward,input.strafe)),speed=3.5*Math.min(.05,Math.max(0,dt));
  const dx=(-Math.sin(player.yaw)*input.forward+Math.cos(player.yaw)*input.strafe)/length*speed;
  const dz=(-Math.cos(player.yaw)*input.forward-Math.sin(player.yaw)*input.strafe)/length*speed;
  const blocked=(x,z)=>obstacles.some(b=>x>b.minX-.3&&x<b.maxX+.3&&z>b.minZ-.3&&z<b.maxZ+.3);
  let x=Math.max(-10,Math.min(4.7,player.x+dx)),z=Math.max(-106,Math.min(10,player.z+dz));
  if(blocked(x,player.z))x=player.x;if(blocked(x,z))z=player.z;
  return {...player,x,z};
}
export function travelPose(from,to,progress){const p=Math.max(0,Math.min(1,progress)),s=p*p*(3-2*p),angle=Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw));return {x:from.x+(to.x-from.x)*s,z:from.z+(to.z-from.z)*s,yaw:from.yaw+angle*s,pitch:from.pitch+(to.pitch-from.pitch)*s};}
