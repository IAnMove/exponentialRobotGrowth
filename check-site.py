from html.parser import HTMLParser
from pathlib import Path
import subprocess
import re

root = Path(__file__).resolve().parent
public = root / 'dist'
class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'id':
                self.ids.add(value)
            if key in ('href', 'src') and value and value.startswith('./'):
                target = public / value[2:]
                assert target.is_file(), f'Recurso ausente: {target}'

for page, module in [('index.html', 'game.js'), ('factory.html', 'factory.js')]:
    references = References()
    references.feed((public / page).read_text(encoding='utf-8'))
    controls = set(re.findall(r"\$\('([^']+)'\)", (public / module).read_text(encoding='utf-8')))
    assert controls <= references.ids, f'Controles ausentes en {page}: {controls - references.ids}'
for name in ('game.js', 'world.js', 'characters.js', 'activity.js', 'factory.js', 'factory-world.js', 'factory-model.js', 'narrator.js', 'narration-catalog.js', 'industrial-model.js', 'network-model.js', 'vendor/three.module.js', 'vendor/three.core.js'):
    subprocess.run(['node', '--check', str(public / name)], check=True, capture_output=True)
assert (public / 'network-model.js').read_bytes() == (root / 'network-model.js').read_bytes()
assert (public / 'industrial-model.js').read_bytes() == (root / 'industrial-model.js').read_bytes()
print('Referencias locales, JavaScript y modelo servido: OK')
