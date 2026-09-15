"""Generate a reusable MiniMax narration with the user's existing local client.

Credentials stay in the existing .env outside this repository. No auto-retries:
an interrupted response can already have consumed generation credits.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import os
import sys
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--studio', type=Path, default=Path(r'U:\minimax_scripts'))
    parser.add_argument('--text', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--voice', default='Spanish_Narrator')
    parser.add_argument('--model', default='speech-2.8-hd')
    parser.add_argument('--language', choices=['Spanish', 'English'], default='Spanish')
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError('Output already exists; choose a new file to avoid regenerating it.')
    text = args.text.read_text(encoding='utf-8-sig').strip()
    if not text or len(text) > 2000:
        raise RuntimeError('Use a narration fragment of 1–2000 characters.')
    spec = importlib.util.spec_from_file_location('robot_lab_minimax_studio', args.studio / 'app.py')
    studio = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(studio)
    studio.load_dotenv(args.studio / '.env')
    client = studio.MiniMaxClient()
    client.require_key()
    if client.base_url not in ('https://api.minimax.io/v1', 'https://api-uw.minimax.io/v1', 'https://api.minimaxi.com/v1'):
        raise RuntimeError('The configured API base is not a supported official MiniMax endpoint.')
    payload = {
        'model': args.model, 'text': text, 'stream': False,
        'language_boost': args.language, 'output_format': 'hex',
        'voice_setting': {'voice_id': args.voice, 'speed': 1, 'vol': 1, 'pitch': 0},
        'audio_setting': {'sample_rate': 32000, 'bitrate': 128000, 'format': 'mp3', 'channel': 1},
    }
    print(json.dumps({'status': 'generating', 'model': args.model, 'voice': args.voice, 'characters': len(text)}), flush=True)
    try:
        response = client.post_json('/t2a_v2', payload, timeout=180)
        base = response.get('base_resp', {})
        if base.get('status_code') != 0:
            raise RuntimeError(f"MiniMax error {base.get('status_code')}: {base.get('status_msg', 'Unknown error')}")
        audio = bytes.fromhex(response.get('data', {}).get('audio', ''))
        if len(audio) < 1024:
            raise RuntimeError('MiniMax did not return a usable audio file.')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('xb') as f:
            f.write(audio)
        extra = response.get('extra_info', {})
        metadata = {
            'provider': 'MiniMax', 'model': args.model, 'voice': args.voice,
            'language': args.language, 'text': text,
            'duration_ms': extra.get('audio_length'),
            'billed_characters': extra.get('usage_characters'),
            'sample_rate': extra.get('audio_sample_rate'),
            'size_bytes': len(audio), 'generated_at': datetime.now(timezone.utc).isoformat(),
        }
        args.output.with_suffix('.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'status': 'saved', 'path': str(args.output.resolve()), **{k: metadata[k] for k in ('duration_ms', 'billed_characters', 'size_bytes')}}, ensure_ascii=False))
    except Exception as exc:
        safe = str(exc).replace(client.api_key, '[REDACTED]')
        print('Narration generation failed: ' + safe[:700], file=sys.stderr)
        return 1
    finally:
        os.environ.pop('MINIMAX_API_KEY', None)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
