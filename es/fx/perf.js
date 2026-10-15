import * as THREE from '../../vendor/three.module.js';

// Keeps a 3D scene fluid on phones and weak GPUs, and idle while it is off screen.
// One call after creating the renderer; the scene's own render loop stays unchanged.
// - Phones: pixel ratio capped and soft shadows replaced by regular ones.
// - Slow frames (under ~35 fps for 1.5 s): render scale drops in steps down to `min`;
//   at the minimum, shadow maps stop updating every frame.
// - Off screen (scrolled away or hidden): render calls are skipped until it is visible again.
export function tuneRenderer(renderer, {min = .6, mobileCap = 1.25} = {}) {
  const canvas = renderer.domElement;
  const coarse = !!globalThis.matchMedia?.('(pointer: coarse)').matches || Math.min(globalThis.screen?.width || 1e4, globalThis.screen?.height || 1e4) < 700;
  if (coarse) {
    renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), mobileCap));
    if (renderer.shadowMap.type === THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  let visible = true, last = 0, avg = 1 / 60, slow = 0, cool = 0, frozen = false;
  if ('IntersectionObserver' in globalThis) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; }, {rootMargin: '160px'}).observe(canvas);
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    if (!visible) return;
    const now = performance.now(), dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (dt > .002 && dt < .5) {
      avg += (dt - avg) * .05;
      cool = Math.max(0, cool - dt);
      slow = avg > 1 / 35 ? slow + dt : 0;
      if (slow > 1.5 && cool <= 0) {
        slow = 0; cool = 2;
        const ratio = renderer.getPixelRatio();
        if (ratio > min + 1e-3) renderer.setPixelRatio(Math.max(min, +(ratio * .8).toFixed(2)));
        else if (renderer.shadowMap.enabled && !frozen) { frozen = true; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
      }
    }
    render(scene, camera);
  };
  return {get visible() { return visible; }, get scale() { return renderer.getPixelRatio(); }};
}
