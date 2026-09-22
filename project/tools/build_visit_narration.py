"""Record the museum and models narrations. Reuse a clip when text, model and voice match.

A failed request is not retried: the call may already have been billed.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VOICES = json.loads((ROOT / 'narration' / 'voices.json').read_text(encoding='utf-8'))
AUDIO = ROOT / 'dist' / 'audio'
FFMPEG = shutil.which('ffmpeg') or str(Path.home() / 'ffmpeg' / 'bin' / 'ffmpeg.exe')

JOBS = [
    ('modelos', ROOT / 'narration' / 'modelos.json', ROOT / 'site-src' / 'modelos' / 'voices.js'),
    ('museo', ROOT / 'narration' / 'museo.json', ROOT / 'site-src' / 'museo' / 'voices.js'),
]


def decode_ok(path):
    if not Path(FFMPEG).exists() and shutil.which('ffmpeg') is None:
        raise RuntimeError('ffmpeg is required to confirm that each MP3 decodes.')
    probe = subprocess.run([FFMPEG, '-v', 'error', '-i', str(path), '-f', 'null', '-'], capture_output=True, text=True)
    if probe.returncode != 0:
        raise RuntimeError(probe.stderr.strip() or f'{path.name} did not decode')


def one(notebook, lang, entry):
    text = entry['text'].strip()
    if not text or len(text) > 2000:
        raise RuntimeError(f'{notebook}/{lang}/{entry["id"]} must be 1–2000 characters, got {len(text)}')
    digest = hashlib.sha256(('speech-2.8-hd' + VOICES[lang] + text).encode()).hexdigest()[:12]
    filename = f'{notebook}-{lang}-{entry["id"]}-{digest}.mp3'
    target = AUDIO / filename
    script = ROOT / 'narration' / 'scripts' / f'{filename}.txt'
    script.parent.mkdir(parents=True, exist_ok=True)
    script.write_text(text, encoding='utf-8')
    if target.exists():
        meta_path = target.with_suffix('.json')
        if not meta_path.exists():
            raise RuntimeError(f'{filename} exists without a transcript. Leave it; do not regenerate.')
        meta = json.loads(meta_path.read_text(encoding='utf-8'))
        if meta.get('text') != text or meta.get('model') != 'speech-2.8-hd' or meta.get('voice') != VOICES[lang]:
            raise RuntimeError(f'{filename} does not match the current text, model or voice. Choose a new file instead of overwriting.')
        print(json.dumps({'status': 'reused', 'file': filename}), flush=True)
    else:
        language = 'Spanish' if lang == 'es' else 'English'
        result = subprocess.run([
            sys.executable, str(ROOT / 'tools' / 'generate_narration.py'),
            '--text', str(script), '--output', str(target),
            '--voice', VOICES[lang], '--model', 'speech-2.8-hd', '--language', language,
        ])
        if result.returncode != 0:
            raise RuntimeError(f'Generation failed for {filename}. Not retrying.')
        meta = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        if meta.get('text') != text:
            raise RuntimeError(f'Transcript mismatch for {filename}')
    decode_ok(target)
    duration = meta['duration_ms'] / 1000
    if not duration or duration <= 0:
        raise RuntimeError(f'{filename} has no measured duration')
    return dict(entry, file=filename, duration=duration)


def catalog(notebook, scripts, destination):
    result = {'es': [], 'en': []}
    for lang, entries in scripts.items():
        for entry in entries:
            result[lang].append(one(notebook, lang, entry))
    code = '// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.\n'
    code += 'export const VOICES = ' + json.dumps(result, ensure_ascii=False, indent=2) + ';\n'
    code += "const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\n"
    code += 'for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n'
    destination.write_text(code, encoding='utf-8')
    print(f'{notebook}: {sum(len(v) for v in result.values())} clips, durations measured per language.')


if __name__ == '__main__':
    if not Path(FFMPEG).exists():
        raise SystemExit('ffmpeg is required before any request, so a saved clip can be decoded.')
    for notebook, source, destination in JOBS:
        catalog(notebook, json.loads(source.read_text(encoding='utf-8')), destination)
