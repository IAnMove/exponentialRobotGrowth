"""Copy only public runtime assets to the dedicated GitHub Pages checkout."""
from pathlib import Path
import argparse
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = args.output.resolve()
assert output != root and not output.is_relative_to(root), 'Use a separate checkout.'
output.mkdir(parents=True, exist_ok=True)
count = 0
for file in (root / 'dist').rglob('*'):
    if not file.is_file():
        continue
    relative = file.relative_to(root / 'dist')
    if file.suffix not in ['.html', '.js', '.css', '.mp3', '.jpg', '.png', '.webp', '.glb'] and relative.as_posix() not in ['.nojekyll', 'vendor/THREE-LICENSE.txt']:
        continue
    target = output / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(file, target)
    count += 1
print(f'Packaged {count} public runtime assets to {output}')
