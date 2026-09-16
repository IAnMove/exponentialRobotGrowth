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
for line in '\n'.join(p.read_text(encoding='utf-8') for p in sorted((ROOT / 'site-src').glob('*en.tsv'))).splitlines():
    if not line or line.startswith('#'):
        continue
    source, target = line.split('\t', 1)
    assert source not in translations, 'Duplicate translation: ' + source
    translations[source] = target
pattern = re.compile('|'.join(re.escape(s) for s in sorted(translations, key=len, reverse=True)))
SCENES=[('factory.html','Fábrica','Un robot terminado vuelve a la línea y ayuda a fabricar los siguientes.'),('district.html','Distrito','La fabricación necesita una cadena completa de materiales, componentes y pruebas.'),('city.html','Ciudad','Los robots llegan a los barrios y cubren tareas de la vida cotidiana.'),('region.html','Región','Varias ciudades comparten una red industrial: producir, ampliar y distribuir compiten por los mismos recursos.')]
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
            scene_index=next((i for i,s in enumerate(SCENES) if s[0]==page),None)
            if scene_index is not None:
                navigation='<section class="journey"><nav class="journey-steps" aria-label="Escalas del crecimiento">'+''.join(f'<a href="./{url}"'+(' aria-current="step"' if url==page else '')+f'><b>0{i+1}</b>{name}</a>' for i,(url,name,_) in enumerate(SCENES))+'</nav><div class="lesson-intro"><p>'+SCENES[scene_index][2]+'</p><button type="button" id="lesson-overview">◖)) Explicación general</button><button type="button" id="lesson-tour">Recorrer los sectores →</button></div><p class="journey-scope">Escenarios ilustrativos: cada escala empieza con sus propios supuestos. Sin fechas ni previsiones de empleo.</p></section>'
                content=content.replace('</header>','</header>'+navigation,1)
                if scene_index<3:
                    url,name,_=SCENES[scene_index+1]
                    content=content.replace('</main>',f'<a class="journey-next" href="./{url}"><span>Siguiente escala</span>{name} →</a></main>',1)
                content=content.replace('</head>','<link rel="stylesheet" href="./journey.css"></head>')
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
            home_label = '← All explorations' if language == 'en' else '← Todas las explicaciones'
            content = content.replace('</head>', '<link rel="stylesheet" href="./atlas-navigation.css"></head>')
            content = content.replace('<body>', f'<body><div class="atlas-return"><a href="./index.html">{home_label}</a><a href="./terafab/index.html">Terafab ↗</a></div>', 1)
        (destination / source.name).write_text(content, encoding='utf-8')
    # Robot scenes get a dedicated namespace; retain the old scene URLs too.
    robots = destination / 'robots'
    robots.mkdir(exist_ok=True)
    for source in (ROOT / 'site-src').iterdir():
        if source.suffix not in ['.html', '.js', '.css']:
            continue
        content = (destination / source.name).read_text(encoding='utf-8')
        if source.suffix == '.js':
            content = content.replace("'./vendor/", "'../vendor/") if language == 'en' else content.replace("'../vendor/", "'../../vendor/")
            if source.name == 'narrator.js':
                content = content.replace("'./narration-catalog-en.js'", "'../narration-catalog-en.js'") if language == 'en' else content.replace("'../narration-catalog.js'", "'../../narration-catalog.js'")
        if source.suffix == '.html':
            content = content.replace('href="./atlas-navigation.css"', 'href="../atlas-navigation.css"')
            content = content.replace('href="./index.html"', 'href="../index.html"')
            content = content.replace('href="./terafab/index.html"', 'href="../terafab/index.html"')
            content = content.replace(f'href="./es/{source.name}"', f'href="../es/robots/{source.name}"') if language == 'en' else content.replace(f'href="../{source.name}"', f'href="../../robots/{source.name}"')
        (robots / source.name).write_text(content, encoding='utf-8')
    (robots / 'index.html').write_text((robots / 'factory.html').read_text(encoding='utf-8'), encoding='utf-8')
    # Standalone explanations use their own modules and bilingual content.
    for folder in ['hub', 'terafab']:
        target = destination if folder == 'hub' else destination / folder
        target.mkdir(exist_ok=True)
        for source in (ROOT / 'site-src' / folder).iterdir():
            if source.suffix not in ['.html', '.js', '.css']:
                continue
            content = source.read_text(encoding='utf-8')
            if source.suffix == '.html':
                content = content.replace('{{EN}}', './index.html' if language == 'en' else '../index.html').replace('{{ES}}', './es/index.html' if language == 'en' else './index.html')
                if language == 'en':
                    content = content.replace('lang="es"', 'lang="en"', 1)
                    content = content.replace('Atlas — Explicaciones interactivas', 'Atlas — Interactive explanations').replace('Terafab — Atlas interactivo', 'Terafab — Interactive Atlas')
                    content = content.replace('Explora cómo funcionan los sistemas: robots, fábricas de chips y sus conexiones.', 'Explore how systems work: robots, chip factories and their connections.')
                    content = content.replace('Explora la fábrica integrada de chips de Terafab, sigue sus conexiones y experimenta con los límites de producción.', 'Explore the Terafab integrated chip factory, follow its connections and experiment with production constraints.')
                    content = content.replace('Activa JavaScript para las explicaciones interactivas.', 'Enable JavaScript for the interactive explanations.').replace('Activa JavaScript para explorar el diagrama.', 'Enable JavaScript to explore the diagram.').replace('aria-label="Exploraciones"', 'aria-label="Explorations"')
                title = re.search(r'<title>(.*?)</title>', content).group(1)
                description = re.search(r'name="description" content="([^"]+)"', content).group(1)
                content = content.replace('</head>', f'<meta property="og:type" content="website"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{description}"><meta name="twitter:card" content="summary"></head>')
            (target / source.name).write_text(content, encoding='utf-8')
(ROOT / 'dist/.nojekyll').write_text('', encoding='utf-8')
print('Built Atlas, Robots and Terafab in English / and Spanish /es/; legacy robot URLs preserved.')
