"""Compile the Spanish source into English (default) and Spanish static routes.

Translations use one-pass exact phrase substitution: replacement text is never
translated again. Simulation identifiers and numerical rules remain unchanged.
Audio and Three.js are shared by both languages, including on a Pages subpath.
"""
from pathlib import Path
import re
import html

ROOT = Path(__file__).resolve().parents[1]
translations = {}
for line in (ROOT / 'site-src/en.tsv').read_text(encoding='utf-8').splitlines():
    if not line or line.startswith('#'):
        continue
    source, target = line.split('\t', 1)
    assert source not in translations, 'Duplicate translation: ' + source
    translations[source] = target
pattern = re.compile('|'.join(re.escape(s) for s in sorted(translations, key=len, reverse=True)))
for language in ['en', 'es']:
    destination = ROOT / 'dist' / ('' if language == 'en' else 'es')
    destination.mkdir(exist_ok=True)
    for source in (ROOT / 'site-src').iterdir():
        if source.suffix not in ['.html', '.js', '.css']:
            continue
        canonical = root_model if (root_model := ROOT / source.name).name in ['industrial-model.js', 'network-model.js'] else source
        content = canonical.read_text(encoding='utf-8')
        if source.suffix == '.html':
            page = source.name
            en_link = './' + page if language == 'en' else '../' + page
            es_link = './es/' + page if language == 'en' else './' + page
            switch = '<nav class="language-switch" aria-label="Language / Idioma">' + ''.join(
                f'<a href="{href}" lang="{code}" hreflang="{code}"' + (' aria-current="true"' if language == code else '') + f'>{label}</a>'
                for code, href, label in [('en', en_link, 'EN'), ('es', es_link, 'ES')]) + '</nav>'
            content = content.replace('</header>', switch + '</header>', 1)
            content = content.replace('</head>', '<link rel="stylesheet" href="./language.css"></head>')
        if language == 'en':
            content = pattern.sub(lambda match: translations[match.group()].replace("'", "\\'") if source.suffix == '.js' else translations[match.group()], content)
            content = content.replace('lang="es"', 'lang="en"', 1) if source.suffix == '.html' else content
            if source.name == 'narrator.js':
                content = content.replace("'./narration-catalog.js'", "'./narration-catalog-en.js'")
        else:
            content = content.replace("'./vendor/", "'../vendor/")
            if source.name == 'narrator.js':
                content = content.replace("'./narration-catalog.js'", "'../narration-catalog.js'")
        if source.suffix == '.html':
            title = re.search(r'<title>(.*?)</title>', content).group(1)
            description = re.search(r'name="description" content="([^"]+)"', content).group(1)
            tags = f'<meta property="og:type" content="website"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{description}"><meta name="twitter:card" content="summary"><meta property="og:locale" content="{"en_US" if language == "en" else "es_ES"}">'
            content = content.replace('</head>', tags + '</head>')
        (destination / source.name).write_text(content, encoding='utf-8')
(ROOT / 'dist/.nojekyll').write_text('', encoding='utf-8')
print('Built English / and Spanish /es/ with shared audio and vendor assets.')
