import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS, SYNCABLE, validateSettings} from '../settings.js';
import {harness} from './helpers.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('options.html'), css=read('ui.css');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Settings order: tab protection (with individual tabs), sync, diagnostics, save/reset, then support',()=>{
  const at=marker=>{const i=html.indexOf(marker);assert(i>=0,marker);return i;};
  const order=['id="enabled"','id="timing-heading"','id="protection-heading"','id="discardPinned"','id="protectAudio"',
    'id="exclusions"','Calls, video and unsaved work','id="individual"','id="sync-heading"','id="syncList"',
    'id="diagnostics-heading"','id="save"','id="reset"','id="support-heading"','id="reportBug"','id="support"'];
  assert.deepEqual(order.map(at),order.map(at).toSorted((a,b)=>a-b));
  // Individual tabs sit inside Tab protection; neither they nor the sync choices are
  // in a settings fieldset that locks while settings load or save.
  const section=html.slice(at('aria-labelledby="protection-heading"'));
  assert(section.indexOf('id="individual"')<section.indexOf('</section>'));
  for(const marker of ['id="individual"','id="syncList"']){
    const before=html.slice(0,at(marker));
    assert(before.lastIndexOf('</fieldset>')>before.lastIndexOf('<fieldset class="settings-fields"'),marker);
  }
  assert(!/<(input|select|textarea)\b/.test(html.slice(at('id="reset"'),at('id="support-heading"'))));
  assert.equal(html.slice(at('id="support-heading"')).indexOf('<section'),-1);
  for(const [,id] of read('options.js').matchAll(/\$\('([^']+)'\)/g))assert(html.includes(`id="${id}"`),id);
});

test('sync: "Sync all settings", then Parking and Tab protection groups as on the page, then Theme; nothing else syncs',()=>{
  const keys=[...html.matchAll(/data-sync="(\w+)"/g)].map(m=>m[1]);
  assert.deepEqual(keys.toSorted(),[...SYNCABLE].toSorted());
  for(const local of ['enabled','debug'])assert(!keys.includes(local));
  assert.match(html,/Pausing, protected tabs, debug logging and anything about your windows and tabs stay on this computer/);
  // Group boxes are derived from their settings; a group with one setting (Theme) gets no box of its own.
  assert.deepEqual([...html.matchAll(/data-sync-group="(\w+)"/g)].map(m=>m[1]),['all','parking','protection']);
  const group=name=>[...html.matchAll(new RegExp(`data-sync="(\\w+)" data-group="${name}"`,'g'))].map(m=>m[1]);
  const page=ids=>ids.toSorted((a,b)=>html.indexOf(`id="${a}"`)-html.indexOf(`id="${b}"`));
  assert.deepEqual(group('parking'),['sleepingMode','delayMinutes','dwellSeconds']);assert.deepEqual(group('parking'),page(group('parking')),'page order');
  assert.deepEqual(group('protection'),['discardPinned','protectAudio','exclusions']);assert.deepEqual(group('protection'),page(group('protection')));
  assert.match(html,/<input type="checkbox" data-sync="appearance"><span>Theme<\/span>/);
  assert.match(html,/<label class="check-row sync-all"><input type="checkbox" data-sync-group="all"><span>Sync all settings<\/span><\/label>/);
  for(const name of ['Parking','Tab protection'])assert.match(html,new RegExp(`<div class="sync-children" role="group" aria-label="${name}">`));
  assert.match(html,/<button id="reset" type="button">Restore defaults<\/button>/);assert(!html.includes('Reset settings'));
});

test('theme is a compact labelled three-state icon control; bug report is a small labelled control',()=>{
  assert(!html.includes('appearance-heading')&&!/<select[^>]+id="appearance"/.test(html));
  const radios=[...html.matchAll(/<label class="theme-option" title="([^"]+)"><input type="radio" name="appearance" value="(\w+)" aria-label="([^"]+)"><svg[^>]*aria-hidden="true"/g)];
  assert.deepEqual(radios.map(m=>m[2]),['light','dark','auto']);
  assert.deepEqual(radios.map(m=>m[3]),['Light theme','Dark theme','Auto theme']);
  assert(radios.every(m=>m[1].startsWith(m[3])),'tooltips name each state');
  assert(html.indexOf('theme-switch')<html.indexOf('<form'),'placed in the header');
  assert.match(css,/\.theme-option:has\(input:checked\)/);assert.match(css,/\.theme-option:has\(input:focus-visible\)/);
  for(const page of ['options.html','popup.html'])
    assert.match(read(page),/<button[^>]*id="reportBug"[^>]*type="button"[^>]*aria-label="Report a bug on GitHub \(opens in a new tab\)"[^>]*title="Report a bug[^"]*"><svg[^>]*aria-hidden="true"/);
  assert(!read('parked.html').includes('reportBug'));
  for(const page of ['options.html','popup.html','parked.html'])assert(!/\sstyle=/.test(read(page)),'CSP forbids inline styles');
});

