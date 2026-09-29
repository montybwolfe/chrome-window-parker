import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,copy} from './helpers.js';
import {DEFAULTS,validateSettings} from '../settings.js';
const options={id:'test',url:'chrome-extension://test/options.html'};

for(const sleepingMode of ['chrome','immediate'])for(const discarded of [false,true])
test(`${sleepingMode}: restores saved tab when Chrome discarded=${discarded}, preserving other tabs`,async()=>{
 const h=harness();h.local.settings={sleepingMode};h.tab(201).discarded=true;await h.restart();
 const before=copy(h.windows[1]);await h.parkAll();assert(h.p.states[2].parked);
 assert.equal(h.calls.filter(c=>c[0]==='discard').length,sleepingMode==='chrome'?0:5);
 assert.deepEqual(h.windows[1].tabs.slice(0,3).map(t=>[t.id,t.url,t.index,t.pinned,t.groupId]),before.tabs.map(t=>[t.id,t.url,t.index,t.pinned,t.groupId]));
 h.tab(200).discarded=discarded;const parking=h.p.states[2].parkingId;
 await h.focus(2);await h.advance(2000);assert(h.tab(200).active);assert(!h.tab(parking));assert(h.tab(201).discarded);assert.equal(!!h.tab(202).discarded,sleepingMode==='immediate');
});
test('new installs, old settings and invalid stored enums use Chrome and Auto; reset persists both',async()=>{
 for(const settings of [undefined,{delayMinutes:30},{sleepingMode:'invalid',appearance:'broken'}]){
  const h=harness();if(settings)h.local.settings=settings;await h.restart();assert.equal(h.p.settings.sleepingMode,'chrome');assert.equal(h.p.settings.appearance,'auto');
  await h.p.configure({...h.p.settings,sleepingMode:'immediate',appearance:'dark'});await h.restart();assert.equal(h.p.settings.appearance,'dark');assert.equal(h.p.settings.sleepingMode,'immediate');
  await h.p.message({type:'reset'},options);await h.restart();assert.deepEqual(h.p.settings,DEFAULTS);
 }
 for(const settings of [{sleepingMode:'x'},{appearance:'x'}])assert.throws(()=>validateSettings(settings));
});
for(const cleanup of ['automatic','manual','clear','closed','navigated'])
test(`stale parking messages after ${cleanup} finish quietly without further changes`,async()=>{
 const h=harness();await h.restart();await h.parkAll();const tab=copy(h.tab(h.p.states[2].parkingId));const sender={id:'test',url:tab.url,tab};
 if(cleanup==='automatic'){await h.focus(2);await h.advance(2000);}
 if(cleanup==='manual'){await h.focus(2);assert((await h.p.message({type:'restore'},sender)).restored);}
 if(cleanup==='clear')await h.p.message({type:'close-parked'},options);
 if(cleanup==='closed')await h.api.tabs.remove(tab.id);
 if(cleanup==='navigated')h.tab(tab.id).url='https://example.org';
 const calls=h.calls.length;
 for(const type of ['parked-info','restore'])assert.deepEqual(await h.p.message({type},sender),{gone:true});
 assert.equal(h.calls.length,calls);
});
test('stale handling preserves authentication and unexpected API errors',async()=>{
 const h=harness();await h.restart();await h.parkAll();const tab=copy(h.tab(h.p.states[2].parkingId));const sender={id:'test',url:tab.url,tab};
 await assert.rejects(()=>h.p.message({type:'configure'},{...sender}),/Unsupported parking action/);
 await assert.rejects(()=>h.p.message({type:'restore'},{...sender,id:'other'}),/Invalid sender/);
 const error=new TypeError('Unexpected API failure');h.hooks.getTab=()=>{throw error;};
 await assert.rejects(()=>h.p.message({type:'parked-info'},sender),e=>e===error);
});
test('switching sleeping mode does not discard already parked tabs; next cycle uses saved mode',async()=>{
 const h=harness();await h.restart();await h.parkAll();await h.p.configure({...h.p.settings,sleepingMode:'immediate'});await h.p.sweep();assert(!h.calls.some(c=>c[0]==='discard'));
 await h.focus(2);await h.p.restore(2);await h.parkAll();assert.deepEqual(h.calls.filter(c=>c[0]==='discard').map(c=>c[1]),[200,201,202]);
});
for(const sleepingMode of ['chrome','immediate'])for(const protection of ['individual','site'])test(`${sleepingMode}: selected ${protection} exclusion leaves window alone`,async()=>{
 const h=harness();h.local.settings={sleepingMode};await h.restart();
 if(protection==='individual')h.p.protectedIds=[200];else h.p.settings.exclusions=['example.com'];
 await h.advance(16*60000);await h.p.sweep();assert(!h.p.states[2].parked);assert.equal(h.calls.length,0);
});
