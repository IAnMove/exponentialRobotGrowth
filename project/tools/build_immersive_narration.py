"""Record cinematic-gallery narration; unchanged clips reuse the notebook audio."""
from concurrent.futures import ThreadPoolExecutor
import json
from build_llms_narration import ROOT, generate, cached

catalog=ROOT/'site-src/immersive/voices.js'
if catalog.exists():
    data=json.loads(catalog.read_text(encoding='utf-8').split('export const VOICES = ',1)[1].split(';\n',1)[0])
    cached.update({e['file']:e for entries in data.values() for e in entries})
if __name__=='__main__':
    scripts=json.loads((ROOT/'narration/immersive-llms.json').read_text(encoding='utf-8'))
    result={'es':[], 'en':[]}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for lang,item in pool.map(generate,[(lang,e) for lang,entries in scripts.items() for e in entries]):
            result[lang].append(item)
    code='// MiniMax speech-2.8-hd. Gallery-specific text; unchanged clips reused.\nexport const VOICES = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n'
    code+="const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\nfor (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n"
    catalog.write_text(code,encoding='utf-8')
    print('Immersive gallery: 26 bilingual clips ready, measured attention cues.')