test('section headings keep their names; each has a small decorative icon drawn in the page',()=>{
  const headings=[...html.matchAll(/<h2 id="([\w-]+)">(<svg class="heading-icon"[^>]*>.*?<\/svg>)([^<]+)<\/h2>/g)].map(m=>[m[1],m[3],m[2]]);
  assert.deepEqual(headings.map(h=>h[1]),['Parking','Tab protection','Sync','Diagnostics','Support']);
  assert.equal((html.match(/<h2\b/g)||[]).length,headings.length,'every section heading');
  for(const [id,,svg] of headings){
    assert.match(svg,/^<svg class="heading-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor"/,id);
    assert(!/href|src=|url\(|<text|<image/.test(svg),`${id}: no external or text content`);
  }
  // Headings are flex rows, so the icon never adds height; the quiet Diagnostics heading keeps a quiet icon.
  assert.match(css,/\.settings-page h2 \{ display: flex; align-items: center; gap: 8px; \}/);
  assert.match(css,/\.heading-icon \{ flex: none; color: var\(--accent\); \}/);
  assert.match(css,/\.settings-section\.compact \.heading-icon \{ width: 14px; height: 14px; color: inherit; \}/);
  assert.match(css,/:root\[data-theme="dark"\] \{[^}]*--accent: #8bb3ff/,'a lighter accent in dark mode');
});

test('a long individual-tab list scrolls inside its own bounded panel; body text is not shrunk',()=>{
  assert.match(html,/<div id="tabs" class="tab-list" role="group" aria-label="Open tabs">/);
  const rule=css.match(/\.tab-list \{([^}]+)\}/)[1];
  assert.match(rule,/max-height: min\(\d+px, \d+vh\)/);assert.match(rule,/overflow-y: auto/);
  assert.match(css,/\.tab-title \{[^}]*-webkit-line-clamp: 2/);
  assert.match(css,/body \{ margin: 0; font: inherit; \}/,"override Chrome's 75% extension-page body size");
});

test('the tab list shows that it scrolls: edge fades and a chevron, without adding a tab stop or covering clicks',()=>{
  assert.match(html,/<div class="tab-scroll" id="tabScroll"><div id="tabs" class="tab-list"[^>]*><\/div><button class="scroll-cue" id="moreTabs" type="button" tabindex="-1" aria-hidden="true" title="More tabs below" hidden><svg[^>]*aria-hidden="true"/);
  const fades=css.match(/\.tab-scroll::before, \.tab-scroll::after \{([^}]+)\}/)[1];
  assert.match(fades,/pointer-events: none/);assert.match(fades,/opacity: 0/);assert.match(fades,/right: calc\(1px \+ var\(--scrollbar, 0px\)\)/);
  assert.match(css,/\.tab-scroll\.more-above::before, \.tab-scroll\.more-below::after \{ opacity: 1; \}/);
  // Fades use the panel's own colour, so they work in light, dark and Auto.
  assert.match(css,/\.tab-scroll::after \{[^}]*background: linear-gradient\(transparent, var\(--control\)/);
  assert.match(css,/\.tab-list \{[^}]*scroll-padding-block: 24px 56px/,'keyboard focus scrolls rows clear of the fades');
  assert.match(css,/prefers-reduced-motion: reduce\) \{ \.tab-scroll::before, \.tab-scroll::after \{ transition: none; \}/);
  assert.match(css,/\.individual-intro, \.tab-scroll, \.individual-section #tabStatus \{ margin-left: 0; \}/,'full width on narrow pages');
});

// The page runs against the real worker engine (tests/helpers.js), so sync
// requests use the real rules. Tab listing and protection are simulated.
async function page(t,{settings={...DEFAULTS,appearance:'dark'},fail=false,sync={},policy={},customized={},tabs=[{id:11,windowId:1,title:'Research'},{id:12,windowId:2,title:'x'.repeat(400)}],reduced=false}={}){
  const elements=new Map(),messages=[],storageListeners=[];
  const events=()=>({on:{},addEventListener(type,fn){(this.on[type]||=[]).push(fn);},
    fire(type,e={}){return Promise.all((this.on[type]||[]).map(fn=>fn({preventDefault(){},isTrusted:true,detail:1,...e})));}});
  const node=(props={})=>{const n={...events(),disabled:false,hidden:false,checked:false,indeterminate:false,value:'',textContent:'',title:'',className:'',children:[],
    classes:new Set(),dataset:{},focused:false,focus(){for(const other of all)other.focused=false;n.focused=true;},append(...kids){this.children.push(...kids);},replaceChildren(...kids){this.children=kids;this.textContent='';},
    selectionStart:0,selectionEnd:0,setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);},...props};
    n.classList={add:c=>n.classes.add(c),remove:c=>n.classes.delete(c),toggle:(c,on=!n.classes.has(c))=>{on?n.classes.add(c):n.classes.delete(c);return on;}};
    n.style={props:{},setProperty(k,v){this.props[k]=v;}};n.scrolls=[];n.scrollBy=o=>n.scrolls.push(o);
    Object.assign(n,{scrollHeight:0,clientHeight:0,scrollTop:0,offsetWidth:0,clientWidth:0});all.push(n);return n;};
  const all=[];
  const el=id=>{if(!elements.has(id))elements.set(id,node({id}));return elements.get(id);};
  const themes=['light','dark','auto'].map(value=>node({value,name:'appearance'}));
  const groups=[1,2,3,4].map(()=>node({disabled:true}));
  // In page order, as options.html lists them.
  const boxes=[...html.matchAll(/data-sync="(\w+)"(?: data-group="(\w+)")?/g)].map(m=>node({dataset:{sync:m[1],...(m[2]?{group:m[2]}:{})}}));
  const groupBoxes=[...html.matchAll(/data-sync-group="(\w+)"/g)].map(m=>node({dataset:{syncGroup:m[1]}}));
  el('syncList').disabled=true;
  const h=harness(2,3);h.local.settings=validateSettings(settings);h.local.syncPolicy=policy;h.local.customized=customized;Object.assign(h.sync,sync);
  await h.restart();
  // Chrome reports each storage write to every extension page, after the write.
  const set=h.api.storage.local.set;h.api.storage.local.set=async values=>{await set(values);
    const changes=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{newValue:structuredClone(v)}]));
    setImmediate(()=>storageListeners.forEach(fn=>fn(changes,'local')));};
  let protectedIds=[];
  const reply=data=>({ok:true,data:structuredClone(data)});
  const old={document:globalThis.document,chrome:globalThis.chrome,ResizeObserver:globalThis.ResizeObserver,matchMedia:globalThis.matchMedia};
  const resizers=[];globalThis.ResizeObserver=class{constructor(fn){resizers.push(fn);}observe(){}};
  globalThis.matchMedia=query=>({matches:reduced&&/reduced-motion: reduce/.test(query)});
  globalThis.document={getElementById:el,createElement:tag=>node({tagName:tag.toUpperCase()}),get activeElement(){return all.find(n=>n.focused);},
    querySelectorAll:selector=>({'input[name=appearance]':themes,'.settings-fields':groups,'input[data-sync]':boxes,'input[data-sync-group]':groupBoxes})[selector]||[]};
  globalThis.chrome={storage:{onChanged:{addListener:fn=>storageListeners.push(fn)}},runtime:{async sendMessage(msg){
    messages.push(structuredClone(msg));
    if(msg.type==='settings'&&fail)return {ok:false,error:'Worker unavailable'};
    if(msg.type==='status')return reply({tabs,protectedIds});
    if(msg.type==='protect'){protectedIds=msg.protected?[msg.tabId]:[];return reply({protected:msg.protected});}
    try{return reply(await h.p.message(structuredClone(msg),{id:'test',url:'chrome-extension://test/options.html'}));}
    catch(error){return {ok:false,error:error.message};}
  }},tabs:{create:async()=>({})}};
  t.after(()=>Object.assign(globalThis,old));
  const choose=value=>{for(const r of themes)r.checked=r.value===value;};
  const box=key=>boxes.find(b=>b.dataset.sync===key),group=name=>groupBoxes.find(b=>b.dataset.syncGroup===name);
  // A click: a box showing a dash becomes ticked, as in Chrome.
  const click=async target=>{target.checked=target.indeterminate||!target.checked;target.indeterminate=false;await target.fire('change');await flush();await flush();};
  const state=b=>b.indeterminate?'some':b.checked?'on':'off';
  const tree=()=>({all:state(group('all')),parking:state(group('parking')),protection:state(group('protection')),theme:state(box('appearance'))});
  // The open choice panel: each setting's name and its options.
  const choices=()=>p.el('syncChoices').children.map(set=>({name:set.children[0].textContent,hidden:set.children[0].className==='visually-hidden',
    note:set.children.find(c=>c.className==='hint')?.textContent,
    options:set.children.filter(c=>c.className==='check-row').map(label=>({radio:label.children[0],text:label.children[1].textContent}))}));
  const pick=async(name,text)=>{const radio=choices().find(c=>c.name===name).options.find(o=>o.text.startsWith(text)).radio;radio.checked=true;await radio.fire('change');};
  const remote=settings=>storageListeners.forEach(fn=>fn({settings:{newValue:settings}},'local'));
  const sent=type=>messages.filter(m=>m.type===type);
  const p={h,el,themes,groups,boxes,box,group,click,tree,choices,pick,messages,sent,choose,remote,stored:()=>h.p.settings,resize:()=>resizers.forEach(fn=>fn()),
    checked:()=>themes.filter(r=>r.checked).map(r=>r.value)};
  return p;
}
const load=async(p,name)=>{await import(`../options.js?${name}=${Math.random()}`);await flush();await flush();return p;};

