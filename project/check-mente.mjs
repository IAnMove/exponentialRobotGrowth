import assert from 'node:assert/strict';
import {NEURONS, NONNEURONAL, CORTICAL, CEREBELLAR, SYNAPSE_ORDER, BRAIN_WATTS, WORKING_CHUNKS, GROK1, VISUAL, TRACE_BUMP, createState, logisticLoss, contextWindow, visiblePositions, emittedScores, brainJoules, stepWeight, stepTrace, lessonKey, snapshot, tick} from './site-src/mente/model.js';

assert.equal(GROK1.parameters, 314e9);
assert.equal(GROK1.experts, 8);
assert.equal(GROK1.activeExperts, 2);
assert.equal(GROK1.layers, 64);
assert.equal(GROK1.queryHeads, 48);
assert.equal(GROK1.kvHeads, 8);
assert.equal(GROK1.embedding, 6144);
assert.equal(GROK1.vocab, 131072);
assert.equal(GROK1.context, 8192);
assert.equal(NEURONS, 86.1e9);
assert.equal(NONNEURONAL, 84.6e9);
assert.equal(CORTICAL, 16.3e9);
assert.equal(CEREBELLAR, 69e9);
assert.equal(WORKING_CHUNKS, 4);
assert.equal(BRAIN_WATTS, 20);

const remainder = NEURONS - CORTICAL - CEREBELLAR;
assert(remainder > 0.5e9 && remainder < 1e9, 'The rest of the brain is under a billion neurons');
assert(CEREBELLAR / NEURONS > 0.75 && CEREBELLAR / NEURONS < 0.85);
assert(CORTICAL / NEURONS < 0.25);
assert(NONNEURONAL / NEURONS > 0.8 && NONNEURONAL / NEURONS < 1.2, 'Non-neuronal cells are not ten per neuron');
assert.equal(GROK1.activeExperts / GROK1.experts, 0.25);
assert.equal(GROK1.queryHeads / GROK1.kvHeads, 6);
assert(GROK1.parameters / NEURONS > 1, 'Grok-1 has more parameters than the brain has neurons');
assert(SYNAPSE_ORDER / GROK1.parameters > 100 && SYNAPSE_ORDER / GROK1.parameters < 1000);

const visualShare = VISUAL.cerebellar / (VISUAL.cerebellar + VISUAL.cortical);
assert(Math.abs(visualShare - CEREBELLAR / NEURONS) < 0.03);
assert(VISUAL.layers < GROK1.layers);
assert.equal(VISUAL.experts, GROK1.experts);
assert.equal(VISUAL.activeExperts, GROK1.activeExperts);

assert.deepEqual(contextWindow(48), {asked: 48, kept: 48, dropped: 0});
assert.deepEqual(contextWindow(8192), {asked: 8192, kept: 8192, dropped: 0});
assert.deepEqual(contextWindow(8193), {asked: 8193, kept: 8192, dropped: 1});
assert.deepEqual(contextWindow(10.9), {asked: 10, kept: 10, dropped: 0});
assert.deepEqual(contextWindow(-4), {asked: 0, kept: 0, dropped: 0});
assert.throws(() => contextWindow(NaN));
assert.equal(visiblePositions(0, 1), 1);
assert.equal(visiblePositions(10.9, 1), 11);
assert.equal(visiblePositions(8192, 1), 8192);
assert.equal(visiblePositions(8192, 5), 8192);
assert.equal(visiblePositions(8190, 1), 8191);
assert.equal(visiblePositions(8190, 3), 8192);
assert.equal(emittedScores(10, 0), 0);
assert.equal(emittedScores(0, 1), 48);
assert.equal(emittedScores(0, 2), 48 * (1 + 2));
assert.equal(emittedScores(10, 1), 48 * 11);
assert.equal(emittedScores(8192, 2), 48 * 8192 * 2);
assert(emittedScores(100, 4) > emittedScores(100, 3));

assert.equal(brainJoules(8), 160);
assert.equal(brainJoules(0), 0);
assert.throws(() => brainJoules(-1));
assert.throws(() => brainJoules(NaN));

const held = stepWeight(-1.2, 'reply');
assert.equal(held.delta, 0);
assert.equal(held.weight, -1.2);
assert.equal(held.loss, logisticLoss(-1.2));
const moved = stepWeight(-1.2, 'learn');
assert(moved.delta > 0);
assert(moved.loss < logisticLoss(-1.2));
let weight = -1.2;
for (let i = 0; i < 80; i++) {
  const next = stepWeight(weight, 'learn');
  assert(next.loss < logisticLoss(weight));
  weight = next.weight;
}
assert(1 / (1 + Math.exp(-weight)) > 0.97);

assert(stepTrace(0, 'reply').delta === TRACE_BUMP.reply);
assert(stepTrace(0, 'learn').delta === TRACE_BUMP.learn);
assert(stepTrace(0, 'learn').delta > stepTrace(0, 'reply').delta);
assert.equal(stepTrace(1, 'learn').delta, 0);
assert.equal(stepTrace(1, 'learn').trace, 1);

const fresh = createState();
const before = JSON.stringify(fresh);
const view = snapshot(fresh);
assert.equal(JSON.stringify(fresh), before);
assert.equal(view.grokDelta, 0);
assert.equal(view.brainJoules, 160);
assert.equal(view.kept, 48);
assert.equal(view.chunks, 4);
assert.equal(view.nextScores, 48 * 49);
assert.equal(view.lesson, 'window');
assert.equal(view.headsPerKv, 6);
assert.equal(view.expertFraction, 0.25);

assert.equal(lessonKey({mode: 'reply', contextTokens: 3}), 'short');
assert.equal(lessonKey({mode: 'reply', contextTokens: 48}), 'window');
assert.equal(lessonKey({mode: 'learn', contextTokens: 48}), 'learn');
assert.equal(lessonKey({mode: 'reply', contextTokens: 9000}), 'cut');
assert.equal(lessonKey({mode: 'learn', contextTokens: 9000}), 'cut-learn');
assert.equal(lessonKey({...fresh, focus: 'units'}), lessonKey({...fresh, focus: 'energy'}));

const reply = createState();
reply.playing = true;
const w0 = reply.weight;
for (let i = 0; i < 80; i++) tick(reply, 0.5);
assert.equal(reply.weight, w0);
assert.equal(reply.generated, VISUAL.tokens);
assert.equal(reply.playing, false);
assert(Math.abs(reply.trace - VISUAL.tokens * TRACE_BUMP.reply) < 1e-9);

const learning = createState();
learning.mode = 'learn';
learning.playing = true;
tick(learning, 0.5);
assert.equal(learning.generated, 0);
tick(learning, 0.5);
assert.equal(learning.generated, 1);
assert(learning.weight > -1.2);
assert(Math.abs(learning.trace - TRACE_BUMP.learn) < 1e-9);
const paused = createState();
tick(paused, 2);
assert.equal(paused.generated, 0);

console.log('Mind: Grok-1 card, cerebellar majority, glial myth, frozen reply, causal window, brain joules: OK');
