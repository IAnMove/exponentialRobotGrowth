import {spawn, exhibits, stepVisitor, lookDelta, nearestExhibit, roomName, standAt} from './model.js';
import {createMuseum} from './world.js';
import {StepGuide} from '../llms/guide.js';
import {VOICES} from './voices.js';
const es = document.documentElement.lang === 'es', t = (a, b) => es ? a : b, $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits: 1});
const TOUR = [
  { id: 'hall' },
  { id: 'screen', pieza: 'robots' },
  { id: 'enter', pieza: 'robots' },
  { id: 'mind', pieza: 'modelos' }
];
const player = { ...spawn };
let step = 0, voiceLanguage = es ? 'es' : 'en';
let world, entered = null, last = performance.now();
let basis = { x: 0, z: -1, rx: 1, rz: 0 };
const keys = new Set();
const stick = { id: null, x: 0, y: 0, ox: 0, oy: 0 };
document.title = t('Museo — Dos maneras de entrar', 'Museum — Two ways in');
$('app').innerHTML = `<div id="view" tabindex="0"></div>
<div class="cross" aria-hidden="true"></div>
<div class="hud top"><a href="../index.html">${t('← Modo web', '← Web mode')}</a><a href="../modelos/index.html">${t('Modelos', 'Models')}</a><button id="narrate" class="primary" type="button">${t('Escuchar la visita', 'Play the visit')}</button><label class="voice-lang">${t('Voz', 'Voice')} <select id="voice-language"><option value="es" ${es ? 'selected' : ''}>Español</option><option value="en" ${es ? '' : 'selected'}>English</option></select></label><span id="voice-state"></span><span class="where" id="where" data-x="0" data-z="18"></span></div>
<p id="voice-transcript"></p>
<p id="help">${t('W A S D o el joystick para caminar. Ratón para mirar. E entra en la experiencia. Esc vuelve al pasillo.', 'W A S D or the stick to walk. Mouse to look. E steps into the experience. Esc returns to the gallery.')}</p>
<div class="stick" id="stick" aria-hidden="true"><i id="stick-knob"></i></div>
<aside class="card" id="card">
<span class="eyebrow" id="card-num"></span>
<h2 id="card-name"></h2>
<p>${t('Estás delante de la pantalla. Entrar abre la experiencia a tamaño completo. La página web es la otra visita, sin el pasillo.', 'You are in front of the screen. Step in and the experience opens full size. The web page is the other visit, without the gallery.')}</p>
<div class="actions"><button class="primary" id="enter" type="button">${t('Entrar', 'Step in')}</button><a id="web" href="../index.html">${t('Abrir en web', 'Open on the web')}</a></div>
</aside>
<div id="entered" hidden>
<div class="entered-bar"><button id="leave" type="button">${t('← Volver al pasillo', '← Back to the gallery')}</button><a id="entered-web" href="../index.html">${t('Abrir en web', 'Open on the web')}</a><span id="entered-name"></span></div>
<iframe id="frame" title="${t('Experiencia', 'Experience')}"></iframe>
</div>
<p id="loading">${t('Abriendo las salas…', 'Opening the galleries…')}</p>`;

try {
  world = createMuseum($('view'), es);
  $('loading').hidden = true;
} catch (e) {
  $('loading').textContent = t('La vista 3D no está disponible en este navegador.', 'The 3D view is unavailable in this browser.');
  console.error(e);
}

function jumpTo(id) {
  const exhibit = exhibits.find(item => item.id === id);
  if (!exhibit) return;
  const stand = standAt(exhibit);
  player.x = stand.x;
  player.z = stand.z;
  player.yaw = stand.yaw;
  player.pitch = stand.pitch;
}

