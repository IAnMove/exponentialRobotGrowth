from pathlib import Path
import shutil

root=Path(__file__).resolve().parent
vendor=root/'dist'/'vendor'
vendor.mkdir(parents=True,exist_ok=True)
for name in ('three.module.js','three.core.js'):
    shutil.copyfile(root/'node_modules'/'three'/'build'/name,vendor/name)
shutil.copyfile(root/'node_modules'/'three'/'LICENSE',vendor/'THREE-LICENSE.txt')
shutil.copyfile(root/'network-model.js',root/'dist'/'network-model.js')
shutil.copyfile(root/'industrial-model.js',root/'dist'/'industrial-model.js')
print('Sitio autocontenido preparado en dist/')
