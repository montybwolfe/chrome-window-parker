"""Build a release ZIP from an explicit allowlist; no development files ship."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['permissions'] == ['tabs', 'storage', 'alarms', 'downloads']
assert not manifest.get('host_permissions') and not manifest.get('content_scripts')
assert len(manifest['description']) <= 132
files = [
    'manifest.json', 'background.js', 'clock.js', 'engine.js', 'settings.js',
    'ui.js', 'ui.css', 'parked.html', 'parked.js', 'options.html', 'options.js',
    'popup.html', 'popup.js', 'PRIVACY.md',
    'icons/16.png', 'icons/32.png', 'icons/48.png', 'icons/128.png',
]
references = [manifest['background']['service_worker'], manifest['options_ui']['page'],
              manifest['action']['default_popup'], *manifest['icons'].values(),
              *manifest['action']['default_icon'].values()]
assert all(ref in files for ref in references)
output = root / 'outputs'
output.mkdir(exist_ok=True)
archive = output / f"chrome-window-parker-{manifest['version']}.zip"
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
