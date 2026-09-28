// "About Atlas" tab, injected into every page by the build. Self-contained: markup, styles and behaviour.
// A left-edge tab opens a panel with the author on X, the GitHub repository (live star count) and sharing.
const REPO = 'IAnMove/exponentialRobotGrowth', REPO_URL = `https://github.com/${REPO}`, X_HANDLE = 'theinaog';
const NUDGE_AFTER = 90, STAR_CACHE_HOURS = 6;

if (!document.querySelector('.atlas-about')) mount();

function mount() {
  const es = document.documentElement.lang === 'es', t = (a, b) => es ? a : b;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  const style = document.createElement('style');
  style.textContent = `
.atlas-about{--ab-bg:#101a26f2;--ab-line:#ffffff24;--ab-text:#e8eef5;--ab-muted:#a9b8c8;--ab-gold:#e9c98f;position:fixed;left:0;top:42%;z-index:60;font:14px/1.5 Inter,ui-sans-serif,system-ui,sans-serif;color:var(--ab-text);transition:opacity .2s}
.atlas-about[hidden]{display:block!important;opacity:0;pointer-events:none}
.atlas-about-tab{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;writing-mode:vertical-rl;transform:rotate(180deg);padding:14px 8px;border:1px solid var(--ab-line);border-left:0;border-radius:10px 0 0 10px;background:var(--ab-bg);backdrop-filter:blur(10px);color:var(--ab-text);font-size:12px;letter-spacing:.08em;cursor:pointer;box-shadow:0 6px 24px #0006}
.atlas-about-tab:hover{background:#18263a}
.atlas-about-tab:focus-visible{outline:2px solid var(--ab-gold);outline-offset:2px}
.atlas-about-tab .ab-star{color:var(--ab-gold);transform:rotate(180deg)}
.atlas-about.open .atlas-about-tab{background:#1d2c40;color:var(--ab-gold)}
.atlas-about-panel{position:absolute;left:44px;top:50%;transform:translate(-12px,-50%);width:min(330px,calc(100vw - 60px));max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;padding:22px;border:1px solid var(--ab-line);border-radius:16px;background:var(--ab-bg);backdrop-filter:blur(14px);box-shadow:0 20px 60px #000a;opacity:0;visibility:hidden;transition:opacity .2s,transform .2s,visibility 0s .2s}
.atlas-about.open .atlas-about-panel{opacity:1;visibility:visible;transform:translate(0,-50%);transition:opacity .2s,transform .2s}
.atlas-about h2{margin:0 0 4px;font-size:18px;font-weight:600;letter-spacing:-.01em;color:var(--ab-text)}
.atlas-about p{margin:0 0 16px;color:var(--ab-muted);font-size:13px;line-height:1.6}
.atlas-about .ab-card{display:block;border:1px solid var(--ab-line);border-radius:12px;padding:14px;margin:0 0 10px;background:#ffffff06}
.atlas-about .ab-card b{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--ab-text)}
.atlas-about .ab-card>span{display:block;font-size:12px;color:var(--ab-muted);margin-bottom:10px}
.atlas-about .ab-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--ab-line);color:var(--ab-text);background:#ffffff0d}
.atlas-about .ab-btn:hover{background:#ffffff1a}
.atlas-about .ab-btn:focus-visible{outline:2px solid var(--ab-gold);outline-offset:2px}
.atlas-about .ab-btn.ab-primary{background:var(--ab-gold);border-color:var(--ab-gold);color:#141c27}
.atlas-about .ab-btn.ab-primary:hover{background:#f3dcb0}
.atlas-about .ab-count{font-variant-numeric:tabular-nums;padding-left:8px;margin-left:2px;border-left:1px solid #141c2755}
.atlas-about .ab-count:empty{display:none}
.atlas-about .ab-note{font-size:11px;color:#8fa1b5;margin:12px 0 0}
.atlas-about .ab-hint{position:absolute;left:44px;top:50%;transform:translateY(-50%);white-space:nowrap;padding:7px 11px;border-radius:8px;background:var(--ab-gold);color:#141c27;font-size:12px;font-weight:600;box-shadow:0 6px 20px #0007;pointer-events:none;opacity:0;transition:opacity .3s}
.atlas-about.nudge .ab-hint{opacity:1}
.atlas-about.nudge:not(.open) .atlas-about-tab{animation:ab-wiggle 1.2s ease-in-out 2}
@keyframes ab-wiggle{0%,100%{transform:rotate(180deg) translateX(0)}30%{transform:rotate(180deg) translateX(-5px)}60%{transform:rotate(180deg) translateX(2px)}}
@media (prefers-reduced-motion:reduce){.atlas-about *{transition:none!important;animation:none!important}}
@media (max-width:650px){.atlas-about{top:auto;bottom:calc(var(--atlas-player-height,0px) + 90px)}.atlas-about-tab{padding:12px 6px;font-size:11px}.atlas-about-panel{top:auto;bottom:0;transform:translate(-12px,0)}.atlas-about.open .atlas-about-panel{transform:none}.atlas-about .ab-hint{top:auto;bottom:0;transform:none}}
@media print{.atlas-about{display:none!important}}`;
  document.head.append(style);

  const xIcon = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4zm-1.2 17.9h1.9L7.1 4.2h-2z"/></svg>';
  const ghIcon = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5"/></svg>';
  const shareIcon = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>';

  const root = document.createElement('aside');
  root.className = 'atlas-about';
  root.setAttribute('aria-label', t('Sobre Atlas', 'About Atlas'));
  root.innerHTML = `<button class="atlas-about-tab" type="button" aria-expanded="false" aria-controls="atlas-about-panel"><span class="ab-star" aria-hidden="true">★</span>${t('Sobre Atlas', 'About Atlas')}</button>
<span class="ab-hint" aria-hidden="true">${t('¿Te gusta? ⭐', 'Enjoying it? ⭐')}</span>
<div class="atlas-about-panel" id="atlas-about-panel" role="dialog" aria-label="${t('Sobre Atlas', 'About Atlas')}">
 <h2>Atlas</h2>
 <p>${t('Explicaciones interactivas para entender cómo funcionan los sistemas: cambia las condiciones y mira qué pasa.', 'Interactive explanations of how systems work: change the conditions and watch what happens.')}</p>
 <div class="ab-card"><b>${t('Hecho por', 'Made by')} @${X_HANDLE}</b><span>${t('Sígueme en X para ver los próximos cuadernos antes que nadie.', 'Follow on X to see the next notebooks first.')}</span>
  <a class="ab-btn" href="https://x.com/${X_HANDLE}" target="_blank" rel="noopener">${xIcon}${t('Seguir', 'Follow')} @${X_HANDLE}</a></div>
 <div class="ab-card"><b>${t('¿Te ha gustado?', 'Did you enjoy it?')}</b><span>${t('Una estrella en GitHub ayuda a que más gente lo descubra. Es gratis y tarda un segundo.', 'A GitHub star helps more people find it. It is free and takes a second.')}</span>
  <a class="ab-btn ab-primary" href="${REPO_URL}" target="_blank" rel="noopener">${ghIcon}★ ${t('Dar una estrella', 'Star the repo')}<span class="ab-count" aria-label="${t('estrellas', 'stars')}"></span></a></div>
 <div class="ab-card"><b>${t('Compártelo', 'Share it')}</b><span>${t('Envía esta página a quien le pueda interesar.', 'Send this page to someone who would like it.')}</span>
  <button class="ab-btn ab-share" type="button">${shareIcon}<span class="ab-share-label">${t('Compartir esta página', 'Share this page')}</span></button></div>
 <p class="ab-note">${t('Código abierto en', 'Open source on')} <a href="${REPO_URL}" target="_blank" rel="noopener" style="color:inherit">GitHub</a>.</p>
</div>`;
  document.body.append(root);

  const tab = root.querySelector('.atlas-about-tab'), panel = root.querySelector('.atlas-about-panel');
  function setOpen(open, focus = true) {
    root.classList.toggle('open', open);
    root.classList.remove('nudge');
    tab.setAttribute('aria-expanded', String(open));
    if (open) { store.set('atlas-about-nudged', '1'); loadStars(); if (focus) panel.querySelector('a,button')?.focus({ preventScroll: true }); }
    else if (focus && root.contains(document.activeElement)) tab.focus({ preventScroll: true });
  }
  tab.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) setOpen(false); });
  document.addEventListener('pointerdown', e => { if (root.classList.contains('open') && !root.contains(e.target)) setOpen(false, false); });
  // Pages capture keys for walking; typing inside the panel must not move the visitor.
  root.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); e.stopPropagation(); });

  // Out of the way while a 3D world owns the mouse or a painting portal is playing.
  const sync = () => { const busy = !!document.pointerLockElement || document.body.classList.contains('crossing'); root.hidden = busy; if (busy) setOpen(false, false); };
  document.addEventListener('pointerlockchange', sync);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const shareLabel = root.querySelector('.ab-share-label');
  root.querySelector('.ab-share').addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(location.href);
      shareLabel.textContent = t('Enlace copiado ✓', 'Link copied ✓');
    } catch { shareLabel.textContent = t('Copia la URL de la barra', 'Copy the URL from the address bar'); }
    setTimeout(() => { shareLabel.textContent = t('Compartir esta página', 'Share this page'); }, 2500);
  });

  let starsLoaded = false;
  async function loadStars() {
    if (starsLoaded) return; starsLoaded = true;
    const out = root.querySelector('.ab-count'), show = n => { if (n > 0) out.textContent = new Intl.NumberFormat(es ? 'es' : 'en').format(n); };
    try {
      const cached = JSON.parse(store.get('atlas-stars') || 'null');
      if (cached && Date.now() - cached.at < STAR_CACHE_HOURS * 3600e3) return show(cached.n);
      const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return;
      const n = (await res.json()).stargazers_count;
      if (Number.isFinite(n)) { store.set('atlas-stars', JSON.stringify({ n, at: Date.now() })); show(n); }
    } catch {}
  }

  // One gentle nudge per browser, after a real visit; never while the page is hidden.
  if (!store.get('atlas-about-nudged')) {
    let seen = 0;
    const timer = setInterval(() => {
      if (document.hidden || root.hidden) return;
      if (++seen < NUDGE_AFTER) return;
      clearInterval(timer);
      if (root.classList.contains('open')) return;
      store.set('atlas-about-nudged', '1');
      root.classList.add('nudge');
      setTimeout(() => root.classList.remove('nudge'), reduced ? 4000 : 6000);
    }, 1000);
  }
}
