import {DEEPSEEK, FAMILIES, V2, createState, snapshot, contextMemory, repeatedPrefix, tariffById, requestsToBreakEven, ANTHROPIC_RULE} from './model.js';
import {createModelsWorld} from './world.js';
import {StepGuide} from '../llms/guide.js';
import {VOICES} from './voices.js';
const es = document.documentElement.lang === 'es', t = (a, b) => es ? a : b, $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 2});
const usd = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 4});
const sciNf = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 2, minimumFractionDigits: 1});
function sci(x) {
  if (!Number.isFinite(x) || Math.abs(x) < 1000) return nf.format(x);
  const e = Math.floor(Math.log10(Math.abs(x))), m = x / 10 ** e;
  return sciNf.format(m) + ' × 10' + [...String(e)].map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] ?? '⁻').join('');
}
const copy = {
  causal: [t('Decodificador', 'Decoder'), t('Es la familia del notebook 08 y de Grok. Cada pieza ve el pasado y se escribe después de la anterior. En la escena, la primera esfera solo se une a sí misma: el futuro pesa cero.', 'This is the family of notebook 08 and of Grok. Each piece sees the past and is written after the previous one. In the scene, the first sphere connects only to itself: the future weighs zero.')],
  encoder: [t('Codificador', 'Encoder'), t('BERT lee el texto entero, hacia atrás y hacia delante, y devuelve una etiqueta o un vector. No continúa una frase. Por eso todas las esferas quedan unidas a la primera.', 'BERT reads the whole text, backward and forward, and returns a label or a vector. It does not continue a sentence. That is why every sphere is tied to the first.')],
  encdec: [t('Codificador y decodificador', 'Encoder and decoder'), t('El dibujo de Vaswani de 2017, y el de T5: una mitad lee la fuente sin máscara causal y la otra escribe en serie, mirando en cada paso todas las posiciones ya leídas.', 'Vaswani’s 2017 diagram, and T5’s: one half reads the source with no causal mask and the other writes serially, looking at every position already read.')],
  moe: [t('Expertos dispersos', 'Sparse experts'), t('Sigue siendo un decodificador. En algunas capas, cada token usa 2 de 8 expertos. Grok-1 y DeepSeek están aquí. Esos 2 de 8 no son una cuarta parte de todos los pesos: la atención sigue siendo densa.', 'It is still a decoder. In some layers, each token uses 2 of 8 experts. Grok-1 and DeepSeek sit here. Those 2 of 8 are not a quarter of every weight: attention stays dense.')],
  ssm: [t('Estado, Mamba y Jamba', 'State, Mamba and Jamba'), t('Una capa recurrente guarda un estado de ancho fijo. No añade una clave por cada token nuevo. Jamba pone una capa de atención cada siete de Mamba, así que la caché de claves vive en un octavo de las capas. La esfera no crece cuando alargas el contexto. Las barras sí.', 'A recurrent layer keeps a fixed-width state. It does not add a key for every new token. Jamba places one attention layer for every seven Mamba layers, so the key cache lives in one eighth of the layers. The sphere does not grow as you lengthen the context. The bars do.')],
  diffusion: [t('Difusión de texto', 'Text diffusion'), t('Todas las posiciones se proponen a la vez y se corrigen durante varias rondas. No hay una pieza 40 esperando a la 39. El precio de calcular se parece a rondas por longitud, no a una sola pasada de izquierda a derecha.', 'Every position is proposed at once and corrected over several rounds. Piece 40 does not wait for piece 39. The compute looks like rounds times length, not one left-to-right pass.')],
  jepa: [t('JEPA', 'JEPA'), t('El error compara dos vectores, el predicho y el objetivo. No reparte probabilidad sobre un vocabulario, así que este modelo no escribe la frase. Es la familia de Yann LeCun, no un LLM autorregresivo.', 'The error compares two vectors, the prediction and the target. It does not spread probability over a vocabulary, so this model does not write the sentence. It is Yann LeCun’s family, not an autoregressive LLM.')],
  jev: [t('Jev, la interfaz', 'Jev, the interface'), t('TypeSafe no ha publicado la arquitectura. Lo publicado es el contrato: una pasada, una opción de las que declaraste, y preguntas que no comparten una sola distribución. Una opción legal puede ser la decisión falsa. No es un modelo de lenguaje: no escribe.', 'TypeSafe has not published the architecture. What is published is the contract: one pass, one of the options you declared, and questions that do not share a single distribution. A legal option can still be the wrong decision. It is not a language model: it does not write.')],
  cache: [t('Tres precios, no uno', 'Three prices, not one'), t('La entrada nueva se cobra a precio de fallo. El prefijo repetido, si acierta, se cobra a precio de acierto. La salida se vuelve a calcular siempre y no hereda el descuento. En Flash, fuera de hora punta, el acierto son 0,003 dólares por millón y el fallo 0,15: cincuenta veces menos.', 'Fresh input is billed at the miss price. A repeated prefix, on a hit, is billed at the hit price. The output is computed again every time and does not inherit the discount. On Flash, off-peak, a hit is 0.003 dollars per million and a miss is 0.15: fifty times less.')]
};
const TOUR = [
  { id: 'intro', family: 'cache' }, { id: 'causal', family: 'causal' }, { id: 'encoder', family: 'encoder' },
  { id: 'encdec', family: 'encdec' }, { id: 'moe', family: 'moe' }, { id: 'ssm', family: 'ssm' },
  { id: 'diffusion', family: 'diffusion' }, { id: 'jepa', family: 'jepa' }, { id: 'jev', family: 'jev' },
  { id: 'cache', family: 'cache' }, { id: 'disk', family: 'cache' }, { id: 'rule', family: 'cache' }
];
let state = createState(), world, last = performance.now(), step = 0, voiceLanguage = es ? 'es' : 'en';
document.title = t('Modelos — Familias, caché y precio', 'Models — Families, cache and price');
$('app').innerHTML = `<nav class="nav"><a href="../index.html">← Atlas</a><a href="../museo/index.html#modelos">${t('Museo', 'Museum')}</a><a href="../llms/index.html">LLMs</a><a href="../mente/index.html">${t('Mente', 'Mind')}</a><span><a href="${es ? '../../modelos/index.html' : './index.html'}" lang="en">EN</a> / <a href="${es ? './index.html' : '../es/modelos/index.html'}" lang="es">ES</a></span></nav>
<header><div><span class="eyebrow">${t('NOTEBOOK 10 · FAMILIAS Y PRECIO', 'NOTEBOOK 10 · FAMILIES AND PRICE')}</span><h1>${t('No todo modelo<br>escribe de uno en uno.', 'Not every model<br>writes one by one.')}</h1></div><p>${t('El notebook 08 es un decodificador. Aquí están las otras familias, y la factura: entrada nueva, entrada repetida y salida. El ejemplo con dólares es la tarifa publicada por DeepSeek.', 'Notebook 08 is a decoder. Here are the other families, and the bill: fresh input, repeated input and output. The dollar example is DeepSeek’s published tariff.')}</p></header>
<section class="dashboard" aria-label="${t('Cifras de esta elección', 'Figures for this choice')}">
<article><span id="d1-label"></span><strong id="d1"></strong><small id="d1-note"></small></article>
<article><span id="d2-label"></span><strong id="d2"></strong><small id="d2-note"></small></article>
<article><span id="d3-label"></span><strong id="d3"></strong><small id="d3-note"></small></article>
</section>
<div class="families" role="group" aria-label="${t('Familia', 'Family')}">${FAMILIES.map(f => `<button type="button" data-family="${f.id}" aria-pressed="${f.id === 'cache'}">${es ? f.es : f.en}</button>`).join('')}</div>
<section class="voice-bar" aria-label="${t('Recorrido narrado', 'Narrated walkthrough')}"><button id="narrate" class="primary" type="button">${t('Escuchar el recorrido', 'Play the walkthrough')}</button><label><input id="voice-enabled" type="checkbox" checked> MiniMax</label><label>${t('Voz', 'Voice')} <select id="voice-language"><option value="es" ${es ? 'selected' : ''}>Español</option><option value="en" ${es ? '' : 'selected'}>English</option></select></label><span id="voice-state"></span><span id="voice-time"></span></section>
<p id="voice-transcript"></p>
<div class="controls">
<label>${t('Tarifa DeepSeek', 'DeepSeek tariff')} <select id="tariff"><option value="flash-off">${t('Flash · valle', 'Flash · off-peak')}</option><option value="flash-peak">${t('Flash · punta', 'Flash · peak')}</option><option value="pro-off">${t('Pro · valle', 'Pro · off-peak')}</option><option value="pro-peak">${t('Pro · punta', 'Pro · peak')}</option></select></label>
<label>${t('Prefijo repetible', 'Reusable prefix')} <output id="prefix-value"></output><input id="prefix" type="range" min="0" max="200000" step="1000" value="100000"></label>
<label>${t('Cola nueva', 'New suffix')} <output id="suffix-value"></output><input id="suffix" type="range" min="0" max="20000" step="100" value="2000"></label>
<label>${t('Salida', 'Output')} <output id="output-value"></output><input id="output" type="range" min="1" max="20000" step="100" value="4000"></label>
<label>${t('Visitas', 'Visits')} <output id="repeats-value"></output><input id="repeats" type="range" min="1" max="200" step="1" value="50"></label>
<label>${t('Tokens del contexto', 'Context tokens')} <output id="tokens-value"></output><input id="tokens" type="range" min="1" max="32000" step="1" value="4096"></label>
</div>
<div class="layout">
<section class="stage">
<div class="scene-caption"><b id="scene-status"></b><span>${t('La barra clara es la atención latente de DeepSeek-V2. La barra alta es una atención completa con las mismas 128 cabezas. La esfera es un estado que no crece. Ocho esferas: máscara causal o bidireccional.', 'The short bar is DeepSeek-V2’s latent attention. The tall bar is full attention with the same 128 heads. The sphere is a state that does not grow. Eight spheres: a causal or bidirectional mask.')}</span></div>
<div id="space" role="img" tabindex="0" aria-label="${t('Barras de memoria y una fila de tokens. Arrastra para girar.', 'Memory bars and a row of tokens. Drag to turn.')}"></div>
<p id="loading">${t('Preparando las familias…', 'Preparing the families…')}</p>
<div class="view-controls"><button id="fit" type="button">${t('Centrar', 'Center')}</button><button id="zoom-out" type="button" aria-label="${t('Alejar', 'Zoom out')}">−</button><button id="zoom-in" type="button" aria-label="${t('Acercar', 'Zoom in')}">+</button></div>
</section>
<aside>
<span class="eyebrow">${t('QUÉ ESTÁS MIRANDO', 'WHAT YOU ARE LOOKING AT')}</span>
<div class="detail">
<h2 id="focus-name"></h2>
<p id="focus-detail"></p>
<dl>
<div><dt>${t('Acierto / fallo, Flash valle', 'Hit / miss, Flash off-peak')}</dt><dd id="ratio"></dd></div>
<div><dt>${t('Elementos MHA por token', 'MHA elements per token')}</dt><dd id="mha"></dd></div>
<div><dt>${t('Elementos MLA por token', 'MLA elements per token')}</dt><dd id="mla"></dd></div>
<div><dt>${t('Veces más pequeña, V2', 'Times smaller, V2')}</dt><dd id="shrink"></dd></div>
<div><dt>${t('Estado que no crece', 'State that does not grow')}</dt><dd id="ssm"></dd></div>
<div><dt>${t('Capas con caché en Jamba', 'Layers with a cache in Jamba')}</dt><dd id="jamba"></dd></div>
<div><dt>${t('Visitas para compensar una escritura 1,25×', 'Visits to repay a 1.25× write')}</dt><dd id="even"></dd></div>
<div><dt>${t('Coste con acierto de prefijo', 'Cost if the prefix hits')}</dt><dd id="with"></dd></div>
<div><dt>${t('Coste si se recalcula todo', 'Cost if everything is recomputed')}</dt><dd id="without"></dd></div>
</dl>
</div>
</aside>
</div>
<section class="principles">
<article><span class="eyebrow">01 · ${t('FAMILIA', 'FAMILY')}</span><b>${t('Escribir es una de ellas', 'Writing is one of them')}</b><p>${t('Decodificador, codificador, los dos a la vez, expertos, estado, difusión, JEPA y una interfaz de decisiones. Comparten matrices. No comparten qué se predice ni cuándo.', 'Decoder, encoder, both at once, experts, state, diffusion, JEPA and a decision interface. They share matrices. They do not share what is predicted, or when.')}</p></article>
<article><span class="eyebrow">02 · ${t('FACTURA', 'BILL')}</span><b>${t('Entrada, caché y salida', 'Input, cache and output')}</b><p>${t('Un token de salida no se abarata porque el prefijo estuviera repetido. El descuento, cuando existe, es solo de la entrada que el servidor ya convirtió en claves y valores.', 'An output token does not get cheaper because the prefix was repeated. The discount, when there is one, covers only the input the server already turned into keys and values.')}</p></article>
<article><span class="eyebrow">03 · ${t('DISCO', 'DISK')}</span><b>${t('Cabe porque la caché es chica', 'It fits because the cache is small')}</b><p>${t('DeepSeek-V2 comprime la clave y el valor en 576 números por token y capa, frente a 32.768 de una atención completa con 128 cabezas de dimensión 128. Esa caché cabe en disco. El anuncio de 2024 ya cobraba el acierto a una décima del fallo. La tarifa de ahora está en los controles.', 'DeepSeek-V2 compresses key and value into 576 numbers per token per layer, against 32,768 for full attention with 128 heads of dimension 128. That cache fits on disk. The 2024 announcement already priced a hit at a tenth of a miss. Today’s tariff is in the controls.')}</p></article>
</section>
<details class="assumptions"><summary>${t('Fuentes · tarifas del 19 de septiembre de 2026 y papeles', 'Sources · tariffs of 19 September 2026 and papers')}</summary>
<p>${t('DeepSeek, hoja de precios: Flash valle 0,003 / 0,15 / 0,60 dólares por millón (acierto, fallo, salida). Punta es el doble: 0,006 / 0,30 / 1,20. Pro valle 0,022 / 0,66 / 1,98 y punta 0,044 / 1,32 / 3,96. La punta es de lunes a viernes, 01:00–04:00 y 06:00–10:00 UTC, fuera de los festivos chinos. El resto es valle, fines de semana incluidos.', 'DeepSeek price sheet: Flash off-peak 0.003 / 0.15 / 0.60 dollars per million (hit, miss, output). Peak is double: 0.006 / 0.30 / 1.20. Pro off-peak 0.022 / 0.66 / 1.98 and peak 0.044 / 1.32 / 3.96. Peak is Monday to Friday, 01:00–04:00 and 06:00–10:00 UTC, outside Chinese public holidays. Everything else is off-peak, including weekends.')} <a href="https://api-docs.deepseek.com/quick_start/pricing" target="_blank" rel="noopener">DeepSeek pricing ↗</a></p>
<p>${t('El acierto exige un prefijo ya guardado y una coincidencia completa. La salida se sigue calculando. No hay garantía de acierto en cada llamada. El anuncio de caché en disco (0,014 el acierto y 0,14 el fallo, una décima) atribuye esa posibilidad a la atención latente de V2. No es la tarifa vigente.', 'A hit needs a prefix already stored and a complete match. The output is still computed. A hit is not guaranteed on every call. The disk-cache announcement (0.014 for a hit and 0.14 for a miss, one tenth) credits that possibility to V2’s latent attention. It is not the current tariff.')} <a href="https://api-docs.deepseek.com/news/news0802" target="_blank" rel="noopener">DeepSeek, 2024 ↗</a> · <a href="https://arxiv.org/abs/2405.04434" target="_blank" rel="noopener">DeepSeek-V2 ↗</a></p>
<p>${t('Anthropic publica otra regla, distinta de estos dólares: escribir la caché de 5 minutos cuesta 1,25 veces la entrada, la de 1 hora cuesta 2 veces, y leerla cuesta 0,1. Con 1,25 y 0,1 la segunda visita ya compensa. DeepSeek no cobra un recargo de escritura en la hoja citada: la primera visita va a precio de fallo y la siguiente, si acierta, a precio de acierto.', 'Anthropic publishes a different rule, separate from these dollars: a 5-minute cache write costs 1.25 times input, a 1-hour write costs 2 times, and a read costs 0.1. With 1.25 and 0.1 the second visit already pays it back. DeepSeek charges no write surcharge on the cited sheet: the first visit is at the miss price and the next, on a hit, at the hit price.')} <a href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" target="_blank" rel="noopener">Anthropic prompt caching ↗</a></p>
<p>${t('Jamba, AI21: una capa de atención por cada siete de Mamba. Mamba, Gu y Dao 2023: el estado recurrente tiene ancho fijo. JEPA predice en el espacio de representaciones. Jev, TypeSafe, septiembre de 2026: interfaz publicada, pesos no. Las ocho esferas y las dos de ocho cajas son un esquema, no un modelo entrenado.', 'Jamba, AI21: one attention layer for every seven Mamba layers. Mamba, Gu and Dao 2023: the recurrent state has a fixed width. JEPA predicts in representation space. Jev, TypeSafe, September 2026: published interface, unpublished weights. The eight spheres and the two-of-eight boxes are a diagram, not a trained model.')}</p>
</details>
<footer>${t('Atlas · Modelos · notebook 10 · 21 septiembre 2026', 'Atlas · Models · notebook 10 · 21 September 2026')}</footer>`;

