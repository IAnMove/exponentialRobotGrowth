import {sampleCell} from './site-src/journeys/cell-model.js';
import {sampleChip} from './site-src/journeys/microchip-model.js';
import {sampleGrid,lineAtPower} from './site-src/journeys/electricity-model.js';
import {sampleEvolution} from './site-src/journeys/evolution-model.js';
import {sampleCarbon,FLUXES,RESERVOIRS} from './site-src/journeys/carbon-model.js';
import {playerFixture} from './check-player-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt,walk} from './site-src/journeys/common.js';
import {StepGuide} from './site-src/llms/guide.js';
const source=readFileSync('site-src/journeys/app.js','utf8').replace(/^import .*;$/gm,'');
for(const lang of ['es','en'])for(const mode of ['web','immersive'])for(const [id,lesson] of Object.entries(LESSONS)){
 const elements=new Map(),events={},frames=[],audios=[];let now=0,current,phase,pose,redirect,notebook,sceneTime,inspect,orbitState,savedForReload=null;
 const element=id=>{if(!elements.has(id))elements.set(id,{id,checked:false,dataset:{},style:{},value:'',classList:{toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(){},setPointerCapture(){},append(){}});return elements.get(id);};
 const stops=lesson.steps.map((s,i)=>({...element('stop-'+i),dataset:{stop:String(i)}})),controls=lesson.controls.map(c=>({...element('control-'+c.id),dataset:{control:c.id},value:c.value,checked:c.value})),moves=['forward','left','right','back'].map(move=>({...element(move),dataset:{move}}));
 const truthRows=Array.from({length:8},(_,i)=>({...element('truth-'+i),dataset:{truth:String(i)}}));
 const variantButtons=Array.from({length:3},(_,i)=>({...element('cell-variant-'+i),dataset:{cellVariant:String(i)}}));
 const metricNodes=lesson.evaluate(defaults(lesson),0).metrics.map((_,i)=>element('metric-value-'+i));
 const display=n=>new Intl.NumberFormat(lang,{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
 const document={documentElement:{lang},body:element('body'),hidden:false,getElementById:id=>controls.find(c=>c.id===id)||element(id),querySelectorAll:s=>s==='[data-truth]'?truthRows:s==='[data-cell-variant]'?variantButtons:s==='#metrics b'?metricNodes:s==='[data-stop]'?stops:s==='[data-control]'?controls:moves,addEventListener(name,fn){events['document:'+name]=fn;}};
 class AudioStub{constructor(){audios.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){}removeAttribute(){}load(){}}
 class Guide extends StepGuide{constructor(o){super({...o,AudioClass:AudioStub});}}
 const VOICES={[id]:Object.fromEntries(['es','en'].map((l,i)=>[l,lesson.steps.map((s,j)=>({id:'step-'+j,text:s.text[i],src:'fixture.mp3',duration:10}))]))};
 const Player=playerFixture(lang,p=>notebook=p);class NotebookFixture extends Player{
  constructor(options){if(savedForReload&&lesson.continuous)options.restore(savedForReload);super(options);}
  pause(){super.pause();if(this.current)this.options.onSync({...this.current,running:false,reason:'pause'});}
  save(){if(lesson.continuous)savedForReload=JSON.parse(JSON.stringify(this.options.capture()));}
 }
 const ctx={sampleCell,sampleChip,sampleGrid,lineAtPower,sampleEvolution,sampleCarbon,FLUXES,RESERVOIRS,NotebookPlayer:NotebookFixture,LESSONS,defaults,poseAt,walk,StepGuide:Guide,VOICES,document,window:{addEventListener(n,f){events[n]=f;}},console,URLSearchParams,Intl,performance:{now:()=>now},matchMedia:()=>({matches:false}),location:{search:`?topic=${id}&mode=${mode}`,replace(url){redirect=url;}},requestAnimationFrame:f=>frames.push(f),createWorld:(host,lesson,es,fn)=>(inspect=fn,{canvas:element('canvas'),update(s,i){current=s;phase=i;},render(p,dt,animation,orbit,mode,time){pose={...p};sceneTime=time;orbitState={...orbit};},dispose(){}})};
 vm.runInNewContext(source,ctx);
 if(id==='internet'&&mode==='immersive'){assert.equal(redirect,'./internet-voyage.html');assert.equal(frames.length,0,'legacy gallery must not start behind redirect');continue;}
 const advance=n=>{for(let i=0;i<n;i++){now+=1000/60;frames.shift()(now);}};
 if(lesson.continuous){advance(1);const initialDistance=orbitState.distance;element('zoom-in').onclick();advance(1);assert(orbitState.distance<initialDistance,'zoom button moves the camera closer');element('fit-network').onclick();advance(1);assert.equal(orbitState.distance,initialDistance,'fit restores the overview');}assert.equal(phase,0);assert(element('app').innerHTML.includes(`pieza=${id}`));
 element('timeline').oninput({target:{value:String(lesson.horizon)}});assert.equal(+element('timeline').value,lesson.horizon);
 assert.equal(JSON.stringify(current.metrics),JSON.stringify(lesson.evaluate(defaults(lesson),lesson.horizon).metrics));
 if(id==='electricity'){assert.equal(current.completed,24);assert.equal(current.hour,23);assert.equal(current.active,false);assert.equal(current.trace.states.length,25,'the final day contains exactly 24 intervals');assert.equal(current.energyGenerated,current.trace.states[24].energyGenerated);assert(element('electricity-balance').innerHTML.includes('24:00'));assert(element('electricity-balance').innerHTML.includes('23 → 24'),'end-of-day powers are identified as the final hourly mean');}
 element('reset').onclick();assert.equal(+element('timeline').value,0);
 if(id==='electricity'){assert.equal(current.stored,10,'reset shows the initial battery, before hour zero');assert.equal(current.energyGenerated,0);assert.equal(metricNodes[2].textContent,display(10)+' MWh');}
 element('step').onclick();assert.equal(+element('timeline').value,1);
 if(id==='electricity')assert.equal(current.stored,4,'one completed hour consumes six MWh from the initial stock');
 element('play').onclick();advance(50);assert(+element('timeline').value>1);if(mode==='immersive')events.blur();else{document.hidden=true;events['document:visibilitychange']();document.hidden=false;}const paused=+element('timeline').value;advance(80);assert.equal(+element('timeline').value,paused);
 if(mode==='web'||lesson.continuous){for(let i=0;i<4;i++){notebook.stage(i,false);assert.equal(phase,i);notebook.seek(notebook.clock.timeline[i].start+5,false);assert.equal(+element('timeline').value,Math.floor(lesson.narrationTime?lesson.narrationTime(defaults(lesson),i,.5,lang):(i+.5)/4*lesson.horizon));}stops[1].onclick();assert.equal(phase,1);notebook.changeLanguage(lang==='es'?'en':'es');assert.equal(element('language').value,lang==='es'?'en':'es');if(lesson.continuous){const edge=notebook.clock.timeline[2];notebook.seek(edge.start+edge.duration-1e-9,false);advance(1);assert.equal(id==='carbon'?current.interval:['electricity','microchip','cell'].includes(id)?current.completed:current.t,Math.floor(sceneTime),'counters must not announce arrivals before their packets reach the next round');notebook.seek(notebook.clock.timeline[2].start+8,false);const before=+element('timeline').value;element('step').onclick();advance(70);assert.equal(+element('timeline').value,Math.min(lesson.horizon,before+1),'paused narration must not overwrite manual step');assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'rendered messages must match the manual round');notebook.options.onSync({...notebook.current,running:false,reason:'tick'});advance(1);assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'late audio errors cannot overwrite a manual experiment');notebook.changeLanguage('en');advance(1);assert.equal(sceneTime,Math.min(lesson.horizon,before+1),'language changes preserve the manual experiment');element('reset').onclick();element('play').onclick();advance(20);const partial=sceneTime;element('play').onclick();advance(10);assert.equal(sceneTime,partial,'pause freezes messages inside a round');if(mode==='immersive'){notebook.stage(1,true);const initial=lesson.poseAt(1);events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});advance(25);events.keyup({code:'KeyW'});assert(pose.z<initial.z,'visitor walks into the actual exhibit');assert.equal(notebook.running,false,'walking pauses the narrated simulation');const beforePose={...pose};inspect({chapter:3});advance(1);assert.equal(phase,3);assert.deepEqual(pose,beforePose,'a physical listening button preserves the visitor position');}}if(id==='electricity'){
   element('reset').onclick();element('play').onclick();advance(21);element('play').onclick();advance(10);
   assert(Math.abs(sceneTime-.5)<1e-10,'half an hour is a real fractional position');
   const half=sampleGrid(current.trace,sceneTime);assert(Math.abs(half.stored-7)<1e-10);assert.equal(half.completed,0);assert.equal(metricNodes[2].textContent,display(7)+' MWh','header battery matches the fractional scene');
   const input=(name,value)=>{const el=controls.find(c=>c.dataset.control===name);el.value=value;el.oninput();};
   input('voltage',400);input('sun',0);input('demand',45);
   element('play').onclick();advance(20);element('play').onclick();advance(10);
   const partial=sceneTime,snapshot=sampleGrid(current.trace,partial);
   assert(partial>0&&partial<1);assert.equal(snapshot.completed,0);assert(Math.abs(snapshot.stored-(10-6*partial))<1e-10,'stock changes with elapsed hours, not with a prematurely completed interval');
   assert(Math.abs(snapshot.energyDischarge-6*partial)<1e-10);assert(Math.abs(snapshot.energyGenerated-snapshot.generated*partial)<1e-10,'mean MW integrated over elapsed hours gives MWh');
   notebook.changeLanguage(notebook.language==='es'?'en':'es');advance(1);
   assert.equal(sceneTime,partial,'voice language preserves fractional electrical time');assert.equal(sampleGrid(current.trace,sceneTime).stored,snapshot.stored);assert.equal(metricNodes[2].textContent,display(snapshot.stored)+' MWh');
   notebook.save();assert.equal(savedForReload.experiment.round,partial);assert.equal(savedForReload.params.voltage,400);
   frames.length=0;elements.clear();now=0;notebook=undefined;current=undefined;
   vm.runInNewContext(source,{...ctx});advance(1);
   assert.equal(sceneTime,partial,'reload restores the battery partway through its current hour');assert.equal(current.completed,0);assert.equal(sampleGrid(current.trace,sceneTime).stored,snapshot.stored);assert.equal(metricNodes[2].textContent,display(snapshot.stored)+' MWh','reload keeps the header at the restored battery stock');assert(Math.abs(element('electricity-chart-cursor').x1-(30+partial/24*380))<1e-10,'chart cursor tracks elapsed day time');
   assert.equal(controls.find(c=>c.dataset.control==='voltage').value,400);assert.equal(controls.find(c=>c.dataset.control==='sun').value,0);assert.equal(controls.find(c=>c.dataset.control==='demand').value,45);
   advance(80);assert.equal(sceneTime,partial,'restored electrical experiment stays paused');
  }
  if(id==='microchip'){
   const input=(name,value)=>{const el=controls.find(c=>c.dataset.control===name);el.checked=value;el.oninput();};
   for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)for(let cin=0;cin<=1;cin++){
    const beforePose={...pose};input('a',!!a);input('b',!!b);input('carry',!!cin);advance(1);
    assert.equal(sceneTime,0);assert.equal(notebook.running,false);assert.deepEqual(pose,beforePose,'switches reset propagation while preserving the viewing position');
    assert.equal(current.result.ready,false);assert.equal(current.result.sum,null);assert.equal(current.result.cout,null);assert.equal(current.nodes.xor1,null);
    assert.equal(metricNodes[1].textContent,'…');assert.equal(element('microchip-leds').textContent,'… · …','pending terminals must not be shown as logic zero');assert.equal(metricNodes[3].textContent,String(a+b+cin));assert.match(current.metrics[3].label[lang==='es'?0:1],/esperad|expected/i,'the precomputed decimal is explicitly labelled as expected');
    assert(element('chart').innerHTML.includes('class="logic-pending"')&&element('chart').innerHTML.includes('class="logic-signal"'),'pending timing segments and valid levels have distinct representations');assert.equal(+element('microchip-chart-width').width,0,'future internal levels are hidden at the start');
    const selected=truthRows.filter(row=>row['aria-current']==='true');assert.equal(selected.length,1);assert.equal(+selected[0].dataset.truth,a*4+b*2+cin,'the truth table highlights the actual input triple');
    assert.equal(current.inputs.cin,cin);assert.equal(current.inverter.output,1-a);assert.equal(current.mos.channelOn,!!a);
    assert.equal(current.series.length,3);assert(current.series.every(line=>line.values.length===13));assert.equal(current.series[0].values[3],null);assert.equal(current.series[0].values[4],a^b);
    element('timeline').oninput({target:{value:'4'}});advance(1);assert.equal(current.nodes.xor1,a^b);assert.equal(current.nodes.and1,a&b);assert.equal(metricNodes[1].textContent,String(a^b),'evaluated logic zero is displayed as zero');
    element('timeline').oninput({target:{value:'8'}});advance(1);assert.equal(current.nodes.xor2,(a+b+cin)%2);assert.equal(current.nodes.and2,cin&(a^b));assert.equal(current.result.sum,null);assert.equal(current.nodes.sum,null);assert.equal(element('microchip-leds').textContent,'… · …');
    element('timeline').oninput({target:{value:'10'}});advance(1);assert.equal(current.nodes.or,Math.floor((a+b+cin)/2));assert.equal(current.result.cout,null);assert.equal(current.nodes.cout,null,'an internally evaluated carry has not yet arrived at the output terminal');
    element('timeline').oninput({target:{value:'12'}});advance(1);
    const sum=(a+b+cin)%2,cout=Math.floor((a+b+cin)/2);assert.equal(current.result.ready,true);assert.equal(current.result.sum,sum);assert.equal(current.result.cout,cout);assert.equal(current.result.decimal,a+b+cin);assert.equal(current.result.binary,`${cout}${sum}`);assert.equal(element('microchip-leds').textContent,`${cout} · ${sum}`);
    if(a===0&&b===0&&cin===0){assert.equal(current.inverter.output,1);assert.equal(current.inputs.a,0);assert.equal(current.result.sum,0,'the separate NOT A demo must not feed the adder A input');}
    element('timeline').oninput({target:{value:'1'}});advance(1);assert.equal(current.result.ready,false);assert.equal(current.nodes.xor1,null);assert.equal(element('microchip-leds').textContent,'… · …','rewinding clears future terminal values');assert(Math.abs(element('microchip-chart-width').width-400/12)<1e-10,'rewinding masks future graph levels again');
   }
   input('a',false);input('b',true);input('carry',true);
   // A legal audio seek immediately before its propagation endpoint must not
   // round into the completed terminal state.
   const edge=notebook.clock.timeline[3];notebook.seek(edge.start+edge.duration*.799999,false);advance(1);assert(sceneTime<12);assert.equal(current.completed,11);assert.equal(element('microchip-leds').textContent,'… · …');
   notebook.seek(edge.start+edge.duration*.8,false);advance(1);assert.equal(sceneTime,12);assert.equal(element('microchip-leds').textContent,'1 · 0');
   element('timeline').oninput({target:{value:'5'}});element('play').onclick();advance(20);element('play').onclick();advance(10);
   const partial=sceneTime;assert(partial>5&&partial<6);assert.equal(sampleChip(current.trace,partial).result.ready,false);
   notebook.changeLanguage(notebook.language==='es'?'en':'es');advance(1);assert.equal(sceneTime,partial,'changing language preserves a signal partway along a wire');
   notebook.save();assert.equal(savedForReload.experiment.round,partial);assert.deepEqual(savedForReload.params,{a:false,b:true,carry:true});
   frames.length=0;elements.clear();now=0;notebook=undefined;current=undefined;
   vm.runInNewContext(source,{...ctx});advance(1);
   assert.equal(sceneTime,partial,'reload restores fractional propagation');assert.equal(current.completed,5);assert.equal(current.inputs.a,0);assert.equal(current.inputs.b,1);assert.equal(current.inputs.cin,1);assert.equal(element('microchip-leds').textContent,'… · …');assert(Math.abs(element('microchip-chart-width').width-partial/12*400)<1e-10,'the graph reveals exactly the restored elapsed propagation');
   assert.equal(controls.find(c=>c.dataset.control==='a').checked,false);assert.equal(controls.find(c=>c.dataset.control==='b').checked,true);assert.equal(controls.find(c=>c.dataset.control==='carry').checked,true);
   advance(80);assert.equal(sceneTime,partial,'restored propagation remains paused');
  }
  if(id==='cell'){
   const input=variant=>{const el=controls.find(c=>c.dataset.control==='variant');el.value=variant;el.oninput();};
   const seek=time=>{element('timeline').oninput({target:{value:String(time)}});advance(1);return sampleCell(current.trace,sceneTime);};
   const seekVoice=(time,variant)=>{const edge=notebook.clock.timeline[2],release=variant===2?15:21,u=.12+(time-7)/(release-7)*.78;notebook.seek(edge.start+edge.duration*u,false);advance(1);return sampleCell(current.trace,sceneTime);};
   const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message);
   for(const variant of [0,1,2]){
    const beforePose={...pose};input(variant);advance(1);
    assert.equal(sceneTime,0);assert.equal(notebook.running,false);assert.deepEqual(pose,beforePose,'changing the codon resets the molecular process without moving the visitor');
    assert.deepEqual(variantButtons.map(b=>b['aria-pressed']),[0,1,2].map(v=>String(v===variant)),'the comparison buttons report the actual selected fragment');
    const expected=variant===2?['Met','Ala']:['Met','Ala','Phe','Glu'];
    assert.deepEqual(current.expected.aminoAcids,expected);assert.equal(current.chain.length,0);assert.equal(element('cell-built').textContent,'—','the expected chain is not presented as an already built peptide');
    assert.equal(element('cell-copy').textContent,'0 / 15');assert.equal(element('cell-location').textContent,lang==='es'?'Núcleo':'Nucleus');
    assert.equal(Number.parseInt(metricNodes[2].textContent,10),0);assert.equal(Number.parseInt(metricNodes[3].textContent,10),expected.length);
    assert.match(current.metrics[3].label[lang==='es'?0:1],/esperad|expected/i);assert.match(element('cell-expected').textContent,/esperada|expected/i);assert(element('cell-expected').textContent.includes(expected.join('–')));
    assert.equal(current.series[0].values.length,25);assert.equal(current.series[0].values[8],0);assert.equal(current.series[0].values[9],1);assert.equal(current.series[0].values[12],2);assert.equal(current.series[0].values[15],variant===2?2:3);assert.equal(current.series[0].values[18],expected.length);
    assert(element('chart').innerHTML.includes('clip-path="url(#cell-chart-reveal)"'),'the full reference trace is clipped so future synthesis is invisible');assert.equal(+element('cell-chart-width').width,0);
    let state=seek(4);assert.equal(state.transcription.fragmentBasesCompleted,15);assert.equal(state.mrna.processed,false);assert.equal(state.mrna.location,'nucleus');assert.equal(state.chain.length,0);
    state=seek(5);assert.equal(state.mrna.processed,true);assert.equal(state.mrna.location,'pore');assert.equal(state.mrna.exported,false);assert.equal(state.translation.readCodons,0);assert.equal(element('cell-built').textContent,'—');
    state=seek(7);assert.equal(state.mrna.exported,true);assert.equal(state.mrna.location,'cytosol');assert.equal(state.chain.length,0,'translation does not invent a residue at the moment of export');assert.equal(state.translation.trna.kind,'initiator');assert.equal(state.translation.trna.site,'P');assert.equal(element('cell-codon').textContent,'1 · AUG');
    state=seekVoice(9-1e-7,variant);assert(sceneTime<9);assert.equal(state.chain.length,0);assert.equal(current.completed,8);assert.equal(element('cell-built').textContent,'—','a fractional voice seek before incorporation cannot round into a completed residue');
    state=seek(9);assert.deepEqual(state.chain.aminoAcids,['Met']);assert.equal(element('cell-built').textContent,'Met');assert.equal(state.chain.attached,true);
    state=seek(12);assert.deepEqual(state.chain.aminoAcids,['Met','Ala']);assert.equal(element('cell-built').textContent,'Met–Ala');assert.equal(state.translation.trna.kind,'elongation');assert.equal(state.translation.trna.site,'A');
    const release=variant===2?15:21,recycle=release+1;
    state=seekVoice(release-1e-7,variant);assert.equal(state.chain.released,false);assert.equal(state.translation.trna,null,'STOP is recognized by a factor, not by an amino-acid-carrying tRNA');assert.equal(state.translation.releaseFactor.kind,'eRF');assert.equal(state.chain.length,expected.length);assert.equal(element('cell-codon').textContent,`${expected.length+1} · UAA · STOP`);
    state=seek(release);assert.equal(state.chain.released,true);assert.equal(state.chain.attached,false);assert.deepEqual(state.chain.aminoAcids,expected);assert.equal(element('cell-built').dataset.released,'true');assert(element('cell-status').innerHTML.includes(lang==='es'?'Cadena liberada':'Chain released'));
    state=seek(recycle);assert.equal(state.translation.recycled,true);assert.equal(state.translation.active,false);assert.equal(state.translation.trna,null);assert.equal(state.translation.releaseFactor,null);assert.equal(element('cell-codon').textContent,'—','recycled ribosomes have no active codon');
    if(variant===2){assert.equal(state.translation.readCodons,3);assert.equal(state.translation.codonIndex,2);assert(state.codons.slice(3).every(c=>c.status==='skipped'&&!c.read&&!c.incorporated));assert.match(element('cell-fragment').innerHTML,/data-codon="3" data-state="skipped"/,'GAA after the first STOP stays explicitly unread');}
    state=seek(24);assert.equal(state.active,false);assert.equal(state.translation.readCodons,variant===2?3:5);assert.deepEqual(state.chain.aminoAcids,expected);assert.equal(element('cell-built').textContent,expected.join('–'));assert(!element('cell-fragment').innerHTML.includes('aria-current="true"'),'the final fragment does not claim an active codon');near(+element('cell-chart-width').width,380);advance(80);assert.equal(sceneTime,24);
    state=seek(6);assert.equal(state.mrna.location,'pore');assert.equal(state.chain.length,0);assert.equal(state.chain.released,false);assert.equal(state.translation.readCodons,0);assert.equal(element('cell-built').textContent,'—');assert.equal(element('cell-built').dataset.released,'false');near(+element('cell-chart-width').width,95,'rewind hides future additions again');
   }
   for(const variant of [1,2,0]){element('timeline').oninput({target:{value:'12'}});element('play').onclick();advance(5);const beforePose={...pose};variantButtons[variant].onclick();advance(1);assert.equal(current.variant,variant);assert.equal(sceneTime,0);assert.equal(notebook.running,false);assert.deepEqual(pose,beforePose,'direct comparison buttons use the same reset-and-pause path as the slider');assert.equal(element('cell-built').textContent,'—');assert.equal(+controls[0].value,variant);assert.equal(variantButtons[variant]['aria-pressed'],'true');advance(5);assert.equal(sceneTime,0,'a direct variant choice pauses experiment playback');}
   input(2);element('timeline').oninput({target:{value:'8'}});element('play').onclick();advance(20);element('play').onclick();advance(10);
   const partial=sceneTime,snapshot=sampleCell(current.trace,partial);assert(partial>8&&partial<9);assert.equal(snapshot.completed,8);assert.equal(snapshot.chain.length,0);assert.equal(snapshot.translation.readCodons,1);assert.equal(element('cell-built').textContent,'—');
   notebook.changeLanguage(notebook.language==='es'?'en':'es');advance(1);assert.equal(sceneTime,partial,'voice language preserves a partially bound tRNA');assert.equal(element('cell-built').textContent,'—');
   notebook.save();assert.equal(savedForReload.experiment.round,partial);assert.equal(savedForReload.params.variant,2);
   frames.length=0;elements.clear();now=0;notebook=undefined;current=undefined;
   vm.runInNewContext(source,{...ctx});advance(1);
   assert.equal(sceneTime,partial,'reload restores fractional molecular progress');assert.equal(current.completed,8);assert.equal(current.variant,2);assert.equal(controls.find(c=>c.dataset.control==='variant').value,2);assert.equal(element('cell-built').textContent,'—');assert(element('cell-expected').textContent.includes('Met–Ala'));
   near(+element('cell-chart-width').width,partial/24*380);near(+element('cell-chart-cursor').x1,34+partial/24*380);advance(80);assert.equal(sceneTime,partial,'restored synthesis remains paused');
  }
  if(id==='evolution'){
   // A discontinuous generation must remain the completed one while the next
   // generation is being copied. Seek to the actual end of the mutation stage.
   const edge=notebook.clock.timeline[2];notebook.seek(edge.start+edge.duration-1e-9,false);advance(1);
   assert.equal(current.t,0);assert.equal(current.countA,25);assert.equal(current.frequency,.5);assert.equal(element('evolution-result').textContent,'25 A / 50','HUD retains the completed population while copies are forming');
   notebook.seek(edge.start+edge.duration,false);advance(1);assert.equal(current.t,1);assert.equal(element('evolution-result').textContent,`${current.countA} A / 50`);
   const input=(name,value)=>{const el=controls.find(c=>c.dataset.control===name);if(typeof value==='boolean')el.checked=value;else el.value=value;el.oninput();};
   input('drift',false);input('advantage',-.25);input('seed',17);
   element('timeline').oninput({target:{value:'7'}});advance(1);
   assert.equal(current.countA,null,'infinite-population expectation has no rounded individual count');assert.equal(current.cohort,null);assert.equal(current.events.length,0);assert(element('evolution-result').textContent.endsWith(' % A'),'deterministic result uses a proportion');assert(!element('evolution-result').textContent.includes('/ 50'));
   element('play').onclick();advance(20);element('play').onclick();advance(10);
   const partial=sceneTime;assert(partial>7&&partial<8,'manual simulation retains a fractional generation');
   const frequency=current.frequency;assert.equal(current.t,7);assert.equal(frequency,lesson.evaluate({advantage:-.25,mutation:.01,drift:false,seed:17},7).frequency);
   notebook.changeLanguage(notebook.language==='es'?'en':'es');advance(1);
   assert.equal(sceneTime,partial,'changing voice language preserves the fractional generation');assert.equal(current.frequency,frequency);
   notebook.save();assert.equal(savedForReload.experiment.round,partial);assert.equal(savedForReload.params.seed,17);
   // Re-execute the real app in a fresh VM, with the same persisted capture.
   // The fixture only supplies storage; restoration and time ownership are app code.
   frames.length=0;elements.clear();now=0;notebook=undefined;current=undefined;
   vm.runInNewContext(source,{...ctx});advance(1);
   assert.equal(sceneTime,partial,'reload restores exact fractional manual position');assert.equal(current.t,7);assert.equal(current.frequency,frequency);
   assert.equal(controls.find(c=>c.dataset.control==='seed').value,17);assert.equal(controls.find(c=>c.dataset.control==='advantage').value,-.25);assert.equal(controls.find(c=>c.dataset.control==='drift').checked,false);
   advance(80);assert.equal(sceneTime,partial,'restored manual experiment stays paused');
  }
  events.pagehide({persisted:false});continue;}
 element('instant').checked=true;element('guide').onclick();assert.equal(audios.length,1);advance(210);assert.equal(phase,0,'a long audio never advances on a guessed duration');
 for(let i=0;i<4;i++){assert.equal(phase,i);audios.at(-1).onended();advance(120);assert.equal(phase,i,'observe for three seconds after audio');advance(65);}
 assert.equal(phase,3);assert.match(element('voice-state').textContent,/completo|complete/);
 stops[1].onclick();assert.equal(phase,1);assert.equal(audios.length,5);
 if(mode==='immersive'){const initial=poseAt(1);events.keydown({code:'KeyW',target:{closest:()=>false},preventDefault(){}});advance(25);events.keyup({code:'KeyW'});assert(pose.x<initial.x,'walk uses camera forward');assert.match(element('voice-state').textContent,/pausa|Paused/);}
 events.pagehide({persisted:false});
}
console.log('30 lesson/language/mode combinations and two Internet redirects: controls, metrics, global timeline scrubbing, fractional continuous seek/pause/language/reload, causal Cell copy/export/first STOP and expected-versus-built HUD, 24-hour energy units and eight Microchip truth-table states, honest deterministic counts, audio-ended immersive tours, walking interruption and cleanup: OK');

