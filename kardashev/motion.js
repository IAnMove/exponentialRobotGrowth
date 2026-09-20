// Scene motion is independent of K progression and narration playback.
export function advanceScene(clock, dt, moving, visible=true) {
  return moving&&visible&&Number.isFinite(dt)&&dt>0 ? clock+Math.min(dt,.1) : clock;
}
