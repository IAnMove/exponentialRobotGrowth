import {CATALOG} from '../catalog.js';
import {IMMERSIVE} from '../immersive/catalog.js';
// One floor plan. Meshes and collision both read these boxes. No second yaw for the walls.
export const EYE = 1.62;
export const RADIUS = 0.32;
export const SPEED = 3.6;
export const STAND = 3.2;
export const WALL_H = 5.6;
// Both the renderer and interaction use this same front-facing canvas. The
// portal threshold sits in front of the frame, reachable before wall collision.
export const PAINTING=Object.freeze({centerY:2.35,defaultWidth:3.6,aspect:1.5,canvasOffset:.02,entryDistance:.65});
const EPSILON=1e-9,PORTAL_ALIGNMENT=Math.cos(Math.PI/6);

export const rooms=[
  {id:'hall',es:'Atrio',en:'Atrium',subtitle:['Un museo de ideas','A museum of ideas'],color:'#d9bd8d',x:0,z:1,minX:-6,maxX:6,minZ:-6,maxZ:8,gate:{x:0,z:0}},
  {id:'mind',es:'Inteligencia',en:'Intelligence',subtitle:['Lenguaje, mente y modelos','Language, mind and models'],color:'#a7b6ff',x:0,z:-14,minX:-6,maxX:6,minZ:-22,maxZ:-6,gate:{x:0,z:-6}},
  {id:'industry',es:'Industria y vida',en:'Industry & life',subtitle:['Robots, fábricas y hogares','Robots, factories and homes'],color:'#91d9bf',x:-14,z:1,minX:-23,maxX:-6,minZ:-6,maxZ:8,gate:{x:-6,z:0}},
  {id:'cosmos',es:'Cosmos',en:'Cosmos',subtitle:['De la órbita a la civilización','From orbit to civilization'],color:'#e8bb80',x:14,z:1,minX:6,maxX:23,minZ:-6,maxZ:8,gate:{x:6,z:0}},
  {id:'life',es:'Vida y naturaleza',en:'Life & nature',subtitle:['Células, carbono y evolución','Cells, carbon and evolution'],color:'#e4abc1',x:0,z:17,minX:-6,maxX:6,minZ:8,maxZ:26,gate:{x:0,z:8}}
];
const wall=(x1,z1,x2,z2)=>({minX:Math.min(x1,x2)-.16,maxX:Math.max(x1,x2)+.16,minZ:Math.min(z1,z2)-.16,maxZ:Math.max(z1,z2)+.16});
export const walls=[
  wall(-23,-6,-6,-6),wall(-23,-6,-23,8),wall(-23,8,-2,8),wall(2,8,23,8),wall(23,8,23,-6),wall(6,-6,23,-6),
  wall(-6,8,-6,26),wall(6,8,6,26),wall(-6,26,6,26),
  wall(-6,-6,-6,-2),wall(-6,2,-6,8),wall(6,-6,6,-2),wall(6,2,6,8),
  wall(-6,-6,-2,-6),wall(2,-6,6,-6),wall(-6,-6,-6,-22),wall(6,-6,6,-22),wall(-6,-22,6,-22)
];

