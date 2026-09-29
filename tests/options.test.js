import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS, validateSettings} from '../settings.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('options.html'), css=read('ui.css');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Settings hierarchy: tab protection (with individual tabs), diagnostics, save/reset, then support',()=>{
  const at=marker=>{const i=html.indexOf(marker);assert(i>=0,marker);return i;};
  const order=['id="enabled"','id="timing-heading"','id="protection-heading"','id="discardPinned"','id="protectAudio"',
    'id="exclusions"','Calls, video and unsaved work','id="individual"','id="diagnostics-heading"','id="save"','id="reset"','id="support-heading"'];
  assert.deepEqual(order.map(at),order.map(at).toSorted((a,b)=>a-b));
  // Individual tabs sit inside the Tab protection section, outside any settings
  // fieldset that is disabled while settings load or save.
  const section=html.slice(at('aria-labelledby="protection-heading"'));
  assert(section.indexOf('id="individual"')<section.indexOf('</section>'));
  const before=html.slice(0,at('id="individual"'));
  assert(before.lastIndexOf('</fieldset>')>before.lastIndexOf('<fieldset'));
  // No ordinary setting follows Save/Reset; Support is the final section.
  assert(!/<(input|select|textarea)\b/.test(html.slice(at('id="reset"'),at('id="support-heading"'))));
  assert.equal(html.slice(at('id="support-heading"')).indexOf('<section'),-1);
  // Every element options.js looks up still exists.
  for(const [,id] of read('options.js').matchAll(/\$\('([^']+)'\)/g))assert(html.includes(`id="${id}"`),id);
});

test('theme is a compact labelled three-state icon control, not a standalone section',()=>{
  assert(!html.includes('appearance-heading')&&!/<select[^>]+id="appearance"/.test(html));
  const radios=[...html.matchAll(/<label class="theme-option" title="([^"]+)"><input type="radio" name="appearance" value="(\w+)" aria-label="([^"]+)"><svg[^>]*aria-hidden="true"/g)];
  assert.deepEqual(radios.map(m=>m[2]),['light','dark','auto']);
  assert.deepEqual(radios.map(m=>m[3]),['Light theme','Dark theme','Auto theme']);
  assert(radios.every(m=>m[1].startsWith(m[3])),'tooltips name each state');
  assert(html.indexOf('theme-switch')<html.indexOf('<form'),'placed in the header');
  assert.match(css,/\.theme-option:has\(input:checked\)/);assert.match(css,/\.theme-option:has\(input:focus-visible\)/);
  assert(!/\sstyle=/.test(html),'CSP forbids inline styles');
});

test('a long individual-tab list scrolls inside its own bounded panel',()=>{
  assert.match(html,/<div id="tabs" class="tab-list" role="group" aria-label="Open tabs">/);
  const rule=css.match(/\.tab-list \{([^}]+)\}/)[1];
  assert.match(rule,/max-height: min\(\d+px, \d+vh\)/);assert.match(rule,/overflow-y: auto/);
  assert.match(css,/\.tab-title \{[^}]*-webkit-line-clamp: 2/);
});

