import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const hash=b=>createHash('sha256').update(b).digest('hex'),voices={es:'ttv-voice-2026091606404326-GjG0y5Nk',en:'English_expressive_narrator'},model='speech-2.8-hd';
let count=0;const files=new Set();
for(const [name,input,prefix,expected]of [['kardashev','kardashev.json','kardashev',5]]){
 const source=readFileSync(`site-src/kardashev/voices.js`,'utf8'),clips=JSON.parse(source.split('export const VOICES = ')[1].split(/;\r?\n/)[0]),canonical=JSON.parse(readFileSync('narration/'+input,'utf8'));
 for(const language of ['es','en']){
  assert.equal(clips[language].length,expected);
  const moduleUrl=`https://fixture.test/${language==='es'?'es/':''}kardashev/voices.js`,runtime=vm.runInNewContext(source.replace('export const VOICES','const VOICES').replaceAll('import.meta.url',JSON.stringify(moduleUrl))+'\nVOICES',{URL,document:{documentElement:{lang:language}}});
  clips[language].forEach((clip,i)=>{
   const entry=canonical[language][i];assert.equal(clip.id,entry.id);assert.equal(clip.text,entry.text);
   const digest=hash(Buffer.from(model+voices[language]+entry.text)).slice(0,12),filename=`${prefix}-${language}-${entry.id}-${digest}.mp3`;assert.equal(clip.file,filename);assert(!files.has(filename));files.add(filename);
   const stem=filename.slice(0,-4),proofBytes=readFileSync(`narration/kardashev-audio/${stem}.json`),proof=JSON.parse(proofBytes),script=readFileSync(`narration/kardashev-scripts/${stem}.txt`);
   assert.equal(script.toString('utf8'),entry.text+'\n');assert.equal(proof.text,entry.text);assert.equal(proof.provider,'MiniMax');assert.equal(proof.model,model);assert.equal(proof.voice,voices[language]);assert.equal(proof.language,language==='es'?'Spanish':'English');
   const mp3=['dist/audio/'+filename,'../audio/'+filename].find(existsSync);assert(mp3,'public recording exists');const audio=readFileSync(mp3);assert(audio.length>10000);assert.equal(audio.length,proof.size_bytes);
   assert.equal(proof.validation.audio_sha256,hash(audio));assert.equal(proof.validation.text_sha256,hash(Buffer.from(entry.text)));assert.equal(proof.validation.script_sha256,hash(script));assert.equal(proof.validation.ffmpeg_decode,'passed');assert.equal(clip.duration,proof.validation.decoded_duration_seconds);
   const decode=spawnSync('ffmpeg',['-v','error','-nostdin','-i',mp3,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr.trim(),'');
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',mp3],{encoding:'utf8'});assert.equal(probe.status,0);const result=JSON.parse(probe.stdout);assert.equal(result.streams.length,1);assert.equal(result.streams[0].codec_name,'mp3');assert.equal(+result.streams[0].sample_rate,32000);assert.equal(result.streams[0].channels,1);assert.equal(+result.format.duration,clip.duration);
   assert.equal(runtime[language][i].src,'https://fixture.test/audio/'+filename);
   if(existsSync(`dist/audio/${stem}.json`))assert.equal(readFileSync(`dist/audio/${stem}.json`,'utf8'),proofBytes.toString('utf8'));
   count++;
  });
 }
}
assert.equal(count,10);assert.equal(files.size,10);
console.log('Kardashev recordings: 10 exact existing bilingual MiniMax clips, full MP3 decodes, configured voices, measured durations, content hashes, portable scripts/proofs and shared public paths: OK');
