import {createNarrator} from './narrator.js';
import {createRobotTrace,robotFrameAt,robotChapterWindows} from './robot-trace.js';

// The voice and the manual controls position the same replay of the real engines.
// The trace itself is never serialized: only assumptions and dated interventions.
export function createRobotGuide({kind,params,onFrame=()=>{},capture=()=>null,restore=()=>{},onBegin=()=>{}}){
 let assumptions={...params},events=[],trace=createRobotTrace(kind,assumptions,events),time=0,source='voice',aligning=false,ready=false,restored=false;
 let frame=robotFrameAt(trace,0),narrator;
 const rebuild=()=>{trace=createRobotTrace(kind,assumptions,events);assumptions={...trace.params};};
 const windows=()=>robotChapterWindows(trace);
 const windowFor=id=>{const result=windows();return Array.isArray(result)?result.find(w=>w.id===id):result[id];};
 const clampTime=value=>Math.max(0,Math.min(trace.horizon,Number.isFinite(+value)?+value:0));
 function apply(value){time=clampTime(value);frame=robotFrameAt(trace,time);if(ready)onFrame(frame);return frame;}
 function sync(s){if(aligning||source==='manual')return;const w=windowFor(s.id);if(!w)return;const start=w.start??w.from??0,end=w.end??w.to??start;apply(start+(end-start)*s.progress);}
 function align(){const player=narrator?.player;if(!player)return;const current=player.current,w=windowFor(current.id);let chosen=w&&time>=(w.start??w.from)&&time<=(w.end??w.to)?{...w,id:current.id}:null;
  if(!chosen){const candidates=player.clock.timeline.map(c=>({c,w:windowFor(c.id)})).filter(({w})=>w&&(w.end??w.to)>(w.start??w.from)&&time>=(w.start??w.from)-1e-8&&time<=(w.end??w.to)+1e-8).sort((a,b)=>((a.w.end??a.w.to)-(a.w.start??a.w.from))-((b.w.end??b.w.to)-(b.w.start??b.w.from)));if(candidates.length)chosen={...candidates[0].w,id:candidates[0].c.id};}
  if(!chosen)return;const c=player.clock.timeline.find(c=>c.id===chosen.id),start=chosen.start??chosen.from,end=chosen.end??chosen.to,phase=end>start?(time-start)/(end-start):0;aligning=true;try{narrator.align(c.start+Math.max(0,Math.min(1,phase))*c.duration);}finally{aligning=false;}
 }
 narrator=createNarrator({onBegin,onIntent(){if(!aligning)source='voice';},capture:()=>({version:1,params:assumptions,events,time,source,extra:capture()}),restore(saved){if(!saved||saved.version!==1)return;try{assumptions={...saved.params};events=Array.isArray(saved.events)?saved.events:[];rebuild();source=saved.source==='manual'?'manual':'voice';apply(saved.time);restore(saved.extra);restored=true;}catch{assumptions={...params};events=[];rebuild();apply(0);}},onSync:sync,onReady(){if(restored&&source==='manual')align();if(ready)onFrame(frame);}});
 const api={
  get trace(){return trace;},get frame(){return frame;},get time(){return time;},get params(){return assumptions;},get events(){return events;},get source(){return source;},get player(){return narrator.player;},
  ready(){ready=true;onFrame(frame);},
  seek(value,{pause=true,alignFooter=true,save=true}={}){source='manual';if(pause)narrator.stop();apply(value);if(alignFooter)align();if(save)narrator.save();return frame;},
  advance(dt){return api.seek(time+dt,{pause:false,alignFooter:false,save:false});},
  reset(next=assumptions){source='manual';narrator.stop();assumptions={...next};events=[];rebuild();apply(0);align();narrator.save();return frame;},
  intervene(event){source='manual';narrator.stop();const stamp=frame.sampledTime;events=events.filter(e=>e.time<=stamp+1e-9);events.push({...event,time:stamp});rebuild();apply(time);align();narrator.save();return frame;},
  explain(key,stateKey){source='voice';narrator.explain(key,stateKey);},stop(){source='manual';narrator.stop();},save(){narrator.save();},dispose(){narrator.save();narrator.dispose();},align
 };
 return api;
}

const rowCaches=new WeakMap();
function headerRow(frame){return {time:frame.sampledTime,total:frame.trace.kind==='city'?frame.replacement.done:frame.total,reference:frame.trace.kind==='city'?600:frame.referenceTotal,fleet:frame.trace.kind==='city'?frame.state.industry.fleet:frame.fleet,referenceFleet:frame.referenceFleet,...frame.ledger};}
export function robotHeaderPoints(trace,current){let rows=rowCaches.get(trace);if(!rows){rows=[];for(let time=0;time<=trace.horizon;time++)rows.push(headerRow(robotFrameAt(trace,time)));rowCaches.set(trace,rows);}return [...rows.filter(r=>r.time<current.sampledTime-1e-9),headerRow(current)];}
