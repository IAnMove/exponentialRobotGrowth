"""Record the bilingual Internet voyage. Cache by text/model/voice; never retry billing calls."""
from concurrent.futures import ThreadPoolExecutor
import json
from build_visit_narration import ROOT, one

if __name__ == '__main__':
    scripts = json.loads((ROOT/'narration/internet-voyage.json').read_text(encoding='utf-8'))
    jobs = [(lang, entry) for lang, entries in scripts.items() for entry in entries]
    def record(job):
        lang, entry = job
        return lang, one('internet-voyage', lang, entry)
    result = {'es': [], 'en': []}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for lang, entry in pool.map(record, jobs):
            result[lang].append(entry)
    code = '// MiniMax speech-2.8-hd; durations measured from the recordings.\nexport const VOICES = '+json.dumps(result, ensure_ascii=False, indent=2)+';\n'
    code += "const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\nfor (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n"
    (ROOT/'site-src/journeys/voices-internet-voyage.js').write_text(code, encoding='utf-8')
    print('Internet voyage: 18 decoded bilingual recordings ready.')
