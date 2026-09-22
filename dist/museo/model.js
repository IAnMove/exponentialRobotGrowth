// One floor plan. Meshes and collision both read these boxes. No second yaw for the walls.
export const EYE = 1.62;
export const RADIUS = 0.32;
export const SPEED = 3.1;
export const STAND = 1.85;
export const WALL_H = 3.55;

export const walls = [
  { minX: -4.3, maxX: -3.85, minZ: -4, maxZ: 22 },
  { minX: 3.85, maxX: 4.3, minZ: -4, maxZ: 22 },
  { minX: -4.3, maxX: 4.3, minZ: 21.6, maxZ: 22.2 },
  { minX: -8.3, maxX: -7.85, minZ: -18, maxZ: -4 },
  { minX: 7.85, maxX: 8.3, minZ: -18, maxZ: -4 },
  { minX: -8.3, maxX: 8.3, minZ: -18.3, maxZ: -17.7 },
  { minX: -8.3, maxX: -4.3, minZ: -4.4, maxZ: -3.85 },
  { minX: 4.3, maxX: 8.3, minZ: -4.4, maxZ: -3.85 }
];

// nx,nz is the screen's front: the direction from the glass toward the visitor.
export const exhibits = [
  { id: 'robots', href: '../robots/index.html', x: -3.55, z: 15, nx: 1, nz: 0, color: '#a7e0cf', num: '01', es: 'Robots', en: 'Robots' },
  { id: 'terafab', href: '../terafab/index.html', x: -3.55, z: 10.5, nx: 1, nz: 0, color: '#b9b1ff', num: '02', es: 'Terafab', en: 'Terafab' },
  { id: 'dyson', href: '../dyson/index.html', x: 3.55, z: 15, nx: -1, nz: 0, color: '#f0c075', num: '03', es: 'Esfera de Dyson', en: 'Dyson sphere' },
  { id: 'home', href: '../home/index.html', x: -3.55, z: 6, nx: 1, nz: 0, color: '#efbd8c', num: '04', es: 'Hogar', en: 'Home' },
  { id: 'starlink', href: '../starlink/index.html', x: 3.55, z: 10.5, nx: -1, nz: 0, color: '#6ee7c5', num: '05', es: 'Starlink', en: 'Starlink' },
  { id: 'spacex', href: '../spacex/index.html', x: 3.55, z: 6, nx: -1, nz: 0, color: '#e8a06a', num: '06', es: 'SpaceX', en: 'SpaceX' },
  { id: 'kardashev', href: '../kardashev/index.html', x: 3.55, z: 1.5, nx: -1, nz: 0, color: '#bba7ef', num: '07', es: 'Kardashev', en: 'Kardashev' },
  { id: 'growth', href: '../growth/index.html', x: -3.55, z: 1.5, nx: 1, nz: 0, color: '#d7e38a', num: '2D', es: 'Crecimiento', en: 'Growth' },
  { id: 'llms', href: '../llms/index.html', x: -4.2, z: -17.15, nx: 0, nz: 1, color: '#99b9ff', num: '08', es: 'LLMs', en: 'LLMs' },
  { id: 'mente', href: '../mente/index.html', x: 0, z: -17.15, nx: 0, nz: 1, color: '#f0b4c4', num: '09', es: 'Mente', en: 'Mind' },
  { id: 'modelos', href: '../modelos/index.html', x: 4.2, z: -17.15, nx: 0, nz: 1, color: '#f3d39a', num: '10', es: 'Modelos', en: 'Models' }
];

export const spawn = { x: 0, z: 18, yaw: 0, pitch: 0 };

// Camera yaw whose −z looks along (dx, dz). Tested against THREE, not against a copy of itself.
export function yawLookingAt(dx, dz) {
  const len = Math.hypot(dx, dz);
  if (!(len > 0)) throw new RangeError('A look direction is required');
  return Math.atan2(-dx / len, -dz / len);
}

export function standAt(exhibit) {
  return {
    x: exhibit.x + exhibit.nx * STAND,
    z: exhibit.z + exhibit.nz * STAND,
    yaw: yawLookingAt(-exhibit.nx, -exhibit.nz),
    pitch: 0
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
  while (remaining > 1e-4) {
    const h = Math.min(0.05, remaining);
    x += (fwd.x * input.forward + right.x * input.strafe) * SPEED * h;
    z += (fwd.z * input.forward + right.z * input.strafe) * SPEED * h;
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

export function roomName(z) {
  return z < -4 ? 'mind' : 'hall';
}

export function insideWall(x, z, boxes = walls) {
  return boxes.some(b => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
}
