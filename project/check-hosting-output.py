"""Keep current/previous narration while preserving the full source archive."""
import tempfile
from pathlib import Path
from tools.prepare_hosting_output import prepare


def rejected(source, output, expected):
    try:
        prepare(source, output)
    except ValueError as error:
        assert expected in str(error), str(error)
    else:
        raise AssertionError('Unsafe or unresolved output was accepted.')
    assert not output.exists()


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    source = root / 'dist'
    (source / 'audio').mkdir(parents=True)
    (source / 'index.html').write_text('<script src="app.js"></script>', encoding='utf-8')
    (source / 'app.js').write_text('const narration="/audio/current.mp3";', encoding='utf-8')
    for name in ['current', 'previous', 'unused']:
        (source / 'audio' / f'{name}.mp3').write_bytes(name.encode())
    (source / 'audio/unused.json').write_text('{"file":"unused.mp3"}', encoding='utf-8')
    before = {p.relative_to(source): p.read_bytes() for p in source.rglob('*') if p.is_file()}
    output = root / 'publish'
    result = prepare(source, output, ['previous.mp3'])
    assert result['omitted_audio_files'] == 1
    assert result['omitted_audio_bytes'] == len(b'unused')
    assert not (output / 'audio/unused.mp3').exists()
    for relative, data in before.items():
        assert (source / relative).read_bytes() == data
        if str(relative).replace('\\', '/') != 'audio/unused.mp3':
            assert (output / relative).read_bytes() == data
    try:
        prepare(source, output)
    except ValueError as error:
        assert 'already exists' in str(error)
    else:
        raise AssertionError('Existing output was overwritten.')
    (source / 'app.js').write_text('const narration=name+".mp3";', encoding='utf-8')
    rejected(source, root / 'constructed', 'constructed audio')
    (source / 'app.js').write_text('const narration="missing.mp3";', encoding='utf-8')
    rejected(source, root / 'missing', 'audio is missing')
    rejected(source, source / 'nested', 'separate')
print('Hosting output: live/previous audio retained, unused archive preserved, unresolved references and overwrites rejected.')
