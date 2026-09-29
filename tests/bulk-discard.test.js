import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,copy} from './helpers.js';
const sender={id:'test',url:'chrome-extension://test/options.html'};
const discarded=h=>h.calls.filter(c=>c[0]==='discard').map(c=>c[1]);
async function setup(tabs=3,settings={}){const h=harness(2,tabs);h.local.settings={sleepingMode:'immediate',...settings};await h.restart();await h.advance(16*60000);return h;}
function move(h,id,to=1){const t=h.tab(id),from=h.windows.find(w=>w.id===t.windowId);from.tabs=from.tabs.filter(t=>t.id!==id);t.windowId=to;t.active=false;h.windows.find(w=>w.id===to).tabs.push(t);h.p.signalTab(from.id);h.p.signalTab(to);}

test('three loaded tabs are discarded after parking; the parking page alone stays active',async()=>{
 const h=await setup();const original=copy(h.windows[1]);await h.p.sweep();assert.deepEqual(discarded(h),[200,201,202]);
 assert(h.windows[1].tabs.slice(0,3).every(t=>t.discarded&&!t.active));assert(h.tab(h.p.states[2].parkingId).active);
 assert.deepEqual(h.windows[1].tabs.slice(0,3).map(t=>[t.id,t.index,t.pinned,t.groupId,t.url]),original.tabs.map(t=>[t.id,t.index,t.pinned,t.groupId,t.url]));
});
test('mixed eligibility skips each protected tab without blocking eligible neighbors',async()=>{
 const h=await setup(8);h.tab(201).discarded=true;h.tab(202).pinned=true;h.tab(203).audible=true;h.tab(204).url='https://meet.google.com/call';h.p.protectedIds=[205];h.tab(206).autoDiscardable=false;
 await h.p.sweep();assert.deepEqual(discarded(h),[200,207]);for(const id of [202,203,204,205,206])assert(!h.tab(id).discarded);assert(h.tab(201).discarded);
});
test('optional pinned and audio allowances apply independently to background candidates',async()=>{
 const h=await setup(3,{discardPinned:true,protectAudio:false});h.tab(201).pinned=true;h.tab(202).audible=true;await h.p.sweep();assert.deepEqual(discarded(h),[200,201,202]);assert(h.tab(201).pinned);
});
test('loaded-again tabs are reevaluated on the next cycle regardless of prior discard source',async()=>{
 const h=await setup(4);h.tab(202).discarded=true;await h.p.sweep();assert.deepEqual(discarded(h),[200,201,203]);
 await h.focus(2);await h.advance(2000);await h.api.tabs.update(202,{active:true});await h.p.activated(2,202);
 await h.api.tabs.update(201,{active:true});await h.p.activated(2,201);const start=discarded(h).length;
 await h.focus(-1);await h.advance(16*60000);await h.p.sweep();assert.deepEqual(discarded(h).slice(start),[100,101,102,103,200,201,202]);assert(h.tab(203).discarded);
});
for(const [name,mutation] of Object.entries({
 pinned:h=>{h.tab(201).pinned=true;},audio:h=>{h.tab(201).audible=true;},protected:h=>{h.p.protectedIds.push(201);},
 excluded:h=>{h.tab(201).url='https://meet.google.com/call';},loading:h=>{h.tab(201).status='loading';h.p.signalTab(2);},
 pending:h=>{h.tab(201).pendingUrl='https://example.org/new';},nonDiscardable:h=>{h.tab(201).autoDiscardable=false;},
 split:h=>{h.tab(201).splitViewId=1;},internal:h=>{h.tab(201).url='chrome://settings';},
 moved:h=>move(h,201),closed:async h=>{await h.api.tabs.remove(201);h.p.signalTab(2);},
 chromeFirst:h=>{h.tab(201).discarded=true;}
}))test(`fresh candidate eligibility after first discard: ${name}`,async()=>{
 const h=await setup();h.hooks.discard=async t=>{if(t.id===200)await mutation(h);};await h.p.sweep();assert.deepEqual(discarded(h),[200,202]);
});
for(const stage of ['tab read','window read'])test(`candidate moved during final ${stage} is never discarded in its new window`,async()=>{
 const h=await setup();let done=false;
 if(stage==='tab read')h.hooks.getTab=id=>{if(id===201&&!done){done=true;move(h,201);}};
 else h.hooks.getWindow=()=>{if(h.tab(200).discarded&&!done){done=true;move(h,201);}};
 await h.p.sweep();assert.deepEqual(discarded(h),[200,202]);assert.equal(h.tab(201).windowId,1);assert(!h.tab(201).discarded);
});
test('new background tab created mid-batch is excluded from its snapshot',async()=>{
 const h=await setup();let newId;h.hooks.discard=async t=>{if(t.id===200)newId=(await h.api.tabs.create({windowId:2,active:false,url:'https://example.org/new'})).id;};
 await h.p.sweep();assert.deepEqual(discarded(h),[200,201,202]);assert(!h.tab(newId).discarded);
});
for(const refusal of ['Cannot discard tab with id: 201','Tabs cannot be edited right now','No tab with id: 201'])test(`normal per-tab refusal continues safe candidates: ${refusal}`,async()=>{
 const h=await setup();h.hooks.discard=t=>{if(t.id===201)throw Error(refusal);};await h.p.sweep();assert.deepEqual(discarded(h),[200,201,202]);assert(!h.tab(201).discarded);assert(h.tab(202).discarded);
});
test('Chrome winning the actual discard call remains asleep without retries',async()=>{
 const h=await setup();h.hooks.discard=t=>{if(t.id===201){t.discarded=true;throw Error('Cannot discard tab with id: 201');}};
 await h.p.sweep();assert.deepEqual(discarded(h),[200,201,202]);assert(h.tab(201).discarded);assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
});
for(const [name,mutation] of Object.entries({
 focus:h=>{h.windows[1].focused=true;h.p.signalFocus(2);},
 focusRoundTrip:h=>{h.p.signalFocus(2);h.p.signalFocus(-1);},
 selectReal:async h=>{await h.api.tabs.update(201,{active:true});h.p.signalTab(2,201);},
 selectionRoundTrip:async h=>{await h.api.tabs.update(201,{active:true});h.p.signalTab(2,201);await h.api.tabs.update(h.p.states[2].parkingId,{active:true});h.p.signalTab(2,h.p.states[2].parkingId);},
 settings:h=>{h.p.safetyEpoch++;},pause:h=>{h.p.settings.enabled=false;},mode:h=>{h.p.settings.sleepingMode='chrome';},
 download:h=>{h.hooks.downloading=true;},sleep:h=>h.jump(3600000),clockBack:h=>h.jump(-10000),
 parkingNavigation:h=>{h.tab(h.p.states[2].parkingId).url='https://example.org/real';},
 parkingPending:h=>{h.tab(h.p.states[2].parkingId).pendingUrl='https://example.org/real';},
 parkingMoved:h=>move(h,h.p.states[2].parkingId)
}))test(`whole-operation invalidation stops remaining candidates: ${name}`,async()=>{
 const h=await setup();h.hooks.discard=async t=>{if(t.id===200)await mutation(h);};await h.p.park(2);assert.deepEqual(discarded(h),[200]);
});
test('parking-page navigation during final candidate lookup prevents that discard',async()=>{
 const h=await setup();h.hooks.getTab=id=>{if(id===201)h.tab(h.p.states[2].parkingId).url='https://example.org/real';};await h.p.park(2);assert.deepEqual(discarded(h),[200]);
});
test('download safety is checked again between candidates and fails closed',async()=>{
 const h=await setup();h.hooks.discard=t=>{if(t.id===200)h.hooks.downloads=()=>{throw Error('Download query unavailable');};};await h.p.park(2);assert.deepEqual(discarded(h),[200]);
});
test('slow final API response invalidates the candidate snapshot before discard',async()=>{
 const h=await setup();h.hooks.getTab=id=>{if(id===201)h.jump(6000);};await h.p.park(2);assert.deepEqual(discarded(h),[200]);
});
for(const newSession of [false,true])test(`interrupted batch is never resumed by replacement worker; new session=${newSession}`,async()=>{
 const h=await setup();const stopped=new Error('Worker terminated');h.hooks.discard=t=>{if(t.id===200){t.discarded=true;throw stopped;}};
 // Simulate termination after an API side effect by aborting the subsequent read.
 h.hooks.getTab=id=>{if(id===200&&h.tab(id).discarded)throw stopped;};
 await assert.rejects(()=>h.p.park(2),e=>e===stopped);h.hooks.getTab=null;h.hooks.discard=null;const count=h.calls.length;
 await h.restart(newSession);await h.p.sweep();assert.equal(h.calls.length,count);assert(h.tab(200).discarded);assert(!h.tab(201).discarded);assert(h.p.states[2].parked);
});
test('Chrome-managed mode explicitly discards zero candidates in the same multi-tab setup',async()=>{
 const h=await setup(6,{sleepingMode:'chrome'});h.tab(201).discarded=true;await h.p.sweep();assert.deepEqual(discarded(h),[]);assert(h.p.states[2].parked);assert(h.tab(201).discarded);assert(!h.tab(202).discarded);
});
test('changing policy or protection while parked does not retroactively discard or wake tabs',async()=>{
 const h=await setup(3,{sleepingMode:'chrome'});await h.p.sweep();await h.p.configure({...h.p.settings,sleepingMode:'immediate'});await h.p.sweep();assert.deepEqual(discarded(h),[]);
 await h.focus(2);await h.advance(2000);await h.focus(-1);await h.advance(16*60000);await h.p.sweep();const before=copy(h.windows),calls=h.calls.length;
 await h.p.configure({...h.p.settings,sleepingMode:'chrome',exclusions:['example.com']});await h.p.message({type:'protect',tabId:201,protected:true},sender);await h.p.sweep();assert.equal(h.calls.length,calls);assert.deepEqual(h.windows,before);
});
for(const mode of ['chrome','immediate'])for(const enabled of [true,false])test(`Clear eight windows preserves background states and activates one target each: ${mode}, enabled=${enabled}`,async()=>{
 const h=harness(8,4);h.local.settings={sleepingMode:mode};await h.restart();await h.parkAll();
 for(const w of h.windows){w.tabs[0].discarded=true;w.tabs[1].discarded=true;w.tabs[2].discarded=false;}
 await h.p.configure({...h.p.settings,enabled});const start=h.calls.length;const neighbors=h.windows.map(w=>w.tabs.slice(1,4).map(copy));
 const result=await h.p.closeParkedTabs();assert.equal(result.closed,8);assert.equal(result.remaining,0);assert.equal(h.p.settings.enabled,enabled);
 const actions=h.calls.slice(start);assert(!actions.some(c=>c[0]==='discard'));assert.equal(actions.filter(c=>c[0]==='update').length,8);
 h.windows.forEach((w,i)=>{assert(w.tabs[0].active&&!w.tabs[0].discarded);assert.deepEqual(w.tabs.slice(1),neighbors[i]);});assert.deepEqual(h.local.parkingRecords,{});
});
for(const mode of ['chrome','immediate'])test(`Clear restores the remembered loaded tab without selecting a different loaded neighbor: ${mode}`,async()=>{
 const h=await setup(3,{sleepingMode:mode});await h.p.sweep();h.tab(200).discarded=false;h.tab(201).discarded=false;h.tab(202).discarded=true;const start=h.calls.length;
 await h.p.closeParkedTabs();assert.deepEqual(h.calls.slice(start).filter(c=>c[0]==='update').map(c=>c[1]),[200]);assert(!h.calls.slice(start).some(c=>c[0]==='discard'));assert(h.tab(202).discarded);assert(!h.tab(201).discarded);
});
for(const action of ['restore','clear'])test(`${action} never follows a remembered tab moved to another window`,async()=>{
 const h=await setup();await h.p.sweep();move(h,200);const start=h.calls.length;
 if(action==='restore'){await h.focus(2);await h.advance(2000);}else await h.p.closeParkedTabs();
 assert(h.tab(201).active);assert(!h.tab(200).active);assert(h.tab(200).discarded);assert.deepEqual(h.calls.slice(start).filter(c=>c[0]==='update').map(c=>c[1]),[201]);
});
test('Clear cannot activate a second target after its first successful activation disappears',async()=>{
 const h=await setup();await h.p.sweep();h.hooks.update=t=>{if(t.id===200){move(h,200);h.windows[1].tabs.forEach(t=>{t.active=false;});}};const start=h.calls.length;
 const result=await h.p.closeParkedTabs();assert.equal(result.remaining,1);assert.deepEqual(h.calls.slice(start).filter(c=>c[0]==='update').map(c=>c[1]),[200]);assert(h.tab(201).discarded);
});
test('minimized windows and app-focus transitions preserve dwell and placement',async()=>{
 const h=await setup();h.windows[1].state='minimized';await h.focus(-1);await h.p.sweep();assert(h.p.states[2].parked);assert.equal(h.windows[1].state,'minimized');
 for(let i=0;i<3;i++){await h.focus(2);await h.advance(300);await h.focus(-1);await h.advance(300);}assert(h.tab(200).discarded);
 await h.focus(2);await h.advance(2000);assert(h.tab(200).active);assert(h.tab(201).discarded);assert.equal(h.windows[1].state,'minimized');
});
test('focus signal refreshes last-use before an older queued sweep can park the window just left',async()=>{
 const h=harness();h.local.settings={sleepingMode:'immediate'};await h.restart();await h.advance(2000);assert(h.p.states[1].qualified);
 h.jump(16*60000);h.windows[0].focused=false;h.windows[1].focused=true;h.p.signalFocus(2);
 // A sweep queued before focusChanged may run first, after the synchronous signal.
 await h.p.sweep();assert(!h.p.states[1].parked);assert.equal(h.p.states[1].lastUse,h.clock.now());assert.deepEqual(discarded(h),[]);
});
