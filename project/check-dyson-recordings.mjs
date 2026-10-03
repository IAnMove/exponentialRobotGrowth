import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const hash=b=>createHash('sha256').update(b).digest('hex'),ids=['star','panel','swarm','heat','mass','shell'];
const voicesByLanguage={es:'ttv-voice-2026091606404326-GjG0y5Nk',en:'English_expressive_narrator'},model='speech-2.8-hd';
const source=readFileSync('site-src/dyson/voices.js','utf8'),VOICES=JSON.parse(source.split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
// Explicit portable folders win as a SET, not per-file fallbacks. A missing
// portable proof/script must fail even if an ignored historical file survives.
const portable=existsSync('narration/dyson-audio')||existsSync('narration/dyson-scripts'),proofDir=portable?'narration/dyson-audio/':'dist/audio/',scriptDir=portable?'narration/dyson-scripts/':'narration/scripts/';
let recordings=0,decodes=0;const files=new Set();
for(const language of ['es','en']){
 const original=JSON.parse(readFileSync(`narration/dyson.${language}.json`,'utf8'));
 assert.deepEqual(Object.keys(original),ids.map(id=>'dyson-'+id));assert.deepEqual(VOICES[language].map(clip=>clip.id),ids);
 // Evaluate the actual standalone src resolver for BOTH public route depths.
 const moduleUrl=`https://fixture.test/${language==='es'?'es/':''}dyson/voices.js`;
 const runtime=vm.runInNewContext(source.replace('export const VOICES','const VOICES').replaceAll('import.meta.url',JSON.stringify(moduleUrl))+'\nVOICES',{URL,document:{documentElement:{lang:language}}});
 for(const clip of VOICES[language]){
  const canonical=original['dyson-'+clip.id],digest=hash(Buffer.from(model+voicesByLanguage[language]+canonical.text)).slice(0,12),filename=`dyson-${language}-${clip.id}-${digest}.mp3`;
  assert.equal(clip.title,canonical.title);assert.equal(clip.text,canonical.text);assert.equal(clip.file,filename);assert(!files.has(filename),'each clip has its own content identity');files.add(filename);
  assert.equal(runtime[language].find(value=>value.id===clip.id).src,new URL('audio/'+filename,'https://fixture.test/').href,'ES and EN standalone paths reach shared public audio');
  const script=readFileSync(scriptDir+filename.slice(0,-4)+'.txt'),proofBytes=readFileSync(proofDir+filename.slice(0,-4)+'.json'),proof=JSON.parse(proofBytes);
  assert.equal(script.toString('utf8'),canonical.text+'\n','the saved recording input contains the exact narration, including its sole final newline');
  const audioPath=['dist/audio/'+filename,'../audio/'+filename].find(existsSync);assert(audioPath,'public MP3 exists: '+filename);const audio=readFileSync(audioPath);
  assert.equal(proof.provider,'MiniMax');assert.equal(proof.model,model);assert.equal(proof.voice,voicesByLanguage[language]);assert.equal(proof.language,language==='es'?'Spanish':'English');assert.equal(proof.text,canonical.text);
  assert(audio.length>10000);assert.equal(audio.length,proof.size_bytes);assert.equal(proof.validation.audio_sha256,hash(audio));assert.equal(proof.validation.text_sha256,hash(Buffer.from(canonical.text)));assert.equal(proof.validation.script_sha256,hash(script));
  assert(Number.isFinite(proof.duration_ms)&&proof.duration_ms>0);assert(Number.isFinite(clip.duration)&&clip.duration>0);assert.equal(clip.duration,proof.validation.decoded_duration_seconds,'runtime uses measured MP3 duration');assert(Math.abs(proof.duration_ms/1000-clip.duration)<=.15);
  assert.equal(proof.validation.ffmpeg_decode,'passed');assert.equal(proof.validation.codec,'mp3');assert.equal(proof.validation.sample_rate,32000);assert.equal(proof.validation.channels,1);
  const decoded=spawnSync('ffmpeg',['-v','error','-nostdin','-i',audioPath,'-f','null','-'],{encoding:'utf8'});assert.equal(decoded.status,0,'the actual MP3 decodes fully: '+filename);assert.equal(decoded.stderr.trim(),'');decodes++;
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',audioPath],{encoding:'utf8'});assert.equal(probe.status,0);const measured=JSON.parse(probe.stdout);assert.equal(measured.streams.length,1);assert.equal(measured.streams[0].codec_name,'mp3');assert.equal(+measured.streams[0].sample_rate,32000);assert.equal(measured.streams[0].channels,1);assert.equal(+measured.format.duration,clip.duration,'independently probed duration agrees with playback');
  const rawProof='dist/audio/'+filename.slice(0,-4)+'.json';if(portable&&existsSync(rawProof))assert.equal(readFileSync(rawProof).toString('utf8'),proofBytes.toString('utf8'),'portable and source recording proofs agree byte for byte');
  recordings++;
 }
}
assert.equal(recordings,12);assert.equal(files.size,12);
console.log(`Dyson recordings OK: ${recordings} exact bilingual MiniMax clips, ${decodes} full MP3 decodes, canonical scripts/titles, configured voices, content hashes, measured durations, portable proofs and both route depths.`);
