// Cinematic scroll view of notebook 08. Every number drawn comes from model.js:
// the reversible tokenizer, the toy transformer trace, softmax and the seeded sampler.
import {DEFAULTS,createRun,advance,contextWindow,transformerTrace,softmax,randomStep,sample,tokenize,hash} from './model.js';

const es=document.documentElement.lang==='es',lang=es?'es':'en',t=(a,b)=>es?a:b,$=id=>document.getElementById(id);
const number=(n,d=0)=>new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const show=x=>x==='<EOS>'?'⏹':x.includes('\n')?'↵':/^\s+$/.test(x)?'␠':x;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k,smooth=x=>x*x*(3-2*x),easeOut=x=>1-(1-x)**3;
const bounce=x=>{const n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d)return n*(x-=1.5/d)*x+.75;if(x<2.5/d)return n*(x-=2.25/d)*x+.9375;return n*(x-=2.625/d)*x+.984375;};
const rand=i=>{const x=Math.sin(i*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const SANS='Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',MONO='ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace';
const C={blue:'#8fb3ff',mint:'#7fe6d3',gold:'#ffcf7a',coral:'#ff8a7a',violet:'#b79bff',ink:'#e8efff',muted:'#8a9bb8'};
const CAND=[C.mint,C.blue,C.violet];

document.title=t('LLMs — El viaje de una respuesta','LLMs — The journey of an answer');
const CH=[
  {short:t('Pregunta','Question')},
  {short:t('Contexto','Context'),eyebrow:t('02 · CONTEXTO','02 · CONTEXT'),title:t('El modelo solo ve lo que le envían.','The model only sees what it is sent.'),body:t('La aplicación apila instrucciones, mensajes anteriores y, si los hay, documentos recuperados. Todo acaba en un único texto. El modelo no abre internet por su cuenta: si falta la fuente, falta.','The application stacks instructions, earlier messages and, when present, retrieved documents. It all becomes one text. The model does not open the internet by itself: if the source is missing, it is missing.'),extra:`<p class="fine">${t('Cambia el experimento arriba: «Banco» con o sin conversación, o el museo con o sin ficha.','Switch the experiment above: “Bank” with or without chat history, or the museum with or without a record.')}</p>`},
  {short:'Tokens',eyebrow:t('03 · TOKENS','03 · TOKENS'),title:t('El texto se rompe en piezas.','Text shatters into pieces.'),body:t('Cada pieza —una palabra, un trozo de palabra, un signo— recibe un número. Este tokenizador de juguete es reversible: juntar las piezas devuelve exactamente el texto.','Each piece — a word, a word fragment, a symbol — gets a number. This toy tokenizer is reversible: joining the pieces returns exactly the text.'),extra:`<div class="stat"><div><strong id="token-count">0</strong>${t('piezas','pieces')}</div><div><strong id="vocab-count">0</strong>${t('distintas','distinct')}</div></div><p class="fine">${t('Un modelo comercial usa su propio vocabulario de decenas de miles de piezas.','A commercial model uses its own vocabulary of tens of thousands of pieces.')}</p>`},
  {short:t('Vectores','Vectors'),eyebrow:t('04 · VECTORES','04 · VECTORS'),title:t('Cada pieza se convierte en una columna de números.','Each piece becomes a column of numbers.'),body:t('Una tabla aprendida da a cada ID un vector, y se le suma su posición. Aquí hay 6 dimensiones; un modelo real usa miles. <b class="m">Azul</b> es positivo, <b style="color:#ff8a7a">coral</b> negativo.','A learned table gives each ID a vector, plus its position. Here there are 6 dimensions; a real model uses thousands. <b class="m">Blue</b> is positive, <b style="color:#ff8a7a">coral</b> negative.'),extra:`<div class="formula">x = E[id] + P(${t('posición','position')})</div><p class="fine">${t('Dibujamos las últimas 8 piezas. El resto del contexto queda como una franja arriba. Pasa el cursor por una celda.','We draw the last 8 pieces. The rest of the context becomes a strip above. Hover over a cell.')}</p>`},
  {short:t('Atención','Attention'),eyebrow:t('05 · ATENCIÓN','05 · ATTENTION'),title:t('Cada pieza mira hacia atrás.','Every piece looks back.'),body:t('La consulta <b class="k">dorada</b> se compara con las claves de las piezas anteriores. Softmax reparte el 100 % de su atención entre ellas. El futuro está enmascarado: pesa exactamente cero.','The <b class="k">gold</b> query is compared with the keys of earlier pieces. Softmax splits 100% of its attention among them. The future is masked: it weighs exactly zero.'),extra:`<div class="formula">A = softmax(QKᵀ/√d + M)</div><p class="fine">${t('Desplázate para mover la consulta, o pulsa una pieza. Una sola cabeza con pesos sintéticos: no mide importancia factual.','Scroll to move the query, or click a piece. One head with synthetic weights: it does not measure factual importance.')}</p>`},
  {short:t('Capas','Layers'),eyebrow:t('06 · CAPAS','06 · LAYERS'),title:t('Y eso se repite, capa tras capa.','And it repeats, layer after layer.'),body:t('Atención, una red neuronal y atajos residuales, apilados decenas de veces. Todas las posiciones se calculan en paralelo; la última reúne lo necesario para predecir la siguiente pieza.','Attention, a neural network and residual shortcuts, stacked dozens of times. All positions are computed in parallel; the last one gathers what is needed to predict the next piece.'),extra:`<p class="fine">${t('Las luces siguen vectores de activaciones. No son pensamientos ni una lectura fiel de una red real.','The lights follow activation vectors. They are not thoughts, nor a faithful reading of a real network.')}</p>`},
  {short:t('Probabilidades','Probabilities'),eyebrow:t('07 · PROBABILIDADES','07 · PROBABILITIES'),title:t('Una apuesta sobre la siguiente pieza.','A bet on the next piece.'),body:t('El vector final se proyecta sobre el vocabulario y softmax lo convierte en probabilidades. <b class="k">Probable no significa verdadero.</b>','The final vector is projected onto the vocabulary and softmax turns it into probabilities. <b class="k">Probable does not mean true.</b>'),extra:`<label class="knob"><span>${t('Temperatura','Temperature')} <output id="temp-out"></output></span><input id="temp" type="range" min="0" max="2" step="0.05"></label><div class="formula">pᵢ = exp(zᵢ/T) / Σ exp(zⱼ/T)</div><p class="fine">${t('T baja: la favorita se lo lleva casi todo. T alta: el reparto se aplana. Tres candidatas y logits preparados para el ejemplo.','Low T: the favorite takes almost everything. High T: the distribution flattens. Three candidates and curated logits for the example.')}</p>`},
  {short:t('Elegir','Choose'),eyebrow:t('08 · ELEGIR','08 · CHOOSE'),title:t('Sale una sola pieza.','Only one piece comes out.'),body:t('Se puede tomar siempre la más probable o sortear según las probabilidades. La bola cae en la franja: el ancho de cada tramo es su probabilidad.','You can always take the most likely one or draw according to the probabilities. The ball drops onto the strip: each segment’s width is its probability.'),extra:`<div class="seg" role="group" aria-label="${t('Cómo se elige','How a token is chosen')}"><button data-decoding="greedy">${t('La más probable','Most likely')}</button><button data-decoding="sample">${t('Sortear','Sample')}</button></div><button class="ghost" id="reseed">${t('Otra semilla ↻','Another seed ↻')}</button><p class="fine" id="choice-readout"></p>`},
  {short:t('Repetir','Repeat'),eyebrow:t('09 · REPETIR','09 · REPEAT'),title:t('Lo escrito vuelve a entrar.','What was written goes back in.'),body:t('La pieza elegida se añade al contexto y todo el recorrido se repite, pieza a pieza, hasta la señal de fin. Un error temprano también se convierte en contexto.','The chosen piece is appended to the context and the whole journey repeats, piece by piece, until the end signal. An early mistake also becomes context.'),extra:`<p class="evidence" id="evidence"></p><div class="actions"><button class="cta" id="regen">↻ ${t('Generar otra vez','Generate again')}</button><button class="ghost" id="try-museum">${t('Probar: museo sin ficha','Try: museum without a record')}</button></div>`}
];

$('app').innerHTML=`<div class="progress" id="progress"></div>
<header class="bar"><a href="./index.html">← ${t('Notebook 08','Notebook 08')}</a><span class="brand">LLMs · <em>${t('vista cinemática','cinematic view')}</em></span>
<div class="pills" role="group" aria-label="${t('Experimento','Experiment')}"><button data-scenario="capital">${t('Capital','Capital')}</button><button data-scenario="bank">${t('«Banco»','“Bank”')}</button><button data-scenario="museum">${t('Museo','Museum')}</button></div>
<label class="opt" id="opt-context"><input type="checkbox" id="context"> ${t('Conversación previa','Chat history')}</label>
<label class="opt" id="opt-retrieval"><input type="checkbox" id="retrieval"> ${t('Consultar ficha','Retrieve record')}</label>
<select id="source" aria-label="${t('Documento','Document')}"><option value="current">${t('Ficha vigente','Current record')}</option><option value="archive">${t('Archivo antiguo','Old archive')}</option></select>
<nav class="lang"><a href="${es?'../../llms/cinema.html':'./cinema.html'}" lang="en" ${es?'':'aria-current="true"'}>EN</a><a href="${es?'./cinema.html':'../es/llms/cinema.html'}" lang="es" ${es?'aria-current="true"':''}>ES</a></nav></header>
<nav class="rail" aria-label="${t('Capítulos','Chapters')}">${CH.map((c,i)=>`<button data-go="${i}" aria-label="${c.short}"><span>${String(i+1).padStart(2,'0')} · ${c.short}</span></button>`).join('')}</nav>
<main class="story">
<section class="chapter hero" data-ch="0"><article class="card"><span class="eyebrow">${t('NOTEBOOK 08 · DENTRO DE UN LLM','NOTEBOOK 08 · INSIDE AN LLM')}</span><h1>${t('El viaje de<br>una respuesta.','The journey<br>of an answer.')}</h1><p>${t('Sigue tu pregunta mientras se rompe en piezas, se vuelve números, se mira a sí misma y sale convertida en una apuesta. Cada valor se calcula en directo.','Follow your question as it shatters into pieces, turns into numbers, looks at itself and comes out as a bet. Every value is computed live.')}</p><span class="scroll-hint"><i></i>${t('DESPLÁZATE','SCROLL')}</span></article></section>
${CH.slice(1).map((c,i)=>`<section class="chapter" data-ch="${i+1}"><article class="card"><span class="eyebrow">${c.eyebrow}</span><h2>${c.title}</h2><p>${c.body}</p>${c.extra}</article></section>`).join('')}
</main>
<section class="outro"><article class="card"><span class="eyebrow">${t('QUÉ ES REAL AQUÍ','WHAT IS REAL HERE')}</span><h2>${t('Una maqueta que calcula de verdad.','A scale model that really computes.')}</h2><p>${t('Tokenización reversible, vectores con posición, una cabeza de atención causal con su bloque residual, softmax con temperatura y el muestreo con semilla se calculan en tu navegador. Las respuestas y sus logits están preparados para el ejemplo: no se ejecuta un LLM real y la atención de juguete no produce esas respuestas.','Reversible tokenization, position-aware vectors, one causal attention head with its residual block, softmax with temperature and seeded sampling are computed in your browser. Answers and their logits are curated for the example: no real LLM runs, and the toy attention does not produce those answers.')}</p><div class="actions"><a class="cta" href="./index.html">${t('Abrir el laboratorio completo →','Open the full lab →')}</a><a href="../immersive/index.html?experience=llms">${t('Entrar en 3D ↗','Enter 3D ↗')}</a></div><ul><li><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">Vaswani et al. · Attention Is All You Need</a></li><li><a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener">Brown et al. · Language Models are Few-Shot Learners</a></li><li><a href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener">Lewis et al. · Retrieval-Augmented Generation</a></li></ul></article></section>
<div class="tip" id="tip" hidden></div>`;

// ---------- state ----------
let options={...DEFAULTS},run=null,chips=[],win=[],winStart=0,trace=null,gen=null,genClock=0,genTimes=[];
let p=0,pS=0,cur=-1,time=0,last=performance.now(),typeStart=0,stackStart=0,dropStart=-1,userQuery=null,lastAutoQ=-1,q=0;
let colScale=0,hits=[],pointer=null;const orb={x:0,y:0,r:0,a:0};const extraIds=new Map();
const canvas=$('stage'),ctx=canvas.getContext('2d');let W=0,H=0,DPR=1;
const sections=[...document.querySelectorAll('.chapter')];

// Soft glow sprites: much cheaper than shadowBlur.
const sprites={};
for(const [name,color] of Object.entries(C)){const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'#ffffff');gr.addColorStop(.14,color);gr.addColorStop(.42,color+'55');gr.addColorStop(1,color+'00');g.fillStyle=gr;g.fillRect(0,0,64,64);sprites[color]=s;}
const glow=(x,y,r,color,alpha=1)=>{if(alpha<=.01||r<=0)return;ctx.globalAlpha=Math.min(1,alpha);ctx.drawImage(sprites[color],x-r,y-r,r*2,r*2);};
const stars=Array.from({length:170},(_,i)=>({x:rand(i),y:rand(i+500),z:.2+.8*rand(i+900),tw:rand(i+1300)*6.28}));

function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function spaced(px){if('letterSpacing' in ctx)ctx.letterSpacing=px+'px';}
function wrapText(text,maxW){const words=text.split(/(\s+)/),lines=[];let line='';for(const w of words){const next=line+w;if(ctx.measureText(next).width>maxW&&line.trim()){lines.push(line.trimEnd());line=w.trimStart();}else line=next;}if(line.trim())lines.push(line.trimEnd());return lines;}
function area(){if(W>=900){const x=Math.min(W*.4,540)+24;return {x,y:92,w:W-x-70,h:H-92-40,get cx(){return this.x+this.w/2;},get cy(){return this.y+this.h/2;}};}
  return {x:14,y:110,w:W-28,h:Math.max(260,H*.5),get cx(){return this.x+this.w/2;},get cy(){return this.y+this.h/2;}};}
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);}

