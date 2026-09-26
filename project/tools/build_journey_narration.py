"""Build bilingual journey scripts from the lesson data, then record/cache MiniMax clips."""
from pathlib import Path
import json
import subprocess
import sys
from build_visit_narration import catalog
ROOT = Path(__file__).resolve().parents[1]
code = "import {LESSONS} from './site-src/journeys/catalog.js'; console.log(JSON.stringify(Object.fromEntries(Object.entries(LESSONS).map(([id,l])=>[id,Object.fromEntries(['es','en'].map((lang,i)=>[lang,l.steps.map((s,j)=>({id:'step-'+j,title:s.title[i],text:s.text[i]}))]))]))));"
lessons = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=ROOT, encoding='utf-8'))
selected = sys.argv[1:] or list(lessons)
for name in selected:
    scripts = lessons[name]
    (ROOT / 'narration' / f'journey-{name}.json').write_text(json.dumps(scripts, ensure_ascii=False, indent=2), encoding='utf-8')
    catalog('journey-' + name, scripts, ROOT / 'site-src' / 'journeys' / f'voices-{name}.js')
available = [name for name in lessons if (ROOT / 'site-src' / 'journeys' / f'voices-{name}.js').exists()]
imports = '\n'.join(f"import {{VOICES as {name}}} from './voices-{name}.js';" for name in available)
(ROOT / 'site-src' / 'journeys' / 'voices.js').write_text(imports + '\nexport const VOICES={' + ','.join(available) + '};\n', encoding='utf-8')
