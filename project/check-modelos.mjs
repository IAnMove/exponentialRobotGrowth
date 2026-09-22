import assert from 'node:assert/strict';
import {V2, JAMBA, MAMBA_STATE, DEEPSEEK, ANTHROPIC_RULE, TARIFFS, tariffById, attentionMask, moeActiveFraction, mhaElementsPerToken, mlaElementsPerToken, jambaAttentionLayers, contextMemory, serialRounds, jepaError, jevChoice, jevIndependent, requestCost, repeatedPrefix, requestsToBreakEven, snapshot, createState} from './site-src/modelos/model.js';

assert.equal(DEEPSEEK.flash.off.hit / DEEPSEEK.flash.off.miss, 0.02);
assert.equal(DEEPSEEK.pro.off.hit / DEEPSEEK.pro.off.miss, 0.022 / 0.66);
assert(Math.abs(DEEPSEEK.announced2024.hit / DEEPSEEK.announced2024.miss - 0.1) < 1e-12);
for (const group of ['flash', 'pro']) {
  for (const key of ['hit', 'miss', 'output']) assert.equal(DEEPSEEK[group].peak[key], DEEPSEEK[group].off[key] * 2);
}
assert.notEqual(DEEPSEEK.flash.off.hit, DEEPSEEK.announced2024.hit);
assert.equal(TARIFFS.length, 4);

const prices = tariffById('flash-off');
const once = repeatedPrefix(prices, { prefix: 8000, suffix: 400, output: 600, repeats: 1 });
assert.equal(once.withCache, once.noCache);
assert.equal(once.saved, 0);
const twice = repeatedPrefix(prices, { prefix: 8000, suffix: 400, output: 600, repeats: 2 });
assert(twice.withCache < twice.noCache);
assert.equal(twice.later.outputCost, twice.first.outputCost);
assert(twice.later.hitCost < twice.first.missCost);
const onlyOutput = requestCost(prices, { hit: 0, miss: 0, output: 1e6 });
assert.equal(onlyOutput.total, prices.output);
assert.equal(onlyOutput.hitCost, 0);
assert.throws(() => requestCost(prices, { hit: -1, miss: 0, output: 0 }));

assert(Math.abs(requestsToBreakEven(1.25, 0.1) - (1.25 - 0.1) / 0.9) < 1e-12);
assert(requestsToBreakEven(ANTHROPIC_RULE.write5m, ANTHROPIC_RULE.read) > 1);
assert(requestsToBreakEven(ANTHROPIC_RULE.write5m, ANTHROPIC_RULE.read) < 2);
assert(requestsToBreakEven(ANTHROPIC_RULE.write1h, ANTHROPIC_RULE.read) > 2);
assert(requestsToBreakEven(ANTHROPIC_RULE.write1h, ANTHROPIC_RULE.read) < 3);
assert.equal(requestsToBreakEven(1, prices.hit / prices.miss), 1);

assert.equal(mhaElementsPerToken() / mlaElementsPerToken(), (2 * V2.heads * V2.headDim) / (V2.kvLoraRank + V2.ropeDim));
assert(mlaElementsPerToken() < mhaElementsPerToken() / 50);
const short = contextMemory(1), long = contextMemory(10000);
assert.equal(short.ssm, long.ssm);
assert.equal(long.ssm, V2.layers * MAMBA_STATE);
assert(long.mla > short.mla);
assert.equal(jambaAttentionLayers(), 4);
assert.equal(jambaAttentionLayers() / JAMBA.layers, 0.125);

const causal = attentionMask('causal', 0, 8);
assert.equal(causal[0], 1);
assert.equal(causal[7], 0);
assert(Math.abs(causal.reduce((a, b) => a + b, 0) - 1) < 1e-12);
const encoder = attentionMask('bidirectional', 0, 8);
assert(encoder[7] > 0);
assert(encoder.every(x => Math.abs(x - 1 / 8) < 1e-12));
assert.equal(attentionMask('cross', 0, 8, 5).length, 5);
assert.equal(moeActiveFraction(8, 2), 0.25);
assert.deepEqual(serialRounds('diffusion', 100, 8), { rounds: 8, positionsPerRound: 100 });
assert.deepEqual(serialRounds('autoregressive', 100, 8), { rounds: 100, positionsPerRound: 1 });
assert.equal(jepaError([0, 0], [0, 1]), 0.5);
assert.throws(() => jepaError([0], [0, 1]));

const sure = jevChoice(['cobrar', 'esperar', 'derivar'], [3, 0, -1]);
assert.equal(sure.choice, 'cobrar');
assert(sure.probabilities.every((_, i, all) => all.includes(sure.probabilities[i])));
assert.equal(sure.options, undefined);
assert(Math.abs(sure.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
const both = jevIndependent([
  { options: ['sí', 'no'], logits: [0.8, 0.8] },
  { options: ['sí', 'no'], logits: [0.8, 0.8] }
]);
assert(Math.abs(both[0].probabilities[0] - 0.5) < 1e-9);
assert(Math.abs(both[1].probabilities[0] - 0.5) < 1e-9);

const view = snapshot(createState());
assert.equal(view.family, 'cache');
assert(view.bill.saved > 0);
assert.equal(view.causalHidesFuture, true);
assert.equal(view.encoderSeesFuture, true);
assert.equal(JSON.stringify(createState()), JSON.stringify(createState()));
const before = JSON.stringify(createState());
snapshot(createState());
assert.equal(JSON.stringify(createState()), before);

console.log('Models: DeepSeek sheet, prefix bill, MLA shrink, masks, Jev schema and break-even: OK');