try { world = createModelsWorld($('space')); $('loading').hidden = true; }
catch (e) { $('loading').textContent = t('La vista 3D no está disponible. Las cifras siguen abajo y arriba.', 'The 3D view is unavailable. The figures above and beside it still work.'); console.error(e); }

function paint() {
  const v = snapshot(state);
  const mem = contextMemory(state.tokens);
  const [name, detail] = copy[state.family];
  document.querySelectorAll('[data-family]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.family === state.family)));
  const prices = tariffById(state.tariff);
  if (state.family === 'cache') {
    $('d1-label').textContent = t('Con el prefijo en caché', 'With the prefix cached');
    $('d1').textContent = usd.format(v.bill.withCache);
    $('d1-note').textContent = t('Si cada visita, menos la primera, acierta el prefijo.', 'If every visit after the first hits the prefix.');
    $('d2-label').textContent = t('Recalculando el prefijo', 'Recomputing the prefix');
    $('d2').textContent = usd.format(v.bill.noCache);
    $('d2-note').textContent = state.repeats + t(' visitas a precio de fallo.', ' visits at the miss price.');
    $('d3-label').textContent = t('Diferencia', 'Difference');
    $('d3').textContent = usd.format(v.bill.saved);
    $('d3-note').textContent = usd.format(prices.hit) + t(' el millón acertado · ', ' per million hit · ') + usd.format(prices.output) + t(' el millón de salida', ' per million output');
  } else if (state.family === 'ssm') {
    $('d1-label').textContent = t('Atención completa', 'Full attention');
    $('d1').textContent = sci(mem.mha);
    $('d1-note').textContent = t('Números guardados a estos tokens, V2.', 'Numbers stored at this many tokens, V2.');
    $('d2-label').textContent = t('Atención latente', 'Latent attention');
    $('d2').textContent = sci(mem.mla);
    $('d2-note').textContent = nf.format(v.mlaShrink) + t(' veces menos.', ' times less.');
    $('d3-label').textContent = t('Estado recurrente', 'Recurrent state');
    $('d3').textContent = sci(mem.ssm);
    $('d3-note').textContent = t('No cambia con los tokens. Jamba guarda claves en el ', 'It does not change with the tokens. Jamba keeps keys in ') + nf.format(v.memory.jambaShare * 100) + t(' % de las capas.', '% of the layers.');
  } else {
    $('d1-label').textContent = t('Acierto por millón', 'Hit per million');
    $('d1').textContent = usd.format(prices.hit);
    $('d1-note').textContent = t('Fallo ', 'Miss ') + usd.format(prices.miss) + t(' · salida ', ' · output ') + usd.format(prices.output);
    $('d2-label').textContent = t('Máscara o fracción', 'Mask or fraction');
    $('d2').textContent = state.family === 'moe' ? '2 / 8' : state.family === 'causal' ? t('futuro 0', 'future 0') : state.family === 'encoder' || state.family === 'encdec' ? t('ve todo', 'sees all') : state.family === 'diffusion' ? state.denoise + t(' rondas', ' rounds') : state.family === 'jev' ? t('en el esquema', 'in the schema') : t('vectores', 'vectors');
    $('d2-note').textContent = state.family === 'jev' ? t('Dos preguntas pueden valer lo mismo sin compartir una distribución.', 'Two questions can tie without sharing a distribution.') : t('El precio de arriba no depende de esta familia.', 'The price above does not depend on this family.');
    $('d3-label').textContent = t('Visitas de ejemplo', 'Example visits');
    $('d3').textContent = usd.format(v.bill.withCache);
    $('d3-note').textContent = t('Misma factura de caché, por si comparas.', 'The same cache bill, so you can compare.');
  }
  $('prefix-value').textContent = nf.format(state.prefix);
  $('suffix-value').textContent = nf.format(state.suffix);
  $('output-value').textContent = nf.format(state.output);
  $('repeats-value').textContent = String(state.repeats);
  $('tokens-value').textContent = nf.format(state.tokens);
  $('focus-name').textContent = name;
  $('focus-detail').textContent = detail;
  $('ratio').textContent = '1 / ' + nf.format(DEEPSEEK.flash.off.miss / DEEPSEEK.flash.off.hit);
  $('mha').textContent = sci(mem.mha / state.tokens);
  $('mla').textContent = sci(mem.mla / state.tokens);
  $('shrink').textContent = nf.format(v.mlaShrink);
  $('ssm').textContent = sci(mem.ssm);
  $('jamba').textContent = '1 / 8';
  $('even').textContent = nf.format(requestsToBreakEven(ANTHROPIC_RULE.write5m, ANTHROPIC_RULE.read));
  $('with').textContent = usd.format(repeatedPrefix(prices, state).withCache);
  $('without').textContent = usd.format(repeatedPrefix(prices, state).noCache);
  $('scene-status').textContent = name.toUpperCase();
  world?.render(state);
}
function getClip() {
  const clip = (VOICES[voiceLanguage] || []).find(item => item.id === TOUR[step].id);
  return clip?.src ? clip : { id: TOUR[step].id, title: TOUR[step].id, text: copy[TOUR[step].family][1], src: '', duration: 8 };
}
function renderVoice() {
  if (!guide) return;
  const clip = guide.clip || getClip();
  $('voice-transcript').textContent = clip.text || '';
  const labels = {
    idle: t('Pulsa escuchar para recorrer cada familia', 'Press play to walk through each family'),
    loading: t('Cargando narración…', 'Loading narration…'),
    speaking: t('Escuchando · la escena espera', 'Listening · the scene waits'),
    waiting: t('La escena se queda · siguiente paso en ', 'The scene holds · next step in ') + Math.ceil(guide.remaining) + ' s',
    reading: t('Tiempo para leer · ', 'Reading time · ') + Math.ceil(guide.remaining) + ' s',
    paused: t('Recorrido en pausa', 'Walkthrough paused'),
    ready: t('Listo para el siguiente paso', 'Ready for the next step'),
    finished: t('Recorrido completado', 'Walkthrough complete'),
    blocked: t('Pulsa escuchar para permitir el audio', 'Press play to allow audio'),
    error: t('No se pudo cargar la voz. Puedes cambiar de familia a mano.', 'The voice could not load. You can still change family by hand.')
  };
  $('voice-state').textContent = labels[guide.state] || '';
  const elapsed = guide.audio?.currentTime || 0;
  const duration = guide.audio?.duration || clip.duration || 0;
  $('voice-time').textContent = guide.enabled && clip.src ? Math.floor(elapsed) + ' / ' + Math.ceil(duration) + ' s' : '';
  $('narrate').textContent = guide.running ? t('Pausar voz', 'Pause voice') : guide.state === 'finished' ? t('Repetir recorrido', 'Replay walkthrough') : t('Escuchar el recorrido', 'Play the walkthrough');
}
const guide = new StepGuide({
  gap: 3,
  getClip,
  onAdvance() {
    if (step >= TOUR.length - 1) return false;
    step += 1;
    state.family = TOUR[step].family;
    paint();
    return true;
  },
  onChange() { renderVoice(); }
});
document.querySelectorAll('[data-family]').forEach(btn => { btn.onclick = () => {
  const index = TOUR.findIndex(beat => beat.id === btn.dataset.family);
  if (index >= 0) step = index;
  guide.stop();
  state.family = btn.dataset.family;
  paint();
  renderVoice();
}; });
for (const id of ['prefix', 'suffix', 'output', 'repeats', 'tokens']) {
  $(id).oninput = e => { state[id] = Number(e.target.value); paint(); };
}
$('tariff').oninput = e => { state.tariff = e.target.value; paint(); };
$('narrate').onclick = () => {
  if (guide.state === 'finished') { step = 0; state.family = TOUR[0].family; paint(); }
  if (guide.running) guide.pause(); else guide.resume();
};
$('voice-language').onchange = e => { voiceLanguage = e.target.value; const active = guide.running; guide.stop(); if (active) guide.enter(); else renderVoice(); };
$('voice-enabled').onchange = e => guide.setEnabled(e.target.checked);
$('fit').onclick = () => world?.fit();
$('zoom-in').onclick = () => world?.zoomBy(1.12);
$('zoom-out').onclick = () => world?.zoomBy(1 / 1.12);
paint();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden) { guide.tick(dt); world?.render(state, dt); renderVoice(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