test('theme control reflects the saved value and applies each choice immediately; Restore defaults',async t=>{
  const p=await load(await page(t),'theme');
  assert.deepEqual(p.checked(),['dark']);assert(p.groups.every(g=>!g.disabled));
  for(const value of ['light','auto','dark']){
    p.choose(value);await p.themes.find(r=>r.value===value).fire('change');await flush();
    assert.deepEqual(p.messages.at(-1),{type:'appearance',appearance:value});assert.equal(p.stored().appearance,value);
  }
  // Saving the form keeps the theme the header already saved, and says what the page showed.
  p.el('delayMinutes').value='30';await p.el('settings').fire('submit');await flush();
  const saved=p.sent('configure').at(-1);assert.equal(saved.settings.appearance,'dark');assert.equal(saved.settings.delayMinutes,30);
  assert.deepEqual(Object.keys(saved.settings).toSorted(),Object.keys(DEFAULTS).toSorted());
  assert.equal(saved.shown.delayMinutes,15,'the value the page showed before the edit');assert.equal(p.messages.at(-1).type,'sync-state');
  assert.equal(p.stored().delayMinutes,30);assert.equal(p.h.p.customized.delayMinutes,true);
  // Restore defaults: defaults here, sync off here, nothing chosen here, shared values untouched.
  await p.click(p.group('all'));assert.deepEqual(p.tree(),{all:'on',parking:'on',protection:'on',theme:'on'});
  const shared=structuredClone(p.h.sync);
  await p.el('reset').fire('click');await flush();await flush();
  assert.deepEqual(p.checked(),['auto']);assert.equal(p.el('delayMinutes').value,15);
  assert.equal(p.el('status').textContent,'Defaults restored. Sync is now off on this computer; your other computers keep their settings.');
  assert.deepEqual(p.tree(),{all:'off',parking:'off',protection:'off',theme:'off'});assert(p.boxes.every(b=>!b.checked));
  assert.deepEqual(p.h.sync,shared);assert(Object.values(p.h.p.customized).every(on=>!on));
});

