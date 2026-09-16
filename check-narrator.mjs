import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NarrationPlayer} from './dist/narrator.js';
import {NARRATIONS as SPANISH} from './dist/narration-catalog.js';
import {NARRATIONS as ENGLISH} from './dist/narration-catalog-en.js';
const englishOnly=process.argv.includes('--english');
const NARRATIONS=englishOnly?ENGLISH:SPANISH;
if(!englishOnly)assert.deepEqual(Object.keys(ENGLISH),Object.keys(SPANISH));
for(let i=0;i<14;i++)assert(NARRATIONS['district-'+i]);
for(let i=0;i<5;i++)assert(NARRATIONS['robot-factory-'+i]);
for(let i=0;i<6;i++)assert(NARRATIONS['city-'+i]);
for(const key of ['guide-factory','guide-district','guide-city','factory-first-loop','district-chain-lesson','region-growth-lesson','district-productivity-lesson'])assert(NARRATIONS[key]);
for(let i=0;i<6;i++)assert(NARRATIONS['region-'+i]);
for(let i=0;i<3;i++)assert(NARRATIONS['region-city-'+i]);
for(const key of ['region-overview','region-operation','region-project'])assert(NARRATIONS[key]);
for(const state of ['working','rest','waiting','supply','building','full','blocked','arriving','kits'])assert(NARRATIONS['state-'+state]);
for(const entry of [...Object.values(NARRATIONS),...(englishOnly?[]:Object.values(ENGLISH))]){assert(entry.text.length>100);assert(entry.duration>0);assert(fs.statSync(new URL(entry.src)).size>1024);}
class FakeAudio{
  static rejectNext=false;static instances=[];
  constructor(src){this.src=src;this.paused=true;FakeAudio.instances.push(this);}
  play(){if(FakeAudio.rejectNext){FakeAudio.rejectNext=false;return Promise.reject(new Error('Gesture required'));}this.paused=false;this.onplaying?.();return Promise.resolve();}
  pause(){this.paused=true;this.onpause?.();}
  removeAttribute(){this.src='';}load(){}
}
let beginnings=0;const clips=[];
const player=new NarrationPlayer({AudioClass:FakeAudio,onBegin(){beginnings++;},onClip(c){clips.push(c.title);}});
player.start([NARRATIONS['robot-factory-1'],NARRATIONS['state-waiting']]);
assert.equal(player.state,'playing');assert.equal(beginnings,1);
const old=player.audio,lateEnd=old.onended;player.start([NARRATIONS['district-0'],NARRATIONS['state-working']]);
assert(old.paused);assert.equal(old.src,'');lateEnd();assert.equal(player.index,0,'A stale ended event must not advance a different explanation');
player.audio.onended();assert.equal(player.index,1);assert.equal(clips.at(-1),NARRATIONS['state-working'].title);
player.toggle();assert.equal(player.state,'paused');player.toggle();assert.equal(player.state,'playing');
player.audio.onended();assert.equal(player.state,'finished');player.repeat();assert.equal(player.index,0);
player.stop();assert.equal(player.state,'stopped');assert.equal(player.audio,null);
FakeAudio.rejectNext=true;player.start([NARRATIONS['district-1']]);await Promise.resolve();assert.equal(player.state,'blocked');player.toggle();assert.equal(player.state,'playing');
const failing=player.audio;FakeAudio.rejectNext=true;player.start([NARRATIONS['district-2']]);player.start([NARRATIONS['district-3']]);await Promise.resolve();assert.equal(player.state,'playing','An old play rejection must not overwrite a new selection');assert(failing.paused);
player.audio.onerror();assert.equal(player.state,'error');player.toggle();assert.equal(player.state,'playing');player.stop();
console.log(Object.keys(NARRATIONS).length*(englishOnly?1:2)+(englishOnly?' English':' bilingual')+' audio assets; switching, stale events, sequential context, pause/replay, autoplay rejection and error recovery: OK');
