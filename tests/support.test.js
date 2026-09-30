import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindIssues, bindSupport, ISSUES_URL, SUPPORT_URL} from '../support.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function setup(t,create=async()=>({id:1}),bind=bindSupport){
 let click,now=1000;const calls=[],errors=[];
 const old=globalThis.chrome;globalThis.chrome={tabs:{create:async props=>{calls.push(props);return create(props);}}};
 t.after(()=>{globalThis.chrome=old;});t.mock.method(performance,'now',()=>now);
 const button={disabled:false,addEventListener:(name,fn)=>{assert.equal(name,'click');click=fn;}};
 bind(button,error=>errors.push(error));
 return {button,calls,errors,click:(event={})=>click({isTrusted:true,detail:1,...event}),advance:ms=>{now+=ms;}};
}
test('support module import and binding perform no navigation, request or storage access',t=>{
 const h=setup(t);assert.deepEqual(h.calls,[]);assert(!h.button.disabled);
 assert.equal(SUPPORT_URL,'https://buymeacoffee.com/montybwolfe');
 assert(!/fetch\s*\(|XMLHttpRequest|storage\.|sendMessage|setTimeout|setInterval|Image\s*\(/.test(read('support.js')));
});
for(const [input,detail] of [['mouse',1],['keyboard',0]])test(`deliberate ${input} support action opens exactly one canonical active tab`,async t=>{
 const h=setup(t);await h.click({detail,url:'https://attacker.invalid',target:{href:'https://attacker.invalid'}});
 assert.deepEqual(h.calls,[{url:SUPPORT_URL,active:true}]);assert.deepEqual(h.errors,[]);assert(!h.button.disabled);
});
test('pending navigation blocks rapid actions without duplicate tabs',async t=>{
 let resolve;const h=setup(t,()=>new Promise(r=>{resolve=r;}));const first=h.click();assert(h.button.disabled);h.advance(2000);await h.click();assert.equal(h.calls.length,1);resolve({id:1});await first;assert(!h.button.disabled);
});
test('successful navigation still suppresses rapid pointer or keyboard repeats',async t=>{
 const h=setup(t);await h.click();h.advance(50);await h.click();await h.click({detail:0});assert.equal(h.calls.length,1);h.advance(1000);await h.click({detail:0});assert.equal(h.calls.length,2);
});
test('second click of a double click is ignored even after cooldown',async t=>{
 const h=setup(t);await h.click();h.advance(2000);await h.click({detail:2});assert.equal(h.calls.length,1);
});
test('scripted clicks cannot open support',async t=>{
 const h=setup(t);await h.click({isTrusted:false});assert.deepEqual(h.calls,[]);
});
test('navigation failure is reported, unlocks control, and allows later deliberate retry',async t=>{
 const error=new Error('Chrome could not create tab');let fail=true;const h=setup(t,async()=>{if(fail)throw error;return {id:1};});await h.click();assert.deepEqual(h.errors,[error]);assert(!h.button.disabled);fail=false;h.advance(1001);await h.click();assert.equal(h.calls.length,2);
});
test('both surfaces bind native accessible secondary buttons; parked page and worker have no support hooks',()=>{
 for(const name of ['popup','options']){
  const html=read(name+'.html');assert.match(html,/<button[^>]*id="support"[^>]*type="button"[^>]*aria-label="[^"]*opens in a new tab/);
  assert.match(read(name+'.js'),/bindSupport\(document.getElementById\('support'\)/);assert(!html.includes(SUPPORT_URL));
 }
 assert.match(read('popup.html'),/class="popup-links"/);
 for(const name of ['popup','options']) { assert.match(read(name+'.html'),/<h1>Chrome Window Parker<\/h1>/); assert(!/(?<!Chrome )Window Parker/.test(read(name+'.html'))); }assert(read('options.html').indexOf('support-section')>read('options.html').indexOf('individual-section'));
 for(const file of ['parked.html','parked.js','background.js','engine.js'])assert(!read(file).includes('support.js')&&!read(file).includes('buymeacoffee'));
 assert.match(read('ui.css'),/:focus-visible/);assert.match(read('ui.css'),/\.popup-links \{ display: flex/);
});
for(const [input,detail] of [['mouse',1],['keyboard',0]])test(`deliberate ${input} bug report opens exactly the GitHub Issues page, with nothing attached`,async t=>{
 const h=setup(t,undefined,bindIssues);await h.click({detail,url:'https://attacker.invalid'});
 assert.equal(ISSUES_URL,'https://github.com/montybwolfe/chrome-window-parker/issues');
 assert.deepEqual(h.calls,[{url:ISSUES_URL,active:true}]);assert.deepEqual(h.errors,[]);
 await h.click({isTrusted:false});h.advance(50);await h.click();assert.equal(h.calls.length,1,'no scripted or rapid repeats');
 for(const name of ['popup','options']){
  assert.match(read(name+'.js'),/bindIssues\(\$\('reportBug'\)/);assert(!read(name+'.html').includes(ISSUES_URL));
 }
});
test('popup: Parking on, then Report a bug, Buy me a coffee and Settings as same-sized icon buttons; Settings keeps full labels',()=>{
 const popup=read('popup.html'),options=read('options.html');
 const footer=popup.match(/<div class="popup-links">(.*?)<\/div><\/div>/)[1];
 const buttons=[...footer.matchAll(/<button class="icon-button" id="(\w+)" type="button" aria-label="([^"]+)" title="([^"]+)"><svg viewBox="0 0 24 24" aria-hidden="true"[^>]*>.*?<\/svg><\/button>/g)].map(m=>m.slice(1));
 assert.deepEqual(buttons,[['reportBug','Report a bug on GitHub (opens in a new tab)','Report a bug'],
   ['support','Buy me a coffee (opens in a new tab)','Buy me a coffee'],['options','Settings','Settings']],'bug, coffee, then Settings');
 assert.equal(footer.replace(/<svg.*?<\/svg>/g,'').replace(/<[^>]+>/g,''),'','no visible text beside the icons');
 assert(!/Settings…|Settings\.\.\./.test(popup),'no ellipsis');assert.match(popup,/<span id="mode" class="hint">/);
 // Settings has room for the full, labelled versions, and no Settings button of its own.
 const coffee=options.match(/<button class="text-button coffee-link" id="support"[^>]*>.*?<\/button>/)?.[0];
 assert.match(coffee,/aria-label="Buy me a coffee \(opens in a new tab\)"/,'the accessible name starts with the visible label');
 assert.match(coffee,/<svg viewBox="0 0 24 24" aria-hidden="true"[^>]*>.*<\/svg><span>Buy me a coffee<\/span><\/button>$/,'an inline cup: no image request');
 assert.match(options,/<button class="text-button bug-link" id="reportBug"[^>]*>.*?<span>Report a bug<\/span><\/button>/);
 assert(!/id="options"/.test(options));
 for(const html of [popup,options])assert(!/<button[^>]*>Support( development)?<\/button>/.test(html),'no vague "Support" control');
 const css=read('ui.css');
 assert.match(css,/button\.icon-button \{[^}]*width: 30px; height: 30px; min-height: 30px/,'the same hit area for each');
 assert.match(css,/button\.icon-button:hover \{[^}]*color: var\(--text\)/);assert.match(css,/button\.icon-button:focus-visible \{ outline-offset: 0; \}/);
 assert.match(css,/\.popup-footer \{[^}]*white-space: nowrap/,'one line');
 assert.match(css,/html\.popup-root \{ width: 360px; min-width: 360px; \}/,'the fixed width the footer is laid out for');
 // The README's graphical button goes to the same page as the extension's link.
 assert(read('README.md').includes(`<a href="${SUPPORT_URL}"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me a Coffee" width="217"></a>`));
});
test('permission list and restrictive CSP remain unchanged; no external resources or payment integration',()=>{
 const m=JSON.parse(read('manifest.json'));assert.deepEqual(m.permissions,['tabs','storage','alarms','downloads']);assert.equal(m.host_permissions,undefined);assert.equal(m.content_scripts,undefined);
 assert.equal(m.content_security_policy.extension_pages,"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'");
 for(const f of ['popup.html','options.html','parked.html'])assert(!/<(?:script|img|iframe)[^>]+(?:src|href)="https?:/.test(read(f)));
 assert.equal(m.version,'1.5.5.2');assert(!/stripe|payment|entitlement/i.test(read('support.js')));
});