// nx,nz is the screen's front: the direction from the glass toward the visitor.
export const exhibits = [
  {id:'lunar',room:'cosmos',x:14,z:7.65,nx:0,nz:-1,color:'#ffc478',es:'Tierra → Luna',en:'Earth → Moon',width:4.3,stand:3.6},
  {id:'robots',room:'industry',x:-16,z:-5.65,nx:0,nz:1,color:'#a7e0cf',es:'Robots',en:'Robots'},
  {id:'terafab',room:'industry',x:-22.65,z:-2,nx:1,nz:0,color:'#b9b1ff',es:'Terafab',en:'Terafab'},
  {id:'home',room:'industry',x:-22.65,z:4,nx:1,nz:0,color:'#efbd8c',es:'Hogar',en:'Home'},
  {id:'growth',room:'industry',x:-15,z:7.65,nx:0,nz:-1,color:'#d7e38a',es:'Crecimiento',en:'Growth'},
  {id:'dyson',room:'cosmos',x:11,z:-5.65,nx:0,nz:1,color:'#f0c075',es:'Esfera de Dyson',en:'Dyson sphere'},
  {id:'kardashev',room:'cosmos',x:19,z:-5.65,nx:0,nz:1,color:'#bba7ef',es:'Kardashev',en:'Kardashev'},
  {id:'starlink',room:'cosmos',x:22.65,z:0,nx:-1,nz:0,color:'#6ee7c5',es:'Starlink',en:'Starlink'},
  {id:'spacex',room:'cosmos',x:22.65,z:5.3,nx:-1,nz:0,color:'#e8a06a',es:'SpaceX',en:'SpaceX'},
  {id:'llms',room:'mind',x:0,z:-21.65,nx:0,nz:1,color:'#99b9ff',es:'Dentro de una respuesta',en:'Inside an answer',width:4.8,stand:4},
  {id:'mente',room:'mind',x:-5.65,z:-16,nx:1,nz:0,color:'#f0b4c4',es:'Mente',en:'Mind'},
  {id:'modelos',room:'mind',x:5.65,z:-16,nx:-1,nz:0,color:'#f3d39a',es:'Modelos',en:'Models'},
  {id:'internet',room:'mind',x:-5.65,z:-9.5,nx:1,nz:0,color:'#72d7ef',es:'Internet',en:'Internet',journey:true},
  {id:'electricity',room:'industry',x:-9.5,z:-5.65,nx:0,nz:1,color:'#ffd278',es:'Electricidad',en:'Electricity',journey:true},
  {id:'microchip',room:'mind',x:5.65,z:-9.5,nx:-1,nz:0,color:'#c0a2ff',es:'Microchip',en:'Microchip',journey:true},
  {id:'cell',room:'life',x:-5.65,z:17,nx:1,nz:0,color:'#f2a6bc',es:'La célula',en:'The cell',journey:true},
  {id:'ideas',room:'mind',x:-4.35,z:-21.65,nx:0,nz:1,color:'#e5a5f2',es:'Una idea',en:'An idea',width:2.5,journey:true},
  {id:'nuclear',room:'industry',x:-9.5,z:7.65,nx:0,nz:-1,color:'#ffb582',es:'Reactor nuclear',en:'Nuclear reactor',journey:true},
  {id:'carbon',room:'life',x:5.65,z:17,nx:-1,nz:0,color:'#83d5d8',es:'Carbono y clima',en:'Carbon & climate',journey:true},
  {id:'evolution',room:'life',x:0,z:25.65,nx:0,nz:-1,color:'#b9df92',es:'Evolución',en:'Evolution',journey:true}
].map(e=>({...e,href:e.journey?`../journeys/index.html?topic=${e.id}`:`../${e.id}/index.html`}));
// Numbers come from the shared catalogue, so paintings and home-page cards always agree.
for(const e of exhibits)e.num=CATALOG[e.id].number;

export const spawn = { x: 0, z: 5, yaw: 0, pitch: .06 };

// Camera yaw whose −z looks along (dx, dz). Tested against THREE, not against a copy of itself.
export function yawLookingAt(dx, dz) {
  const len = Math.hypot(dx, dz);
  if (!(len > 0)) throw new RangeError('A look direction is required');
  return Math.atan2(-dx / len, -dz / len);
}

export function standAt(exhibit) {
  return {
    x: exhibit.x + exhibit.nx * (exhibit.stand||STAND),
    z: exhibit.z + exhibit.nz * (exhibit.stand||STAND),
    yaw: yawLookingAt(-exhibit.nx, -exhibit.nz),
    pitch: .12
  };
}

export function paintingPlane(exhibit){
 const width=exhibit.width||PAINTING.defaultWidth;
 return {center:{x:exhibit.x+exhibit.nx*PAINTING.canvasOffset,y:PAINTING.centerY,z:exhibit.z+exhibit.nz*PAINTING.canvasOffset},
  normal:{x:exhibit.nx,y:0,z:exhibit.nz},right:{x:exhibit.nz,y:0,z:-exhibit.nx},width,height:width/PAINTING.aspect};
}
const finitePose=pose=>!!pose&&['x','z','yaw','pitch'].every(field=>Number.isFinite(pose[field]));
const eyeAt=pose=>({x:pose.x,y:EYE,z:pose.z});
// THREE's camera rotation order is YXZ: positive pitch looks up; yaw zero
// looks down -z. These values must come from the pose actually being rendered.
const viewRay=pose=>({x:-Math.sin(pose.yaw)*Math.cos(pose.pitch),y:Math.sin(pose.pitch),z:-Math.cos(pose.yaw)*Math.cos(pose.pitch)});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const along=(origin,direction,distance)=>({x:origin.x+direction.x*distance,y:origin.y+direction.y*distance,z:origin.z+direction.z*distance});

