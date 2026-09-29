// Minimal Chrome DevTools Protocol client over --remote-debugging-pipe, so the
// artwork tools need no npm dependencies. Development only; never packaged.
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// A disposable profile: nothing touches your own Chrome profile.
export async function launch({extraArgs = []} = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'cwp-assets-'));
  const proc = spawn(CHROME, [`--user-data-dir=${profile}`, '--headless=new', '--remote-debugging-pipe',
    '--enable-unsafe-extension-debugging', '--no-first-run', '--no-default-browser-check', '--disable-sync',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--password-store=basic', '--use-mock-keychain', '--hide-scrollbars', '--force-color-profile=srgb',
    '--window-size=1280,900', ...extraArgs, 'about:blank'], {stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']});
  const pending = new Map(), listeners = [];
  let id = 0, buffer = '';
  proc.stdio[4].on('data', chunk => {
    buffer += chunk;
    for (let end; (end = buffer.indexOf('\0')) >= 0;) {
      const msg = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      if (msg.id && pending.has(msg.id)) {
        const {resolve, reject, method} = pending.get(msg.id); pending.delete(msg.id);
        msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result);
      } else for (const fn of listeners) fn(msg);
    }
  });
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((resolve, reject) => {
    const msg = {id: ++id, method, params, ...(sessionId ? {sessionId} : {})};
    const timer = setTimeout(() => { pending.delete(msg.id); reject(new Error(`${method}: timed out`)); }, timeout);
    pending.set(msg.id, {method, resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); }});
    proc.stdio[3].write(JSON.stringify(msg) + '\0');
  });
  const close = async () => {
    try { await send('Browser.close', {}, undefined, 3000); } catch {}
    if (proc.exitCode === null) { proc.kill('SIGKILL'); await new Promise(resolve => proc.once('exit', resolve)); }
    rmSync(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  };
  await send('Browser.getVersion');
  return {send, on: fn => listeners.push(fn), close};
}

export async function evaluate(cdp, sessionId, expression) {
  const r = await cdp.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

export async function attach(cdp, targetId) {
  return (await cdp.send('Target.attachToTarget', {targetId, flatten: true})).sessionId;
}
