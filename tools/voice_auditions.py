from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,sys,json
root=Path(__file__).resolve().parents[1]
voices=['Spanish_ReliableMan','Spanish_SereneWoman','Spanish_Steadymentor']
def make(voice):
    output=root/'narration/auditions'/f'{voice}.mp3'
    if not output.exists():
        p=subprocess.run([sys.executable,str(root/'tools/generate_narration.py'),'--text',str(root/'narration/voice-audition.txt'),'--output',str(output),'--voice',voice,'--language','Spanish'],capture_output=True,text=True,encoding='utf-8')
        if p.returncode: raise RuntimeError(p.stderr[-500:])
    return {'voice':voice,'path':str(output),'seconds':json.loads(output.with_suffix('.json').read_text(encoding='utf-8'))['duration_ms']/1000}
with ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(make,voices):print(json.dumps(result),flush=True)