// Finite segment against the exact wall boxes and height used by the renderer.
// A painting behind a wall must not become a card or an E-key destination.
function wallOccludes(origin,direction,distance){
 for(const wall of walls){
  let near=0,far=distance,intersects=true;
  for(const [axis,min,max] of [['x',wall.minX,wall.maxX],['y',0,WALL_H],['z',wall.minZ,wall.maxZ]]){
   if(Math.abs(direction[axis])<EPSILON){
    if(origin[axis]<min||origin[axis]>max){intersects=false;break;}
   }else{
    const a=(min-origin[axis])/direction[axis],b=(max-origin[axis])/direction[axis];
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far){intersects=false;break;}
   }
  }
  if(intersects&&far>EPSILON&&near<distance-EPSILON)return true;
 }
 return false;
}
function insideCanvas(point,plane){
 const local=subtract(point,plane.center);
 return Math.abs(dot(local,plane.right))<=plane.width/2+EPSILON&&Math.abs(local.y)<=plane.height/2+EPSILON;
}

export function focusHit(pose,maxDistance=5.5){
 if(!finitePose(pose)||!Number.isFinite(maxDistance)||maxDistance<=0)return null;
 const origin=eyeAt(pose),direction=viewRay(pose);
 let best=null;
 for(const exhibit of exhibits){
  const plane=paintingPlane(exhibit),frontDistance=dot(subtract(origin,plane.center),plane.normal),toward=dot(direction,plane.normal);
  if(frontDistance<=EPSILON||toward>=-EPSILON)continue;
  const distance=-frontDistance/toward;
  if(distance<=EPSILON||distance>maxDistance||(best&&distance>=best.distance))continue;
  const point=along(origin,direction,distance);
  if(!insideCanvas(point,plane)||wallOccludes(origin,direction,distance))continue;
  best={exhibit,distance,point};
 }
 return best;
}
export function focusedExhibit(pose,maxDistance=5.5){return focusHit(pose,maxDistance)?.exhibit||null;}

// A walking trigger, distinct from explicitly pressing E. Cross the plane in
// front of the full canvas, facing and advancing within 30 degrees of its
// inward normal. Pure strafing, reversing and Web-only paintings never enter.
export function portalCrossing(from,to){
 if(!finitePose(from)||!finitePose(to))return null;
 const start=eyeAt(from),delta={x:to.x-from.x,y:0,z:to.z-from.z},length=Math.hypot(delta.x,delta.z);
 if(length<=EPSILON)return null;
 const direction={x:delta.x/length,y:0,z:delta.z/length},look={x:-Math.sin(to.yaw),y:0,z:-Math.cos(to.yaw)};
 let best=null,bestFraction=Infinity;
 for(const exhibit of exhibits){
  if(!Object.hasOwn(IMMERSIVE,exhibit.id))continue;
  const plane=paintingPlane(exhibit),advance=-dot(direction,plane.normal),facing=-dot(look,plane.normal);
  if(advance<PORTAL_ALIGNMENT-EPSILON||facing<PORTAL_ALIGNMENT-EPSILON)continue;
  const before=dot(subtract(start,plane.center),plane.normal),after=before+dot(delta,plane.normal);
  if(before<PAINTING.entryDistance-EPSILON||after>PAINTING.entryDistance+EPSILON||before-after<=EPSILON)continue;
  const fraction=Math.max(0,Math.min(1,(before-PAINTING.entryDistance)/(before-after)));
  if(fraction>=bestFraction)continue;
  const distance=length*fraction,point=along(start,direction,distance);
  if(!insideCanvas(point,plane)||wallOccludes(start,direction,distance))continue;
  best=exhibit;bestFraction=fraction;
 }
 return best;
}

export function collide(x, z, radius, boxes = walls) {
  for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    let dx = x - cx;
    let dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > 0 && d2 < radius * radius) {
      const d = Math.sqrt(d2);
      const push = radius - d;
      x += dx / d * push;
      z += dz / d * push;
    } else if (d2 === 0) {
      const left = x - b.minX, right = b.maxX - x, back = z - b.minZ, front = b.maxZ - z;
      const m = Math.min(left, right, back, front);
      if (m === left) x = b.minX - radius;
      else if (m === right) x = b.maxX + radius;
      else if (m === back) z = b.minZ - radius;
      else z = b.maxZ + radius;
    }
  }
  return { x, z };
}

