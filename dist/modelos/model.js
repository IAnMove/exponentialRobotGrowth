// Families the autoregressive notebook does not draw, plus token price.
// DeepSeek dollar amounts are the published sheet of 19 September 2026.
// MLA widths are DeepSeek-V2's published comparison, not an unpublished V4 card.

export const V2 = Object.freeze({
  layers: 60,
  heads: 128,
  headDim: 128,
  kvLoraRank: 512,
  ropeDim: 64,
  bytes: 2
});

export const JAMBA = Object.freeze({ layers: 32, attentionEvery: 8 });
// Gu & Dao 2023: the recurrent state width N. A real layer holds N per channel.
// The count below is N per layer, enough to show that it does not grow with the tokens.
export const MAMBA_STATE = 16;

// USD per 1e6 tokens. Peak is exactly twice off-peak on this sheet.
// https://api-docs.deepseek.com/quick_start/pricing
export const DEEPSEEK = Object.freeze({
  date: '2026-09-19',
  peakUtc: 'Mon–Fri 01:00–04:00 and 06:00–10:00 UTC, outside Chinese public holidays',
  flash: {
    off: { hit: 0.003, miss: 0.15, output: 0.6 },
    peak: { hit: 0.006, miss: 0.3, output: 1.2 }
  },
  pro: {
    off: { hit: 0.022, miss: 0.66, output: 1.98 },
    peak: { hit: 0.044, miss: 1.32, output: 3.96 }
  },
  // Launch note, 2024. Not the current sheet. Hit and miss only.
  announced2024: { hit: 0.014, miss: 0.14 }
});

// Anthropic's published prompt-cache rule, as multipliers of a base input price.
// 5-minute write 1.25×, 1-hour write 2×, read 0.1×. The base itself is editable.
export const ANTHROPIC_RULE = Object.freeze({
  read: 0.1,
  write5m: 1.25,
  write1h: 2
});

export const TARIFFS = Object.freeze([
  { id: 'flash-off', group: 'flash', band: 'off', ...DEEPSEEK.flash.off },
  { id: 'flash-peak', group: 'flash', band: 'peak', ...DEEPSEEK.flash.peak },
  { id: 'pro-off', group: 'pro', band: 'off', ...DEEPSEEK.pro.off },
  { id: 'pro-peak', group: 'pro', band: 'peak', ...DEEPSEEK.pro.peak }
]);

export function tariffById(id) {
  const found = TARIFFS.find(t => t.id === id);
  if (!found) throw new RangeError('Unknown tariff');
  return found;
}

export function softmax(logits) {
  if (!logits.length || logits.some(x => !Number.isFinite(x))) throw new RangeError('Finite nonempty logits required');
  const max = Math.max(...logits);
  const weights = logits.map(x => Math.exp(x - max));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(x => x / sum);
}

function uniform(count, visible) {
  const row = Array.from({ length: count }, (_, j) => visible(j) ? 1 : 0);
  const sum = row.reduce((a, b) => a + b, 0);
  if (!sum) throw new RangeError('Mask hid every position');
  return row.map(x => x / sum);
}

// causal: a decoder token sees itself and the past. bidirectional: an encoder sees all.
// cross: a decoder query sees every encoder position, and none of a future decoder token.
export function attentionMask(kind, query, count, sourceCount = count) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Count required');
  if (kind === 'cross') return uniform(sourceCount, () => true);
  if (!Number.isInteger(query) || query < 0 || query >= count) throw new RangeError('Query out of range');
  if (kind === 'causal') return uniform(count, j => j <= query);
  if (kind === 'bidirectional') return uniform(count, () => true);
  throw new RangeError('Unknown mask');
}

export function moeActiveFraction(experts, active) {
  if (!(experts > 0) || !(active > 0) || active > experts) throw new RangeError('Active experts must fit');
  return active / experts;
}

export function mhaElementsPerToken(spec = V2) {
  return spec.layers * 2 * spec.heads * spec.headDim;
}
export function mlaElementsPerToken(spec = V2) {
  return spec.layers * (spec.kvLoraRank + spec.ropeDim);
}
export function elementsToBytes(elements, bytes = V2.bytes) {
  return elements * bytes;
}

// Jamba keeps a KV cache only on the attention layers (1 of every 8 in the released mix).
export function jambaAttentionLayers(layers = JAMBA.layers, every = JAMBA.attentionEvery) {
  if (layers < 1 || every < 1) throw new RangeError('Layers required');
  return Math.floor(layers / every);
}

export function contextMemory(tokens) {
  const n = Math.max(0, Math.floor(tokens));
  return {
    tokens: n,
    mha: n * mhaElementsPerToken(),
    mla: n * mlaElementsPerToken(),
    ssm: V2.layers * MAMBA_STATE,
    jambaShare: jambaAttentionLayers() / JAMBA.layers
  };
}

export function serialRounds(kind, length, steps) {
  const n = Math.max(1, Math.floor(length));
  const k = Math.max(1, Math.floor(steps));
  if (kind === 'autoregressive') return { rounds: n, positionsPerRound: 1 };
  if (kind === 'diffusion') return { rounds: k, positionsPerRound: n };
  throw new RangeError('Unknown generator');
}

