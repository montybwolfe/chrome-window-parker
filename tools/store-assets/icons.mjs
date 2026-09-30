// Renders runtime icons from icons/parker-timer.svg in headless Chrome, at their
// real size (no enlarging or shrinking of another PNG). Development only.
//   node tools/store-assets/icons.mjs 16 24     writes icons/parker-timer-16.png and -24.png
// At 16 px one SVG unit is 1/8 px and the stem, crown and hands are 1 px wide,
// centred on pixel edges, so they would blur across two pixels. The 16 px icon
// moves just those parts half a pixel right, onto whole pixels. Other sizes are
// plain renders of the SVG.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {launch, attach, sleep} from './cdp.mjs';
import {decode, encode} from './png.mjs';

const path = file => fileURLToPath(new URL(`../../${file}`, import.meta.url));
const master = readFileSync(path('icons/parker-timer.svg'), 'utf8');
export function aligned(svg) {
  const moves = [['<rect x="60" y="16"', '<rect x="64" y="16"'], ['<rect x="52" y="8"', '<rect x="56" y="8"'], ['d="M64 46V73L82 84"', 'd="M68 46V73L86 84"']];
  for (const [from, to] of moves) { if (!svg.includes(from)) throw new Error(`The SVG changed; update the 16 px alignment (${from})`); svg = svg.replace(from, to); }
  return svg;
}

const sizes = process.argv.slice(2).map(Number);
if (!sizes.length || !sizes.every(size => Number.isInteger(size) && size >= 16 && size <= 128)) throw new Error('Give sizes, e.g. 16 24');
const cdp = await launch();
try {
  for (const size of sizes) {
    const svg = (size === 16 ? aligned(master) : master).replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}" style="display:block"`);
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'});
    const session = await attach(cdp, targetId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {width: 200, height: 200, deviceScaleFactor: 1, mobile: false}, session);
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}}, session);
    await cdp.send('Page.navigate', {url: 'data:text/html,' + encodeURIComponent(`<body style="margin:0">${svg}`)}, session);
    await sleep(500);
    const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: size, height: size, scale: 1}}, session);
    await cdp.send('Target.closeTarget', {targetId});
    const image = decode(Buffer.from(data, 'base64'));
    if (image.width !== size || image.height !== size) throw new Error(`Rendered ${image.width}×${image.height}, not ${size}`);
    writeFileSync(path(`icons/parker-timer-${size}.png`), encode(image, {alpha: true}));
    console.log(`icons: parker-timer-${size}.png`);
  }
} finally { await cdp.close(); }
