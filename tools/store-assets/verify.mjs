// Checks the Store artwork: exact sizes, no alpha except the icon, outputs that
// match their records, sources that haven't changed since rendering, and (for
// releases) UI captures that still match the current extension UI.
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {info} from './png.mjs';

const path = file => fileURLToPath(new URL(`../../${file}`, import.meta.url));
export const sha = file => createHash('sha256').update(readFileSync(path(file))).digest('hex');
// Files that change how the captured extension pages look.
export const UI = ['options.html', 'options.js', 'popup.html', 'popup.js', 'parked.html', 'parked.js', 'ui.css', 'ui.js',
  'theme.js', 'settings.js', 'icons/parker-timer-128.png'];
const shot = (n, name, uses) => ({file: `store-listing/screenshot-${n}-${name}-1280x800.png`, page: `shot-${n}-${name}.html`, width: 1280, height: 800, uses});
export const ASSETS = [
  shot(1, 'parked', ['parked-light']), shot(2, 'popup', ['popup-light']), shot(3, 'settings', ['settings-light']),
  shot(4, 'sync', ['settings-light']), shot(5, 'dark', ['parked-dark', 'popup-dark']),
  {file: 'store-listing/small-promo-440x280.png', page: 'promo-small.html', width: 440, height: 280, uses: []},
  {file: 'store-listing/marquee-promo-1400x560.png', page: 'promo-marquee.html', width: 1400, height: 560, uses: ['parked-light']},
  {file: 'store-listing/store-icon-128.png', page: 'icon.html', width: 128, height: 128, alpha: true, uses: []},
  {file: 'docs/assets/buy-me-a-coffee-cover-1600x400.png', page: 'cover.html', width: 1600, height: 400, uses: []}];
export const inputsOf = asset => [`tools/store-assets/compositions/${asset.page}`, 'tools/store-assets/compositions/style.css',
  'icons/parker-timer.svg', 'tools/store-assets/compose.mjs', 'tools/store-assets/png.mjs',
  ...asset.uses.map(name => `store-listing/sources/ui/${name}.png`), ...(asset.page.includes('sync') ? ['store-listing/sources/ui/capture.json'] : [])];

export function verifyAssets({ui = true} = {}) {
  const problems = [], record = JSON.parse(readFileSync(path('store-listing/sources/assets.json')));
  const byFile = new Map(record.assets.map(a => [a.file, a]));
  for (const asset of ASSETS) {
    const r = byFile.get(asset.file);
    if (!r || !existsSync(path(asset.file))) { problems.push(`${asset.file}: missing output or record`); continue; }
    const png = info(readFileSync(path(asset.file)));
    if (png.width !== asset.width || png.height !== asset.height) problems.push(`${asset.file}: ${png.width}×${png.height}`);
    if (png.alpha !== !!asset.alpha) problems.push(`${asset.file}: ${png.alpha ? 'has' : 'lacks'} an alpha channel`);
    if (sha(asset.file) !== r.sha256) problems.push(`${asset.file}: differs from its record; re-run compose.mjs`);
    for (const input of inputsOf(asset)) if (!existsSync(path(input)) || sha(input) !== r.inputs[input])
      problems.push(`${asset.file}: ${input} changed since rendering; re-run compose.mjs`);
  }
  const fields = JSON.parse(readFileSync(path('store-listing/fields.json')));
  for (const file of [...fields.screenshots, fields.small_promo_tile, fields.marquee_promo_tile, fields.store_icon])
    if (!byFile.has(`store-listing/${file}`)) problems.push(`fields.json lists ${file}, which has no record`);
  if (ui) {
    const captured = JSON.parse(readFileSync(path('store-listing/sources/ui/capture.json'))).ui;
    for (const file of UI) if (sha(file) !== captured[file]) problems.push(`${file} changed since the UI was captured; re-run capture.mjs and compose.mjs`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = verifyAssets();
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `${problems.length} problem(s)` : `All ${ASSETS.length} images verified against their sources and the current UI.`);
  process.exitCode = problems.length ? 1 : 0;
}
