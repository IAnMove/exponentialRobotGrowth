import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NarrationPlayer} from './dist/narrator.js';

// Verify packaged paths in both locales, including deployment below a repo path.
for (const lang of ['en','es']) {
  globalThis.document={documentElement:{lang}};
  const route=lang==='es'?'es/kardashev':'kardashev';
  const {VOICES}=await import(`./dist/${route}/voices.js`);
  for (const language of ['en','es']) {
    assert.deepEqual(VOICES[language].map(c=>c.id),['human','planet','star','galaxy','satellite']);
    for (const c of VOICES[language]) {
      assert(c.duration>10&&c.duration<90);
      assert(c.text.length>100);
      assert(fs.statSync(new URL(c.src)).size>10000);
      assert(c.src.includes('/dist/audio/'),'Both locales must share the root audio assets');
    }
  }
  const glb=fs.readFileSync(`dist/${route}/marco.glb`);
  assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);
  const data=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
  assert(data.nodes.some(n=>n.name==='MarCo_BUS'));
  assert(data.nodes.some(n=>n.name==='Reflectarray'));
  assert(fs.statSync(`dist/${route}/earth-blue-marble.jpg`).size>100000);

  class FakeAudio {
    constructor(src){this.src=src;this.paused=true;}
    play(){this.paused=false;this.onplaying?.();return Promise.resolve();}
    pause(){this.paused=true;this.onpause?.();}
    removeAttribute(){this.src='';}load(){}
  }
  const visited=[];
  const player=new NarrationPlayer({AudioClass:FakeAudio,onClip(c){visited.push(c.id);}});
  player.start(VOICES[lang].slice(0,4));
  for(let i=0;i<3;i++)player.audio.onended();
  assert.deepEqual(visited,['human','planet','star','galaxy']);
  player.audio.onended();assert.equal(player.state,'finished');
  player.start([VOICES[lang][4]]);const old=player.audio,stale=old.onended;
  player.start([VOICES[lang==='es'?'en':'es'][4]]);
  assert(old.paused);stale();assert.equal(player.state,'playing');assert.equal(player.index,0);
  player.toggle();assert.equal(player.state,'paused');player.stop();assert.equal(player.audio,null);
}
console.log('Kardashev: NASA models, shared bilingual audio, four-scene tour, language replacement and pause/stop: OK');
