// One floor plan. Meshes and collision both read these boxes. No second yaw for the walls.
export const EYE = 1.62;
export const RADIUS = 0.32;
export const SPEED = 3.6;
export const STAND = 3.2;
export const WALL_H = 5.6;

export const rooms=[
  {id:'hall',es:'Atrio',en:'Atrium',subtitle:['Un museo de ideas','A museum of ideas'],color:'#d9bd8d',x:0,z:1,minX:-6,maxX:6,minZ:-6,maxZ:8,gate:{x:0,z:0}},
  {id:'mind',es:'Inteligencia',en:'Intelligence',subtitle:['Lenguaje, mente y modelos','Language, mind and models'],color:'#a7b6ff',x:0,z:-14,minX:-6,maxX:6,minZ:-22,maxZ:-6,gate:{x:0,z:-6}},
  {id:'industry',es:'Industria y vida',en:'Industry & life',subtitle:['Robots, fábricas y hogares','Robots, factories and homes'],color:'#91d9bf',x:-14,z:1,minX:-23,maxX:-6,minZ:-6,maxZ:8,gate:{x:-6,z:0}},
  {id:'cosmos',es:'Cosmos',en:'Cosmos',subtitle:['De la órbita a la civilización','From orbit to civilization'],color:'#e8bb80',x:14,z:1,minX:6,maxX:23,minZ:-6,maxZ:8,gate:{x:6,z:0}}
];
const wall=(x1,z1,x2,z2)=>({minX:Math.min(x1,x2)-.16,maxX:Math.max(x1,x2)+.16,minZ:Math.min(z1,z2)-.16,maxZ:Math.max(z1,z2)+.16});
export const walls=[
  wall(-23,-6,-6,-6),wall(-23,-6,-23,8),wall(-23,8,23,8),wall(23,8,23,-6),wall(6,-6,23,-6),
  wall(-6,-6,-6,-2),wall(-6,2,-6,8),wall(6,-6,6,-2),wall(6,2,6,8),
  wall(-6,-6,-2,-6),wall(2,-6,6,-6),wall(-6,-6,-6,-22),wall(6,-6,6,-22),wall(-6,-22,6,-22)
];

// nx,nz is the screen's front: the direction from the glass toward the visitor.
export const exhibits = [
  {id:'robots',room:'industry',x:-16,z:-5.65,nx:0,nz:1,color:'#a7e0cf',num:'01',es:'Robots',en:'Robots'},
  {id:'terafab',room:'industry',x:-22.65,z:-2,nx:1,nz:0,color:'#b9b1ff',num:'02',es:'Terafab',en:'Terafab'},
  {id:'home',room:'industry',x:-22.65,z:4,nx:1,nz:0,color:'#efbd8c',num:'03',es:'Hogar',en:'Home'},
  {id:'growth',room:'industry',x:-15,z:7.65,nx:0,nz:-1,color:'#d7e38a',num:'04',es:'Crecimiento',en:'Growth'},
  {id:'dyson',room:'cosmos',x:11,z:-5.65,nx:0,nz:1,color:'#f0c075',num:'05',es:'Esfera de Dyson',en:'Dyson sphere'},
  {id:'kardashev',room:'cosmos',x:19,z:-5.65,nx:0,nz:1,color:'#bba7ef',num:'06',es:'Kardashev',en:'Kardashev'},
  {id:'starlink',room:'cosmos',x:22.65,z:0,nx:-1,nz:0,color:'#6ee7c5',num:'07',es:'Starlink',en:'Starlink'},
  {id:'spacex',room:'cosmos',x:22.65,z:5.3,nx:-1,nz:0,color:'#e8a06a',num:'08',es:'SpaceX',en:'SpaceX'},
  {id:'llms',room:'mind',x:0,z:-21.65,nx:0,nz:1,color:'#99b9ff',num:'09',es:'Dentro de una respuesta',en:'Inside an answer',width:4.8,stand:4},
  {id:'mente',room:'mind',x:-5.65,z:-14,nx:1,nz:0,color:'#f0b4c4',num:'10',es:'Mente',en:'Mind'},
  {id:'modelos',room:'mind',x:5.65,z:-14,nx:-1,nz:0,color:'#f3d39a',num:'11',es:'Modelos',en:'Models'}
].map(e=>({...e,href:`../${e.id}/index.html`}));

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

// The screen in front of the visitor, not the one they already walked past.
export function nearestExhibit(x, z, lookX = 0, lookZ = -1, max = 4.4) {
  let best = null;
  let bestD = max;
  const lookLen = Math.hypot(lookX, lookZ) || 1;
  for (const e of exhibits) {
    const dx = e.x - x;
    const dz = e.z - z;
    const d = Math.hypot(dx, dz);
    if (!(d > 0.05) || d >= bestD) continue;
    const facing = (dx * lookX + dz * lookZ) / (d * lookLen);
    if (facing > 0.45) { best = e; bestD = d; }
  }
  return best;
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
  const p=Math.max(0,Math.min(1,progress)),s=p*p*(3-2*p),yaw=standAt(exhibit).yaw;
  return {x:from.x+(exhibit.x-exhibit.nx*.45-from.x)*s,z:from.z+(exhibit.z-exhibit.nz*.45-from.z)*s,yaw:from.yaw+Math.atan2(Math.sin(yaw-from.yaw),Math.cos(yaw-from.yaw))*Math.min(1,p*3),pitch:from.pitch*(1-s)};
}

export function insideWall(x, z, boxes = walls) {
  return boxes.some(b => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
}
