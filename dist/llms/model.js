// Educational mechanics. This is NOT a trained language model or live web search.
export const PHASES=['question','retrieval','tokens','vectors','layers','scores','choose','feedback'];
export function tokenize(text){
  // A reversible teaching tokenizer. Production models use their own vocabularies.
  return (text.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)||[]).flatMap(part=>
    /^\p{L}{8,}$/u.test(part)?[part.slice(0,4),part.slice(4)]:[part]);
}
export function hash(text){let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function vector(token,position=0){const h=hash(token);return Array.from({length:6},(_,i)=>Math.sin((h%997)*(i+1)*.017)+.2*Math.cos(position/(i+1)));}
export function softmax(logits,temperature=1){
  if(!logits.length||logits.some(x=>!Number.isFinite(x)))throw new RangeError('Finite nonempty logits required');
  if(!Number.isFinite(temperature)||temperature<0)throw new RangeError('Nonnegative temperature required');
  if(temperature===0){const max=Math.max(...logits);const index=logits.indexOf(max);return logits.map((_,i)=>i===index?1:0);}
  const max=Math.max(...logits),weights=logits.map(x=>Math.exp((x-max)/temperature)),sum=weights.reduce((a,b)=>a+b,0);return weights.map(x=>x/sum);
}
export function attention(tokens,query=tokens.length-1){
  if(!tokens.length)return {weights:[],mixed:[]};
  const q=Math.max(0,Math.min(tokens.length-1,query)),vectors=tokens.map(vector);
  const scores=vectors.slice(0,q+1).map(v=>v.reduce((a,x,i)=>a+x*vectors[q][i],0)/Math.sqrt(6));
  const weights=[...softmax(scores),...Array(tokens.length-q-1).fill(0)];
  return {weights,mixed:Array.from({length:6},(_,i)=>vectors.reduce((a,v,j)=>a+v[i]*weights[j],0))};
}
export function randomStep(seed){const next=(Math.imul(seed,1664525)+1013904223)>>>0;return {seed:next,value:next/4294967296};}
export function sample(probabilities,value){let sum=0;for(let i=0;i<probabilities.length;i++){sum+=probabilities[i];if(value<sum)return i;}return probabilities.length-1;}
export const DEFAULTS={scenario:'capital',context:true,retrieval:false,source:'current',temperature:.7,decoding:'greedy',seed:42};
export function scenarioData(language,options){const es=language==='es',t=(a,b)=>es?a:b;
  if(options.scenario==='bank')return {
    name:t('Una palabra ambigua','An ambiguous word'),question:t('¿Qué significa «banco»?','What does “bank” mean?'),
    history:options.context?t('Estoy hablando de dinero, cuentas y préstamos.','I am talking about money, accounts and loans.'):'',
    choices:[t('Entidad','Financial'),t('Asiento','River'),t('Depende','Depends')],
    logits:options.context?[4.2,0,1.1]:[2.1,2.3,2],
    completions:[t('Entidad financiera que gestiona dinero y ofrece servicios bancarios.','Financial institution that manages money and provides banking services.'),t('Asiento donde pueden sentarse varias personas.','River edge: the land alongside a river.'),t('Depende del contexto. ¿Hablas de dinero o de un asiento?','Depends on context. Do you mean finance or the edge of a river?')],
    source:null,evidence:options.context?t('El contexto orienta el significado. No ha cambiado ningún peso.','Context steers the meaning. No model weight has changed.'):t('Sin contexto hay varias interpretaciones. Pedir una aclaración sería útil.','Without context, several interpretations are possible. Asking for clarification would help.')};
  if(options.scenario==='museum'){
    const source=options.retrieval?{title:options.source==='current'?t('Museo Delta · ficha vigente','Delta Museum · current record'):t('Museo Delta · archivo antiguo','Delta Museum · old archive'),
      text:options.source==='current'?t('Horario vigente: los sábados, el Museo Delta abre a las 10:00.','Current hours: on Saturdays, Delta Museum opens at 10:00.'):t('Horario archivado: los sábados, el Museo Delta abría a las 09:00.','Archived hours: on Saturdays, Delta Museum used to open at 09:00.'),
      hour:options.source==='current'?'10:00':'09:00'}:null;
    return {name:t('Un dato que necesita fuente','A fact that needs a source'),question:t('¿A qué hora abre el Museo Delta el sábado?','What time does Delta Museum open on Saturday?'),history:'',choices:['09:00','10:00',t('No','I')],
      logits:source?source.hour==='10:00'?[.1,4.4,1]:[4.4,.1,1]:[3.8,1,.6],
      completions:[t('09:00 es la hora de apertura.', '09:00 is the opening time.')+(source?t(' Según la ficha consultada.',' According to the retrieved record.') :''),t('10:00 es la hora de apertura.','10:00 is the opening time.')+(source?t(' Según la ficha consultada.',' According to the retrieved record.') :''),t('No puedo confirmar el horario sin una fuente vigente.','I cannot confirm the hours without a current source.')],source,
      evidence:!source?t('Fallo posible: una hora plausible, pero sin evidencia. El horario vigente ficticio es 10:00.','Possible failure: a plausible time without evidence. The fictional current hours are 10:00.'):options.source==='current'?t('El documento añade la evidencia que faltaba. Recuperarlo no garantiza interpretarlo bien.','The document adds missing evidence. Retrieval does not guarantee correct interpretation.'):t('Una fuente antigua también puede llevar a una respuesta incorrecta. Citar no basta: revisa la vigencia.','An old source can also lead to an incorrect answer. A citation is not enough: check freshness.')};
  }
  return {name:t('Un conocimiento aprendido','A learned fact'),question:t('¿Cuál es la capital de Francia?','What is the capital of France?'),history:'',choices:[t('París','Paris'),'Lyon',t('Marsella','Marseille')],logits:[4.2,1.2,.5],
    completions:[t('París es la capital de Francia.','Paris is the capital of France.'),t('Lyon es la capital de Francia.','Lyon is the capital of France.'),t('Marsella es la capital de Francia.','Marseille is the capital of France.')],source:null,
    evidence:t('Este ejemplo representa conocimiento aprendido. No se ha consultado internet. Elegir una alternativa improbable puede dar un dato falso.','This example represents learned knowledge. No internet search occurred. Choosing an unlikely alternative can produce a false fact.')};
}
export function createRun(language='es',options={}){
  const settings={...DEFAULTS,...options},data=scenarioData(language,settings);
  const prompt=[language==='es'?'Responde brevemente.':'Answer briefly.',data.history,data.source?.text??'',data.question].filter(Boolean).join('\n');
  const tokens=tokenize(prompt),vocabulary=[...new Set(tokens)],tokenIds=tokens.map(token=>vocabulary.indexOf(token)+1);
  return {language,options:settings,data,prompt,tokens,tokenIds,phase:0,playing:false,elapsed:0,generated:[],outputTokens:null,chosen:null,seed:settings.seed,done:false,loops:0};
}
export function nextCandidates(run){
  if(run.outputTokens){const next=run.outputTokens[run.generated.length];return next===undefined?{pieces:['<EOS>'],logits:[0],scripted:true}:{pieces:[next,'…','<EOS>'],logits:[4.6,.1,-1],scripted:true};}
  return {pieces:run.data.completions.map(c=>tokenize(c)[0]),logits:run.data.logits,scripted:true};
}
export function pendingToken(run){
  if(run.outputTokens)return run.outputTokens[run.generated.length]??'<EOS>';
  const logits=run.data.logits,choice=run.options.decoding==='greedy'?logits.indexOf(Math.max(...logits)):sample(softmax(logits,run.options.temperature),randomStep(run.seed).value);
  return tokenize(run.data.completions[choice])[0];
}
export function advance(run){
  if(run.done)return run;
  if(run.phase<6){run.phase++;return run;}
  if(run.phase===6){
    if(!run.outputTokens){const p=softmax(run.data.logits,run.options.temperature);const rng=randomStep(run.seed);run.seed=rng.seed;
      run.chosen=run.options.decoding==='greedy'?run.data.logits.indexOf(Math.max(...run.data.logits)):sample(p,rng.value);
      // Curated continuations make the example inspectable; they are not a trained model's output.
      run.outputTokens=tokenize(run.data.completions[run.chosen]);}
    if(run.generated.length<run.outputTokens.length)run.generated.push(run.outputTokens[run.generated.length]);
    else {run.done=true;run.playing=false;}
    run.phase=7;run.loops++;return run;
  }
  run.phase=4;return run;
}
export function tick(run,dt,speed=1){if(!run.playing||run.done||!Number.isFinite(dt)||dt<=0)return run;run.elapsed+=Math.min(dt,.2)*speed;
  const duration=run.loops>0?.28:1.1;if(run.elapsed>=duration){run.elapsed=0;advance(run);}return run;}
export function trainStep(weight,rate=.7){const probability=1/(1+Math.exp(-weight));return weight+rate*(1-probability);}
export function trainingStats(weight){const probability=1/(1+Math.exp(-weight));return {probability,loss:-Math.log(Math.max(probability,1e-12))};}