test('individual tabs: refresh lists every tab, checkboxes protect immediately and survive a settings load failure',async t=>{
  const p=await load(await page(t,{fail:true}),'individual');
  assert.equal(p.el('loadError').hidden,false);assert(p.groups.every(g=>g.disabled),'settings stay locked');
  assert.equal(p.el('syncList').disabled,true,'sync choices need loaded settings');
  p.el('individual').open=true;await p.el('individual').fire('toggle');await flush();
  const rows=p.el('tabs').children;assert.equal(rows.length,2);
  const [box,text]=rows[1].children;assert.equal(text.children[0].className,'tab-title');
  assert.equal(text.children[0].textContent.length,400);assert.equal(rows[1].title.length,400);
  assert.equal(text.children[1].textContent,'Window 2');assert.equal(box.disabled,false);
  // Enter on a checkbox or choice in these lists must not submit (save) the settings form;
  // Space still toggles, and Enter still presses a button.
  for(const id of ['tabs','syncList','syncChoice']){
    const prevented=[];for(const key of ['Enter',' '])await p.el(id).fire('keydown',{key,target:{tagName:'INPUT'},preventDefault(){prevented.push(key);}});
    assert.deepEqual(prevented,['Enter'],id);
  }
  const pressed=[];await p.el('syncChoice').fire('keydown',{key:'Enter',target:{tagName:'BUTTON'},preventDefault(){pressed.push('Enter');}});
  assert.deepEqual(pressed,[],'Apply and Cancel still work with Enter');
  box.checked=true;await box.fire('change');
  assert.deepEqual(p.messages.at(-1),{type:'protect',tabId:12,protected:true});
  assert.equal(p.el('tabStatus').textContent,'Tab protection updated.');
  await p.el('refresh').fire('click');await flush();
  assert.equal(p.messages.filter(m=>m.type==='status'&&m.includeTabs).length,2);
  assert.equal(p.el('tabs').children[1].children[0].checked,true);
});