// ---------- model plumbing ----------
function idFor(token){const i=run.tokens.indexOf(token);if(i>=0)return run.tokenIds[i];if(!extraIds.has(token))extraIds.set(token,new Set(run.tokens).size+extraIds.size+1);return extraIds.get(token);}
function makeChip(text,id,i,from){ctx.font=`500 14px ${MONO}`;const space=/^\s+$/.test(text)&&!text.includes('\n'),label=show(text),a=area();
  const x=from?.x??a.x+a.w*(.3+.4*rand(i)),y=from?.y??a.y+a.h*(.42+.16*rand(i+99));
  return {text,label,id,i,space,w:space?9:ctx.measureText(label).width+16,hue:200+hash(text)%80,x,y,s:.6,a:0,tx:x,ty:y,ts:1,ta:0};}
function allTokens(){return [...run.tokens,...(gen?gen.generated:[])];}
function computeTrace(){const {tokens,offset}=contextWindow({tokens:run.tokens,generated:gen?gen.generated:[]});win=tokens;winStart=offset;trace=transformerTrace(win,offset);}
function probs(){return softmax(run.data.logits,options.temperature);}
function candidates(){return run.data.completions.map(c=>tokenize(c)[0]);}
function choice(){const l=run.data.logits;return options.decoding==='greedy'?l.indexOf(Math.max(...l)):sample(probs(),randomStep(options.seed).value);}
function rebuild(){
  const before=run?.prompt;run=createRun(lang,options);extraIds.clear();gen=null;genTimes=[];
  if(run.prompt!==before){chips=run.tokens.map((tok,i)=>makeChip(tok,run.tokenIds[i],i));typeStart=time;stackStart=time;}
  else chips.length=run.tokens.length;
  computeTrace();dropStart=cur===7?time:-1;userQuery=null;syncControls();
}
function startGen(){gen=createRun(lang,options);gen.phase=6;genClock=0;genTimes=[];if(reduce)while(!gen.done)stepGen();}
function stepGen(){const before=gen.generated.length;advance(gen);gen.phase=6;
  if(gen.generated.length>before){const tok=gen.generated.at(-1);chips.push(makeChip(tok,idFor(tok),chips.length,{x:orb.x,y:orb.y}));genTimes.push(time);computeTrace();}
  syncReadouts();}
