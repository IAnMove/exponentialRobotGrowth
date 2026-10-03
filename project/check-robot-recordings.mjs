import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
import {NARRATIONS as spanish} from './dist/narration-catalog.js';
import {NARRATIONS as english} from './dist/narration-catalog-en.js';
const hash=b=>createHash('sha256').update(b).digest('hex'),voices=JSON.parse(readFileSync('narration/voices.json'));
assert.deepEqual(Object.keys(spanish),Object.keys(english));assert.equal(Object.keys(spanish).length,54);
let proofs=0;
for(const lang of ['es','en']){
 const lessons=JSON.parse(readFileSync(`narration/lessons.${lang}.json`)),regions=JSON.parse(readFileSync(`narration/region.${lang}.json`)),catalog=lang==='es'?spanish:english;
 for(const id of ['robot-factory-1','region-3','region-city-2','factory-limits']){
  const clip=catalog[id],script=(lessons[id]||regions[id]).text;assert.equal(clip.text,script);
  const filename=new URL(clip.src).pathname.split('/').at(-1),digest=hash(Buffer.from('speech-2.8-hd'+voices[lang]+script)).slice(0,12);assert.equal(filename,`${id}-${digest}.mp3`);
  const metadataPath=[`narration/robot-audio/${filename.slice(0,-4)}.json`,`dist/audio/${filename.slice(0,-4)}.json`].find(existsSync);assert(metadataPath,'saved recording proof '+filename);
  const scriptPath=[`narration/robot-scripts/${filename.slice(0,-4)}.txt`,`narration/scripts/${filename.slice(0,-4)}.txt`].find(existsSync);assert(scriptPath,'saved recording script '+filename);
  const metadata=JSON.parse(readFileSync(metadataPath)),audio=readFileSync(new URL(clip.src)),scriptBytes=readFileSync(scriptPath);
  assert.equal(metadata.provider,'MiniMax');assert.equal(metadata.model,'speech-2.8-hd');assert.equal(metadata.voice,voices[lang]);assert.equal(metadata.language,lang==='es'?'Spanish':'English');assert.equal(metadata.text,script);assert.equal(scriptBytes.toString().trim(),script);
  assert.equal(audio.length,metadata.size_bytes);assert.equal(hash(audio),metadata.validation.audio_sha256);assert.equal(hash(Buffer.from(script)),metadata.validation.text_sha256);assert.equal(hash(scriptBytes),metadata.validation.script_sha256);
  assert.equal(metadata.validation.ffmpeg_decode,'passed');assert.equal(metadata.validation.codec,'mp3');assert.equal(metadata.validation.channels,1);assert.equal(metadata.validation.sample_rate,32000);assert.equal(metadata.validation.decoded_duration_seconds,clip.duration);assert.equal(metadata.duration_ms/1000,clip.duration);proofs++;
 }
}
console.log(`Robot recordings: ${proofs} exact bilingual MiniMax recordings, transcripts, content hashes, bytes and decoded durations; 108 catalog entries OK.`);
