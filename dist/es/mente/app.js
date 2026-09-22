import {GROK1, NEURONS, CEREBELLAR, CORTICAL, VISUAL, createState, snapshot, tick} from './model.js';
import {createMindWorld} from './world.js';
const es = document.documentElement.lang === 'es', t = (a, b) => es ? a : b, $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 1});
const small = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 3});
const sciNf = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 2, minimumFractionDigits: 1});
function sci(x) {
  if (!Number.isFinite(x) || x === 0) return '0';
  if (Math.abs(x) < 1e6) return nf.format(x);
  const e = Math.floor(Math.log10(Math.abs(x))), m = x / 10 ** e;
  return sciNf.format(m) + ' × 10' + [...String(e)].map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] ?? '⁻').join('');
}
function signed(x) { if (Math.abs(x) < 1e-12) return '0'; const n = small.format(x); return x > 0 ? '+' + n : n; }
const lessons = {
  'cut-learn': t('La ventana de Grok-1 ya ha cortado la entrada, y el modo entrenar además mueve un peso de juguete. En una respuesta real ese peso no se mueve. El corte de 8192 posiciones sí es de esa ficha.', 'Grok-1’s window has already cut the input, and training mode also moves a toy weight. A real reply does not move that weight. The 8,192-position cut does belong to that model card.'),
  cut: t('Pasado 8192, Grok-1 deja fuera lo más antiguo. No es un olvido: es un corte de la entrada. El cerebro tampoco sostiene la frase entera en la memoria de trabajo. Son dos límites distintos.', 'Past 8,192, Grok-1 drops the oldest positions. That is not forgetting: it is an input cut. A brain does not hold the whole sentence in working memory either. The two limits are different.'),
  learn: t('Cada token nuevo mueve un peso de juguete y la pérdida baja. Una conversación no ejecuta ese paso: los pesos quedan como quedaron al terminar el entrenamiento.', 'Each new token moves a toy weight and the loss falls. A conversation does not run that step: the weights stay as training left them.'),
  window: t('Grok-1 sigue teniendo estos tokens en la ventana. La memoria de trabajo humana, en la estimación de Cowan, sigue en unos 4 fragmentos. Alargar el texto no le añade fragmentos.', 'Grok-1 still holds these tokens in its window. Human working memory, on Cowan’s estimate, stays near 4 chunks. A longer text does not add chunks.'),
  short: t('Con tan poco texto, los dos caben en su memoria de corto plazo. Alarga la entrada, o pasa a entrenar, y la analogía se rompe por sitios distintos.', 'With this little text, both fit in short-term memory. Lengthen the input, or switch to training, and the analogy breaks in different places.')
};
const focusCopy = {
  units: [t('Unidades distintas', 'Different units'), t('La mayoría de las neuronas están en el cerebelo, no en la corteza. Las células no neuronales son del mismo orden que las neuronas, no diez veces más. Grok-1 tiene parámetros: cada token usa 2 de 8 expertos en las capas dispersas. Eso no es un 25 % de todos los pesos, porque la atención sigue siendo densa.', 'Most neurons are in the cerebellum, not the cortex. Non-neuronal cells are the same order as neurons, not ten times more. Grok-1 has parameters: each token uses 2 of 8 experts in the sparse layers. That is not 25% of every weight, because attention stays dense.')],
  memory: [t('Dos memorias de corto plazo', 'Two short-term stores'), t('Un token no es un fragmento. La ventana de Grok-1 es una cinta de 8192 posiciones con máscara causal. La memoria de trabajo es un límite de lo que se sostiene a la vez; el resto se reconstruye desde otra memoria o se pierde. Cortar la cinta no es recordar mal.', 'A token is not a chunk. Grok-1’s window is a tape of 8,192 positions with a causal mask. Working memory limits what is held at once; the rest is reconstructed from other memory or lost. Cutting the tape is not misremembering.')],
  learn: [t('Responder no entrena', 'Replying does not train'), t('Al responder, el cambio de pesos de Grok es 0. Al entrenar, un peso de juguete sube y la pérdida baja: es el mismo paso mínimo que el mini-entrenamiento del notebook de LLMs, no un entrenamiento real de Grok. El rastro del cerebro se mueve en los dos modos. Su tamaño es didáctico, no una medición de una sinapsis.', 'While replying, Grok’s weight change is 0. In training, a toy weight rises and the loss falls: the same minimal step as the LLM notebook’s tiny training example, not a real Grok training run. The brain trace moves in both modes. Its size is didactic, not a measured synapse.')],
  energy: [t('20 W, todo el rato', '20 W, the whole time'), t('En este intervalo el cerebro disipa unos 20 W haga lo que haga: ver, equilibrarse, hablar. No hay una cifra publicada de vatios para el Grok con el que conversas, y no la inventamos. Lo que sí crece en la familia del transformador es el trabajo en serie: cada token nuevo puntúa la ventana una vez. Con caché no se relee el prompt desde cero, y tampoco sale el token 40 antes que el 39.', 'Across this interval the brain dissipates about 20 W whatever it is doing: seeing, balancing, speaking. There is no published wattage for the Grok you talk to, and we do not invent one. What does grow in the transformer family is serial work: each new token scores the window once. A cache avoids rereading the prompt from scratch, and token 40 still cannot come out before token 39.')]
};
let state = createState(), world, last = performance.now(), domAt = 0;
document.title = t('Mente — Grok y un cerebro', 'Mind — Grok and a brain');
$('app').innerHTML = `<nav class="nav"><a href="../index.html">← Atlas</a><a href="../llms/index.html">LLMs</a><span><a href="${es ? '../../mente/index.html' : './index.html'}" lang="en">EN</a> / <a href="${es ? './index.html' : '../es/mente/index.html'}" lang="es">ES</a></span></nav>
<header><div><span class="eyebrow">${t('NOTEBOOK 09 · GROK-1 Y UN CEREBRO', 'NOTEBOOK 09 · GROK-1 AND A BRAIN')}</span><h1>${t('No es un cerebro<br>que habla.', 'Not a brain<br>that speaks.')}</h1></div><p>${t('El Grok con el que conversas predice el siguiente fragmento, con los pesos quietos. Un cerebro no tiene ese ciclo. Las cifras del modelo son las de Grok-1, la única ficha completa que xAI ha publicado. No se las asignamos a las versiones posteriores.', 'The Grok you talk to predicts the next fragment, with its weights held still. A brain has no such cycle. The model counts are Grok-1’s, the only complete card xAI has published. We do not assign them to later versions.')}</p></header>
<section class="dashboard" aria-label="${t('Comparación de este intervalo', 'Comparison for this interval')}">
<article><span>${t('Cambio de un peso de Grok', 'Change in one Grok weight')}</span><strong id="dash-delta"></strong><small id="dash-delta-note"></small></article>
<article><span>${t('Lo que cabe ahora', 'What fits now')}</span><strong id="dash-memory"></strong><small id="dash-memory-note"></small></article>
<article><span>${t('Energía del cerebro', 'Energy of the brain')}</span><strong id="dash-energy"></strong><small id="dash-energy-note"></small></article>
</section>
<div class="controls">
<button id="play" class="primary">▶ ${t('Emitir tokens', 'Emit tokens')}</button>
<button id="reset" aria-label="${t('Reiniciar', 'Reset')}">↺</button>
<div class="forms" role="group" aria-label="${t('Fase', 'Phase')}">
<button id="mode-reply" aria-pressed="true">${t('Responder', 'Reply')}</button>
<button id="mode-learn" aria-pressed="false">${t('Entrenar', 'Train')}</button>
</div>
<div class="forms" role="group" aria-label="${t('Qué mirar', 'What to look at')}">
<button id="focus-units" aria-pressed="false">${t('Unidades', 'Units')}</button>
<button id="focus-memory" aria-pressed="true">${t('Memoria', 'Memory')}</button>
<button id="focus-learn" aria-pressed="false">${t('Pesos', 'Weights')}</button>
<button id="focus-energy" aria-pressed="false">${t('Energía', 'Energy')}</button>
</div>
<label>${t('Tokens de entrada', 'Input tokens')} <output id="context-value"></output><input id="context" type="range" min="0" max="12000" step="1" value="48"></label>
<label>${t('Segundos del intervalo', 'Seconds in the interval')} <output id="seconds-value"></output><input id="seconds" type="range" min="1" max="60" step="1" value="8"></label>
</div>
<div class="layout">
<section class="stage">
<div class="scene-caption"><b id="scene-status"></b><span>${t('Izquierda: ' + VISUAL.cerebellar + ' puntos de cerebelo y ' + VISUAL.cortical + ' de corteza, en la proporción del recuento. Derecha: ' + VISUAL.layers + ' de las ' + GROK1.layers + ' capas de Grok-1, ' + VISUAL.activeExperts + ' de ' + VISUAL.experts + ' expertos encendidos, y una cinta de ' + VISUAL.tokens + ' tokens. El anillo significa pesos quietos. Nada está a escala biológica.', 'Left: ' + VISUAL.cerebellar + ' cerebellar points and ' + VISUAL.cortical + ' cortical ones, in the census proportion. Right: ' + VISUAL.layers + ' of Grok-1’s ' + GROK1.layers + ' layers, ' + VISUAL.activeExperts + ' of ' + VISUAL.experts + ' experts lit, and a tape of ' + VISUAL.tokens + ' tokens. The ring means still weights. Nothing is at biological scale.')}</span></div>
<div id="space" role="img" tabindex="0" aria-label="${t('Dos sistemas: una nube neuronal a la izquierda y una pila de capas a la derecha. Arrastra, rueda o usa las flechas.', 'Two systems: a neuronal cloud on the left and a stack of layers on the right. Drag, scroll or use the arrow keys.')}"></div>
<p id="loading">${t('Preparando la comparación…', 'Preparing the comparison…')}</p>
<div class="view-controls"><button id="fit">${t('Centrar', 'Center')}</button><button id="zoom-out" aria-label="${t('Alejar', 'Zoom out')}">−</button><button id="zoom-in" aria-label="${t('Acercar', 'Zoom in')}">+</button></div>
<div class="scene-bottom"><span id="action"></span><strong id="percent"></strong></div>
</section>
<aside>
<span class="eyebrow">${t('QUÉ ESTÁS COMPARANDO', 'WHAT YOU ARE COMPARING')}</span>
<div class="detail">
<h2 id="focus-name"></h2>
<p id="focus-detail"></p>
<p id="lesson" aria-live="polite"></p>
<dl>
<div><dt>${t('Neuronas · Azevedo 2009', 'Neurons · Azevedo 2009')}</dt><dd id="neurons"></dd></div>
<div><dt>${t('No neuronales por neurona', 'Non-neuronal cells per neuron')}</dt><dd id="glia"></dd></div>
<div><dt>${t('En el cerebelo', 'In the cerebellum')}</dt><dd id="cerebellum"></dd></div>
<div><dt>${t('En la corteza', 'In the cortex')}</dt><dd id="cortex"></dd></div>
<div><dt>${t('Parámetros de Grok-1 por neurona', 'Grok-1 parameters per neuron')}</dt><dd id="per-neuron"></dd></div>
<div><dt>${t('Sinapsis de orden por parámetro', 'Order-of-magnitude synapses per parameter')}</dt><dd id="per-parameter"></dd></div>
<div><dt>${t('Expertos usados por token', 'Experts used per token')}</dt><dd id="experts"></dd></div>
<div><dt>${t('Consultas por cada clave', 'Queries per key')}</dt><dd id="heads"></dd></div>
<div><dt>${t('Tokens que siguen en la ventana', 'Tokens still in the window')}</dt><dd id="kept"></dd></div>
<div><dt>${t('Fragmentos de trabajo', 'Working-memory chunks')}</dt><dd id="chunks"></dd></div>
<div><dt>${t('Tokens cortados', 'Tokens cut off')}</dt><dd id="dropped"></dd></div>
<div><dt>${t('Puntuaciones del próximo token', 'Scores for the next token')}</dt><dd id="scores"></dd></div>
<div><dt>${t('Δ del próximo paso', 'Δ of the next step')}</dt><dd id="delta"></dd></div>
<div><dt>${t('Pérdida del peso de juguete', 'Toy weight’s loss')}</dt><dd id="loss"></dd></div>
<div><dt>${t('Rastro local didáctico', 'Didactic local trace')}</dt><dd id="trace"></dd></div>
<div><dt>${t('Julios del cerebro', 'Joules in the brain')}</dt><dd id="joules"></dd></div>
<div><dt>${t('Tokens ya emitidos', 'Tokens already emitted')}</dt><dd id="serial"></dd></div>
</dl>
</div>
</aside>
</div>
<section class="principles">
<article><span class="eyebrow">01 · ${t('UNIDADES', 'UNITS')}</span><b>${t('No son la misma pieza', 'Not the same part')}</b><p>${t('Comparar parámetros con neuronas hace que Grok-1 parezca más grande. Compararlos con sinapsis lo hace parecer más pequeño. Una sinapsis no es un número, y un experto no es un área cortical.', 'Comparing parameters with neurons makes Grok-1 look larger. Comparing them with synapses makes it look smaller. A synapse is not a number, and an expert is not a cortical area.')}</p></article>
<article><span class="eyebrow">02 · ${t('MEMORIA', 'MEMORY')}</span><b>${t('Caben cosas distintas', 'Different things fit')}</b><p>${t('8192 tokens no son 8192 recuerdos. Cuatro fragmentos no son cuatro palabras. Buscar en la web, en el otro notebook, alarga el contexto: no reescribe los pesos.', '8,192 tokens are not 8,192 memories. Four chunks are not four words. Looking something up, in the other notebook, lengthens the context: it does not rewrite the weights.')}</p></article>
<article><span class="eyebrow">03 · ${t('TIEMPO', 'TIME')}</span><b>${t('Uno espera al anterior', 'One waits for the previous')}</b><p>${t('Grok escribe en serie. El cerebro mantiene actividad en paralelo y el habla sale en serie por la boca, no porque cada neurona espere el token anterior. Gastar más cálculo de prueba es emitir más tokens, no abrir otro órgano.', 'Grok writes serially. The brain keeps parallel activity, and speech comes out serially at the mouth, not because each neuron waits for the previous token. Spending more test-time compute means emitting more tokens, not opening another organ.')}</p></article>
</section>
<details class="assumptions"><summary>${t('Qué estamos usando · fichas, recuentos y límites', 'What we are using · cards, counts and limits')}</summary>
<p>${t('Grok-1, marzo de 2024: 314 × 10⁹ parámetros, 8 expertos de los cuales 2 se usan por token, 64 capas, 48 cabezas de consulta y 8 de clave/valor, anchura 6144, vocabulario 131072, contexto 8192. Es un transformador autorregresivo con expertos dispersos y posiciones rotatorias. Fuente: el repositorio publicado por xAI. Las versiones posteriores no tienen una ficha equivalente. Este notebook no les copia estos números.', 'Grok-1, March 2024: 314 × 10⁹ parameters, 8 experts of which 2 are used per token, 64 layers, 48 query heads and 8 key/value heads, width 6,144, vocabulary 131,072, context 8,192. It is an autoregressive transformer with sparse experts and rotary positions. Source: the repository published by xAI. Later versions have no equivalent card. This notebook does not copy these numbers onto them.')} <a href="https://github.com/xai-org/grok-1" target="_blank" rel="noopener">Grok-1 ↗</a></p>
<p>${t('Cerebro: Azevedo y colegas (2009) dan 86,1 × 10⁹ neuronas y 84,6 × 10⁹ células no neuronales, con 16,3 × 10⁹ en la corteza y 69 × 10⁹ en el cerebelo. El mito de diez células gliales por neurona no sale de ese recuento. Herculano-Houzel (2009) subraya que unas cuatro de cada cinco neuronas están en el cerebelo. Las sinapsis se toman como orden de magnitud 10¹⁴, no como un censo.', 'Brain: Azevedo and colleagues (2009) report 86.1 × 10⁹ neurons and 84.6 × 10⁹ non-neuronal cells, with 16.3 × 10⁹ in the cortex and 69 × 10⁹ in the cerebellum. The myth of ten glial cells per neuron does not follow from that count. Herculano-Houzel (2009) stresses that about four in five neurons are in the cerebellum. Synapses are taken as an order of magnitude, 10¹⁴, not a census.')} <a href="https://doi.org/10.1002/cne.21974" target="_blank" rel="noopener">Azevedo 2009 ↗</a> · <a href="https://doi.org/10.3389/neuro.09.031.2009" target="_blank" rel="noopener">Herculano-Houzel 2009 ↗</a></p>
<p>${t('Memoria de trabajo: Cowan (2001) sitúa la capacidad cerca de 4 fragmentos, con un margen de más o menos uno. No es un contador de tokens. Energía: el cerebro es alrededor del 2 % de la masa y cerca del 20 % del metabolismo en reposo (Raichle y Gusnard, 2002). Con un metabolismo basal del orden de 100 W, eso son unos 20 W. Es una cifra de orden para todo el órgano, no el coste de una frase.', 'Working memory: Cowan (2001) places capacity near 4 chunks, with a margin of about one. It is not a token counter. Energy: the brain is about 2% of body mass and near 20% of resting metabolism (Raichle and Gusnard, 2002). With basal metabolism on the order of 100 W, that is about 20 W. It is an order-of-magnitude figure for the whole organ, not the cost of one sentence.')} <a href="https://doi.org/10.1017/S0140525X01003922" target="_blank" rel="noopener">Cowan 2001 ↗</a> · <a href="https://doi.org/10.1073/pnas.172399499" target="_blank" rel="noopener">Raichle y Gusnard 2002 ↗</a></p>
<p>${t('La atención de un transformador es una media ponderada de vectores de valor, con máscara causal (Vaswani y colegas, 2017). La atención biológica no es ese cálculo. El paso de entrenamiento de juguete no es retropropagación de Grok; si el cerebro aproxima algo parecido a la retropropagación sigue siendo una pregunta abierta (Lillicrap y colegas, 2020). Predecir el mundo para actuar es una hipótesis, no un resultado de este modelo. Confundir una continuación probable con un recuerdo reconstruido tampoco está justificado.', 'A transformer’s attention is a weighted average of value vectors, with a causal mask (Vaswani and colleagues, 2017). Biological attention is not that calculation. The toy training step is not Grok’s backpropagation; whether a brain approximates something like backpropagation remains an open question (Lillicrap and colleagues, 2020). Predicting the world in order to act is a hypothesis, not a result of this model. Equating a likely continuation with a reconstructed memory is not justified either.')} <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">Vaswani 2017 ↗</a> · <a href="https://doi.org/10.1038/s41583-020-0277-3" target="_blank" rel="noopener">Lillicrap 2020 ↗</a></p>
<p>${t('Los puntos 3D son una muestra: ' + VISUAL.cerebellar + ' y ' + VISUAL.cortical + ' frente a ' + sci(CEREBELLAR) + ' y ' + sci(CORTICAL) + ' neuronas. Las puntuaciones cuentan productos de consulta de una ficha, no julios ni operaciones de coma flotante totales. El vocabulario de ' + nf.format(GROK1.vocab) + ' piezas es el de Grok-1. Un cerebro no elige el siguiente acto en esa lista.', 'The 3D points are a sample: ' + VISUAL.cerebellar + ' and ' + VISUAL.cortical + ' against ' + sci(CEREBELLAR) + ' and ' + sci(CORTICAL) + ' neurons. The scores count query products from one model card, not joules or total floating-point operations. The vocabulary of ' + nf.format(GROK1.vocab) + ' pieces is Grok-1’s. A brain does not choose its next act from that list.')}</p>
</details>
<footer>${t('Atlas · Mente · notebook 09 · 21 septiembre 2026', 'Atlas · Mind · notebook 09 · 21 September 2026')}</footer>`;

