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
for module in ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js', 'environments/RoomEnvironment.js']:
    content=(root/'node_modules/three/examples/jsm'/module).read_text(encoding='utf-8')
    content=content.replace("from 'three'", "from './three.module.js'").replace("'../utils/", "'./")
    (vendor/Path(module).name).write_text(content,encoding='utf-8')
subprocess.run([sys.executable,str(root/'tools'/'build_site.py')],check=True)
print('Sitio autocontenido preparado en dist/')
