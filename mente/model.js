// Grok-1 is the only complete public architecture card from xAI (March 2024).
// Later Grok versions are not assigned these counts. Brain figures are published
// central estimates or stated orders of magnitude, not a neural simulation.
export const NEURONS = 86.1e9;
export const NONNEURONAL = 84.6e9;
export const CORTICAL = 16.3e9;
export const CEREBELLAR = 69e9;
export const SYNAPSE_ORDER = 1e14;
export const BRAIN_WATTS = 20;
export const WORKING_CHUNKS = 4;
export const LEARN_RATE = 0.7;
export const TRACE_BUMP = {reply: 0.015, learn: 0.06};
export const TOKEN_INTERVAL = 0.45;
export const GROK1 = Object.freeze({
  name: 'Grok-1',
  released: '2024-03',
  parameters: 314e9,
  experts: 8,
  activeExperts: 2,
  layers: 64,
  queryHeads: 48,
  kvHeads: 8,
  embedding: 6144,
  vocab: 131072,
  context: 8192
});
// Point counts in the 3D view. The cerebellar share matches the census; the layer count does not.
export const VISUAL = Object.freeze({
  cerebellar: 280,
  cortical: 70,
  layers: 8,
  experts: 8,
  activeExperts: 2,
  tokens: 16
});

export function createState() {
  return {focus: 'memory', mode: 'reply', contextTokens: 48, seconds: 8, generated: 0, playing: false, weight: -1.2, trace: 0, time: 0};
}

export function logisticLoss(weight) {
  if (!Number.isFinite(weight)) throw new RangeError('Finite weight required');
  const probability = 1 / (1 + Math.exp(-weight));
  return -Math.log(Math.max(probability, 1e-12));
}

export function contextWindow(tokens) {
  if (!Number.isFinite(tokens)) throw new RangeError('Finite token count required');
  const asked = Math.max(0, Math.floor(tokens));
  const kept = Math.min(asked, GROK1.context);
  return {asked, kept, dropped: asked - kept};
}

// nthNew is the 1-based index of a newly generated token. KV cache: score the
// current window once. Past the card's context, the oldest position falls off.
export function visiblePositions(promptTokens, nthNew) {
  const prompt = contextWindow(promptTokens).kept;
  const n = Math.max(1, Math.floor(nthNew));
  return Math.min(GROK1.context, prompt + n);
}

export function emittedScores(promptTokens, generated) {
  const n = Math.max(0, Math.floor(Number.isFinite(generated) ? generated : 0));
  let total = 0;
  for (let i = 1; i <= n; i++) total += GROK1.queryHeads * visiblePositions(promptTokens, i);
  return total;
}

export function brainJoules(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Nonnegative seconds required');
  return BRAIN_WATTS * seconds;
}

// One logistic step toward a positive label. Reply mode reports the loss and moves nothing.
export function stepWeight(weight, mode) {
  const loss = logisticLoss(weight);
  if (mode !== 'learn') return {weight, delta: 0, loss};
  const probability = 1 / (1 + Math.exp(-weight));
  const next = weight + LEARN_RATE * (1 - probability);
  return {weight: next, delta: next - weight, loss: logisticLoss(next)};
}

// Didactic local trace. The bump is not a measured synaptic change.
export function stepTrace(trace, mode) {
  if (!Number.isFinite(trace)) throw new RangeError('Finite trace required');
  const bump = TRACE_BUMP[mode] ?? TRACE_BUMP.reply;
  const clamped = Math.min(1, Math.max(0, trace));
  const next = Math.min(1, clamped + bump);
  return {trace: next, delta: next - clamped};
}

export function lessonKey(state) {
  const cut = contextWindow(state.contextTokens).dropped > 0;
  if (cut && state.mode === 'learn') return 'cut-learn';
  if (cut) return 'cut';
  if (state.mode === 'learn') return 'learn';
  if (state.contextTokens > WORKING_CHUNKS) return 'window';
  return 'short';
}

export function snapshot(state) {
  const window = contextWindow(state.contextTokens);
  const upcoming = stepWeight(state.weight, state.mode);
  return {
    focus: state.focus,
    mode: state.mode,
    playing: state.playing,
    contextTokens: window.asked,
    kept: window.kept,
    dropped: window.dropped,
    seconds: state.seconds,
    generated: state.generated,
    chunks: WORKING_CHUNKS,
    brainJoules: brainJoules(state.seconds),
    brainWatts: BRAIN_WATTS,
    nextScores: GROK1.queryHeads * visiblePositions(window.asked, 1),
    emittedScores: emittedScores(window.asked, state.generated),
    weight: state.weight,
    loss: logisticLoss(state.weight),
    grokDelta: upcoming.delta,
    nextLoss: upcoming.loss,
    trace: state.trace,
    cerebellarShare: CEREBELLAR / NEURONS,
    corticalShare: CORTICAL / NEURONS,
    nonneuronalPerNeuron: NONNEURONAL / NEURONS,
    parametersPerNeuron: GROK1.parameters / NEURONS,
    synapsesPerParameter: SYNAPSE_ORDER / GROK1.parameters,
    expertFraction: GROK1.activeExperts / GROK1.experts,
    headsPerKv: GROK1.queryHeads / GROK1.kvHeads,
    vocab: GROK1.vocab,
    layers: GROK1.layers,
    lesson: lessonKey(state)
  };
}

export function tick(state, dt) {
  if (!state.playing || !Number.isFinite(dt) || dt <= 0) return state;
  state.time += Math.min(dt, 0.25);
  if (state.time < TOKEN_INTERVAL) return state;
  state.time -= TOKEN_INTERVAL;
  if (state.generated < VISUAL.tokens) {
    state.generated += 1;
    state.weight = stepWeight(state.weight, state.mode).weight;
    state.trace = stepTrace(state.trace, state.mode).trace;
  }
  if (state.generated >= VISUAL.tokens) state.playing = false;
  return state;
}
