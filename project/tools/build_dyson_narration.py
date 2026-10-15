"""Record only Dyson's twelve authorized bilingual clips, never retrying a paid call.

Audio, scripts and recording proofs are content addressed. A portable proof is
written BEFORE each request, so an interrupted/unknown outcome blocks another
request. Completed audio is decoded and reused; no global catalog is changed.
"""
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'speech-2.8-hd'
IDS = ('star', 'panel', 'swarm', 'heat', 'mass', 'shell')
LANGUAGES = {'es': 'Spanish', 'en': 'English'}
EXPECTED_VOICES = {'es': 'ttv-voice-2026091606404326-GjG0y5Nk', 'en': 'English_expressive_narrator'}
AUDIO_DIR = ROOT / 'dist/audio'
PROOF_DIR = ROOT / 'narration/dyson-audio'
SCRIPT_DIR = ROOT / 'narration/dyson-scripts'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if not path.exists() or path.read_bytes() != encoded:
        path.write_bytes(encoded)


def source_jobs():
    voices = json.loads((ROOT / 'narration/voices.json').read_text(encoding='utf-8'))
    if voices != EXPECTED_VOICES:
        raise RuntimeError('The configured voices differ from the authorized existing voices.')
    jobs = []
    for language in LANGUAGES:
        entries = json.loads((ROOT / f'narration/dyson.{language}.json').read_text(encoding='utf-8'))
        if list(entries) != ['dyson-' + key for key in IDS]:
            raise RuntimeError('Dyson requires the six canonical chapters in their original order.')
        for key in IDS:
            entry = entries['dyson-' + key]
            if set(entry) != {'title', 'text'} or not isinstance(entry['title'], str) or not entry['title']:
                raise RuntimeError('Invalid chapter title: ' + key)
            text = entry['text']
            if not isinstance(text, str) or text != text.strip() or not 100 <= len(text) <= 2000:
                raise RuntimeError('Narration must be an exact 100–2000 character fragment: ' + key)
            digest = sha((MODEL + voices[language] + text).encode('utf-8'))[:12]
            basename = f'dyson-{language}-{key}-{digest}'
            jobs.append({'language': language, 'id': key, 'entry': entry, 'voice': voices[language],
                         'digest': digest, 'audio': AUDIO_DIR / (basename + '.mp3'),
                         'raw_proof': AUDIO_DIR / (basename + '.json'),
                         'proof': PROOF_DIR / (basename + '.json'),
                         'script': SCRIPT_DIR / (basename + '.txt')})
    if len(jobs) != 12 or len({job['audio'] for job in jobs}) != 12:
        raise RuntimeError('Expected exactly twelve unique recordings.')
    return jobs


def validate(job):
    audio, raw, proof, script = (job[key] for key in ('audio', 'raw_proof', 'proof', 'script'))
    if not audio.is_file() or not raw.is_file() or not script.is_file():
        raise RuntimeError('Incomplete outcome; investigate without retrying: ' + audio.name)
    metadata = json.loads(raw.read_text(encoding='utf-8'))
    text = job['entry']['text']
    seconds_reported = metadata.get('duration_ms')
    expected = {'provider': 'MiniMax', 'model': MODEL, 'voice': job['voice'],
                'language': LANGUAGES[job['language']], 'text': text}
    if any(metadata.get(key) != value for key, value in expected.items()):
        raise RuntimeError('Recording identity mismatch: ' + audio.name)
    if script.read_bytes() != (text + '\n').encode('utf-8'):
        raise RuntimeError('Recorded script differs from the exact canonical text: ' + script.name)
    if not isinstance(seconds_reported, (int, float)) or not math.isfinite(seconds_reported) or seconds_reported <= 0:
        raise RuntimeError('Missing provider duration: ' + audio.name)
    if audio.stat().st_size <= 1024 or audio.stat().st_size != metadata.get('size_bytes'):
        raise RuntimeError('Recording byte count mismatch: ' + audio.name)
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(audio), '-f', 'null', '-'],
                             capture_output=True, text=True, encoding='utf-8')
    if decoded.returncode or decoded.stderr.strip():
        raise RuntimeError('Full MP3 decode failed: ' + audio.name)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                            'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(audio)],
                           capture_output=True, text=True, encoding='utf-8', check=True)
    info = json.loads(probe.stdout)
    measured = float(info['format']['duration'])
    streams = info['streams']
    if not math.isfinite(measured) or measured <= 0 or len(streams) != 1:
        raise RuntimeError('Invalid measured audio duration: ' + audio.name)
    stream = streams[0]
    if stream['codec_name'] != 'mp3' or stream['channels'] != 1 or int(stream['sample_rate']) != 32000:
        raise RuntimeError('Unexpected audio format: ' + audio.name)
    if abs(measured - seconds_reported / 1000) > .15:
        raise RuntimeError('Measured and reported durations disagree: ' + audio.name)
    validation = {'ffmpeg_decode': 'passed', 'decoded_duration_seconds': measured,
                  'codec': 'mp3', 'sample_rate': 32000, 'channels': 1,
                  'audio_sha256': sha(audio.read_bytes()), 'text_sha256': sha(text.encode('utf-8')),
                  'script_sha256': sha(script.read_bytes())}
    if 'validation' in metadata and metadata['validation'] != validation:
        raise RuntimeError('Existing recording validation changed: ' + audio.name)
    metadata['validation'] = validation
    if proof.exists():
        previous = json.loads(proof.read_text(encoding='utf-8'))
        if previous.get('status') != 'requested' and previous != metadata:
            raise RuntimeError('Portable recording proof changed: ' + proof.name)
    save_json(raw, metadata)
    save_json(proof, metadata)
    return {**job['entry'], 'id': job['id'], 'file': audio.name, 'duration': measured}


