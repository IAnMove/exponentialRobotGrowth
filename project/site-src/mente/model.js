// Reference data: Grok-1's March 2024 open release, not the current Grok service.
// https://github.com/xai-org/grok-1 (README, model.py and runners.py).
// Brain counts are the published central estimates of Azevedo et al. (2009),
// doi:10.1002/cne.21974. Non-neuronal cells are not all necessarily glia.
// Neither census counts nor this small mathematical example simulate a brain.
export const NEURONS = 86.1e9;
export const NONNEURONAL = 84.6e9;
export const CORTICAL = 16.3e9;
export const CEREBELLAR = 69e9;
export const SYNAPSE_ORDER = 1e14;
// Whole-organ order estimate, not the incremental cost of a sentence:
// Raichle & Gusnard (2002), doi:10.1073/pnas.172399499.
export const BRAIN_WATTS = 20;
// Approximate mean under Cowan's experimental conditions, not a token limit:
// Cowan (2001), doi:10.1017/S0140525X01003922.
export const WORKING_CHUNKS = 4;
export const LEARN_RATE = 0.7;
export const GROK1 = Object.freeze({
  name: 'Grok-1', released: '2024-03', parameters: 314e9,
  experts: 8, activeExperts: 2, layers: 64, queryHeads: 48, kvHeads: 8,
  embedding: 6144, vocab: 131072, context: 8192
});