test('scroll cue follows the list: none without overflow; below at the top, both in the middle, above at the bottom',async t=>{
  const p=await load(await page(t),'cue');
  const list=p.el('tabs'),scroll=p.el('tabScroll'),cue=p.el('moreTabs');
  const state=()=>({above:scroll.classes.has('more-above'),below:scroll.classes.has('more-below'),cue:!cue.hidden});
  const at=async(top,{height=900,visible=338}={})=>{Object.assign(list,{scrollHeight:height,clientHeight:visible,scrollTop:top});await list.fire('scroll');return state();};
  assert.deepEqual(await at(0,{height:300,visible:300}),{above:false,below:false,cue:false},'short list: nothing implied');
  assert.deepEqual(await at(0,{height:340}),{above:false,below:true,cue:true},'just overflowing');
  assert.deepEqual(await at(0),{above:false,below:true,cue:true},'top');
  assert.deepEqual(await at(281),{above:true,below:true,cue:true},'middle');
  assert.deepEqual(await at(562),{above:true,below:false,cue:false},'bottom');
  assert.deepEqual(await at(561.5),{above:true,below:false,cue:false},'fractional bottom still counts');
  assert.deepEqual(await at(0,{height:9000}),{above:false,below:true,cue:true},'very long list');
  // Refreshing to a shorter list, or resizing, clears the cue without a scroll event.
  Object.assign(list,{scrollHeight:120,clientHeight:120,scrollTop:0});
  p.el('individual').open=true;await p.el('refresh').fire('click');await flush();assert.deepEqual(state(),{above:false,below:false,cue:false});
  Object.assign(list,{scrollHeight:900,clientHeight:338});p.resize();assert.deepEqual(state(),{above:false,below:true,cue:true});
  // A scrollbar that takes up space (Windows) is kept clear of the fades; macOS overlay scrollbars take none.
  Object.assign(list,{offsetWidth:600,clientWidth:583});p.resize();assert.equal(scroll.style.props['--scrollbar'],'15px');
  Object.assign(list,{offsetWidth:600,clientWidth:598});p.resize();assert.equal(scroll.style.props['--scrollbar'],'0px');
  await cue.fire('click');assert.deepEqual(list.scrolls,[{top:338*0.8,behavior:'smooth'}]);
});

test('scroll cue respects reduced motion; windows are numbered, not shown by Chrome ID',async t=>{
  const p=await load(await page(t,{reduced:true,tabs:[{id:1,windowId:509769978,title:'A'},{id:2,windowId:509769986,title:'B'},{id:3,windowId:509769978,title:'C'}]}),'cue-motion');
  Object.assign(p.el('tabs'),{clientHeight:300});await p.el('moreTabs').fire('click');
  assert.deepEqual(p.el('tabs').scrolls,[{top:240,behavior:'auto'}]);
  p.el('individual').open=true;await p.el('individual').fire('toggle');await flush();
  assert.deepEqual(p.el('tabs').children.map(row=>row.children[1].children[1].textContent),['Window 1','Window 2','Window 1']);
});

test('sync: "Sync all settings" and the group boxes show their settings: off, some (a dash) or on',async t=>{
  const cases=[[{},{all:'off',parking:'off',protection:'off',theme:'off'}],
    [{appearance:true},{all:'some',parking:'off',protection:'off',theme:'on'}],
    [{delayMinutes:true},{all:'some',parking:'some',protection:'off',theme:'off'}],
    [{delayMinutes:true,dwellSeconds:true,sleepingMode:true,exclusions:true},{all:'some',parking:'on',protection:'some',theme:'off'}],
    [Object.fromEntries(SYNCABLE.map(k=>[k,true])),{all:'on',parking:'on',protection:'on',theme:'on'}]];
  for(const [i,[policy,expected]] of cases.entries()){
    const p=await load(await page(t,{policy}),`sync-states-${i}`);assert.deepEqual(p.tree(),expected,JSON.stringify(policy));
    assert.deepEqual(p.boxes.filter(b=>b.checked).map(b=>b.dataset.sync).toSorted(),Object.keys(policy).toSorted());
    assert(p.boxes.every(b=>!b.indeterminate),'single settings are simply on or off');
    assert.equal(p.el('syncList').disabled,false);
  }
});

test('sync: one setting, a group or everything turns on in one request, and off again; nothing else is stored',async t=>{
  const p=await load(await page(t),'sync-groups');
  await p.click(p.box('delayMinutes'));
  assert.deepEqual(p.messages.at(-1),{type:'sync-enable',keys:['delayMinutes'],choices:{}});
  assert.equal(p.el('syncStatus').textContent,'Park windows after now syncs.');
  assert.deepEqual(p.tree(),{all:'some',parking:'some',protection:'off',theme:'off'});
  await p.click(p.group('parking')); // the dash becomes a tick: the rest of the group turns on
  assert.deepEqual(p.messages.at(-1).keys,['sleepingMode','dwellSeconds'],'only settings not already syncing');
  assert.equal(p.el('syncStatus').textContent,'Parking settings now sync.');
  assert.deepEqual(p.tree(),{all:'some',parking:'on',protection:'off',theme:'off'});
  await p.click(p.group('all'));
  assert.deepEqual(p.messages.at(-1).keys,['discardPinned','protectAudio','exclusions','appearance']);
  assert.equal(p.el('syncStatus').textContent,'All settings now sync.');assert.deepEqual(p.tree(),{all:'on',parking:'on',protection:'on',theme:'on'});
  assert.equal(p.sent('sync-enable').length,3,'one request per click');
  const shared=structuredClone(p.h.sync);
  await p.click(p.group('protection'));
  assert.deepEqual(p.messages.at(-1),{type:'sync-disable',keys:['discardPinned','protectAudio','exclusions']});
  assert.equal(p.el('syncStatus').textContent,'Tab protection settings now stay on this computer.');
  assert.deepEqual(p.tree(),{all:'some',parking:'on',protection:'off',theme:'on'});
  await p.click(p.box('appearance'));assert.equal(p.el('syncStatus').textContent,'Theme now stays on this computer.');
  await p.click(p.group('all'));await p.click(p.group('all')); // on, then off again
  assert.deepEqual(p.messages.at(-1),{type:'sync-disable',keys:[...p.boxes.map(b=>b.dataset.sync)]});
  assert.equal(p.el('syncStatus').textContent,'All settings now stay on this computer.');
  assert.deepEqual(p.tree(),{all:'off',parking:'off',protection:'off',theme:'off'});
  assert.deepEqual(p.h.sync,shared,'turning sync off leaves shared values alone');
  assert(Object.keys(p.h.local).every(key=>['customized','parkingRecords','settings','syncPolicy'].includes(key)),'no stored group or "all" state');
  assert(p.group('all').focused,'focus returns to the box you used');
});