try { world = createMindWorld($('space')); $('loading').hidden = true; }
catch (e) { $('loading').textContent = t('La vista 3D no está disponible. Puedes seguir los contadores y el texto.', 'The 3D view is unavailable. You can still follow the counters and the text.'); console.error(e); }

function setMode(mode) { state.mode = mode; paint(); }
function setFocus(focus) { state.focus = focus; paint(); }
function paint() {
  $('mode-reply').setAttribute('aria-pressed', String(state.mode === 'reply'));
  $('mode-learn').setAttribute('aria-pressed', String(state.mode === 'learn'));
  for (const name of ['units', 'memory', 'learn', 'energy']) $('focus-' + name).setAttribute('aria-pressed', String(state.focus === name));
  const v = snapshot(state);
  const [name, detail] = focusCopy[v.focus] || focusCopy.memory;
  $('dash-delta').textContent = signed(v.grokDelta);
  $('dash-delta-note').textContent = v.mode === 'learn' ? t('Próximo token de juguete. La pérdida pasaría de ', 'Next toy token. Loss would go from ') + small.format(v.loss) + t(' a ', ' to ') + small.format(v.nextLoss) + '.' : t('Pesos congelados mientras responde.', 'Weights frozen while it replies.');
  $('dash-memory').textContent = nf.format(v.kept) + ' / ' + nf.format(GROK1.context);
  $('dash-memory-note').textContent = t('Cerebro: ', 'Brain: ') + v.chunks + t(' fragmentos · ', ' chunks · ') + nf.format(v.dropped) + t(' tokens fuera', ' tokens outside');
  $('dash-energy').textContent = nf.format(v.brainJoules) + ' J';
  $('dash-energy-note').textContent = v.brainWatts + ' W × ' + nf.format(v.seconds) + ' s · ' + t('sin vatios publicados para este Grok', 'no published watts for this Grok');
  $('context-value').textContent = nf.format(v.contextTokens);
  $('seconds-value').textContent = nf.format(v.seconds) + ' s';
  $('context').value = String(state.contextTokens);
  $('seconds').value = String(state.seconds);
  $('focus-name').textContent = name;
  $('focus-detail').textContent = detail;
  $('lesson').textContent = lessons[v.lesson];
  $('neurons').textContent = sci(NEURONS);
  $('glia').textContent = small.format(v.nonneuronalPerNeuron);
  $('cerebellum').textContent = nf.format(v.cerebellarShare * 100) + ' % · ' + sci(CEREBELLAR);
  $('cortex').textContent = nf.format(v.corticalShare * 100) + ' % · ' + sci(CORTICAL);
  $('per-neuron').textContent = small.format(v.parametersPerNeuron);
  $('per-parameter').textContent = nf.format(v.synapsesPerParameter);
  $('experts').textContent = GROK1.activeExperts + ' / ' + GROK1.experts;
  $('heads').textContent = nf.format(v.headsPerKv) + ' · ' + GROK1.queryHeads + ' / ' + GROK1.kvHeads;
  $('kept').textContent = nf.format(v.kept);
  $('chunks').textContent = String(v.chunks);
  $('dropped').textContent = nf.format(v.dropped);
  $('scores').textContent = nf.format(v.nextScores);
  $('delta').textContent = signed(v.grokDelta);
  $('loss').textContent = small.format(v.loss);
  $('trace').textContent = small.format(v.trace);
  $('joules').textContent = nf.format(v.brainJoules) + ' J';
  $('serial').textContent = v.generated + ' / ' + VISUAL.tokens;
  $('scene-status').textContent = state.playing ? t('EMITIENDO EN SERIE', 'EMITTING SERIALLY') : v.mode === 'learn' ? t('ENTRENAR · EL ANILLO SE APAGA', 'TRAIN · THE RING IS OFF') : t('RESPONDER · PESOS QUIETOS', 'REPLY · WEIGHTS STILL');
  $('action').textContent = t('Arrastra · rueda · flechas · pellizca', 'Drag · scroll · arrows · pinch');
  $('percent').textContent = v.generated + ' / ' + VISUAL.tokens + ' ' + t('tokens', 'tokens');
  $('play').textContent = state.playing ? 'Ⅱ ' + t('Pausar', 'Pause') : v.generated >= VISUAL.tokens ? '↺ ' + t('Otra cinta', 'Another tape') : '▶ ' + t('Emitir tokens', 'Emit tokens');
}
$('play').onclick = () => {
  if (state.generated >= VISUAL.tokens) { state.generated = 0; state.time = 0; }
  state.playing = !state.playing;
  last = performance.now();
  paint();
};
$('reset').onclick = () => { state = createState(); world?.fit(); paint(); };
$('mode-reply').onclick = () => setMode('reply');
$('mode-learn').onclick = () => setMode('learn');
$('focus-units').onclick = () => setFocus('units');
$('focus-memory').onclick = () => setFocus('memory');
$('focus-learn').onclick = () => setFocus('learn');
$('focus-energy').onclick = () => setFocus('energy');
$('context').oninput = e => { state.playing = false; state.contextTokens = +e.target.value; paint(); };
$('seconds').oninput = e => { state.seconds = +e.target.value; paint(); };
$('fit').onclick = () => { world?.fit(); paint(); };
$('zoom-in').onclick = () => { world?.zoomBy(1.12); paint(); };
$('zoom-out').onclick = () => { world?.zoomBy(1 / 1.12); paint(); };
window.addEventListener('resize', paint);
paint();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!document.hidden) {
    const wasPlaying = state.playing;
    if (wasPlaying) tick(state, dt);
    world?.render(state, dt);
    if (wasPlaying && !state.playing) paint();
    else if (state.playing && now - domAt > 80) { domAt = now; paint(); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
