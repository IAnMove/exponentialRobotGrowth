"""Prepare a fresh static directory without unused, superseded MP3 recordings.

The full build and its audio archive stay untouched. An optional JSON array of
MP3 basenames retains recordings referenced by a previously deployed version.
"""
import argparse
import json
import re
import shutil
from pathlib import Path

TEXT_SUFFIXES = {'.html', '.js', '.mjs', '.json', '.css', '.svg', '.txt', '.webmanifest'}
AUDIO_NAME = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]*\.mp3')


def plan(source, keep_audio=()):
    files = sorted(path for path in source.rglob('*') if path.is_file())
    if any(path.is_symlink() for path in source.rglob('*')):
        raise ValueError('Static input must not contain symbolic links.')
    available = {path.name for path in files if path.suffix.lower() == '.mp3'}
    required = set(keep_audio)
    for path in files:
        relative = path.relative_to(source)
        # Audio-side JSON files are generation receipts, not runtime references.
        if path.suffix.lower() not in TEXT_SUFFIXES or (relative.parts[0] == 'audio' and path.suffix.lower() == '.json'):
            continue
        content = path.read_text(encoding='utf-8')
        for line in content.splitlines():
            names = AUDIO_NAME.findall(line)
            if '.mp3' in AUDIO_NAME.sub('', line):
                raise ValueError(f'Cannot resolve a constructed audio filename in {relative}.')
            required.update(names)
    missing = required - available
    if missing:
        raise ValueError('Referenced audio is missing: ' + ', '.join(sorted(missing)))
    omitted = [path for path in files if path.suffix.lower() == '.mp3' and path.name not in required]
    omitted_set = set(omitted)
    return [path for path in files if path not in omitted_set], omitted


def prepare(source, output, keep_audio=()):
    source, output = source.resolve(), output.resolve()
    if not source.is_dir() or not (source / 'index.html').is_file():
        raise ValueError('Static input must be a built site containing index.html.')
    if source == output or source.is_relative_to(output) or output.is_relative_to(source):
        raise ValueError('Output must be separate from the input directory.')
    if output.exists():
        raise ValueError('Output already exists; use a fresh directory. No files were removed.')
    files, omitted = plan(source, keep_audio)
    output.mkdir(parents=True)
    for path in files:
        target = output / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    return {
        'output': str(output),
        'files': len(files),
        'bytes': sum(path.stat().st_size for path in files),
        'omitted_audio_files': len(omitted),
        'omitted_audio_bytes': sum(path.stat().st_size for path in omitted),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('dist'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--keep-audio', type=Path, help='JSON array of previously published MP3 basenames')
    args = parser.parse_args()
    keep = json.loads(args.keep_audio.read_text(encoding='utf-8')) if args.keep_audio else []
    if not isinstance(keep, list) or any(not isinstance(name, str) or AUDIO_NAME.fullmatch(name) is None for name in keep):
        parser.error('--keep-audio must contain a JSON array of MP3 basenames.')
    try:
        result = prepare(args.source, args.output, keep)
    except (ValueError, OSError) as error:
        parser.exit(1, f'{error}\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