test('sync on a new computer: different synced values are used without asking, and the page says so',async t=>{
  const p=await load(await page(t,{sync:{delayMinutes:30,sleepingMode:'immediate',appearance:'dark'}}),'sync-new');
  await p.click(p.group('all'));
  assert.equal(p.el('syncChoice').hidden,true,'no question');assert.deepEqual(p.tree(),{all:'on',parking:'on',protection:'on',theme:'on'});
  assert.equal(p.el('delayMinutes').value,30);assert.equal(p.el('delayPreset').value,'30');assert.equal(p.el('sleepingMode').value,'immediate');
  assert.equal(p.el('sleepingHelp').textContent,'Unload eligible tabs as soon as their window is parked.');
  assert.equal(p.el('syncStatus').textContent,'All settings now sync. Updated here from your synced settings: Tab sleeping (Discard immediately), Park windows after (30 minutes).');
  assert(Object.values(p.h.p.customized).every(on=>!on));
});

test('sync: settings chosen here that differ are asked about together; Cancel changes nothing',async t=>{
  const options={settings:{...DEFAULTS,appearance:'dark'},customized:{delayMinutes:true,appearance:true},sync:{delayMinutes:60,appearance:'light',sleepingMode:'immediate'}};
  const p=await load(await page(t,options),'sync-conflicts');
  const before=structuredClone({settings:p.h.local.settings,sync:p.h.sync});
  await p.click(p.group('all'));
  assert.equal(p.el('syncChoice').hidden,false);assert.equal(p.el('syncList').disabled,true);
  assert.equal(p.el('syncChoiceText').textContent,'Some settings are different on this computer and in your synced settings. Choose which to use for each one.');
  assert.deepEqual(p.choices().map(c=>[c.name,c.hidden,c.options.map(o=>o.text)]),[
    ['Park windows after',false,['Use synced: 1 hour','Use this computer’s: 15 minutes']],['Theme',false,['Use synced: Light','Use this computer’s: Dark']]]);
  assert(p.choices()[0].options[0].radio.focused,'focus moves to the first choice');
  assert.equal(p.el('applySync').textContent,'Apply choices');assert.equal(p.el('applySync').disabled,true,'every setting needs a choice');
  assert.equal(p.group('all').checked,true,'the box you ticked stays ticked while you choose');
  assert.deepEqual({settings:p.h.local.settings,sync:p.h.sync},before,'nothing changed yet');assert(Object.values(p.h.p.policy).every(on=>!on));
  await p.pick('Park windows after','Use synced');assert.equal(p.el('applySync').disabled,true);
  await p.el('cancelSync').fire('click');
  assert.equal(p.el('syncChoice').hidden,true);assert.equal(p.el('syncStatus').textContent,'Nothing changed.');
  assert.deepEqual(p.tree(),{all:'off',parking:'off',protection:'off',theme:'off'});assert.equal(p.el('syncList').disabled,false);
  assert.equal(p.sent('sync-enable').length,1,'Cancel sends nothing');assert(p.group('all').focused);
  assert.deepEqual({settings:p.h.local.settings,sync:p.h.sync},before);assert(Object.values(p.h.p.policy).every(on=>!on));
  // Escape cancels too.
  await p.click(p.group('all'));await p.el('syncChoice').fire('keydown',{key:'Escape',target:{tagName:'INPUT'}});
  assert.equal(p.el('syncChoice').hidden,true);assert.equal(p.el('syncStatus').textContent,'Nothing changed.');
});

