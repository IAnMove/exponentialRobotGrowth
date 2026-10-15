import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const sha=b=>createHash('sha256').update(b).digest('hex'),voices={es:'ttv-voice-2026091606404326-GjG0y5Nk',en:'English_expressive_narrator'},files=new Set(),components=new Set();
for(const [name,canonical]of [['llms','llms'],['immersive','immersive-llms']]){
 const source=readFileSync(`site-src/${name}/voices.js`,'utf8'),catalog=JSON.parse(source.split('export const VOICES = ')[1].split(/;\r?\n/)[0]),scripts=JSON.parse(readFileSync(`narration/${canonical}.json`,'utf8'));
 for(const language of ['es','en']){
  assert.equal(catalog[language].length,13);
  const runtime=vm.runInNewContext(source.replace('export const VOICES','const VOICES').replaceAll('import.meta.url',JSON.stringify(`https://fixture.test/${language==='es'?'es/':''}${name}/voices.js`))+'\nVOICES',{URL,document:{documentElement:{lang:language}}});
  catalog[language].forEach((clip,i)=>{
   assert.equal(clip.id,scripts[language][i].id);assert.equal(clip.text,scripts[language][i].text);
   const digest=sha(Buffer.from('speech-2.8-hd'+voices[language]+clip.text)).slice(0,12);assert.equal(clip.file,`llms-${language}-${clip.id}-${digest}.mp3`);
   assert.equal(runtime[language][i].src,'https://fixture.test/audio/'+clip.file);
   const stem=clip.file.slice(0,-4),proof=JSON.parse(readFileSync(`narration/llms-audio/${stem}.json`)),script=readFileSync(`narration/llms-scripts/${stem}.txt`);
   assert.equal(script.toString(),clip.text+'\n');assert.equal(proof.text,clip.text);assert.equal(proof.model,'speech-2.8-hd');assert.equal(proof.voice,voices[language]);assert.equal(proof.validation.text_sha256,sha(Buffer.from(clip.text)));assert.equal(proof.validation.script_sha256,sha(script));assert.equal(proof.validation.catalog_duration_seconds,clip.duration);
   if(clip.segments){
    assert.equal(proof.provider,'MiniMax components');assert.deepEqual(proof.cues,clip.cues);assert.equal(proof.components.length,5);assert.equal(clip.cues.at(-1).end,clip.duration);
    proof.components.forEach((p,j)=>{assert.equal(p.text,clip.segments[j]);assert.equal(p.provider,'MiniMax');assert.equal(p.model,'speech-2.8-hd');assert.equal(p.voice,voices[language]);assert.equal(p.file,`llms-${language}-${clip.id}-part${j}-${sha(Buffer.from(p.model+p.voice+p.text)).slice(0,12)}.mp3`);assert.match(p.audio_sha256,/^[a-f0-9]{64}$/);assert(Math.abs(p.decoded_duration_seconds-(clip.cues[j].end-clip.cues[j].start))<.15);components.add(p.file);});
   }else assert.equal(proof.provider,'MiniMax');
   if(files.has(clip.file))return;files.add(clip.file);
   const path=['dist/audio/'+clip.file,'../audio/'+clip.file].find(existsSync);assert(path);const bytes=readFileSync(path);assert.equal(bytes.length,proof.size_bytes);assert.equal(sha(bytes),proof.validation.audio_sha256);
   const decoded=spawnSync('ffmpeg',['-v','error','-nostdin','-i',path,'-f','null','-'],{encoding:'utf8'});assert.equal(decoded.status,0);assert.equal(decoded.stderr.trim(),'');
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',path],{encoding:'utf8'});assert.equal(probe.status,0);const m=JSON.parse(probe.stdout);assert.equal(m.streams.length,1);assert.equal(m.streams[0].codec_name,'mp3');assert.equal(+m.streams[0].sample_rate,32000);assert.equal(m.streams[0].channels,1);assert.equal(+m.format.duration,proof.validation.decoded_duration_seconds);assert(Math.abs(+m.format.duration-clip.duration)<.15);
  });
 }
}
assert.equal(files.size,34);assert.equal(components.size,30);
console.log('LLM recordings: 34 existing bilingual MP3s fully decoded, exact scripts/hashes, configured MiniMax voices, 30 component proofs and measured five-operation cues preserved: OK');