// fwd and right are the camera's flattened basis. right = forward × up.
export function stepVisitor(pos, fwd, right, input, dt, boxes = walls) {
  if (!Number.isFinite(dt) || dt <= 0) return { x: pos.x, z: pos.z };
  let remaining = Math.min(dt, 0.2);
  let x = pos.x;
  let z = pos.z;
  const norm=Math.max(1,Math.hypot(input.forward,input.strafe));
  while (remaining > 1e-4) {
    const h = Math.min(0.05, remaining);
    x += (fwd.x * input.forward + right.x * input.strafe) / norm * SPEED * h;
    z += (fwd.z * input.forward + right.z * input.strafe) / norm * SPEED * h;
    for (let i = 0; i < 2; i++) ({ x, z } = collide(x, z, RADIUS, boxes));
    remaining -= h;
  }
  return { x, z };
}

// Measured on a THREE camera: positive rotation.x looks up. Mouse-down is +dy, so pitch decreases.
// Mouse-right is +dx. Positive yaw turns the look toward −x, so yaw decreases to look right.
export function lookDelta(yaw, pitch, dx, dy, sensitivity = 0.0022) {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: Math.max(-1.05, Math.min(1.05, pitch - dy * sensitivity))
  };
}

// Legacy horizontal-look entry point. New callers use the full rendered pose.
export function nearestExhibit(x, z, lookX = 0, lookZ = -1, max = 4.4) {
  if(!Number.isFinite(lookX)||!Number.isFinite(lookZ)||Math.hypot(lookX,lookZ)<=EPSILON)return null;
  return focusedExhibit({x,z,yaw:yawLookingAt(lookX,lookZ),pitch:0},max);
}

export function roomName(z,x=0){return roomAt(x,z)?.id||'hall';}
export function roomAt(x,z){return rooms.find(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
// Every leg stays inside a convex gallery, or follows the centre of a doorway.
export function routeTo(from,to){
  const a=roomAt(from.x,from.z),b=roomAt(to.x,to.z);if(!a||!b)return [];
  const path=[];if(a.id!==b.id){if(a.id!=='hall')path.push(a.gate);path.push({x:0,z:0});if(b.id!=='hall')path.push(b.gate);}
  const safe={...to,x:Math.max(b.minX+.55,Math.min(b.maxX-.55,to.x)),z:Math.max(b.minZ+.55,Math.min(b.maxZ-.55,to.z))};
  return [...path,safe].filter((p,i,list)=>Math.hypot(p.x-(i?list[i-1]:from).x,p.z-(i?list[i-1]:from).z)>.05);
}
export function portalPose(from,exhibit,progress){
  const value=Number(progress),p=Number.isNaN(value)?0:Math.max(0,Math.min(1,value)),s=p*p*(3-2*p),yaw=standAt(exhibit).yaw,plane=paintingPlane(exhibit);
  return {x:from.x+(plane.center.x-plane.normal.x*.45-from.x)*s,z:from.z+(plane.center.z-plane.normal.z*.45-from.z)*s,yaw:from.yaw+Math.atan2(Math.sin(yaw-from.yaw),Math.cos(yaw-from.yaw))*Math.min(1,p*3),pitch:from.pitch*(1-s)};
}

export function insideWall(x, z, boxes = walls) {
  return boxes.some(b => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
}

export function isSafePose(pose){
 if(!finitePose(pose)||Math.abs(pose.pitch)>1.05||!roomAt(pose.x,pose.z))return false;
 const safe=collide(pose.x,pose.z,RADIUS);
 return Math.hypot(safe.x-pose.x,safe.z-pose.z)<1e-7;
}
export function restorePose(candidate,fallback=spawn){
 function clean(pose){
  if(!finitePose(pose))return null;
  const value={x:pose.x,z:pose.z,yaw:pose.yaw,pitch:Math.max(-1.05,Math.min(1.05,pose.pitch))};
  return isSafePose(value)?value:null;
 }
 return clean(candidate)||clean(fallback)||{...spawn};
}
