import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matmul,transformerTrace,contextWindow,createRun,vector} from './site-src/llms/model.js';
import {cueAt,guideProgress} from './site-src/llms/flow.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
assert.deepEqual(matmul([[1,2],[3,4]],[[5,6],[7,8]]),[[19,22],[43,50]]);
const tokens=['La',' ','capital',' ','es'],a=transformerTrace(tokens,11);
assert.notDeepEqual(a.Q,a.K);assert.notDeepEqual(a.K,a.V);
assert.deepEqual(a.X[0],vector(tokens[0],11));
for(let i=0;i<tokens.length;i++){
  close(a.A[i].reduce((s,v)=>s+v,0),1);
  for(let j=0;j<tokens.length;j++){
    close(a.scores[i][j],a.Q[i].reduce((s,v,k)=>s+v*a.K[j][k],0)/Math.sqrt(3));
    if(j>i){assert.equal(a.masked[i][j],-Infinity);assert.equal(a.A[i][j],0);}
  }
  for(let d=0;d<3;d++)close(a.mixed[i][d],a.A[i].reduce((s,v,j)=>s+v*a.V[j][d],0));
  for(let d=0;d<6;d++)close(a.residual[i][d],a.X[i][d]+a.projected[i][d]);
  close(a.Y[i].reduce((s,v)=>s+v,0),0);
}
// Changing a future token must not influence an earlier output, even after FFN.
const changed=transformerTrace(['La',' ','capital',' ','diferente'],11);
assert.deepEqual(a.Y.slice(0,4),changed.Y.slice(0,4));assert.notDeepEqual(a.Y[4],changed.Y[4]);
const r=createRun();r.generated=['París',' '];const w=contextWindow(r);
assert.equal(w.tokens.length,8);assert.equal(w.tokens.at(-1),' ');assert.equal(w.offset,r.tokens.length+r.generated.length-8);
const catalog=JSON.parse(fs.readFileSync('site-src/llms/voices.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const clips of Object.values(catalog))for(const clip of clips.filter(c=>c.cues)){
  assert.equal(clip.cues.length,5);assert.equal(clip.segments.length,5);assert.equal(clip.cues[0].start,0);
  for(const [i,cue] of clip.cues.entries()){
    assert(cue.end>cue.start);if(i>0)close(cue.start,clip.cues[i-1].end);
    assert.equal(cueAt(clip.cues,cue.start).index,i);
    close(cueAt(clip.cues,(cue.start+cue.end)/2).progress,.5);
  }
  close(clip.duration,clip.cues.at(-1).end);
  assert.equal(cueAt(clip.cues,clip.duration+10).progress,1);
  const guide={enabled:true,state:'paused',resumeState:'speaking',audio:{currentTime:clip.duration*.42,duration:clip.duration}};
  close(guideProgress(guide,clip),.42);close(guideProgress(guide,clip),.42);
  guide.state='waiting';assert.equal(guideProgress(guide,clip),1);
  guide.enabled=false;guide.state='reading';guide.gap=3;guide.remaining=3+Math.max(6,Math.min(14,clip.text.length/32))*.5;
  close(guideProgress(guide,clip),.5);
}
console.log('LLM tensors: Q/K/V, scaled scores, causal invariance, AV, residuals, FFN shapes, context positions, bilingual measured cues and paused/silent flow: OK');
