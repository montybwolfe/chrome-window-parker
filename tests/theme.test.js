import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../theme.js',import.meta.url),'utf8');
const event=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...a)=>[...listeners].forEach(f=>f(...a)),listeners};};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function page(appearance,systemDark=false,changes=event(),deferred){
 const media=event(),hide=event(),root={dataset:{}};
 const system={matches:systemDark,addEventListener:(_,f)=>media.addListener(f),removeEventListener:(_,f)=>media.removeListener(f)};
 vm.runInNewContext(source,{document:{documentElement:root},matchMedia:()=>system,window:{addEventListener:(_,f)=>hide.addListener(f)},chrome:{storage:{onChanged:changes,local:{get:()=>deferred||Promise.resolve({settings:{appearance}})}}}});
 return {root,media,hide,changes,system,theme:()=>root.dataset.theme};
}
for(const pref of [undefined,'invalid','auto','light','dark'])for(const dark of [false,true])test(`theme ${pref} / system dark=${dark}`,async()=>{
 const p=page(pref,dark);assert('themePending' in p.root.dataset);await flush();assert(!('themePending' in p.root.dataset));
 const forced=['light','dark'].includes(pref);assert.equal(p.theme(),forced?pref:dark?'dark':'light');p.system.matches=!dark;p.media.emit();assert.equal(p.theme(),forced?pref:dark?'light':'dark');
 p.hide.emit();assert.equal(p.changes.listeners.size,0);assert.equal(p.media.listeners.size,0);
});
test('saved appearance updates all open pages; reset returns each to its system preference',async()=>{
 const changes=event();const pages=[page('auto',false,changes),page('auto',true,changes),page('auto',false,changes)];await flush();
 changes.emit({settings:{newValue:{appearance:'dark'}}},'local');assert(pages.every(p=>p.theme()==='dark'));
 changes.emit({settings:{newValue:{appearance:'light'}}},'local');assert(pages.every(p=>p.theme()==='light'));
 changes.emit({settings:{newValue:{appearance:'auto'}}},'local');assert.deepEqual(pages.map(p=>p.theme()),['light','dark','light']);
});
test('late initial storage read cannot overwrite a newer selection',async()=>{
 let resolve;const p=page('auto',false,event(),new Promise(r=>{resolve=r;}));p.changes.emit({settings:{newValue:{appearance:'dark'}}},'local');resolve({settings:{appearance:'light'}});await flush();assert.equal(p.theme(),'dark');
});
test('storage read failure still paints using system preference',async()=>{
 const p=page('auto',true,event(),Promise.reject(new Error('read failed')));await flush();assert.equal(p.theme(),'dark');
});