test('sync: one choice per setting, applied together',async t=>{
  const p=await load(await page(t,{settings:{...DEFAULTS,appearance:'dark'},customized:{delayMinutes:true,appearance:true},
    sync:{delayMinutes:60,appearance:'light',sleepingMode:'immediate'}}),'sync-apply');
  await p.click(p.group('all'));await p.pick('Park windows after','Use synced');await p.pick('Theme','Use this computer’s');
  assert.equal(p.el('applySync').disabled,false);
  await p.el('applySync').fire('click');await flush();await flush();
  const request=p.sent('sync-enable').at(-1);
  assert.deepEqual(request.choices,{delayMinutes:{use:'synced',local:15,synced:60},appearance:{use:'local',local:'dark',synced:'light'}});
  assert.equal(p.el('syncChoice').hidden,true);assert.deepEqual(p.tree(),{all:'on',parking:'on',protection:'on',theme:'on'});
  assert.equal(p.el('delayMinutes').value,60);assert.equal(p.el('delayPreset').value,'60');assert.deepEqual(p.checked(),['dark']);
  assert.equal(p.h.sync.appearance,'dark');assert.equal(p.h.p.customized.delayMinutes,false);assert.equal(p.h.p.customized.appearance,true);
  assert.equal(p.el('syncStatus').textContent,'All settings now sync. Updated here from your synced settings: Tab sleeping (Discard immediately), Park windows after (1 hour).');
  assert(p.group('all').focused);
});

test('sync: a single setting asks one question; if a value changes meanwhile, it asks again',async t=>{
  const p=await load(await page(t,{customized:{delayMinutes:true},sync:{delayMinutes:60}}),'sync-single');
  await p.click(p.box('delayMinutes'));
  assert.equal(p.el('syncChoiceText').textContent,'Park windows after is different on this computer and in your synced settings. Which should your computers use?');
  assert.deepEqual(p.choices().map(c=>[c.name,c.hidden]),[['Park windows after',true]],'the question names it once');
  assert.equal(p.el('applySync').textContent,'Apply');
  p.h.sync.delayMinutes=90; // another computer changes it while you choose
  await p.pick('Park windows after','Use this computer’s');await p.el('applySync').fire('click');await flush();await flush();
  assert.equal(p.el('syncChoiceText').textContent,'A setting changed while you were choosing. Please choose again.');
  assert.deepEqual(p.choices()[0].options.map(o=>o.text),['Use synced: 90 minutes','Use this computer’s: 15 minutes']);
  assert.equal(p.el('applySync').disabled,true);assert.equal(p.h.sync.delayMinutes,90,'not overwritten');assert.equal(p.h.p.policy.delayMinutes,false);
  await p.pick('Park windows after','Use synced');await p.el('applySync').fire('click');await flush();await flush();
  assert.equal(p.el('delayMinutes').value,90);assert.equal(p.el('delayPreset').value,'custom');assert.equal(p.box('delayMinutes').checked,true);
  assert.equal(p.el('syncStatus').textContent,'Park windows after now syncs. Updated here from your synced settings: Park windows after (90 minutes).');
});

test('sync: a synced value this version can’t use is explained, and only safe choices are offered',async t=>{
  const p=await load(await page(t,{sync:{sleepingMode:'smart'}}),'sync-unusable');
  await p.click(p.box('sleepingMode'));
  const [row]=p.choices();assert.equal(row.note,'The synced value can’t be used by this version of Chrome Window Parker.');
  assert.deepEqual(row.options.map(o=>o.text),['Use this computer’s: Let Chrome decide','Don’t sync this setting']);
  await p.pick('Tab sleeping','Don’t sync');await p.el('applySync').fire('click');await flush();await flush();
  assert.equal(p.el('syncStatus').textContent,'Tab sleeping stays on this computer.');assert.equal(p.box('sleepingMode').checked,false);
  assert.equal(p.h.sync.sleepingMode,'smart','left for the other computer');
});