function requestedExhibit() {
  return new URLSearchParams(location.search).get('pieza') || decodeURIComponent(location.hash.replace(/^#/, ''));
}
function applyRequest() { const id = requestedExhibit(); if (id) jumpTo(id); }
applyRequest();
window.addEventListener('hashchange', applyRequest);

function input() {
  return {
    forward: (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + stick.y,
    strafe: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stick.x
  };
}
function getClip() {
  const clip = (VOICES[voiceLanguage] || []).find(item => item.id === TOUR[step].id);
  return clip?.src ? clip : { id: TOUR[step].id, title: TOUR[step].id, text: '', src: '', duration: 8 };
}
function renderVoice() {
  const clip = guide.clip || getClip();
  $('voice-transcript').textContent = clip.text || '';
  const labels = {
    idle: t('Puedes caminar, o escuchar la visita', 'You can walk, or listen to the visit'),
    loading: t('Cargando narración…', 'Loading narration…'),
    speaking: t('Escuchando', 'Listening'),
    waiting: t('Siguiente sala en ', 'Next stop in ') + Math.ceil(guide.remaining) + ' s',
    paused: t('Visita en pausa', 'Visit paused'),
    finished: t('Visita completada', 'Visit complete'),
    blocked: t('Pulsa escuchar para permitir el audio', 'Press play to allow audio'),
    error: t('No se pudo cargar la voz. Puedes seguir caminando.', 'The voice could not load. You can keep walking.')
  };
  $('voice-state').textContent = labels[guide.state] || '';
  $('narrate').textContent = guide.running ? t('Pausar voz', 'Pause voice') : guide.state === 'finished' ? t('Repetir visita', 'Replay visit') : t('Escuchar la visita', 'Play the visit');
}
const guide = new StepGuide({
  gap: 3,
  getClip,
  onAdvance() {
    if (step >= TOUR.length - 1) return false;
    step += 1;
    if (TOUR[step].pieza) jumpTo(TOUR[step].pieza);
    return true;
  },
  onChange() { renderVoice(); }
});
function enter(exhibit) {
  if (!exhibit) return;
  guide.pause();
  entered = exhibit;
  $('frame').src = exhibit.href;
  $('entered-web').href = exhibit.href;
  $('entered-name').textContent = (es ? exhibit.es : exhibit.en);
  $('entered').hidden = false;
  document.exitPointerLock?.();
}
function leave() {
  entered = null;
  $('frame').src = 'about:blank';
  $('entered').hidden = true;
}
function paint(near) {
  $('where').textContent = (roomName(player.z) === 'mind' ? t('Sala de la mente', 'Mind gallery') : t('Pasillo', 'Gallery')) + ' · ' + nf.format(player.x) + ' m, ' + nf.format(player.z) + ' m';
  $('where').dataset.x = String(player.x);
  $('where').dataset.z = String(player.z);
  $('card').classList.toggle('show', Boolean(near) && !entered);
  if (!near) return;
  $('card-num').textContent = near.num + (es ? ' · PANTALLA' : ' · SCREEN');
  $('card-name').textContent = es ? near.es : near.en;
  $('web').href = near.href;
}
$('narrate').onclick = () => {
  if (guide.state === 'finished') step = 0;
  if (!guide.running && (guide.state === 'idle' || guide.state === 'finished' || guide.state === 'error')) {
    if (step === 0) { player.x = spawn.x; player.z = spawn.z; player.yaw = spawn.yaw; player.pitch = 0; }
    else if (TOUR[step].pieza) jumpTo(TOUR[step].pieza);
  }
  if (guide.running) guide.pause(); else guide.resume();
};
$('voice-language').onchange = e => { voiceLanguage = e.target.value; const active = guide.running; guide.stop(); if (active) guide.enter(); else renderVoice(); };
$('enter').onclick = () => enter(nearestExhibit(player.x, player.z, basis.x, basis.z));
$('leave').onclick = leave;
window.addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'KeyE' && !entered) enter(nearestExhibit(player.x, player.z, basis.x, basis.z));
  if (e.code === 'Escape' && entered) leave();
});
window.addEventListener('keyup', e => keys.delete(e.code));
$('view').addEventListener('click', () => { if (!entered) world?.lookLock(); });
window.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== world?.dom || entered) return;
  const look = lookDelta(player.yaw, player.pitch, e.movementX, e.movementY);
  player.yaw = look.yaw;
  player.pitch = look.pitch;
});
let lookDrag = null;
$('view').addEventListener('pointerdown', e => {
  if (entered || e.button !== 0) return;
  if (e.clientX < innerWidth * 0.42 && matchMedia('(pointer: coarse)').matches) {
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    return;
  }
  lookDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', e => {
  if (stick.id === e.pointerId) {
    stick.x = Math.max(-1, Math.min(1, (e.clientX - stick.ox) / 56));
    stick.y = Math.max(-1, Math.min(1, (stick.oy - e.clientY) / 56));
    const knob = $('stick-knob');
    knob.style.left = (50 + stick.x * 28) + '%';
    knob.style.top = (50 - stick.y * 28) + '%';
  }
  if (!lookDrag || lookDrag.id !== e.pointerId || document.pointerLockElement) return;
  const look = lookDelta(player.yaw, player.pitch, e.clientX - lookDrag.x, e.clientY - lookDrag.y);
  lookDrag.x = e.clientX;
  lookDrag.y = e.clientY;
  player.yaw = look.yaw;
  player.pitch = look.pitch;
});
window.addEventListener('pointerup', e => {
  if (stick.id === e.pointerId) { stick.id = null; stick.x = 0; stick.y = 0; }
  if (lookDrag?.id === e.pointerId) lookDrag = null;
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!entered) guide.tick(dt);
  if (!entered && world) {
    const next = stepVisitor(player, { x: basis.x, z: basis.z }, { x: basis.rx, z: basis.rz }, input(), dt);
    player.x = next.x;
    player.z = next.z;
  }
  const near = nearestExhibit(player.x, player.z, basis.x, basis.z);
  const fresh = world?.render(player, near?.id || '');
  if (fresh && Math.hypot(fresh.x, fresh.z) > 0.2) basis = fresh;
  if (!document.hidden) { paint(near); if (guide.running || guide.state === 'waiting') renderVoice(); }
  requestAnimationFrame(frame);
}
renderVoice();
paint(null);
requestAnimationFrame(frame);