def preflight(job, verify_only):
    script = job['script']
    expected = (job['entry']['text'] + '\n').encode('utf-8')
    if script.exists() and script.read_bytes() != expected:
        raise RuntimeError('Script hash collision or canonical text changed: ' + script.name)
    if not script.exists():
        if verify_only:
            raise RuntimeError('Missing canonical recording script: ' + script.name)
        script.parent.mkdir(parents=True, exist_ok=True)
        with script.open('xb') as handle:
            handle.write(expected)
    exists = [job[key].exists() for key in ('audio', 'raw_proof', 'proof')]
    if any(exists):
        if not all(exists[:2]):
            raise RuntimeError('Unknown/incomplete outcome; no retry permitted: ' + job['audio'].name)
        return validate(job)
    if verify_only:
        raise RuntimeError('Missing recording: ' + job['audio'].name)
    return None


def generate(job):
    # A durable marker precedes the paid request. Failed/unknown outcomes retain
    # it, and preflight refuses to request that content again automatically.
    marker = {'status': 'requested', 'provider': 'MiniMax', 'model': MODEL,
              'voice': job['voice'], 'language': LANGUAGES[job['language']],
              'text_sha256': sha(job['entry']['text'].encode('utf-8')),
              'requested_at': datetime.now(timezone.utc).isoformat()}
    job['proof'].parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents a second helper process from issuing the
    # same paid request after both processes happened to pass preflight.
    with job['proof'].open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(json.dumps(marker, ensure_ascii=False, indent=2) + '\n')
    command = [sys.executable, str(ROOT / 'tools/generate_narration.py'), '--text', str(job['script']),
               '--output', str(job['audio']), '--voice', job['voice'], '--model', MODEL,
               '--language', LANGUAGES[job['language']]]
    print(json.dumps({'status': 'generating', 'language': job['language'], 'id': job['id'],
                      'characters': len(job['entry']['text']), 'hash': job['digest']}), flush=True)
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        # generate_narration redacts client credentials. No retry here.
        raise RuntimeError('MiniMax failed; outcome requires investigation, no retry: ' + job['audio'].name
                           + '\n' + (result.stdout + '\n' + result.stderr)[-1000:])
    value = validate(job)
    print(json.dumps({'status': 'verified', 'language': job['language'], 'id': job['id'],
                      'seconds': value['duration'], 'file': value['file']}), flush=True)
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true', help='Validate and reuse all twelve files; never request audio.')
    args = parser.parse_args()
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise RuntimeError('ffmpeg and ffprobe must be available before any paid request.')
    jobs = source_jobs()
    values, pending = {}, []
    for job in jobs:
        cached = preflight(job, args.verify_only)
        if cached is None:
            pending.append(job)
        else:
            values[(job['language'], job['id'])] = cached
            print(json.dumps({'status': 'reused', 'language': job['language'], 'id': job['id'], 'seconds': cached['duration']}), flush=True)
    # Stop submitting new independent requests on the first failure. Any two
    # already in flight finish normally; they are never cancelled or retried.
    with ThreadPoolExecutor(max_workers=2) as pool:
        iterator = iter(pending)
        inflight = {}
        for _ in range(min(2, len(pending))):
            job = next(iterator)
            inflight[pool.submit(generate, job)] = job
        while inflight:
            completed, _ = wait(inflight, return_when=FIRST_COMPLETED)
            for future in completed:
                job = inflight.pop(future)
                values[(job['language'], job['id'])] = future.result()
            for _ in completed:
                job = next(iterator, None)
                if job is not None:
                    inflight[pool.submit(generate, job)] = job
    if len(values) != 12:
        raise RuntimeError('Do not publish a partial narration set.')
    voices = {language: [values[(language, key)] for key in IDS] for language in LANGUAGES}
    code = '// MiniMax speech-2.8-hd; twelve measured, decoded, content-addressed clips.\nexport const VOICES = '
    code += json.dumps(voices, ensure_ascii=False, indent=2) + ';\n'
    code += "const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);\n"
    code += 'for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;\n'
    runtime = ROOT / 'site-src/dyson/voices.js'
    encoded = code.encode('utf-8')
    if not runtime.exists() or runtime.read_bytes() != encoded:
        runtime.write_bytes(encoded)
    print(json.dumps({'status': 'complete', 'generated': len(pending), 'reused': 12 - len(pending), 'recordings': 12,
                      'runtime': 'site-src/dyson/voices.js', 'proofs': 'narration/dyson-audio', 'scripts': 'narration/dyson-scripts'}), flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
