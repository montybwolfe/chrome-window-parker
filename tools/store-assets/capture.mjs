// Stage 1: capture the real extension UI. The repository is installed in a
// disposable headless Chrome profile with synthetic tabs served from this
// machine; windows are parked for real. Writes store-listing/sources/ui/*.png.
import http from 'node:http';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {launch, evaluate, attach, sleep} from './cdp.mjs';
import {UI} from './verify.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = fileURLToPath(new URL('../../store-listing/sources/ui/', import.meta.url));
mkdirSync(out, {recursive: true});
// Generic, made-up tab titles. Nothing here comes from a real browser profile.
export const WINDOWS = [
  ['Research notes', 'Quarterly plan: draft', 'Team calendar', 'Budget 2026'],
  ['Product roadmap', 'Design review', 'Weekly report'],
  ['Reading list', 'Recipe: lemon pasta']];

const server = http.createServer((req, res) => {
  const title = new URL(req.url, 'http://localhost').searchParams.get('t') || 'Page';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><title>${title.replace(/[<&]/g, '')}</title><body style="font:16px system-ui;margin:48px"><h1>${title.replace(/[<&]/g, '')}</h1>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const page = title => `http://127.0.0.1:${server.address().port}/?t=${encodeURIComponent(title)}`;
const log = message => console.log(`capture: ${message}`);
async function waitFor(check, ms, what) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(1000)) if (await check()) return;
  throw new Error(`Timed out waiting for ${what}`);
}

const cdp = await launch();
try {
  const {id} = await cdp.send('Extensions.loadUnpacked', {path: root});
  const url = path => `chrome-extension://${id}/${path}`;
  // Light captures use the default Auto theme with a light system appearance.
  const light = session => cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'light'}]}, session);
  const open = async (path, width, height) => {
    const {targetId} = await cdp.send('Target.createTarget', {url: url(path), newWindow: true});
    const session = await attach(cdp, targetId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 2, mobile: false}, session);
    await light(session); await cdp.send('Page.reload', {}, session);
    await sleep(1500); return session;
  };
  const shot = async (session, name, full = false) => {
    const m = await cdp.send('Page.getLayoutMetrics', {}, session);
    // The popup is as tall as its content, as it is in Chrome.
    const body = await evaluate(cdp, session, `document.body.classList.contains('popup') ? Math.ceil(document.body.getBoundingClientRect().height) : 0`);
    const clip = {x: 0, y: 0, width: m.cssLayoutViewport.clientWidth, scale: 1,
      height: body || (full ? Math.ceil(m.cssContentSize.height) : m.cssLayoutViewport.clientHeight)};
    const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', clip, captureBeyondViewport: full}, session, 20000);
    writeFileSync(out + name + '.png', Buffer.from(data, 'base64')); log(name);
  };
  const S = await open('options.html', 1280, 900);
  const js = expression => evaluate(cdp, S, expression);
  const send = message => js(`chrome.runtime.sendMessage(${JSON.stringify(message)}).then(r => { if (!r.ok) throw new Error(r.error); return r.data; })`);
  const defaults = await send({type: 'settings'});
  const theme = async appearance => { await send({type: 'appearance', appearance}); await sleep(600); };

  // Park three windows quickly; Settings is shown with its defaults afterwards.
  await send({type: 'configure', settings: {...defaults, delayMinutes: 1, sleepingMode: 'immediate'}});
  const ids = [];
  for (const titles of WINDOWS) ids.push(await js(`chrome.windows.create({url: ${JSON.stringify(titles.map(page))}}).then(w => w.id)`));
  await sleep(2500);
  // Headless Chrome reports every visible window as focused; minimized ones aren't, so they can park.
  for (const w of ids) await js(`chrome.windows.update(${w}, {state: 'minimized'}).then(() => 1)`);
  // Minimizing fires no focus change in headless Chrome, so hand focus back to
  // the Settings window explicitly; otherwise the last new window stays "focused".
  await js(`chrome.windows.getCurrent().then(w => chrome.windows.update(w.id, {state: 'minimized'}).then(() => chrome.windows.update(w.id, {state: 'normal', focused: true}))).then(() => 1)`);
  const parkingTab = w => js(`chrome.windows.get(${w}, {populate: true}).then(w => w.tabs.find(t => t.active && t.url.includes('/parked.html#'))?.url || '')`);
  await waitFor(async () => (await Promise.all(ids.map(parkingTab))).every(Boolean), 240000, 'windows to park');
  await sleep(5000); log('parked');

  // A minimized window paints nothing. Restoring it counts as a visit, so the
  // saved tab genuinely returns after the 2-second delay: capture before then.
  const parked = async (w, name) => {
    const target = (await cdp.send('Target.getTargets')).targetInfos.find(t => t.url === parkingTarget[w]);
    const session = await attach(cdp, target.targetId);
    await light(session);
    await js(`chrome.windows.update(${w}, {state: 'normal'}).then(() => 1)`);
    await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1120, height: 660, deviceScaleFactor: 2, mobile: false}, session, 10000);
    await sleep(700); await shot(session, name);
  };
  const parkingTarget = Object.fromEntries(await Promise.all(ids.map(async w => [w, await parkingTab(w)])));
  await send({type: 'configure', settings: {...defaults}});
  await parked(ids[0], 'parked-light');
  await sleep(3000);
  const P = await open('popup.html', 360, 332); await shot(P, 'popup-light', true);

  await send({type: 'sync-enable', key: 'delayMinutes'}); await send({type: 'sync-enable', key: 'sleepingMode'});
  await send({type: 'sync-enable', key: 'appearance'});
  await cdp.send('Page.reload', {}, S); await sleep(1500);
  await shot(S, 'settings-light', true);
  const syncTop = await js(`Math.round(document.querySelector('[aria-labelledby=sync-heading]').getBoundingClientRect().top + scrollY)`);
  // Record where the Sync section is, and the UI sources these captures show.
  writeFileSync(out + 'capture.json', JSON.stringify({syncTop, ui: Object.fromEntries(UI.map(file =>
    [file, createHash('sha256').update(readFileSync(root + file)).digest('hex')]))}, null, 2) + '\n');

  await theme('dark'); await parked(ids[1], 'parked-dark');
  await sleep(3000); await cdp.send('Page.reload', {}, P); await sleep(1500); await shot(P, 'popup-dark', true);
} finally { await cdp.close(); server.close(); }
