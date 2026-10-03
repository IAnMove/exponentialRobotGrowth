"""Verify and archive current LLM recordings; never generates audio or calls a service."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
voice_ids={'es':'ttv-voice-2026091606404326-GjG0y5Nk','en':'English_expressive_narrator'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def verify(path,text,language):
 proof=json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
 assert proof['text']==text and proof['model']=='speech-2.8-hd' and proof['voice']==voice_ids[language]
 assert proof['provider']=='MiniMax'
 return proof
def media(path):
 result=subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-f','null','-'],capture_output=True,text=True,check=True)
 assert not result.stderr.strip()
 result=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(path)],capture_output=True,text=True,check=True).stdout)
 stream=result['streams'][0];assert len(result['streams'])==1 and stream['codec_name']=='mp3' and int(stream['sample_rate'])==32000 and stream['channels']==1
 return float(result['format']['duration'])
seen={};components=set()
for name,canonical in [('llms','llms'),('immersive','immersive-llms')]:
 voices=json.JSONDecoder().raw_decode((ROOT/f'site-src/{name}/voices.js').read_text(encoding='utf-8').split('export const VOICES = ')[1])[0]
 scripts=json.loads((ROOT/f'narration/{canonical}.json').read_text(encoding='utf-8'))
 for language,clips in voices.items():
  for i,clip in enumerate(clips):
   expected=scripts[language][i];assert clip['id']==expected['id'] and clip['text']==expected['text']
   filename=clip['file'];stem=Path(filename).stem
   if filename in seen:assert seen[filename]==clip['text'];continue
   seen[filename]=clip['text'];path=ROOT/'dist/audio'/filename
   assert (ROOT/'narration/scripts'/(filename+'.txt')).read_text(encoding='utf-8').strip()==clip['text']
   duration=media(path);assert abs(duration-clip['duration'])<.15
   if clip.get('segments'):
    proof=json.loads(path.with_suffix('.json').read_text(encoding='utf-8'));assert proof['text']==clip['text'] and proof['cues']==clip['cues']
    parts=[]
    for j,text in enumerate(clip['segments']):
     digest=sha(('speech-2.8-hd'+voice_ids[language]+text).encode())[:12]
     part_file=f'llms-{language}-{clip["id"]}-part{j}-{digest}.mp3';part=ROOT/'narration/.audio-cache'/part_file
     part_proof=verify(part,text,language);part_duration=media(part)
     assert abs(part_duration-(clip['cues'][j]['end']-clip['cues'][j]['start']))<.15
     part_proof['file']=part_file;part_proof['audio_sha256']=sha(part.read_bytes());part_proof['decoded_duration_seconds']=part_duration
     parts.append(part_proof);components.add(part_file)
    proof.update(provider='MiniMax components',model='speech-2.8-hd',voice=voice_ids[language],language='Spanish' if language=='es' else 'English',size_bytes=path.stat().st_size,components=parts)
   else:proof=verify(path,clip['text'],language)
   assert path.stat().st_size==proof['size_bytes']
   script=(clip['text']+'\n').encode()
   proof['validation']={'audio_sha256':sha(path.read_bytes()),'text_sha256':sha(clip['text'].encode()),'script_sha256':sha(script),'decoded_duration_seconds':duration,'ffmpeg_decode':'passed','codec':'mp3','sample_rate':32000,'channels':1,'catalog_duration_seconds':clip['duration']}
   proof_bytes=(json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode()
   for folder,extension,data in [('llms-audio','.json',proof_bytes),('llms-scripts','.txt',script)]:
    dest=ROOT/'narration'/folder/(stem+extension);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
assert len(seen)==34 and len(components)==30
print(f'{len(seen)} existing LLM recordings decoded; {len(components)} MiniMax component proofs archived. Catalog cues preserved; no new voice requests.')
