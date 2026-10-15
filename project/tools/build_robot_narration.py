"""Patch the corrected robot lessons and the factory conclusion in both languages, without rebuilding other audio.

Uses the existing MiniMax generator and configured voices. Existing audio is
verified and reused; an incomplete or invalid recording is never regenerated.
Publish only after all eight clips decode and match their content-addressed proof.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'speech-2.8-hd'
PATCH_IDS = ('robot-factory-1', 'region-3', 'region-city-2', 'factory-limits')
LANGUAGES = {'es': 'Spanish', 'en': 'English'}
RUNTIME = ROOT / 'narration/runtime'


def read_catalog(path):
    source = path.read_text(encoding='utf-8-sig')
    prefix = 'export const NARRATIONS ='
    if not source.startswith(prefix):
        raise RuntimeError('Unsupported narration catalog format: ' + path.name)
    value, _ = json.JSONDecoder().raw_decode(source[len(prefix):].lstrip())
    if not isinstance(value, dict):
        raise RuntimeError('Narration catalog must be an object')
    return value


def source_entries(lang):
    lessons = json.loads((ROOT / f'narration/lessons.{lang}.json').read_text(encoding='utf-8'))
    region = json.loads((ROOT / f'narration/region.{lang}.json').read_text(encoding='utf-8'))
    return {key: (lessons if key.startswith(('robot-factory-', 'factory-')) else region)[key] for key in PATCH_IDS}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_recording(target, script, entry, voice, language):
    proof_path = target.with_suffix('.json')
    if not target.exists() or not proof_path.exists():
        raise RuntimeError('Incomplete recording; investigate without retrying: ' + target.name)
    metadata = json.loads(proof_path.read_text(encoding='utf-8'))
    checks = {
        'text': metadata.get('text') == entry['text'],
        'voice': metadata.get('voice') == voice,
        'model': metadata.get('model') == MODEL,
        'language': metadata.get('language') == language,
        'provider': metadata.get('provider') == 'MiniMax',
        'script': script.read_text(encoding='utf-8').strip() == entry['text'],
        'size': target.stat().st_size == metadata.get('size_bytes') and target.stat().st_size > 1024,
        'duration': isinstance(metadata.get('duration_ms'), (int, float)) and metadata['duration_ms'] > 0,
    }
    if not all(checks.values()):
        raise RuntimeError('Recording proof mismatch: ' + target.name + ' / ' + ','.join(k for k, ok in checks.items() if not ok))
    decode = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(target), '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8')
    if decode.returncode or decode.stderr.strip():
        raise RuntimeError('Audio decode failed: ' + target.name)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(target)], capture_output=True, text=True, encoding='utf-8', check=True)
    measured = json.loads(probe.stdout)
    seconds = float(measured['format']['duration'])
    streams = measured['streams']
    if seconds <= 0 or len(streams) != 1 or streams[0]['codec_name'] != 'mp3' or streams[0]['channels'] != 1 or int(streams[0]['sample_rate']) != 32000:
        raise RuntimeError('Unexpected audio format: ' + target.name)
    if abs(seconds - metadata['duration_ms'] / 1000) > .15:
        raise RuntimeError('Measured duration disagrees with provider proof: ' + target.name)
    validation = {
        'ffmpeg_decode': 'passed',
        'decoded_duration_seconds': seconds,
        'codec': streams[0]['codec_name'],
        'sample_rate': int(streams[0]['sample_rate']),
        'channels': streams[0]['channels'],
        'audio_sha256': sha(target.read_bytes()),
        'text_sha256': sha(entry['text'].encode('utf-8')),
        'script_sha256': sha(script.read_bytes()),
    }
    if 'validation' in metadata:
        if metadata['validation'] != validation:
            raise RuntimeError('Existing decode validation changed: ' + target.name)
    else:
        metadata['validation'] = validation
        proof_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return metadata


def generate(job):
    lang, key, entry, voice = job
    text = entry['text']
    if not 100 <= len(text) <= 2000:
        raise RuntimeError('Corrected narration must be 100–2000 characters: ' + key)
    digest = sha((MODEL + voice + text).encode('utf-8'))[:12]
    target = ROOT / 'dist/audio' / f'{key}-{digest}.mp3'
    script = ROOT / 'narration/scripts' / f'{key}-{digest}.txt'
    if script.exists():
        if script.read_text(encoding='utf-8').strip() != text:
            raise RuntimeError('Script hash collision: ' + script.name)
    else:
        script.parent.mkdir(parents=True, exist_ok=True)
        with script.open('x', encoding='utf-8', newline='\n') as handle:
            handle.write(text + '\n')
    if not target.exists():
        if target.with_suffix('.json').exists():
            raise RuntimeError('Proof exists without audio; do not retry: ' + target.name)
        command = [sys.executable, str(ROOT / 'tools/generate_narration.py'), '--text', str(script), '--output', str(target), '--voice', voice, '--model', MODEL, '--language', LANGUAGES[lang]]
        print(json.dumps({'status': 'generating', 'language': lang, 'clip': key, 'hash': digest, 'characters': len(text)}), flush=True)
        result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')
        if result.returncode:
            # The existing generator redacts client credentials before reporting an error.
            safe = (result.stdout + '\n' + result.stderr)[-1000:]
            raise RuntimeError('MiniMax generation failed without retry: ' + key + '\n' + safe)
    metadata = validate_recording(target, script, entry, voice, LANGUAGES[lang])
    print(json.dumps({'status': 'verified', 'language': lang, 'clip': key, 'hash': digest, 'provider_seconds': metadata['duration_ms'] / 1000, 'decoded_seconds': metadata['validation']['decoded_duration_seconds'], 'bytes': metadata['size_bytes']}), flush=True)
    return lang, key, {**entry, 'src': './audio/' + target.name, 'duration': metadata['duration_ms'] / 1000}


def main():
    voices = json.loads((ROOT / 'narration/voices.json').read_text(encoding='utf-8'))
    baselines = {}
    jobs = []
    for lang in LANGUAGES:
        filename = 'narration-catalog' + ('-en' if lang == 'en' else '') + '.js'
        baseline = RUNTIME / filename
        if not baseline.exists():
            baseline = ROOT / 'dist' / filename
        baselines[lang] = read_catalog(baseline)
        entries = source_entries(lang)
        for key in PATCH_IDS:
            if key not in baselines[lang] and key != 'factory-limits':
                raise RuntimeError('Corrected clip missing from baseline catalog: ' + key)
            jobs.append((lang, key, entries[key], voices[lang]))
    # At most eight authorized recordings, two concurrent; reuse verified files and never retry paid calls.
    with ThreadPoolExecutor(max_workers=2) as pool:
        corrected = list(pool.map(generate, jobs))
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for lang in LANGUAGES:
        before = baselines[lang]
        catalog = dict(before)
        for recording_lang, key, value in corrected:
            if recording_lang == lang:
                catalog[key] = value
        expected_order = list(before) + [key for key in PATCH_IDS if key not in before]
        if list(catalog) != expected_order or any(catalog[key] != value for key, value in before.items() if key not in PATCH_IDS):
            raise RuntimeError('Unrelated recording or catalog order changed')
        filename = 'narration-catalog' + ('-en' if lang == 'en' else '') + '.js'
        source = 'export const NARRATIONS = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\nfor (const item of Object.values(NARRATIONS)) item.src = new URL(item.src, import.meta.url).href;\n'
        (RUNTIME / filename).write_text(source, encoding='utf-8')
        print(json.dumps({'status': 'catalog_saved', 'language': lang, 'entries': len(catalog), 'corrected': len(PATCH_IDS), 'reused_unchanged': len(catalog)-len(PATCH_IDS), 'path': str(RUNTIME / filename)}), flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())