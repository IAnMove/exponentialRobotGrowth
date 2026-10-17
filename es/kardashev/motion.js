// Scene motion is independent of K progression and narration playback.
export function advanceScene(clock, dt, moving, visible=true) {
  return moving&&visible&&Number.isFinite(dt)&&dt>0 ? clock+Math.min(dt,.1) : clock;
}

// Circular test-particle orbits around one central body: T ∝ r^(3/2).
// Radii and the reference rate are display units, without a physical clock.
export function collectorAngularSpeed(radius){
  if(!Number.isFinite(radius)||radius<=0)throw new RangeError('Positive finite orbit radius required');
  return .18*(2.5/radius)**1.5;
}
export function collectorPhaseAt(radius,motion){
  if(!Number.isFinite(motion)||motion<0)throw new RangeError('Nonnegative finite scene motion required');
  return (motion*collectorAngularSpeed(radius))%(2*Math.PI);
}
