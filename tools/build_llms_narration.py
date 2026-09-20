"""Generate only the thirteen bilingual LLM clips, reusing completed audio."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
voices = json.loads((ROOT/'narration/voices.json').read_text(encoding='utf-8'))
scripts = json.loads((ROOT/'narration/llms.json').read_text(encoding='utf-8'))
catalog_file=ROOT/'site-src/llms/voices.js'
cached={}
if catalog_file.exists():
    data=json.loads(catalog_file.read_text(encoding='utf-8').split('export const VOICES = ',1)[1].split(';\n',1)[0])
    cached={c['file']:c for entries in data.values() for c in entries}

def generate(job):
    lang, entry = job
    digest = hashlib.sha256(('speech-2.8-hd'+voices[lang]+entry['text']).encode()).hexdigest()[:12]
    filename = f'llms-{lang}-{entry["id"]}-{digest}.mp3'
    target = ROOT/'dist/audio'/filename
    script = ROOT/'narration/scripts'/f'{filename}.txt'
    script.parent.mkdir(parents=True, exist_ok=True)
    script.write_text(entry['text'], encoding='utf-8')
    if not target.exists():
        subprocess.run([sys.executable,str(ROOT/'tools/generate_narration.py'),'--text',str(script),'--output',str(target),'--voice',voices[lang],'--language','Spanish' if lang=='es' else 'English'], check=True)
    if target.with_suffix('.json').exists():
        meta = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
    else:
        # Public checkouts intentionally omit provider metadata; reuse the public catalog.
        previous=cached[filename]
        meta={'text':previous['text'],'duration_ms':previous['duration']*1000}
    assert meta['text']==entry['text'] and target.stat().st_size>1024
    return lang, dict(entry, file=filename, duration=meta['duration_ms']/1000)

if __name__=='__main__':
    result={'es':[], 'en':[]}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for lang, item in pool.map(generate,[(lang,e) for lang,entries in scripts.items() for e in entries]):
            result[lang].append(item)
    code='// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.\nexport const VOICES = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n'
    code+="const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\nfor (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n"
    (ROOT/'site-src/llms/voices.js').write_text(code,encoding='utf-8')
    print('LLMs: 26 recorded bilingual clips ready.')
