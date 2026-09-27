import {createRun,advance} from './model.js';
import {narrationId} from './guide.js';
// Resolve the seeded demonstration once, so rewinding restores the generated tokens too.
export function responsePlaylist(language,options,voices,titles){const run=createRun(language,options),clips=[];for(let i=0;i<1000;i++){const voice=voices.find(v=>v.id===narrationId(run));if(!voice)throw Error('Missing narration: '+narrationId(run));clips.push({...voice,id:voice.id+'-'+i,title:`${titles[run.phase]}${run.loops?' · '+(language==='es'?'token ':'token ')+run.loops:''}`,snapshot:JSON.parse(JSON.stringify(run))});if(run.done)return clips;advance(run);}throw Error('Response exceeded the teaching vocabulary');}