function stopGen(){if(!gen)return;gen=null;genTimes=[];chips.length=run.tokens.length;computeTrace();syncReadouts();}

// ---------- controls ----------
function syncControls(){
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===options.scenario)));
  $('opt-context').hidden=options.scenario!=='bank';$('opt-retrieval').hidden=options.scenario!=='museum';$('source').hidden=options.scenario!=='museum'||!options.retrieval;
  $('context').checked=options.context;$('retrieval').checked=options.retrieval;$('source').value=options.source;
  $('temp').value=options.temperature;
  document.querySelectorAll('[data-decoding]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.decoding===options.decoding)));
  $('reseed').disabled=options.decoding!=='sample';
  syncReadouts();
}
function syncReadouts(){
  $('token-count').textContent=number(run.tokens.length);$('vocab-count').textContent=number(new Set(run.tokens).size);
  $('temp-out').textContent=number(options.temperature,2);
  const ps=probs(),k=choice(),u=randomStep(options.seed).value;
  $('choice-readout').textContent=options.decoding==='greedy'?t(`Elección máxima: «${candidates()[k]}» con ${number(ps[k]*100,1)} %. La semilla no influye.`,`Greedy: “${candidates()[k]}” at ${number(ps[k]*100,1)}%. The seed has no effect.`):t(`Número al azar u = ${number(u,3)} → cae en «${candidates()[k]}» (${number(ps[k]*100,1)} %).`,`Random number u = ${number(u,3)} → lands on “${candidates()[k]}” (${number(ps[k]*100,1)}%).`);
  $('evidence').textContent=gen?.done?run.data.evidence:gen?t('Generando pieza a pieza…','Generating piece by piece…'):t('La respuesta se escribirá en la escena.','The answer will be written on the stage.');
}
document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{options.scenario=b.dataset.scenario;rebuild();});
$('context').onchange=e=>{options.context=e.target.checked;rebuild();};
$('retrieval').onchange=e=>{options.retrieval=e.target.checked;rebuild();};
$('source').onchange=e=>{options.source=e.target.value;rebuild();};
$('temp').oninput=e=>{options.temperature=+e.target.value;rebuild();};
document.querySelectorAll('[data-decoding]').forEach(b=>b.onclick=()=>{options.decoding=b.dataset.decoding;rebuild();});
$('reseed').onclick=()=>{options.seed=(options.seed+977)>>>0;rebuild();};
$('regen').onclick=()=>{stopGen();startGen();};
$('try-museum').onclick=()=>{options.scenario='museum';options.retrieval=false;rebuild();go(1);};
function go(i){sections[i].scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(+b.dataset.go));

function readScroll(){const mid=innerHeight*.5;let v=0;sections.forEach((s,i)=>{const r=s.getBoundingClientRect();if(r.top<=mid)v=i+Math.min(1,(mid-r.top)/r.height);});p=clamp(v,0,sections.length-.001);
  $('progress').style.width=(p/sections.length*100)+'%';}
addEventListener('scroll',readScroll,{passive:true});addEventListener('resize',()=>{resize();readScroll();});

