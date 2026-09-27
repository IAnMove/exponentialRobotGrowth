"""Record the lunar seed lessons with the project's established MiniMax voices."""
from concurrent.futures import ThreadPoolExecutor
import json
from build_visit_narration import ROOT, one
if __name__=='__main__':
    scripts=json.loads((ROOT/'narration/lunar.json').read_text(encoding='utf-8'))
    result={'es':[],'en':[]}
    def record(job):
        lang,entry=job
        return lang,one('lunar',lang,entry)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for lang,entry in pool.map(record,[(l,e) for l,entries in scripts.items() for e in entries]):
            result[lang].append(entry)
    code='// MiniMax speech-2.8-hd; measured audio durations.\nexport const VOICES = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n'
    code+="const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\nfor (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n"
    (ROOT/'site-src/lunar/voices.js').write_text(code,encoding='utf-8')
    print(f'Lunar: {sum(map(len,result.values()))} bilingual clips decoded and ready.')
