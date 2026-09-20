"""Export runtime and editable source to a GitHub Pages checkout based on main.

This does not push, merge or publish. Sites and local generation metadata stay local.
"""
from pathlib import Path
import argparse
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
output = args.output.resolve()
assert output != root and not output.is_relative_to(root), 'Use a separate checkout.'
git_root = Path(subprocess.check_output(['git', '-C', str(output), 'rev-parse', '--show-toplevel'], text=True).strip()).resolve()
assert output == git_root, 'Output must be a Git checkout root.'
subprocess.run(['python', str(root/'tools/package_pages.py'), '--output', str(output)], check=True)
project = output/'project'
project.mkdir(exist_ok=True)
shutil.copytree(root/'site-src', project/'site-src', dirs_exist_ok=True)
for pattern in ['check-*.py', 'check-*.js', 'check-*.mjs']:
    for file in root.glob(pattern):
        shutil.copyfile(file, project/file.name)
for name in ['industrial-model.js', 'network-model.js', 'package.json', 'package-lock.json', 'serve.py']:
    shutil.copyfile(root/name, project/name)
(project/'tools').mkdir(exist_ok=True)
for name in ['build_site.py', 'package_pages.py']:
    shutil.copyfile(root/'tools'/name, project/'tools'/name)
# A fresh checkout seeds shared audio and catalogs from the published root.
# Build output is ignored; only the root runtime files are committed.
build = (root/'build-site.py').read_text(encoding='utf-8')
build = build.replace("vendor=root/'dist'/'vendor'", """(root/'dist').mkdir(exist_ok=True)
shutil.copytree(root.parent/'audio',root/'dist/audio',dirs_exist_ok=True)
for catalog in ['narration-catalog.js','narration-catalog-en.js']:
    shutil.copyfile(root.parent/catalog,root/'dist'/catalog)
vendor=root/'dist'/'vendor'""")
(project/'build-site.py').write_text(build, encoding='utf-8')
(output/'.gitignore').write_text('node_modules/\n__pycache__/\nproject/dist/\n.env\n.env.*\n', encoding='utf-8')
(output/'README.md').write_text('''# Atlas — interactive explanations

Seven bilingual notebooks: Robots, Terafab, Dyson, Home, Starlink, SpaceX and Kardashev.
English starts at `/`; Spanish at `/es/`. All links work beneath the GitHub Pages repository path.

Kardashev adds a playable 3D planet → star → galaxy journey, live power and multiplier counters,
linear/logarithmic charts and a conditional compound-growth calculator. It distinguishes the
original 1964 categories from the continuous Sagan convention. Rates and scenarios are teaching
assumptions, not forecasts. Sources and limitations are linked inside each notebook.

## One repository for development and publication

- `project/site-src/`: editable bilingual source, models and Three.js scenes.
- `project/check-*`: validation scripts.
- `project/tools/build_site.py`: bilingual route builder.
- Root HTML/JS/CSS, topic folders, `audio/` and `vendor/`: generated deployable website.
- `project/dist/`: ignored build output.

From `project/`:

```sh
npm ci
python build-site.py
python check-site.py
node check-kardashev.mjs
node check-explanations.mjs
node check-full-automation.mjs
node check-narrator.mjs
python tools/package_pages.py --output ..
```

Commit the edited source and regenerated root assets together. Work on a branch and open a PR
against `main`; do not edit generated files directly. GitHub Pages currently publishes the root
of `main`, so pushing a feature branch or opening a PR does not update the public website.

For a local preview run `python serve.py` from `project/`, or serve the repository root with
`python -m http.server 8000`. Audio is already recorded; no credentials or external API are needed.
Three.js is bundled locally; see `vendor/THREE-LICENSE.txt`.

This snapshot consolidates the source project's previous Atlas changes and the `added more places`
work with the new Kardashev notebook. The robot learning improvements proposed in PR #1 are also
included. The older source checkout and this publishing repository originally had separate histories;
this branch is based on GitHub `main` so the PR is normally reviewable and mergeable.
''', encoding='utf-8')
print('Exported editable project and runtime to', output)
