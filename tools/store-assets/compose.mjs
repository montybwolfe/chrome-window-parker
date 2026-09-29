// Stage 2: render the Store artwork from the compositions and the real UI
// captures at 2× in headless Chrome, halve it, and write the final PNGs plus
// store-listing/sources/assets.json (SHA-256 of each output and its inputs).
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {launch, evaluate, attach, sleep} from './cdp.mjs';
import {decode, halve, encode} from './png.mjs';
import {ASSETS, inputsOf, sha} from './verify.mjs';

const path = file => fileURLToPath(new URL(`../../${file}`, import.meta.url));
const {syncTop} = JSON.parse(readFileSync(path('store-listing/sources/ui/capture.json')));
const cdp = await launch();
const records = [];
try {
  const chrome = (await cdp.send('Browser.getVersion')).product;
  for (const asset of ASSETS) {
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'});
    const session = await attach(cdp, targetId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {width: asset.width, height: asset.height, deviceScaleFactor: 2, mobile: false}, session);
    if (asset.alpha) await cdp.send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}}, session);
    // The Sync screenshot starts a little above the Sync section.
    const query = asset.page.includes('sync') ? `?top=${syncTop - 14}` : '';
    await cdp.send('Page.navigate', {url: pathToFileURL(path(`tools/store-assets/compositions/${asset.page}`)).href + query}, session);
    await sleep(500);
    await evaluate(cdp, session, `new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r))
      .then(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))).then(() => document.fonts.ready).then(() => 1)`);
    const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: asset.width, height: asset.height, scale: 1}}, session);
    writeFileSync(path(asset.file), encode(halve(decode(Buffer.from(data, 'base64'))), {alpha: !!asset.alpha}));
    await cdp.send('Target.closeTarget', {targetId});
    records.push({file: asset.file, width: asset.width, height: asset.height, alpha: !!asset.alpha, sha256: sha(asset.file),
      inputs: Object.fromEntries(inputsOf(asset).map(file => [file, sha(file)]))});
    console.log(`compose: ${asset.file}`);
  }
  writeFileSync(path('store-listing/sources/assets.json'), JSON.stringify({renderedWith: chrome, assets: records}, null, 2) + '\n');
} finally { await cdp.close(); }