function page(t,{settings={...DEFAULTS,appearance:'dark'},fail=false}={}){
  const elements=new Map(),messages=[];
  const listeners=()=>({addEventListener(type,fn){(this.on[type]||=[]).push(fn);},on:{},fire(type,e={}){return Promise.all((this.on[type]||[]).map(fn=>fn({preventDefault(){},isTrusted:true,detail:1,...e})));}});
  const node=(props={})=>({...listeners(),disabled:false,hidden:false,checked:false,value:'',textContent:'',title:'',className:'',children:[],
    classList:{add(){},remove(){}},append(...kids){this.children.push(...kids);},replaceChildren(){this.children=[];this.textContent='';},...props});
  const el=id=>{if(!elements.has(id))elements.set(id,node({id}));return elements.get(id);};
  const themes=['light','dark','auto'].map(value=>node({value,name:'appearance'}));
  const groups=[1,2,3,4].map(()=>node({disabled:true}));
  const tabs=[{id:11,windowId:1,title:'Research'},{id:12,windowId:2,title:'x'.repeat(400)}];
  let stored=validateSettings(settings),protectedIds=[];
  const old={document:globalThis.document,chrome:globalThis.chrome};
  globalThis.document={getElementById:el,createElement:()=>node(),
    querySelectorAll:selector=>selector==='input[name=appearance]'?themes:selector==='.settings-fields'?groups:[]};
  globalThis.chrome={runtime:{async sendMessage(msg){
    messages.push(structuredClone(msg));
    if(msg.type==='settings')return fail?{ok:false,error:'Worker unavailable'}:{ok:true,data:stored};
    if(msg.type==='configure'){stored=validateSettings(msg.settings);return {ok:true,data:stored};}
    if(msg.type==='reset'){stored=validateSettings({...DEFAULTS});return {ok:true,data:stored};}
    if(msg.type==='status')return {ok:true,data:{tabs,protectedIds}};
    if(msg.type==='protect'){protectedIds=msg.protected?[msg.tabId]:[];return {ok:true,data:{protected:msg.protected}};}
    return {ok:false,error:'unexpected'};
  }},tabs:{create:async()=>({})}};
  t.after(()=>Object.assign(globalThis,old));
  const choose=value=>{for(const r of themes)r.checked=r.value===value;};
  return {el,themes,groups,messages,choose,stored:()=>stored,checked:()=>themes.filter(r=>r.checked).map(r=>r.value)};
}

test('theme control reflects the saved value and saves each of the three states with the form',async t=>{
  const p=page(t);await import(`../options.js?theme=${Math.random()}`);await flush();
  assert.deepEqual(p.checked(),['dark']);assert(p.groups.every(g=>!g.disabled));
  for(const value of ['light','auto','dark']){
    const saved=p.stored().appearance;assert.notEqual(saved,value);
    p.choose(value);await flush();assert.equal(p.stored().appearance,saved,'choosing alone does not save');
    await p.el('settings').fire('submit');await flush();
    assert.equal(p.messages.at(-1).type,'configure');assert.equal(p.messages.at(-1).settings.appearance,value);
    assert.equal(p.stored().appearance,value);assert.deepEqual(p.checked(),[value]);
  }
  assert.deepEqual(Object.keys(p.messages.at(-1).settings).toSorted(),Object.keys(DEFAULTS).toSorted());
  await p.el('reset').fire('click');await flush();
  assert.deepEqual(p.checked(),['auto']);assert.equal(p.el('status').textContent,'Defaults restored. Tab exclusions are unchanged.');
});

test('individual tabs: refresh lists every tab, checkboxes protect immediately and survive a settings load failure',async t=>{
  const p=page(t,{fail:true});await import(`../options.js?individual=${Math.random()}`);await flush();
  assert.equal(p.el('loadError').hidden,false);assert(p.groups.every(g=>g.disabled),'settings stay locked');
  p.el('individual').open=true;await p.el('individual').fire('toggle');await flush();
  const rows=p.el('tabs').children;assert.equal(rows.length,2);
  const [box,text]=rows[1].children;assert.equal(text.children[0].className,'tab-title');
  assert.equal(text.children[0].textContent.length,400);assert.equal(rows[1].title.length,400);
  assert.equal(text.children[1].textContent,'Window 2');assert.equal(box.disabled,false);
  // Enter on a tab checkbox must not implicitly submit (save) the settings form; Space still toggles.
  const prevented=[];for(const key of ['Enter',' '])await p.el('tabs').fire('keydown',{key,preventDefault(){prevented.push(key);}});
  assert.deepEqual(prevented,['Enter']);
  box.checked=true;await box.fire('change');
  assert.deepEqual(p.messages.at(-1),{type:'protect',tabId:12,protected:true});
  assert.equal(p.el('tabStatus').textContent,'Tab protection updated.');
  await p.el('refresh').fire('click');await flush();
  assert.equal(p.messages.filter(m=>m.type==='status'&&m.includeTabs).length,2);
  assert.equal(p.el('tabs').children[1].children[0].checked,true);
});
