from html.parser import HTMLParser
from pathlib import Path
import subprocess
import re

root = Path(__file__).resolve().parent
public = root / 'dist'
class References(HTMLParser):
    def __init__(self, directory):
        super().__init__()
        self.ids = set()
        self.directory = directory
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'id':
                self.ids.add(value)
            if key in ('href', 'src') and value and value.startswith(('./', '../')):
                target = (self.directory / value).resolve()
                assert target.is_relative_to(public.resolve()), f'Link leaves public directory: {self.directory}: {value}'
                assert target.is_file(), f'Recurso ausente: {target}'

for directory, language in [(public, 'en'), (public / 'es', 'es'), (public / 'robots', 'en'), (public / 'es/robots', 'es')]:
    scenes = [('factory.html', 'factory.js'), ('district.html', 'game.js'), ('region.html', 'region.js'), ('city.html', 'city.js')]
    if directory.name == 'robots':
        scenes.append(('index.html', 'factory.js'))
    for page, module in scenes:
        references = References(directory)
        html = (directory / page).read_text(encoding='utf-8')
        references.feed(html)
        journey = re.search(r'<nav class="journey-steps".*?</nav>', html).group()
        assert re.findall(r'href="./([^"]+)"', journey) == ['factory.html', 'district.html', 'city.html', 'region.html']
        assert f'<html lang="{language}">' in html
        assert f'hreflang="{language}" aria-current="true"' in html
        controls = set(re.findall(r"\$\('([^']+)'\)", (directory / module).read_text(encoding='utf-8')))
        assert controls <= references.ids, f'Controles ausentes en {page}: {controls - references.ids}'
for file in public.rglob('*.html'):
    references = References(file.parent)
    references.feed(file.read_text(encoding='utf-8'))
for directory, language in [(public, 'en'), (public / 'es', 'es')]:
    for route in ['index.html', 'terafab/index.html', 'growth/index.html', 'home/index.html', 'dyson/index.html', 'starlink/index.html', 'spacex/index.html', 'kardashev/index.html']:
        content = (directory / route).read_text(encoding='utf-8')
        assert f'<html lang="{language}">' in content
        assert '{{' not in content
    for topic in ['robots', 'terafab', 'home', 'dyson', 'starlink', 'spacex', 'kardashev']:
        assert (directory / topic / 'index.html').is_file()
for file in public.rglob('*.js'):
    result = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stderr
    for link in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", file.read_text(encoding='utf-8')):
        if link.startswith('.'):
            assert (file.parent / link).is_file(), f'Missing import: {file}: {link}'
for name in ['industrial-model.js', 'network-model.js']:
    assert (public / 'es' / name).read_text(encoding='utf-8') == (root / name).read_text(encoding='utf-8')
print('Atlas + Robots + Terafab, legacy scenes, bilingual controls, local links, imports and syntax: OK')
