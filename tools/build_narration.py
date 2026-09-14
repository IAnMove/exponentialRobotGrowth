"""Generate each approved-style explanation once, with content-addressed audio."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODEL, VOICE = 'speech-2.8-hd', 'Spanish_Narrator'
catalog = json.loads((ROOT / 'narration/places.json').read_text(encoding='utf-8'))
def generate(item):
    key, entry = item
    digest = hashlib.sha256((MODEL + VOICE + entry['text']).encode()).hexdigest()[:12]
    target = ROOT / 'dist/audio' / f'{key}-{digest}.mp3'
    script = ROOT / 'narration/scripts' / f'{key}-{digest}.txt'
    script.parent.mkdir(parents=True, exist_ok=True)
    script.write_text(entry['text'] + '\n', encoding='utf-8')
    if not target.exists():
        p = subprocess.run([sys.executable, str(ROOT / 'tools/generate_narration.py'), '--text', str(script), '--output', str(target)], capture_output=True, text=True, encoding='utf-8')
        if p.returncode:
            raise RuntimeError(key + ': ' + p.stdout[-500:] + p.stderr[-800:])
    meta = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
    if meta['text'] != entry['text'] or target.stat().st_size < 1024:
        raise RuntimeError('Invalid cached audio: ' + key)
    print(json.dumps({'clip':key,'seconds':round(meta['duration_ms']/1000,1),'characters':meta['billed_characters']}),flush=True)
    return key, {**entry, 'src':'./audio/'+target.name, 'duration':meta['duration_ms']/1000}

if __name__ == '__main__':
    # Two bounded independent requests, without automatic retries.
    with ThreadPoolExecutor(max_workers=2) as pool:
        built = dict(pool.map(generate, catalog.items()))
    (ROOT/'dist/narration-catalog.js').write_text('export const NARRATIONS = '+json.dumps(built,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    print(json.dumps({'complete':len(built),'characters':sum(len(v['text']) for v in built.values()),'minutes':round(sum(v['duration'] for v in built.values())/60,1)}),flush=True)