test('sync: failures are explained, and the boxes show only what really syncs',async t=>{
  const p=await load(await page(t),'sync-error');
  p.h.hooks.syncSet=values=>{if('exclusions' in values)throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');};
  await p.click(p.group('protection'));
  assert.equal(p.el('syncStatus').textContent,'Pinned tabs and Audio tabs now sync. Sites to exclude is too long to sync, so it stays on this computer.');
  assert(p.el('syncStatus').classes.has('error'));
  assert.deepEqual(p.tree(),{all:'some',parking:'off',protection:'some',theme:'off'});assert.equal(p.box('exclusions').checked,false);
  p.h.p.syncNotice=[{key:'exclusions',reason:'too-large'}];await p.el('settings').fire('submit');await flush();
  assert.equal(p.el('syncStatus').textContent,'Sites to exclude is too long to sync, so it stays on this computer.');
  p.h.hooks.syncGet=()=>{throw new Error('Sync is unavailable');};
  await p.click(p.box('dwellSeconds'));
  assert.equal(p.el('syncStatus').textContent,'Chrome sync isn’t available right now. Try again later.');
  assert.equal(p.box('dwellSeconds').checked,false);assert.equal(p.el('syncList').disabled,false);
});

test('keyboard focus stays on Save settings, Restore defaults and Refresh list while they work',async t=>{
  const p=await load(await page(t),'focus');
  // Chrome drops focus from a button that is disabled while it works.
  for(const [id,run] of [['save',()=>p.el('settings').fire('submit')],['reset',()=>p.el('reset').fire('click')],['refresh',()=>p.el('refresh').fire('click')]]){
    p.el(id).focus();const done=run();p.el(id).focused=false;await done;await flush();await flush();
    assert(p.el(id).focused,id);
  }
});

test('excluded sites: Sort A–Z tidies the list without saving; the factory list is already in order',async t=>{
  const p=await load(await page(t,{settings:{...DEFAULTS}}),'sites-sort');const sites=p.el('exclusions');
  assert.equal(sites.value,'meet.google.com\nmusic.youtube.com\nteams.microsoft.com\nzoom.us');
  const sent=p.messages.length;await p.el('sortSites').fire('click');
  assert.equal(sites.value,'meet.google.com\nmusic.youtube.com\nteams.microsoft.com\nzoom.us','nothing to change');
  assert.equal(p.messages.length,sent,'sorting saves nothing');
  await p.el('settings').fire('submit');await flush();
  assert.equal(p.h.p.customized.exclusions,false,'saving an unchanged list is not a change made here');
  sites.value='zoom.us\n  https://example.com/work/*\n\nmeet.google.com ';
  await p.el('sortSites').fire('click');
  assert.equal(sites.value,'https://example.com/work/*\nmeet.google.com\nzoom.us');assert.equal(p.messages.length,sent+2,'still unsaved');
  assert.deepEqual(p.stored().exclusions,DEFAULTS.exclusions);
  await p.el('settings').fire('submit');await flush();
  assert.deepEqual(p.stored().exclusions,['https://example.com/work/*','meet.google.com','zoom.us']);assert.equal(p.h.p.customized.exclusions,true);
  // Restore defaults brings back the same order a new installation has.
  await p.el('reset').fire('click');await flush();await flush();
  assert.equal(sites.value,DEFAULTS.exclusions.join('\n'));assert.equal(p.h.p.customized.exclusions,false);
});

test('excluded sites: pasted home-page addresses on whole lines become websites; other pastes are left alone',async t=>{
  const p=await load(await page(t,{settings:{...DEFAULTS,exclusions:['zoom.us']}}),'sites-paste');const sites=p.el('exclusions');
  const paste=async(text,start,end=start)=>{let prevented=false;Object.assign(sites,{selectionStart:start,selectionEnd:end});
    await sites.fire('paste',{clipboardData:{getData:type=>type==='text/plain'?text:''},preventDefault(){prevented=true;}});return prevented;};
  // Several lines on a new line: tidied, specific addresses kept, repeats dropped.
  sites.value='zoom.us\n';
  assert(await paste('https://meet.google.com/\r\n  https://www.example.com/ \nhttps://example.com/work/*\nhttps://meet.google.com\nhttp://localhost:3000/',8));
  assert.equal(sites.value,'zoom.us\nmeet.google.com\nwww.example.com\nhttps://example.com/work/*\nlocalhost:3000');
  // Replacing a whole selected line works the same way.
  sites.value='zoom.us\nold.example';assert(await paste('https://new.example/',8,19));assert.equal(sites.value,'zoom.us\nnew.example');
  // Nothing to tidy: Chrome pastes it normally.
  sites.value='zoom.us\n';assert(!await paste('teams.microsoft.com',8));assert.equal(sites.value,'zoom.us\n');
  // Into part of a line: left as typed.
  sites.value='zoom.us\nwww.';assert(!await paste('https://example.com/',12));
  sites.value='zoom.us';assert(!await paste('https://example.com/',0),'before existing text on the line');
  assert(!await paste('',0),'nothing pasted');
  // Pasting changes only the text box: nothing is saved or counted as changed until Save.
  assert(!p.messages.some(m=>m.type==='configure'));assert.equal(p.h.p.customized.exclusions,false);
});

test('changes from another page or computer update only fields you have not edited',async t=>{
  const p=await load(await page(t),'remote');
  p.el('dwellSeconds').value='5'; // an unsaved edit
  p.remote({...p.stored(),delayMinutes:30,dwellSeconds:9,sleepingMode:'immediate',appearance:'light'});
  assert.equal(p.el('delayMinutes').value,30);assert.equal(p.el('sleepingMode').value,'immediate');
  assert.equal(p.el('sleepingHelp').textContent,'Unload eligible tabs as soon as their window is parked.');
  assert.equal(p.el('dwellSeconds').value,'5','your edit is kept');assert.deepEqual(p.checked(),['light']);
});