canvas.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerleave',()=>{pointer=null;$('tip').hidden=true;});
canvas.addEventListener('click',e=>{const h=hitAt(e.clientX,e.clientY);if(h?.query!==undefined){userQuery=h.query;}});
function hitAt(x,y){for(let i=hits.length-1;i>=0;i--){const h=hits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return h;}return null;}
function updateTip(){const tip=$('tip');if(!pointer){tip.hidden=true;canvas.style.cursor='';return;}const h=hitAt(pointer.x,pointer.y);
  if(!h){tip.hidden=true;canvas.style.cursor='';return;}tip.hidden=false;tip.textContent=h.text;tip.style.left=Math.min(pointer.x,W-270)+'px';tip.style.top=pointer.y+'px';canvas.style.cursor=h.query!==undefined?'pointer':'default';}

// ---------- layout ----------
const vis=ch=>{const lo=ch===0?1:(pS-ch+.18)/.36,hi=ch===CH.length-1?1:(ch+1.18-pS)/.36;return clamp(Math.min(lo,hi));};
const ROW={3:.9,4:.92,5:.94,6:.975,7:.975,8:.92};
function flowRows(maxW,s){const rows=[[]];let x=0;for(const ch of chips){const w=(ch.w+5)*s;if(x+w>maxW&&rows.at(-1).length){rows.push([]);x=0;}rows.at(-1).push(ch);x+=w;if(ch.text.includes('\n')){rows.push([]);x=0;}}return rows.filter(r=>r.length);}
function layout(c,a){
  if(c<2){chips.forEach((ch,i)=>{ch.tx=a.x+a.w*(.25+.5*rand(i));ch.ty=a.y+a.h*(.44+.12*rand(i+99));ch.ts=.6;ch.ta=0;});return;}
  if(c===2){let s=1.5,rows;for(let k=0;k<9;k++){rows=flowRows(a.w*.94,s);if(rows.length*46*s<=a.h*.84)break;s*=.87;}
    const lh=46*s,top=a.y+(a.h-rows.length*lh)/2+lh/2;
    rows.forEach((row,r)=>{const width=row.reduce((sum,ch)=>sum+(ch.w+5)*s,0)-5*s;let x=a.x+(a.w-width)/2;row.forEach(ch=>{ch.tx=x+ch.w*s/2;ch.ty=top+r*lh;ch.ts=s;ch.ta=ch.space?.5:1;x+=(ch.w+5)*s;});});return;}
  const m=win.length,colW=a.w/Math.max(m,1),rowY=a.y+a.h*ROW[c];
  chips.forEach((ch,i)=>{
    if(i<winStart){ch.tx=a.x+a.w*((i+.5)/Math.max(winStart,1));ch.ty=a.y+2;ch.ts=.3;ch.ta=c===8?.45:.22;return;}
    const k=i-winStart;ch.tx=a.x+colW*(k+.5);ch.ty=rowY;ch.ts=clamp(colW/(ch.w+10),.5,1);
    ch.ta=(c===6||c===7)?.3:(c===4&&k>q)?.3:1;});
}
function colGeom(a){const colW=a.w/Math.max(win.length,1),cw=Math.min(colW*.62,46),chh=Math.min(cw*.95,a.h*.085)*colScale,gap=2*colScale;return {colW,cw,chh,gap,top:18+6*(chh+gap)};}