export const MAX_TICK = 48;
export const TOKEN_STEPS = 6;
export const OUTPUT_TOKENS = 8;
export const TOY_DIM = 3;
export const TOY_ROWS = 12;
export const STAGES = Object.freeze(['query', 'scores', 'values', 'route', 'logits', 'emit']);
export const LEARNING_STAGES = Object.freeze(['forward', 'loss', 'gradient', 'update']);
export const VISUAL = Object.freeze({
  cerebellar: 280, cortical: 70, layers: 8, experts: 8, activeExperts: 2,
  tokens: OUTPUT_TOKENS
});
export const DEFAULT_PARAMS = Object.freeze({
  promptTokens: 6, mode: 'reply', chapter: 'memory', humanGrouping: false,
  learningRate: LEARN_RATE, weight: -1.2, label: 1, seconds: 8
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// This is a deliberately small, fixed-weight decoder example, not Grok-1's
// weights, tokenizer, RoPE, expert nonlinearity or an estimate of its answers.
// Matrices use row vectors: project(x, W)[j] = sum_i x[i] * W[i][j].
export const TOY_VOCAB = Object.freeze([
  '<BOS>', 'the', 'robot', 'can', 'learn', 'helps',
  'people', 'with', 'task', 'today', 'and', '.'
]);
const embeddings = [
  [0, 0, 0], [.8, .2, -.4], [.2, 1.1, .4], [1, -.5, .2],
  [.4, .1, 1.2], [-.7, .5, .9], [-.5, -.8, .3], [.6, -.1, -.9],
  [-.4, .9, -.8], [.9, .7, .1], [-.9, -.3, -.5], [.3, -.9, -1]
];
const expertDirections = [
  [.9, .1, -.4], [-.6, .8, .3], [.2, -.4, .9], [-.8, -.2, .6],
  [.4, .9, -.1], [.7, -.8, .2], [-.3, .5, -.8], [-.4, -.7, -.5]
];
export const TOY_WEIGHTS = deepFreeze({
  embeddings,
  query: [[.7, -.2, .1], [.2, .9, -.3], [-.1, .4, .6]],
  key: [[.6, .1, -.2], [-.3, .8, .2], [.2, -.1, .7]],
  value: [[.8, -.1, .2], [.1, .6, -.4], [-.2, .3, .9]],
  output: [[.65, .1, -.2], [-.1, .7, .15], [.2, -.15, .6]],
  router: Array.from({length: TOY_DIM}, (_, i) => expertDirections.map(row => row[i])),
  routerBias: expertDirections.map((_, i) => .02 * (i % 3 - 1)),
  experts: expertDirections.map((_, e) => ({
    in: Array.from({length: TOY_DIM}, (_, i) => Array.from({length: 4}, (_, j) =>
      .45 * Math.sin((e + 1) * (i + 1) + (j + 1) * .7))),
    inBias: Array.from({length: 4}, (_, j) => .07 * Math.cos(e + j)),
    out: Array.from({length: 4}, (_, i) => Array.from({length: TOY_DIM}, (_, j) =>
      .35 * Math.cos((e + 1) + (i + 1) * (j + 1) * .6))),
    outBias: expertDirections[e].map(x => .04 * x)
  })),
  // A fixed rotation avoids a visually unhelpful identity/self-copy projection.
  // It does not make these hand-chosen weights a trained language model.
  vocabularyProjection: Array.from({length: TOY_DIM}, (_, i) => embeddings.map(row => .8 *
    (i === 0 ? Math.cos(1.2) * row[0] - Math.sin(1.2) * row[1]
      : i === 1 ? Math.sin(1.2) * row[0] + Math.cos(1.2) * row[1] : row[2]))),
  vocabularyBias: embeddings.map((_, i) => i === 0 ? -6 : .03 * (i % 4 - 1.5))
});

const PROMPT_PATTERN = Object.freeze([2, 5, 6, 10, 4, 9, 3, 7, 8, 11, 1]);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const add = (a, b) => a.map((x, i) => x + b[i]);
function project(x, matrix, bias = null) {
  return matrix[0].map((_, j) =>
    x.reduce((sum, value, i) => sum + value * matrix[i][j], bias?.[j] ?? 0));
}
function softmax(scores) {
  const top = Math.max(...scores);
  const exponentials = scores.map(x => Math.exp(x - top));
  const total = exponentials.reduce((sum, x) => sum + x, 0);
  return exponentials.map(x => x / total);
}
function finiteOr(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

export function sanitizeParams(raw = {}) {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    // Preserve an overlong input so it can be rejected visibly; never crop it.
    promptTokens: Math.floor(clamp(finiteOr(p.promptTokens, DEFAULT_PARAMS.promptTokens), 0, 12000)),
    mode: p.mode === 'learn' ? 'learn' : 'reply',
    chapter: ['units', 'memory', 'learn', 'energy'].includes(p.chapter) ? p.chapter : DEFAULT_PARAMS.chapter,
    humanGrouping: p.humanGrouping === true,
    learningRate: clamp(finiteOr(p.learningRate, DEFAULT_PARAMS.learningRate), 0, 2),
    weight: clamp(finiteOr(p.weight, DEFAULT_PARAMS.weight), -8, 8),
    label: p.label === 0 || p.label === false ? 0 : 1,
    seconds: clamp(finiteOr(p.seconds, DEFAULT_PARAMS.seconds), 0, 60)
  };
}

function sigmoid(weight) {
  return weight >= 0 ? 1 / (1 + Math.exp(-weight)) : Math.exp(weight) / (1 + Math.exp(weight));
}
export function logisticLoss(weight, label = 1) {
  if (!Number.isFinite(weight) || (label !== 0 && label !== 1)) throw new RangeError('Finite weight and binary label required');
  return Math.max(0, weight) + Math.log1p(Math.exp(-Math.abs(weight))) - label * weight;
}
export function brainJoules(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Nonnegative seconds required');
  return BRAIN_WATTS * seconds;
}

export function positionEmbedding(position) {
  if (!Number.isInteger(position) || position < 0) throw new RangeError('Nonnegative integer position required');
  // Added sinusoidal positions belong only to this toy; Grok-1 instead uses RoPE.
  return [.12 * Math.sin(position * .7), .12 * Math.cos(position * .7), .12 * Math.sin(position * .31 + .4)];
}

export function representativePositions(length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError('Positive integer length required');
  if (length <= TOY_ROWS) return Array.from({length}, (_, i) => i);
  // This samples a large reference prefix for a legible reduced example; it is
  // not a sliding window, not a KV eviction policy, and not full Grok attention.
  return [0, 1, ...Array.from({length: TOY_ROWS - 2}, (_, i) => length - (TOY_ROWS - 2) + i)];
}

function prefixRow(position, promptPositions, bos, outputs) {
  const tokenId = position < promptPositions
    ? bos ? 0 : PROMPT_PATTERN[position % PROMPT_PATTERN.length]
    : outputs[position - promptPositions];
  const positionVector = positionEmbedding(position);
  return {
    id: 'position-' + position, position, tokenId, label: TOY_VOCAB[tokenId],
    source: position < promptPositions ? bos ? 'bos' : 'prompt' : 'output',
    tokenEmbedding: TOY_WEIGHTS.embeddings[tokenId], positionEmbedding: positionVector,
    embedding: add(TOY_WEIGHTS.embeddings[tokenId], positionVector)
  };
}

function computeStep(index, promptPositions, bos, outputs) {
  const fullPositionCount = promptPositions + index;
  const positions = representativePositions(fullPositionCount);
  const prefix = positions.map(position => prefixRow(position, promptPositions, bos, outputs));
  const vectors = prefix.map(row => row.embedding);
  const last = vectors.at(-1);
  const query = project(last, TOY_WEIGHTS.query);
  const keys = vectors.map(row => project(row, TOY_WEIGHTS.key));
  const values = vectors.map(row => project(row, TOY_WEIGHTS.value));
  // The current query belongs to the final known position. Every displayed key
  // is at or before it; future tokens have neither keys nor values here.
  const scores = keys.map(key => dot(query, key) / Math.sqrt(TOY_DIM));
  const weights = softmax(scores);
  const mixed = Array.from({length: TOY_DIM}, (_, j) =>
    values.reduce((sum, row, i) => sum + weights[i] * row[j], 0));
  const routerInput = add(last, project(mixed, TOY_WEIGHTS.output));
  const routerScores = project(routerInput, TOY_WEIGHTS.router, TOY_WEIGHTS.routerBias);
  const selected = routerScores.map((_, i) => i).sort((a, b) => routerScores[b] - routerScores[a] || a - b).slice(0, 2);
  const selectedWeights = softmax(selected.map(i => routerScores[i]));
  const experts = selected.map((id, i) => {
    const w = TOY_WEIGHTS.experts[id];
    const hidden = project(routerInput, w.in, w.inBias).map(Math.tanh);
    return {id, weight: selectedWeights[i], input: routerInput, hidden, output: project(hidden, w.out, w.outBias)};
  });
  const expertMixed = Array.from({length: TOY_DIM}, (_, j) =>
    experts.reduce((sum, expert) => sum + expert.weight * expert.output[j], 0));
  const finalHidden = add(routerInput, expertMixed);
  const logits = project(finalHidden, TOY_WEIGHTS.vocabularyProjection, TOY_WEIGHTS.vocabularyBias);
  const probabilities = softmax(logits);
  const tokenId = probabilities.reduce((best, value, i) => value > probabilities[best] ? i : best, 0);
  return {
    index, start: index * TOKEN_STEPS, end: (index + 1) * TOKEN_STEPS,
    operation: index === 0 ? 'prefill' : 'decode', prefix,
    attention: {
      dim: TOY_DIM, heads: 1, layers: 1, embeddings: vectors,
      query, queryPosition: fullPositionCount - 1, keyPositions: positions,
      keys, values, scores, weights, mixed, causalMask: positions.map(() => true),
      fullPositionCount, displayCount: positions.length, sampled: fullPositionCount > TOY_ROWS,
      scope: fullPositionCount > TOY_ROWS ? 'representative-toy-positions' : 'all-toy-positions'
    },
    router: {
      input: routerInput, scores: routerScores, probabilities: softmax(routerScores),
      selected, weights: selectedWeights, experts,
      outputs: experts.map(expert => expert.output), mixed: expertMixed, finalHidden
    },
    logits, probabilities, prediction: {tokenId, label: TOY_VOCAB[tokenId]}
  };
}

export function makeTrace(rawParams = {}) {
  const params = sanitizeParams(rawParams);
  const bos = params.promptTokens === 0;
  const promptPositions = bos ? 1 : params.promptTokens;
  const valid = promptPositions <= GROK1.context;
  // The final processed prefix can predict one next token. That prediction is
  // not in KV yet: with P=8192 y1 is available, but y1 cannot be processed again.
  const outputLimit = valid ? Math.min(OUTPUT_TOKENS, GROK1.context - promptPositions + 1) : 0;
  const outputs = [], steps = [];
  for (let i = 0; i < outputLimit; i++) {
    const step = computeStep(i, promptPositions, bos, outputs);
    steps.push(step);
    outputs.push(step.prediction.tokenId);
  }
  const probability = sigmoid(params.weight);
  const gradient = probability - params.label; // One labelled sample, x=1.
  const after = params.weight - params.learningRate * gradient;
  return deepFreeze({
    params, horizon: MAX_TICK, valid, status: valid ? 'ready' : 'input-too-long',
    reason: valid ? null : 'prompt-exceeds-8192-positions',
    bos, promptPositions, outputLimit, stopTick: outputLimit * TOKEN_STEPS,
    steps, outputs,
    learning: {
      input: 1, label: params.label, before: params.weight, learningRate: params.learningRate,
      probability, loss: logisticLoss(params.weight, params.label), gradient, after,
      delta: after - params.weight, afterProbability: sigmoid(after), afterLoss: logisticLoss(after, params.label)
    }
  });
}

function timeAt(tick) {
  if (tick === Infinity) return MAX_TICK;
  return clamp(Number.isFinite(tick) ? tick : 0, 0, MAX_TICK);
}

function learningAt(trace, time) {
  const enabled = trace.params.mode === 'learn';
  const t = enabled ? time : 0;
  const complete = enabled && t >= MAX_TICK;
  const phase = complete ? 'complete' : LEARNING_STAGES[Math.floor(t / 12)];
  const preview = trace.learning;
  const ready = {forward: enabled && t >= 12, loss: enabled && t >= 24, gradient: enabled && t >= 36, update: complete};
  return {
    active: enabled && !complete, stage: phase, phase,
    progress: complete ? 1 : (t % 12) / 12, ready,
    input: 1, label: preview.label, learningRate: preview.learningRate,
    before: preview.before, weight: complete ? preview.after : preview.before,
    probability: ready.forward ? preview.probability : null,
    loss: ready.loss ? preview.loss : null,
    gradient: ready.gradient ? preview.gradient : null,
    after: ready.update ? preview.after : null,
    delta: ready.update ? preview.delta : null,
    afterProbability: ready.update ? preview.afterProbability : null,
    afterLoss: ready.update ? preview.afterLoss : null,
    expected: preview
  };
}

function brainAt(params, time) {
  const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const groups = params.humanGrouping ? [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H']] : items.map(item => [item]);
  const elapsedSeconds = params.seconds * time / MAX_TICK;
  return {
    neurons: NEURONS, nonneuronal: NONNEURONAL, cortical: CORTICAL, cerebellar: CEREBELLAR,
    cerebellarShare: CEREBELLAR / NEURONS, corticalShare: CORTICAL / NEURONS,
    nonneuronalPerNeuron: NONNEURONAL / NEURONS,
    watts: BRAIN_WATTS, estimated: true, intervalSeconds: params.seconds, elapsedSeconds,
    energyJoules: brainJoules(elapsedSeconds), estimatedIntervalEnergy: brainJoules(params.seconds),
    human: {
      items, groups, illustratedChunks: groups.length, grouped: params.humanGrouping,
      referenceCapacity: {mean: WORKING_CHUNKS, approximateRange: [3, 5]},
      scope: 'illustrative-grouping-not-memory-performance'
    }
  };
}

export function frameAt(trace, tick = 0) {
  const time = timeAt(tick);
  const inferenceEnabled = trace.params.mode === 'reply' && trace.valid;
  const t = inferenceEnabled ? Math.min(time, trace.stopTick) : 0;
  const generated = inferenceEnabled ? Math.min(trace.outputLimit, Math.floor(t / TOKEN_STEPS)) : 0;
  const finished = inferenceEnabled && generated >= trace.outputLimit;
  const contextFull = finished && trace.outputLimit < OUTPUT_TOKENS;
  const stepIndex = Math.min(Math.floor(t / TOKEN_STEPS), Math.max(0, trace.outputLimit - 1));
  const step = trace.steps[stepIndex] ?? null;
  const local = step ? t - step.start : 0;
  const phaseIndex = Math.min(STAGES.length - 1, Math.floor(local));
  const replyPhase = !trace.valid ? 'invalid' : finished ? contextFull ? 'context-full' : 'complete' : STAGES[phaseIndex];
  const attentionReady = {
    query: inferenceEnabled && local >= 1,
    keys: inferenceEnabled && local >= 1,
    values: inferenceEnabled && local >= 1,
    scores: inferenceEnabled && local >= 2,
    weights: inferenceEnabled && local >= 2,
    mixed: inferenceEnabled && local >= 3
  };
  const decodeCached = inferenceEnabled && t >= 1
    ? Math.min(Math.max(0, trace.outputLimit - 1), Math.max(0, Math.floor((t - 1) / TOKEN_STEPS))) : 0;
  const promptCached = inferenceEnabled && t >= 1;
  const cachePositions = promptCached ? trace.promptPositions + decodeCached : 0;
  const prefillComplete = inferenceEnabled && t >= 2;
  const decodeQueries = inferenceEnabled && t >= 2
    ? Math.min(Math.max(0, trace.outputLimit - 1), Math.max(0, Math.floor((t - 2) / TOKEN_STEPS))) : 0;
  const prefillPerLayer = prefillComplete ? GROK1.queryHeads * trace.promptPositions * (trace.promptPositions + 1) / 2 : 0;
  const decodePerLayer = GROK1.queryHeads * (decodeQueries * trace.promptPositions + decodeQueries * (decodeQueries + 1) / 2);
  const totalPerLayer = prefillPerLayer + decodePerLayer;
  const canQuery = inferenceEnabled && !finished;
  const requiredNextPositions = trace.valid ? trace.promptPositions + generated : null;
  const training = learningAt(trace, time);
  const phase = trace.params.mode === 'learn' ? training.phase : replyPhase;
  const stageProgress = trace.params.mode === 'learn' ? training.progress : finished ? 1 : local - Math.floor(local);
  const emitted = trace.outputs.slice(0, generated).map(tokenId => TOY_VOCAB[tokenId]);
  const predictionReady = inferenceEnabled && local >= 5;
  return {
    tick: time, time, continuous: true, completed: Math.floor(time), progress: time / MAX_TICK,
    active: time < MAX_TICK && (trace.params.mode === 'learn' || canQuery),
    mode: trace.params.mode, chapter: trace.params.chapter, valid: trace.valid,
    reason: trace.reason, bos: trace.bos, contextFull,
    stage: phase, phase, stageProgress,
    inferenceActive: canQuery, inferenceWeightsFrozen: true,
    operation: step?.operation ?? null, tokenIndex: step?.index ?? null,
    tokenNumber: step ? step.index + 1 : null,
    generated, emitted, emittedIds: trace.outputs.slice(0, generated),
    promptPositions: trace.promptPositions, outputLimit: trace.outputLimit,
    prefix: step?.prefix ?? [],
    attention: step ? {...step.attention, ready: attentionReady} : null,
    router: step ? {...step.router, ready: inferenceEnabled && local >= 4} : null,
    logits: step?.logits ?? [], probabilities: step?.probabilities ?? [],
    logitsReady: predictionReady,
    output: {
      tokenId: predictionReady ? step.prediction.tokenId : null,
      label: predictionReady ? step.prediction.label : null,
      ready: predictionReady, emitted: predictionReady && local >= TOKEN_STEPS
    },
    expectedOutput: step?.prediction ?? null,
    lastOutput: generated ? {tokenId: trace.outputs[generated - 1], label: emitted.at(-1)} : null,
    cache: {
      positions: cachePositions, promptCached, processedGenerated: decodeCached,
      knownSequence: trace.valid ? trace.promptPositions + generated : 0,
      pendingInput: trace.valid && !promptCached ? trace.promptPositions : 0,
      pendingOutput: Math.max(0, generated - decodeCached),
      requiredNextPositions, canQuery, capacity: GROK1.context,
      remainingProcessedPositions: trace.valid ? GROK1.context - cachePositions : 0
    },
    counts: {
      // Count causally permitted query-key pairs. A dense kernel can evaluate
      // masked entries too, so the triangular count is not executed GPU work.
      scope: 'analytical-grok1-unmasked-qk-scores-not-executed-flops-or-joules',
      prefillComplete, decodeQueries, prefillPerLayer, decodePerLayer, totalPerLayer,
      allLayers: totalPerLayer * GROK1.layers,
      nextPerLayer: canQuery ? GROK1.queryHeads * requiredNextPositions : null,
      queryHeads: GROK1.queryHeads, layers: GROK1.layers
    },
    packets: step && canQuery ? STAGES.map((stage, i) => ({
      id: stage, stage, progress: clamp(local - i, 0, 1), active: local >= i && local < i + 1,
      value: [step.attention.query, step.attention.weights, step.attention.mixed,
        step.router.selected, step.probabilities, step.prediction.tokenId][i]
    })) : [],
    training, brain: brainAt(trace.params, time)
  };
}
