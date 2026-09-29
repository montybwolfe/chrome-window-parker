"""Build a release ZIP from an explicit allowlist; no development files ship."""
from pathlib import Path
import hashlib
import json
import re
from html.parser import HTMLParser
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert re.fullmatch(r'(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*)){0,3}', manifest['version'])
assert all(int(part) <= 65535 for part in manifest['version'].split('.'))
assert any(int(part) for part in manifest['version'].split('.'))
assert manifest['permissions'] == ['tabs', 'storage', 'alarms', 'downloads']
assert not manifest.get('host_permissions') and not manifest.get('content_scripts')
assert len(manifest['description']) <= 132
files = [
    'LICENSE',
    'manifest.json', 'background.js', 'clock.js', 'engine.js', 'settings.js',
    'ui.js', 'theme.js', 'ui.css', 'parked.html', 'parked.js', 'options.html', 'options.js',
    'popup.html', 'popup.js',
    'icons/parker-timer-16.png', 'icons/parker-timer-32.png', 'icons/parker-timer-48.png', 'icons/parker-timer-128.png',
]
references = [manifest['background']['service_worker'], manifest['options_ui']['page'],
              manifest['action']['default_popup'], *manifest['icons'].values(),
              *manifest['action']['default_icon'].values()]
assert all(ref in files for ref in references)
class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href'):
                assert value in files, f'Unexpected HTML resource: {value}'

for name in files:
    source = (root / name).read_bytes()
    if name.endswith('.html'):
        References().feed(source.decode())
    if name.endswith('.js'):
        for dependency in re.findall(r"from\s+['\"]([^'\"]+)['\"]", source.decode()):
            assert dependency.startswith('./') and dependency[2:] in files, dependency
    if name.endswith('.png'):
        size = int(name.rsplit('-', 1)[1][:-4])
        assert source[:8] == b'\x89PNG\r\n\x1a\n'
        assert int.from_bytes(source[16:20], 'big') == size
        assert int.from_bytes(source[20:24], 'big') == size
assert (root / 'LICENSE').read_text().startswith('MIT License')
assert manifest['version'] == json.loads((root / 'package.json').read_text())['version']
output = root / 'dist'
output.mkdir(exist_ok=True)
archive = output / f"chrome-window-parker-v{manifest['version']}.zip"
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in sorted(files):
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        bundle.writestr(info, (root / name).read_bytes())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
(output / 'RELEASE-SHA256.txt').write_text(
    hashlib.sha256(archive.read_bytes()).hexdigest() + '  ' + archive.name + '\n')
print(f'{archive.name}: {len(files)} files, {archive.stat().st_size:,} bytes')
