from pathlib import Path
import shutil
import subprocess
import sys

root=Path(__file__).resolve().parent
vendor=root/'dist'/'vendor'
vendor.mkdir(parents=True,exist_ok=True)
for name in ('three.module.js','three.core.js'):
    shutil.copyfile(root/'node_modules'/'three'/'build'/name,vendor/name)
shutil.copyfile(root/'node_modules'/'three'/'LICENSE',vendor/'THREE-LICENSE.txt')
subprocess.run([sys.executable,str(root/'tools'/'build_site.py')],check=True)
print('Sitio autocontenido preparado en dist/')
