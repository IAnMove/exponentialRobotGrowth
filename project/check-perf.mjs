// tuneRenderer: phone caps, stepwise render-scale drop, live low-cost shadows, off-screen skipping.
import assert from 'node:assert/strict';

let now = 0, observer = null;
globalThis.performance = {now: () => now};
globalThis.IntersectionObserver = class {constructor(fn) {observer = fn;} observe() {}};
const {tuneRenderer} = await import('./dist/fx/perf.js');
const THREE = await import('./dist/vendor/three.module.js');

function fakeRenderer(ratio = 1.5, soft = true) {
  return {domElement: {}, ratio, renders: 0, shadowMap: {enabled: true, autoUpdate: true, type: soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap},
    getPixelRatio() { return this.ratio; }, setPixelRatio(v) { this.ratio = v; }, render() { this.renders++; }};
}
const frames = (r, n, ms) => { for (let i = 0; i < n; i++) { now += ms; r.render({}, {}); } };

// Desktop: fast frames keep full quality.
globalThis.matchMedia = () => ({matches: false});
globalThis.screen = {width: 1920, height: 1080};
let r = fakeRenderer();
tuneRenderer(r);
frames(r, 300, 16);
assert.equal(r.ratio, 1.5, 'a fluid scene keeps its resolution');
assert.equal(r.renders, 300);

// Slow frames: resolution reaches its floor, then the filter gets cheaper.
// A moving caster must keep moving its shadow at the lowest quality too.
frames(r, 2000, 50);
assert.equal(r.ratio, .6, 'render scale bottoms out at the minimum');
assert.equal(r.shadowMap.type, THREE.BasicShadowMap, 'the lowest quality uses an unfiltered shadow map');
assert.equal(r.shadowMap.autoUpdate, true, 'adaptive quality must keep moving shadows live');

// Off screen: render calls are skipped, and resume once visible.
const before = r.renders;
observer([{isIntersecting: false}]);
frames(r, 50, 16);
assert.equal(r.renders, before, 'nothing renders while off screen');
observer([{isIntersecting: true}]);
frames(r, 5, 16);
assert.equal(r.renders, before + 5);

// A scene that deliberately owns a static shadow map retains that policy.
const staticRenderer = fakeRenderer(.6, false);
staticRenderer.shadowMap.autoUpdate = false;
tuneRenderer(staticRenderer);
frames(staticRenderer, 2000, 50);
assert.equal(staticRenderer.shadowMap.autoUpdate, false, 'the helper preserves explicitly static shadows');

// Phones: pixel ratio capped and soft shadows replaced.
globalThis.matchMedia = q => ({matches: q.includes('coarse')});
r = fakeRenderer(1.7, true);
tuneRenderer(r);
assert.equal(r.ratio, 1.25);
assert.equal(r.shadowMap.type, THREE.PCFShadowMap);

// Environments without matchMedia/screen (tests, workers) keep working.
delete globalThis.matchMedia; delete globalThis.screen;
r = fakeRenderer(1);
tuneRenderer(r);
frames(r, 10, 16);
assert.equal(r.renders, 10);
console.log('Perf: fluid scenes untouched, stepwise scale drop, live basic shadows, explicit static maps, off-screen skip, phone caps: OK');
