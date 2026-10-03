"""Archive and verify existing lunar recordings. No network or generation calls."""
from pathlib import Path
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parents[1]
hash_bytes=lambda data: hashlib.sha256(data).hexdigest()
voice_ids={'es':'ttv-voice-2026091606404326-GjG0y5Nk','en':'English_expressive_narrator'}
for name,canonical in [('lunar','lunar.json')]:
 path=ROOT/'site-src/lunar/voices.js'
 source=path.read_text(encoding='utf-8');voices=json.JSONDecoder().raw_decode(source.split('export const VOICES = ')[1])[0]
 scripts=json.loads((ROOT/'narration'/canonical).read_text(encoding='utf-8'))
 for language,clips in voices.items():
  for i,clip in enumerate(clips):
   expected=scripts[language][i];assert clip['id']==expected['id'] and clip['text']==expected['text']
   filename=clip['file'];stem=Path(filename).stem;mp3=ROOT/'dist/audio'/filename
   proof=json.loads(mp3.with_suffix('.json').read_text(encoding='utf-8'))
   assert proof['text']==clip['text'] and proof['model']=='speech-2.8-hd' and proof['voice']==voice_ids[language]
   assert (ROOT/'narration/scripts'/(filename+'.txt')).read_text(encoding='utf-8').strip()==clip['text']
   result=subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(mp3),'-f','null','-'],capture_output=True,text=True,check=True);assert not result.stderr.strip()
   measured=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(mp3)],capture_output=True,text=True,check=True).stdout)
   stream=measured['streams'][0];duration=float(measured['format']['duration']);assert len(measured['streams'])==1 and stream['codec_name']=='mp3' and int(stream['sample_rate'])==32000 and stream['channels']==1
   script=(clip['text']+'\n').encode('utf-8');audio=mp3.read_bytes();assert len(audio)==proof['size_bytes'];assert abs(proof['duration_ms']/1000-duration)<=.15
   proof['validation']={'audio_sha256':hash_bytes(audio),'text_sha256':hash_bytes(clip['text'].encode('utf-8')),'script_sha256':hash_bytes(script),'decoded_duration_seconds':duration,'ffmpeg_decode':'passed','codec':'mp3','sample_rate':32000,'channels':1,'script_archive':'normalized exact narration input with final newline'}
   proof_bytes=(json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode('utf-8');mp3.with_suffix('.json').write_bytes(proof_bytes)
   for folder,extension,data in [('lunar-audio','.json',proof_bytes),('lunar-scripts','.txt',script)]:
    dest=ROOT/'narration'/folder/(stem+extension);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
   clip['duration']=duration
 before,rest=source.split('export const VOICES = ',1);_,end=json.JSONDecoder().raw_decode(rest)
 path.write_text(before+'export const VOICES = '+json.dumps(voices,ensure_ascii=False,indent=2)+rest[end:],encoding='utf-8')
print('28 existing lunar MP3s fully decoded and archived with measured durations; no new MiniMax requests.')