// ---------- drawing ----------
function drawBackground(a){
  const g=ctx.createRadialGradient(a.cx,a.cy,0,a.cx,a.cy,Math.max(W,H)*.75);g.addColorStop(0,'#0e1838');g.addColorStop(.55,'#070b1a');g.addColorStop(1,'#04050b');
  ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const s of stars){const x=((s.x+time*.004*s.z)%1)*W,y=((s.y-pS*.02*s.z)%1+1)%1*H,tw=.5+.5*Math.sin(time*1.3+s.tw);ctx.globalAlpha=(.12+.4*s.z)*tw;ctx.fillStyle=s.z>.8?'#cfe0ff':'#7f93c4';ctx.fillRect(x,y,s.z*1.6,s.z*1.6);}
  // faint floor grid gives the stage depth
  ctx.globalAlpha=.07;ctx.strokeStyle='#8fb3ff';ctx.lineWidth=1;const hz=H*.62;
  for(let i=-12;i<=12;i++){ctx.beginPath();ctx.moveTo(a.cx+i*18,hz);ctx.lineTo(a.cx+i*140,H);ctx.stroke();}
  for(let j=0;j<8;j++){const y=hz+(H-hz)*((j/8)**1.8);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
}
function drawQuestion(al,a){if(al<.01)return;
  const text=run.data.question,fs=clamp(a.w/12,24,58);ctx.font=`680 ${fs}px ${SANS}`;const lines=wrapText(text,a.w*.9),lh=fs*1.12;
  const n=reduce?text.length:Math.floor((time-typeStart-.3)*24);let used=0;const top=a.cy-lines.length*lh/2;
  glow(a.cx,a.cy,a.w*.45,C.blue,al*.16);
  ctx.globalAlpha=al;ctx.fillStyle=C.muted;ctx.font=`600 11px ${MONO}`;spaced(3);ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(t('TU PREGUNTA','YOUR QUESTION'),a.cx,top-26);spaced(0);
  ctx.font=`680 ${fs}px ${SANS}`;ctx.textBaseline='top';let caret=null;
  lines.forEach((line,i)=>{const visible=line.slice(0,clamp(n-used,0,line.length));used+=line.length+1;const w=ctx.measureText(line).width,x=a.cx-w/2,y=top+i*lh;
    const grad=ctx.createLinearGradient(x,0,x+w,0);grad.addColorStop(0,'#ffffff');grad.addColorStop(1,'#bcd0ff');ctx.fillStyle=grad;ctx.textAlign='left';ctx.fillText(visible,x,y);
    if(visible.length<line.length||i===lines.length-1&&n>=used-1)caret=caret??{x:x+ctx.measureText(visible).width+4,y};});
  if(caret&&Math.sin(time*6)>0){ctx.fillStyle=C.mint;ctx.fillRect(caret.x,caret.y+fs*.08,Math.max(2,fs*.06),fs*.95);}
}
function drawStack(al,a){if(al<.01)return;
  const items=[{label:t('INSTRUCCIÓN','INSTRUCTION'),text:t('Responde brevemente.','Answer briefly.'),color:C.violet}];
  if(options.scenario==='bank')items.push(run.data.history?{label:t('CONVERSACIÓN ANTERIOR','PREVIOUS CONVERSATION'),text:run.data.history,color:C.blue}:{label:t('CONVERSACIÓN ANTERIOR','PREVIOUS CONVERSATION'),text:t('Sin mensajes previos: «banco» queda ambiguo.','No earlier messages: “bank” stays ambiguous.'),empty:true});
  items.push(run.data.source?{label:run.data.source.title.toUpperCase(),text:run.data.source.text,color:C.gold,doc:true}:{label:t('DOCUMENTO RECUPERADO','RETRIEVED DOCUMENT'),text:t('Ninguno. El modelo no navega por su cuenta.','None. The model does not browse on its own.'),empty:true});
  items.push({label:t('TU PREGUNTA','YOUR QUESTION'),text:run.data.question,color:C.mint});
  const w=Math.min(a.w*.84,560),x=a.cx-w/2;ctx.font=`500 15px ${SANS}`;
  const hs=items.map(it=>{it.lines=wrapText(it.text,w-44);return 40+it.lines.length*21;}),gap=14,total=hs.reduce((s,h)=>s+h+gap,0)-gap;let y=a.cy-total/2-10;
  items.forEach((it,i)=>{const e=reduce?1:easeOut(clamp((time-stackStart-.15-i*.28)/.7)),dy=(1-e)*(it.doc?-70:34),h=hs[i];
    ctx.globalAlpha=al*e;
    if(it.doc)glow(x+w/2,y+dy+h/2,w*.6,C.gold,al*e*.22);
    rr(x,y+dy,w,h,14);ctx.fillStyle=it.empty?'rgba(12,18,36,.55)':'rgba(13,21,44,.92)';ctx.fill();
    ctx.lineWidth=1;if(it.empty){ctx.setLineDash([5,6]);ctx.strokeStyle='#3a4a6e';}else ctx.strokeStyle=it.color+'99';ctx.stroke();ctx.setLineDash([]);
    if(!it.empty){rr(x,y+dy,4,h,2);ctx.fillStyle=it.color;ctx.fill();}
    ctx.textAlign='left';ctx.textBaseline='top';ctx.font=`650 10px ${MONO}`;spaced(2);ctx.fillStyle=it.empty?'#62729a':it.color;ctx.fillText(it.label,x+22,y+dy+14);spaced(0);
    ctx.font=`500 15px ${SANS}`;ctx.fillStyle=it.empty?'#6f7fa5':'#e6edfb';it.lines.forEach((l,j)=>ctx.fillText(l,x+22,y+dy+32+j*21));
    y+=h+gap;});
  ctx.globalAlpha=al*.8;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;spaced(2);ctx.textAlign='center';ctx.fillText(t('↓ TODO SE UNE EN UN SOLO TEXTO: EL CONTEXTO','↓ IT ALL BECOMES ONE TEXT: THE CONTEXT'),a.cx,y+8);spaced(0);
}
function drawChip(ch,idAlpha){if(ch.a<.02)return;const s=ch.s,h=24*s,w=ch.w*s;ctx.globalAlpha=ch.a;
  if(s<.45||ch.space){rr(ch.x-w/2,ch.y-(ch.space?3:2.5)*Math.max(s,.6),w,(ch.space?6:5)*Math.max(s,.6),3);ctx.fillStyle=ch.space?'rgba(140,160,210,.35)':`hsl(${ch.hue} 60% 58%)`;ctx.fill();return;}
  rr(ch.x-w/2,ch.y-h/2,w,h,6*s);ctx.fillStyle=`hsla(${ch.hue},55%,19%,.94)`;ctx.fill();ctx.strokeStyle=`hsla(${ch.hue},85%,72%,.75)`;ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#f1f5ff';ctx.font=`500 ${14*s}px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ch.label,ch.x,ch.y+.5);
  if(idAlpha>.02){ctx.globalAlpha=ch.a*idAlpha;ctx.fillStyle='#7086b0';ctx.font=`${Math.max(8,9.5*s)}px ${MONO}`;ctx.fillText(ch.id,ch.x,ch.y+h/2+8*s);}
  if(ch.a>.4)hits.push({x:ch.x-w/2,y:ch.y-h/2,w,h,text:`«${ch.label}» · ID ${ch.id} · ${t('posición','position')} ${ch.i}`,query:cur===4&&ch.i>=winStart?ch.i-winStart:undefined});
}
function drawColumns(c,a){if(colScale<.02||!trace)return;const g=colGeom(a);
  win.forEach((tok,k)=>{const ch=chips[winStart+k];if(!ch)return;
    for(let d=0;d<6;d++){const v=trace.X[k][d],rev=c===3?clamp((pS-3)*2.6-k*.09-d*.04):c>3?1:0;if(rev<=0)continue;
      const y=ch.y-18-(d+1)*(g.chh+g.gap),x=ch.x-g.cw/2,al=rev*(.16+.84*Math.min(1,Math.abs(v)));
      rr(x,y,g.cw,g.chh,3*colScale);ctx.globalAlpha=al;ctx.fillStyle=v>=0?C.blue:C.coral;ctx.fill();
      if(c===3&&g.cw>=34&&g.chh>=15){ctx.globalAlpha=rev;ctx.fillStyle='#07101f';ctx.font=`600 10px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(number(v,2),ch.x,y+g.chh/2+.5);}
      if(c===3)hits.push({x,y,w:g.cw,h:g.chh,text:`«${show(tok)}» · ${t('dimensión','dimension')} ${d+1} = ${number(v,3)}`});}});
  const al=vis(3);if(al>.02&&win.length){const first=chips[winStart];if(!first)return;ctx.globalAlpha=al*.8;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;ctx.textAlign='right';ctx.textBaseline='middle';
    for(let d=0;d<6;d++)ctx.fillText('d'+(d+1),first.x-g.cw/2-8,first.y-18-(d+1)*(g.chh+g.gap)+g.chh/2);
    ctx.textAlign='center';ctx.fillStyle=C.gold;ctx.font=`600 12px ${MONO}`;ctx.fillText(t('x = E[id] + P(posición)','x = E[id] + P(position)'),a.cx,first.y-g.top-34);
    if(winStart>0){ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;spaced(2);ctx.fillText(t(`↑ ${winStart} PIEZAS ANTERIORES DEL CONTEXTO`,`↑ ${winStart} EARLIER CONTEXT PIECES`),a.cx,a.y+18);spaced(0);}}
}
function bez(x0,y0,cx,cy,x1,y1,u){const v=1-u;return [v*v*x0+2*v*u*cx+u*u*x1,v*v*y0+2*v*u*cy+u*u*y1];}
function drawAttention(al,a){if(al<.01||!trace)return;const m=win.length,g=colGeom(a),A=trace.A[q],qc=chips[winStart+q];if(!qc)return;
  const base=k=>chips[winStart+k].y-g.top-6,maxH=a.h*.42;
  win.forEach((_,j)=>{const cj=chips[winStart+j];if(!cj)return;
    if(j>q){ctx.globalAlpha=al*.35;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('−∞ → 0',cj.x,base(j)-4);return;}
    const w=A[j];ctx.lineCap='round';
    if(j===q){ctx.globalAlpha=al*(.3+.7*w);ctx.strokeStyle=C.gold;ctx.lineWidth=1+w*12;ctx.beginPath();ctx.arc(qc.x,base(q)-16,13,0,Math.PI*2);ctx.stroke();}
    else{const x0=cj.x,y0=base(j),x1=qc.x,y1=base(q),cx=(x0+x1)/2,cy=Math.min(y0,y1)-(24+Math.min(maxH,Math.abs(x1-x0)*.55));
      ctx.globalAlpha=al*(.18+.8*w);ctx.strokeStyle=C.gold;ctx.lineWidth=1+w*14;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(cx,cy,x1,y1);ctx.stroke();
      if(!reduce){const n=1+Math.round(w*7);for(let i=0;i<n;i++){const u=(time*.45+i/n+j*.13)%1,[px,py]=bez(x0,y0,cx,cy,x1,y1,u);glow(px,py,8+w*22,C.gold,al*(.35+.65*w)*Math.sin(Math.PI*u));}}}
    ctx.globalAlpha=al;ctx.fillStyle=j===q?'#fff3d6':C.gold;ctx.font=`650 ${11+w*8}px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(number(w*100,0)+'%',cj.x,cj.y+16);});
  glow(qc.x,qc.y,46,C.gold,al*.55);ctx.globalAlpha=al;ctx.strokeStyle=C.gold;ctx.lineWidth=2;rr(qc.x-qc.w*qc.s/2-4,qc.y-12*qc.s-4,qc.w*qc.s+8,24*qc.s+8,9);ctx.stroke();
  // caption
  ctx.globalAlpha=al;ctx.textAlign='left';ctx.textBaseline='top';ctx.font=`600 11px ${MONO}`;spaced(2);ctx.fillStyle=C.muted;ctx.fillText(t('CONSULTA','QUERY'),a.x,a.y+14);spaced(0);
  ctx.font=`650 22px ${SANS}`;ctx.fillStyle=C.gold;ctx.fillText(`«${show(win[q])}»`,a.x,a.y+32);
  ctx.font=`500 12px ${SANS}`;ctx.fillStyle='#b6c4dc';ctx.fillText(t(`reparte el 100 % entre ${q+1} ${q?'piezas visibles':'pieza visible'}`,`splits 100% across ${q+1} visible ${q?'pieces':'piece'}`),a.x,a.y+62);
  // attention matrix
  const ms=Math.min(170,a.h*.26,a.w*.28),cell=ms/m,x0=a.x+a.w-ms,y0=a.y+14;
  for(let i=0;i<m;i++)for(let j=0;j<m;j++){ctx.globalAlpha=al;if(j>i){ctx.fillStyle='#0b1022';ctx.fillRect(x0+j*cell,y0+i*cell,cell-1,cell-1);continue;}
    ctx.fillStyle='#1a2442';ctx.fillRect(x0+j*cell,y0+i*cell,cell-1,cell-1);ctx.globalAlpha=al*Math.pow(trace.A[i][j],.6);ctx.fillStyle=C.gold;ctx.fillRect(x0+j*cell,y0+i*cell,cell-1,cell-1);}
  ctx.globalAlpha=al;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(x0-1,y0+q*cell-1,ms+1,cell+1);
  ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;ctx.textAlign='right';ctx.fillText(t('matriz A · fila = consulta','matrix A · row = query'),x0+ms,y0+ms+8);
}
function drawTower(al,a){if(al<.01||!win.length)return;const g=colGeom(a),L=12,last=chips[winStart+win.length-1];if(!last)return;
  const bottom=last.y-g.top-12,topY=a.y+a.h*.22,pw=a.w*.74,sk=pw*.09;
  const wave=reduce?-9:(time*2.6)%(L+5)-1;
  for(let i=L-1;i>=0;i--){const y=lerp(bottom,topY,i/(L-1)),hot=Math.exp(-((i-wave)**2)*.5),col=i<L/3?C.mint:i<2*L/3?C.blue:C.violet;
    ctx.globalAlpha=al*(.05+.2*hot);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(a.cx-pw/2+sk,y-sk*.28);ctx.lineTo(a.cx+pw/2+sk,y-sk*.28);ctx.lineTo(a.cx+pw/2-sk,y+sk*.28);ctx.lineTo(a.cx-pw/2-sk,y+sk*.28);ctx.closePath();ctx.fill();
    ctx.globalAlpha=al*(.22+.6*hot);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.stroke();
    if(i===0||i===L-1||i===5){ctx.globalAlpha=al*.8;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(`${t('capa','layer')} ${i===5?'…':i===L-1?'N':1}`,a.cx-pw/2-sk-8,y);}}
  ctx.globalAlpha=al*.85;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(t('atención → red → residual','attention → MLP → residual'),a.cx+pw/2+sk-150,topY-sk*.28-16);
  if(!reduce)win.forEach((_,k)=>{const ch=chips[winStart+k];if(!ch)return;for(let n=0;n<9;n++){const u=(time*.2+n/9+k*.041)%1,y=lerp(bottom,orb.y,u),x=lerp(ch.x,orb.x,smooth(u)**2*.95)+Math.sin(u*10+k)*5*(1-u);
    glow(x,y,6+u*6,u<.35?C.mint:u<.7?C.blue:C.gold,al*(.25+.75*Math.sin(Math.PI*u)));}});
  // final vector beside the orb
  const Y=trace.Y[win.length-1],cw=14;ctx.globalAlpha=al;for(let d=0;d<6;d++){const v=Y[d],x=orb.x+34+d*(cw+3);ctx.globalAlpha=al*(.2+.8*Math.min(1,Math.abs(v)/1.6));rr(x,orb.y-9,cw,18,3);ctx.fillStyle=v>=0?C.blue:C.coral;ctx.fill();
    hits.push({x,y:orb.y-9,w:cw,h:18,text:`${t('vector final','final vector')} · d${d+1} = ${number(v,3)}`});}
  ctx.globalAlpha=al;ctx.fillStyle=C.gold;ctx.font=`600 10px ${MONO}`;ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText(t('vector final de la última posición','final vector of the last position'),orb.x+34,orb.y-14);
}
function drawProbs(al,a){if(al<.01)return;const ps=probs(),cands=candidates(),lx=a.x+a.w*(W<900?.34:.42),gap=Math.min(92,a.h*.22),k=choice();
  cands.forEach((cand,i)=>{const y=a.cy+(i-(cands.length-1)/2)*gap,p0=ps[i],col=CAND[i%3];
    ctx.lineCap='round';ctx.globalAlpha=al*(.15+.85*p0);ctx.strokeStyle=col;ctx.lineWidth=1+p0*16;ctx.beginPath();ctx.moveTo(orb.x,orb.y);ctx.bezierCurveTo(lerp(orb.x,lx,.55),orb.y,lerp(orb.x,lx,.45),y,lx-14,y);ctx.stroke();
    if(!reduce)for(let n=0;n<Math.round(1+p0*6);n++){const u=(time*.5+n/6+i*.2)%1,x=lerp(orb.x,lx-14,u),yy=lerp(orb.y,y,smooth(u));glow(x,yy,5+p0*10,col,al*Math.sin(Math.PI*u)*(.3+.7*p0));}
    ctx.globalAlpha=al;ctx.font=`650 ${clamp(a.w/30,15,24)}px ${SANS}`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#f1f5ff';const word=run.data.completions[i].split(/\s/)[0],rest=word.startsWith(cand)?word.slice(cand.length).replace(/[.,;:]$/,''):'';ctx.fillText(cand,lx,y);const cw0=ctx.measureText(cand).width;ctx.fillStyle='#5d6c90';ctx.fillText(rest,lx+cw0,y);const tw=cw0+ctx.measureText(rest).width;
    const bx=lx+Math.max(tw,70)+16,barMax=clamp(a.x+a.w-bx-72,40,a.w*.36),bw=Math.max(2,p0*barMax);rr(bx,y-9,barMax,18,9);ctx.fillStyle='#121b36';ctx.fill();
    const gr=ctx.createLinearGradient(bx,0,bx+bw,0);gr.addColorStop(0,col+'66');gr.addColorStop(1,col);rr(bx,y-9,bw,18,9);ctx.fillStyle=gr;ctx.fill();glow(bx+bw,y,18+p0*20,col,al*.6);
    ctx.globalAlpha=al;ctx.fillStyle=col;ctx.font=`700 15px ${MONO}`;ctx.fillText(number(p0*100,1)+' %',bx+Math.min(barMax,bw)+14>bx+barMax-10?bx+barMax+10:bx+bw+14,y);
    ctx.fillStyle=C.muted;ctx.font=`500 10px ${MONO}`;ctx.fillText(`logit ${number(run.data.logits[i],1)}`,lx,y+18);
    hits.push({x:lx,y:y-12,w:bx+barMax-lx,h:26,text:`«${cand}» · logit ${number(run.data.logits[i],2)} → p = ${number(p0,4)}${i===k?' ★':''}`});});
  ctx.globalAlpha=al;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;spaced(2);ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`T = ${number(options.temperature,2)}`,a.x,a.y+14);spaced(0);
}
function drawChoose(al,a){if(al<.01)return;const ps=probs(),cands=candidates(),k=choice(),sx=a.x+a.w*.08,sw=a.w*.84,sy=a.cy+a.h*.12,sh=52;
  const u=options.decoding==='greedy'?ps.slice(0,k).reduce((s,x)=>s+x,0)+ps[k]/2:randomStep(options.seed).value;
  if(dropStart<0)dropStart=time;const d=reduce?1:clamp((time-dropStart)/1.5),landed=d>=1;let x=sx;
  ps.forEach((p0,i)=>{const w=p0*sw,col=CAND[i%3],on=landed&&i===k;ctx.globalAlpha=al*(on?1:.55);rr(x+1,sy,Math.max(1,w-2),sh,10);const gr=ctx.createLinearGradient(0,sy,0,sy+sh);gr.addColorStop(0,col);gr.addColorStop(1,col+'55');ctx.fillStyle=gr;ctx.fill();
    if(on){glow(x+w/2,sy+sh/2,Math.max(60,w*.6),col,al*.7);ctx.globalAlpha=al;ctx.strokeStyle='#fff';ctx.lineWidth=2;rr(x+1,sy,Math.max(1,w-2),sh,10);ctx.stroke();}
    if(w>44){ctx.globalAlpha=al;ctx.fillStyle='#06101f';ctx.font=`700 13px ${SANS}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cands[i],x+w/2,sy+sh/2-7);ctx.font=`600 10px ${MONO}`;ctx.fillText(number(p0*100,1)+'%',x+w/2,sy+sh/2+9);}
    x+=w;});
  ctx.globalAlpha=al*.8;ctx.fillStyle=C.muted;ctx.font=`500 10px ${MONO}`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('0',sx,sy+sh+8);ctx.textAlign='right';ctx.fillText('1',sx+sw,sy+sh+8);
  const tx=sx+u*sw,ty=sy-10,bx=lerp(orb.x,tx,easeOut(d)),by=lerp(orb.y,ty,reduce?1:bounce(d));
  ctx.globalAlpha=al*.5;ctx.strokeStyle=C.gold;ctx.setLineDash([2,5]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx,sy+sh+4);ctx.lineTo(tx,sy+sh+22);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=al;ctx.fillStyle=C.gold;ctx.font=`600 10px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(options.decoding==='greedy'?t('máximo','argmax'):'u = '+number(u,3),tx,sy+sh+24);
  glow(bx,by,34,C.gold,al);ctx.globalAlpha=al;ctx.fillStyle='#fff8e6';ctx.beginPath();ctx.arc(bx,by,7,0,Math.PI*2);ctx.fill();
  if(landed){const e=easeOut(clamp((time-dropStart-1.5)/.6));ctx.globalAlpha=al*e;ctx.fillStyle=C.gold;ctx.font=`750 ${clamp(a.w/11,30,64)}px ${SANS}`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(`«${cands[k]}»`,a.cx,sy-44-e*8);
    ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;spaced(2);ctx.fillText(t('PIEZA ELEGIDA','CHOSEN PIECE'),a.cx,sy-54-e*8-clamp(a.w/11,30,64));spaced(0);}
}
function drawLoop(al,a){if(al<.01)return;
  const out=gen?gen.generated:[],fs=clamp(a.w/24,17,32),maxW=a.w*.92,top=a.y+a.h*.1;ctx.font=`620 ${fs}px ${SANS}`;ctx.textBaseline='top';ctx.textAlign='left';
  // token-aware wrapping so the newest piece can glow
  const lines=[[]];let lw=0;for(let i=0;i<out.length;i++){const w=ctx.measureText(out[i]).width;if(lw+w>maxW&&lines.at(-1).length&&!/^\s+$/.test(out[i])){lines.push([]);lw=0;}lines.at(-1).push(i);lw+=w;}
  let endX=a.cx,endY=top;
  lines.forEach((line,li)=>{const width=line.reduce((s,i)=>s+ctx.measureText(out[i]).width,0);let x=a.cx-width/2;const y=top+li*fs*1.3;
    for(const i of line){const age=time-(genTimes[i]??-9),hot=reduce?0:clamp(1-age/.9);ctx.globalAlpha=al;ctx.fillStyle=hot>0?`rgb(255,${Math.round(207+48*(1-hot))},${Math.round(122+133*(1-hot))})`:'#eef3ff';ctx.fillText(out[i],x,y);
      if(hot>0)glow(x+ctx.measureText(out[i]).width/2,y+fs/2,fs*1.6,C.gold,al*hot*.5);x+=ctx.measureText(out[i]).width;endX=x;endY=y;}});
  if(!out.length){ctx.globalAlpha=al*.6;ctx.fillStyle=C.muted;ctx.textAlign='center';ctx.fillText('…',a.cx,top);}
  else if(!gen.done&&Math.sin(time*6)>0){ctx.globalAlpha=al;ctx.fillStyle=C.mint;ctx.fillRect(endX+3,endY+fs*.1,2,fs*.95);}
  ctx.globalAlpha=al;ctx.fillStyle=C.muted;ctx.font=`600 10px ${MONO}`;spaced(2);ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(t('LO QUE RECIBES','WHAT YOU RECEIVE'),a.cx,top-10);spaced(0);
  // streams: context → model → answer, and the answer looping back into the context
  const last=chips.at(-1);if(!reduce&&win.length){win.forEach((_,k)=>{const ch=chips[winStart+k];if(!ch)return;for(let n=0;n<3;n++){const u=(time*.5+n/3+k*.07)%1;glow(lerp(ch.x,orb.x,smooth(u)),lerp(ch.y-16,orb.y,u),6,C.blue,al*.6*Math.sin(Math.PI*u));}});
    const age=time-(genTimes.at(-1)??-9);if(age<.5){const u=age/.5;glow(lerp(orb.x,endX,u),lerp(orb.y,endY+fs/2,u),16,C.gold,al);}}
  if(last&&out.length){const x0=Math.min(a.x+a.w-8,a.cx+maxW/2+12),y0=top+fs*.6,x1=last.x,y1=last.y-20;ctx.globalAlpha=al*.4;ctx.strokeStyle=C.mint;ctx.setLineDash([3,7]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(endX+10,y0);ctx.bezierCurveTo(x0+40,y0,x0+40,y1-60,x1,y1);ctx.stroke();ctx.setLineDash([]);
    if(!reduce)for(let n=0;n<4;n++){const u=(time*.35+n/4)%1,v=1-u,px=v**3*(endX+10)+3*v*v*u*(x0+40)+3*v*u*u*(x0+40)+u**3*x1,py=v**3*y0+3*v*v*u*y0+3*v*u*u*(y1-60)+u**3*y1;glow(px,py,7,C.mint,al*.8*Math.sin(Math.PI*u));}
    ctx.globalAlpha=al*.9;ctx.fillStyle=C.mint;ctx.font=`600 10px ${MONO}`;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(t('↻ vuelve al contexto','↻ back into context'),a.x+a.w-4,(y0+y1)/2);}
  ctx.globalAlpha=al;ctx.fillStyle=gen?.done?C.gold:'#c9d6ec';ctx.font=`650 12px ${MONO}`;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText(gen?.done?t('⏹ EOS · respuesta terminada','⏹ EOS · answer complete'):`${t('ciclo','cycle')} ${gen?gen.loops+1:1} · ${t('una pieza por vuelta','one piece per pass')}`,orb.x,orb.y+orb.r+14);
}
function drawOrb(){if(orb.a<.02)return;const pulse=reduce?1:1+.08*Math.sin(time*3);glow(orb.x,orb.y,orb.r*3.6*pulse,C.gold,orb.a*.55);glow(orb.x,orb.y,orb.r*1.6,C.gold,orb.a);
  ctx.globalAlpha=orb.a;ctx.strokeStyle=C.gold+'aa';ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.beginPath();ctx.arc(orb.x,orb.y,orb.r*1.5,time*.8,time*.8+Math.PI*2);ctx.stroke();ctx.setLineDash([]);}

// ---------- main loop ----------
function orbTarget(c,a){const lastChip=chips[winStart+win.length-1];const lx=lastChip?lastChip.tx:a.cx;
  if(c<5)return {x:a.cx-60,y:a.y+a.h*.1,r:0,a:0};if(c===5)return {x:a.cx-60,y:a.y+a.h*.1,r:20,a:1};if(c===6)return {x:a.x+a.w*(W<900?.07:.1),y:a.cy,r:W<900?16:24,a:1};if(c===7)return {x:a.cx,y:a.y+a.h*.14,r:15,a:1};return {x:a.cx,y:a.y+a.h*.58,r:17,a:1};}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;time+=dt;
  pS+=(p-pS)*(reduce?1:1-Math.exp(-dt*8));const c=clamp(Math.floor(pS+1e-4),0,CH.length-1);
  if(c!==cur){cur=c;if(c===0)typeStart=time;if(c===1)stackStart=time;dropStart=c===7?time:-1;
    document.querySelectorAll('[data-go]').forEach(b=>{b.setAttribute('aria-current',String(+b.dataset.go===c));b.classList.toggle('seen',+b.dataset.go<c);});}
  if(c===8&&!gen)startGen();else if(c<8&&pS<7.7&&gen)stopGen();
  if(gen&&!gen.done){genClock+=dt;if(genClock>.55){genClock=0;stepGen();}}
  const m=win.length,autoQ=c===4?Math.min(m-1,Math.floor(clamp(pS-4,0,.999)*m*1.15)):m-1;if(autoQ!==lastAutoQ){lastAutoQ=autoQ;userQuery=null;}q=clamp(userQuery??autoQ,0,Math.max(0,m-1));
  const a=area(),k=reduce?1:1-Math.exp(-dt*7);layout(c,a);
  for(const ch of chips){ch.x+=(ch.tx-ch.x)*k;ch.y+=(ch.ty-ch.y)*k;ch.s+=(ch.ts-ch.s)*k;ch.a+=(ch.ta-ch.a)*k;}
  colScale+=(({3:1,4:.42,5:.42}[c]??0)-colScale)*k;const o=orbTarget(c,a);for(const key of ['x','y','r','a'])orb[key]+=(o[key]-orb[key])*k;
  ctx.setTransform(DPR,0,0,DPR,0,0);hits=[];drawBackground(a);
  drawQuestion(vis(0),a);drawStack(vis(1),a);drawTower(vis(5),a);drawColumns(c,a);drawAttention(vis(4),a);
  const idAlpha=vis(2);for(const ch of chips)drawChip(ch,idAlpha);
  drawProbs(vis(6),a);drawChoose(vis(7),a);drawLoop(vis(8),a);drawOrb();
  ctx.globalAlpha=1;updateTip();requestAnimationFrame(frame);}

resize();rebuild();readScroll();pS=p;requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{last=performance.now();});