export function jepaError(predicted, target) {
  if (predicted.length !== target.length || !predicted.length) throw new RangeError('Latent vectors must match');
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (!Number.isFinite(predicted[i]) || !Number.isFinite(target[i])) throw new RangeError('Finite latents required');
    sum += (predicted[i] - target[i]) ** 2;
  }
  return sum / predicted.length;
}

// Interface only. Jev's weights are unpublished. The choice is always one of the declared options.
export function jevChoice(options, logits) {
  if (options.length !== logits.length || options.length < 2) throw new RangeError('Options and logits must match');
  const probabilities = softmax(logits);
  let index = 0;
  for (let i = 1; i < probabilities.length; i++) if (probabilities[i] > probabilities[index]) index = i;
  return { choice: options[index], probabilities, index };
}

export function jevIndependent(questions) {
  return questions.map(q => jevChoice(q.options, q.logits));
}

export function requestCost(prices, { hit = 0, miss = 0, output = 0 }) {
  for (const n of [hit, miss, output, prices.hit, prices.miss, prices.output]) {
    if (!Number.isFinite(n) || n < 0) throw new RangeError('Nonnegative counts and prices required');
  }
  const hitCost = hit / 1e6 * prices.hit;
  const missCost = miss / 1e6 * prices.miss;
  const outputCost = output / 1e6 * prices.output;
  return { hitCost, missCost, outputCost, total: hitCost + missCost + outputCost };
}

// First call writes the prefix at the miss price. Later calls read it at the hit price
// only if the prefix matches completely. Output is computed again every time.
export function repeatedPrefix(prices, { prefix, suffix, output, repeats }) {
  const n = Math.max(1, Math.floor(repeats));
  const head = Math.max(0, prefix);
  const tail = Math.max(0, suffix);
  const first = requestCost(prices, { hit: 0, miss: head + tail, output });
  const later = requestCost(prices, { hit: head, miss: tail, output });
  const withCache = first.total + later.total * (n - 1);
  const noCache = first.total * n;
  return { repeats: n, first, later, withCache, noCache, saved: noCache - withCache, hitRate: n === 1 ? 0 : head / Math.max(1, head + tail) };
}

// N includes the call that writes the cache. Cheaper once N exceeds this value.
export function requestsToBreakEven(writeMultiplier, readMultiplier) {
  if (!Number.isFinite(writeMultiplier) || !Number.isFinite(readMultiplier)) throw new RangeError('Finite multipliers required');
  if (readMultiplier >= 1) return Infinity;
  return (writeMultiplier - readMultiplier) / (1 - readMultiplier);
}

export const FAMILIES = Object.freeze([
  { id: 'causal', es: 'Decodificador', en: 'Decoder' },
  { id: 'encoder', es: 'Codificador', en: 'Encoder' },
  { id: 'encdec', es: 'Codificador-decodificador', en: 'Encoder-decoder' },
  { id: 'moe', es: 'Expertos', en: 'Experts' },
  { id: 'ssm', es: 'Estado y Jamba', en: 'State and Jamba' },
  { id: 'diffusion', es: 'Difusión', en: 'Diffusion' },
  { id: 'jepa', es: 'JEPA', en: 'JEPA' },
  { id: 'jev', es: 'Jev', en: 'Jev' },
  { id: 'cache', es: 'Caché y precio', en: 'Cache and price' }
]);

export function createState() {
  return {
    family: 'cache',
    tariff: 'flash-off',
    prefix: 100000,
    suffix: 2000,
    output: 4000,
    repeats: 50,
    tokens: 4096,
    denoise: 8,
    baseInput: 3,
    writeRule: '5m'
  };
}

export function snapshot(state) {
  const prices = tariffById(state.tariff);
  const bill = repeatedPrefix(prices, state);
  const memory = contextMemory(state.tokens);
  const causal = attentionMask('causal', 0, 8);
  const encoder = attentionMask('bidirectional', 0, 8);
  const cross = attentionMask('cross', 0, 8, 5);
  const rule = state.writeRule === '1h' ? ANTHROPIC_RULE.write1h : ANTHROPIC_RULE.write5m;
  const jev = jevIndependent([
    { options: ['sí', 'no'], logits: [0.8, 0.8] },
    { options: ['sí', 'no'], logits: [0.8, -1] }
  ]);
  return {
    family: state.family,
    prices,
    bill,
    ratio: prices.hit / prices.miss,
    memory,
    mlaShrink: mhaElementsPerToken() / mlaElementsPerToken(),
    causalHidesFuture: causal[7] === 0,
    encoderSeesFuture: encoder[7] > 0,
    crossWidth: cross.length,
    moeFraction: moeActiveFraction(8, 2),
    ssmFlat: memory.ssm === contextMemory(1).ssm && memory.mla !== contextMemory(1).mla,
    diffusion: serialRounds('diffusion', state.tokens, state.denoise),
    autoregressive: serialRounds('autoregressive', Math.min(state.tokens, 64), state.denoise),
    jepa: jepaError([0, 0], [0, 1]),
    jev,
    breakEven: requestsToBreakEven(rule, ANTHROPIC_RULE.read),
    anthropicRead: ANTHROPIC_RULE.read,
    anthropicWrite: rule,
    announcedRatio: DEEPSEEK.announced2024.hit / DEEPSEEK.announced2024.miss
  };
}
