"""Regional-accent auditions, explicitly designed rather than verified native speakers."""
from pathlib import Path
import importlib.util
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'narration' / 'auditions' / 'regional'
TEXT = ('Los primeros robots se construyen con ayuda humana. Después, algunos vuelven a la fábrica '
        'para construir más robots. La producción se acelera, siempre que también aumenten los '
        'materiales, la energía y el transporte.')
CANDIDATES = {
    'D-espana-masculina': 'Voz masculina adulta de un locutor nativo de Madrid, España. Español peninsular castellano natural, con distinción entre s y z o ce, ci, erres españolas y vocales españolas puras. Entonación y ritmo propios de una conversación en España. Explica ciencia con claridad, cercanía y curiosidad, con un tono medio cálido y pausas naturales. Sin acento inglés, británico ni estadounidense. Sin tono publicitario ni voz épica.',
    'E-espana-femenina': 'Voz femenina adulta de una divulgadora científica nativa de Valladolid, España. Español castellano peninsular natural, distinción entre s y z o ce, ci, erres españolas y vocales españolas puras. Entonación y ritmo propios de una conversación en España. Voz cálida, clara y cercana, tono medio, dicción relajada y pausas naturales. Sin acento inglés, británico ni estadounidense. Sin tono publicitario.',
    'F-mexico-masculina': 'Voz masculina adulta de un divulgador científico nativo de Ciudad de México. Español mexicano natural, seseo, erres españolas y vocales españolas puras. Ritmo y entonación mexicanos cotidianos, sin exageración ni caricatura. Voz cálida, cercana, clara, tono medio y pausas naturales para explicar una idea visual. Sin acento inglés, británico ni estadounidense. Sin tono publicitario ni voz épica.',
}


def main():
    spec = importlib.util.spec_from_file_location('studio', r'U:\minimax_scripts\app.py')
    studio = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(studio)
    studio.load_dotenv(Path(r'U:\minimax_scripts\.env'))
    client = studio.MiniMaxClient()
    client.require_key()
    if client.base_url not in ('https://api.minimax.io/v1', 'https://api-uw.minimax.io/v1', 'https://api.minimaxi.com/v1'):
        raise RuntimeError('Unsupported API base')
    OUT.mkdir(parents=True, exist_ok=True)
    text_path = OUT / 'text.txt'
    text_path.write_text(TEXT + '\n', encoding='utf-8')
    try:
        for name, prompt in CANDIDATES.items():
            meta_path = OUT / (name + '.design.json')
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding='utf-8'))
            else:
                print(json.dumps({'status': 'designing', 'candidate': name}), flush=True)
                r = client.post_json('/voice_design', {'prompt': prompt, 'preview_text': TEXT}, timeout=180)
                if r.get('base_resp', {}).get('status_code') != 0:
                    raise RuntimeError(str(r.get('base_resp')))
                meta = {'voice_id': r['voice_id'], 'prompt': prompt, 'text': TEXT,
                        'provenance': 'Synthetic voice design; regional accent requested, not independently verified.',
                        'created_at': datetime.now(timezone.utc).isoformat()}
                meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                preview = bytes.fromhex(r.get('trial_audio', ''))
                if len(preview) < 1024:
                    raise RuntimeError('No usable design preview')
                (OUT / (name + '.preview.mp3')).write_bytes(preview)
            output = OUT / (name + '.mp3')
            if not output.exists():
                subprocess.run([sys.executable, str(ROOT / 'tools/generate_narration.py'),
                                '--text', str(text_path), '--output', str(output),
                                '--voice', meta['voice_id'], '--language', 'Spanish'], check=True)
            print(json.dumps({'status': 'ready', 'candidate': name, 'path': str(output)}), flush=True)
    except Exception as exc:
        print(str(exc).replace(client.api_key, '[REDACTED]')[:700], file=sys.stderr)
        return 1
    finally:
        os.environ.pop('MINIMAX_API_KEY', None)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
