import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS, SYNCABLE, validateSettings} from '../settings.js';
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

test('every syncable setting has its own checkbox, and nothing else can sync',()=>{
  const keys=[...html.matchAll(/data-sync="(\w+)"/g)].map(m=>m[1]);
  assert.deepEqual(keys.toSorted(),[...SYNCABLE].toSorted());
  for(const local of ['enabled','debug'])assert(!keys.includes(local));
  assert.match(html,/Pausing, protected tabs, debug logging and anything about your windows and tabs stay on this computer/);
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

test('a long individual-tab list scrolls inside its own bounded panel; body text is not shrunk',()=>{
  assert.match(html,/<div id="tabs" class="tab-list" role="group" aria-label="Open tabs">/);
  const rule=css.match(/\.tab-list \{([^}]+)\}/)[1];
  assert.match(rule,/max-height: min\(\d+px, \d+vh\)/);assert.match(rule,/overflow-y: auto/);
  assert.match(css,/\.tab-title \{[^}]*-webkit-line-clamp: 2/);
  assert.match(css,/body \{ margin: 0; font: inherit; \}/,"override Chrome's 75% extension-page body size");
});

function page(t,{settings={...DEFAULTS,appearance:'dark'},fail=false,synced={},policy={}}={}){
  const elements=new Map(),messages=[],storageListeners=[];
  const events=()=>({on:{},addEventListener(type,fn){(this.on[type]||=[]).push(fn);},
    fire(type,e={}){return Promise.all((this.on[type]||[]).map(fn=>fn({preventDefault(){},isTrusted:true,detail:1,...e})));}});
  const node=(props={})=>{const n={...events(),disabled:false,hidden:false,checked:false,value:'',textContent:'',title:'',className:'',children:[],
    classes:new Set(),dataset:{},focused:false,focus(){n.focused=true;},append(...kids){this.children.push(...kids);},replaceChildren(){this.children=[];this.textContent='';},...props};
    n.classList={add:c=>n.classes.add(c),remove:c=>n.classes.delete(c)};return n;};
  const el=id=>{if(!elements.has(id))elements.set(id,node({id}));return elements.get(id);};
  const themes=['light','dark','auto'].map(value=>node({value,name:'appearance'}));
  const groups=[1,2,3,4].map(()=>node({disabled:true}));
  const boxes=SYNCABLE.map(key=>node({dataset:{sync:key}}));
  el('syncList').disabled=true;
  const tabs=[{id:11,windowId:1,title:'Research'},{id:12,windowId:2,title:'x'.repeat(400)}];
  let stored=validateSettings(settings),protectedIds=[],syncPolicy=Object.fromEntries(SYNCABLE.map(k=>[k,policy[k]===true])),notice=null;
  const reply=data=>({ok:true,data:structuredClone(data)});
  const old={document:globalThis.document,chrome:globalThis.chrome};
  globalThis.document={getElementById:el,createElement:()=>node(),
    querySelectorAll:selector=>({'input[name=appearance]':themes,'.settings-fields':groups,'input[data-sync]':boxes})[selector]||[]};
  globalThis.chrome={storage:{onChanged:{addListener:fn=>storageListeners.push(fn)}},runtime:{async sendMessage(msg){
    messages.push(structuredClone(msg));const {type,key}=msg;
    if(type==='settings')return fail?{ok:false,error:'Worker unavailable'}:reply(stored);
    if(type==='configure'){stored=validateSettings(msg.settings);return reply(stored);}
    if(type==='appearance'){stored=validateSettings({...stored,appearance:msg.appearance});return reply(stored);}
    if(type==='reset'){stored=validateSettings({...DEFAULTS});syncPolicy=Object.fromEntries(SYNCABLE.map(k=>[k,false]));return reply(stored);}
    if(type==='status')return reply({tabs,protectedIds});
    if(type==='protect'){protectedIds=msg.protected?[msg.tabId]:[];return reply({protected:msg.protected});}
    if(type==='sync-state'){const n=notice;notice=null;return reply({policy:syncPolicy,notice:n});}
    if(type==='sync-enable'){
      if(synced[key]!==undefined&&JSON.stringify(synced[key])!==JSON.stringify(stored[key]))return reply({status:'conflict',key,local:stored[key],synced:synced[key]});
      if(key==='exclusions'&&synced.tooLarge)return reply({status:'error',reason:'too-large'});
      syncPolicy={...syncPolicy,[key]:true};return reply({status:'on',policy:syncPolicy,settings:stored});
    }
    if(type==='sync-resolve'){
      if(msg.use==='synced')stored=validateSettings({...stored,[key]:synced[key]});
      syncPolicy={...syncPolicy,[key]:true};return reply({status:'on',policy:syncPolicy,settings:stored});
    }
    if(type==='sync-disable'){syncPolicy={...syncPolicy,[key]:false};return reply({status:'off',policy:syncPolicy,settings:stored});}
    return {ok:false,error:'unexpected'};
  }},tabs:{create:async()=>({})}};
  t.after(()=>Object.assign(globalThis,old));
  const choose=value=>{for(const r of themes)r.checked=r.value===value;};
  const box=key=>boxes.find(b=>b.dataset.sync===key);
  const remote=settings=>storageListeners.forEach(fn=>fn({settings:{newValue:settings}},'local'));
  return {el,themes,groups,boxes,box,messages,choose,remote,stored:()=>stored,setNotice:n=>{notice=n;},
    checked:()=>themes.filter(r=>r.checked).map(r=>r.value)};
}

test('theme control reflects the saved value and applies each choice immediately',async t=>{
  const p=page(t);await import(`../options.js?theme=${Math.random()}`);await flush();
  assert.deepEqual(p.checked(),['dark']);assert(p.groups.every(g=>!g.disabled));
  for(const value of ['light','auto','dark']){
    p.choose(value);await p.themes.find(r=>r.value===value).fire('change');await flush();
    assert.deepEqual(p.messages.at(-1),{type:'appearance',appearance:value});assert.equal(p.stored().appearance,value);
  }
  // Saving the form keeps the theme the header already saved.
  p.el('delayMinutes').value='30';await p.el('settings').fire('submit');await flush();
  assert.equal(p.messages.at(-2).type,'configure');assert.equal(p.messages.at(-2).settings.appearance,'dark');
  assert.equal(p.messages.at(-2).settings.delayMinutes,30);assert.equal(p.messages.at(-1).type,'sync-state');
  assert.deepEqual(Object.keys(p.messages.at(-2).settings).toSorted(),Object.keys(DEFAULTS).toSorted());
  await p.el('reset').fire('click');await flush();
  assert.deepEqual(p.checked(),['auto']);assert.equal(p.el('status').textContent,'Defaults restored. Sync is now off on this computer.');
});

test('individual tabs: refresh lists every tab, checkboxes protect immediately and survive a settings load failure',async t=>{
  const p=page(t,{fail:true});await import(`../options.js?individual=${Math.random()}`);await flush();
  assert.equal(p.el('loadError').hidden,false);assert(p.groups.every(g=>g.disabled),'settings stay locked');
  assert.equal(p.el('syncList').disabled,true,'sync choices need loaded settings');
  p.el('individual').open=true;await p.el('individual').fire('toggle');await flush();
  const rows=p.el('tabs').children;assert.equal(rows.length,2);
  const [box,text]=rows[1].children;assert.equal(text.children[0].className,'tab-title');
  assert.equal(text.children[0].textContent.length,400);assert.equal(rows[1].title.length,400);
  assert.equal(text.children[1].textContent,'Window 2');assert.equal(box.disabled,false);
  // Enter on a checkbox in these lists must not submit (save) the settings form; Space still toggles.
  for(const id of ['tabs','syncList']){
    const prevented=[];for(const key of ['Enter',' '])await p.el(id).fire('keydown',{key,preventDefault(){prevented.push(key);}});
    assert.deepEqual(prevented,['Enter'],id);
  }
  box.checked=true;await box.fire('change');
  assert.deepEqual(p.messages.at(-1),{type:'protect',tabId:12,protected:true});
  assert.equal(p.el('tabStatus').textContent,'Tab protection updated.');
  await p.el('refresh').fire('click');await flush();
  assert.equal(p.messages.filter(m=>m.type==='status'&&m.includeTabs).length,2);
  assert.equal(p.el('tabs').children[1].children[0].checked,true);
});

test('sync: each setting turns on and off separately, right away',async t=>{
  const p=page(t,{policy:{appearance:true}});await import(`../options.js?sync-basic=${Math.random()}`);await flush();
  assert.deepEqual(p.boxes.filter(b=>b.checked).map(b=>b.dataset.sync),['appearance']);
  assert.equal(p.el('syncList').disabled,false);
  p.box('delayMinutes').checked=true;await p.box('delayMinutes').fire('change');await flush();
  assert.deepEqual(p.messages.at(-1),{type:'sync-enable',key:'delayMinutes'});
  assert.equal(p.el('syncStatus').textContent,'Park windows after now syncs.');
  assert(p.box('delayMinutes').checked&&!p.box('exclusions').checked);
  p.box('appearance').checked=false;await p.box('appearance').fire('change');await flush();
  assert.deepEqual(p.messages.at(-1),{type:'sync-disable',key:'appearance'});
  assert.equal(p.el('syncStatus').textContent,'Theme now stays on this computer.');
});

test('sync: a different shared value needs an explicit choice, and Cancel changes nothing',async t=>{
  const p=page(t,{settings:{...DEFAULTS,delayMinutes:15},synced:{delayMinutes:60,sleepingMode:'immediate'}});
  await import(`../options.js?sync-conflict=${Math.random()}`);await flush();
  const b=p.box('delayMinutes');b.checked=true;await b.fire('change');await flush();
  assert.equal(p.el('syncChoice').hidden,false);assert.equal(p.el('syncList').disabled,true);
  assert.equal(p.el('syncChoiceText').textContent,'Park windows after is 15 minutes here and 1 hour in sync. Which should all your computers use?');
  assert.equal(p.el('useSynced').textContent,'Use synced: 1 hour');assert.equal(p.el('useLocal').textContent,'Use this computer’s: 15 minutes');
  assert(p.el('useSynced').focused);
  await p.el('cancelSync').fire('click');
  assert.equal(b.checked,false);assert.equal(p.el('syncChoice').hidden,true);assert.equal(p.el('syncStatus').textContent,'Nothing changed.');
  assert(!p.messages.some(m=>m.type==='sync-resolve'));
  // Choosing the synced value updates the effective value and the unedited field.
  b.checked=true;await b.fire('change');await flush();await p.el('useSynced').fire('click');await flush();
  assert.deepEqual(p.messages.at(-1),{type:'sync-resolve',key:'delayMinutes',use:'synced'});
  assert.equal(p.el('delayMinutes').value,60);assert.equal(p.el('delayPreset').value,'60');assert(b.checked);
  const s=p.box('sleepingMode');s.checked=true;await s.fire('change');await flush();await p.el('useLocal').fire('click');await flush();
  assert.deepEqual(p.messages.at(-1),{type:'sync-resolve',key:'sleepingMode',use:'local'});assert.equal(p.el('sleepingMode').value,'chrome');
});

test('sync: failures are explained and leave the setting local',async t=>{
  const p=page(t,{synced:{tooLarge:true}});await import(`../options.js?sync-error=${Math.random()}`);await flush();
  const b=p.box('exclusions');b.checked=true;await b.fire('change');await flush();
  assert.equal(b.checked,false);assert(p.el('syncStatus').classes.has('error'));
  assert.equal(p.el('syncStatus').textContent,'Sites to exclude is too long to sync, so it stays on this computer.');
  p.setNotice({keys:['exclusions'],reason:'too-large'});await p.el('settings').fire('submit');await flush();
  assert.equal(p.el('syncStatus').textContent,'Sites to exclude is too long to sync, so it stays on this computer.');
});

test('changes from another page or computer update only fields you have not edited',async t=>{
  const p=page(t);await import(`../options.js?remote=${Math.random()}`);await flush();
  p.el('dwellSeconds').value='5'; // an unsaved edit
  p.remote({...p.stored(),delayMinutes:30,dwellSeconds:9,sleepingMode:'immediate',appearance:'light'});
  assert.equal(p.el('delayMinutes').value,30);assert.equal(p.el('sleepingMode').value,'immediate');
  assert.equal(p.el('sleepingHelp').textContent,'Unload eligible tabs as soon as their window is parked.');
  assert.equal(p.el('dwellSeconds').value,'5','your edit is kept');assert.deepEqual(p.checked(),['light']);
});
