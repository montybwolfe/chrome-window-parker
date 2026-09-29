// Local test double only. No extension APIs or real user tabs are accessed.
import {harness, copy} from '../helpers.js';
import {systemClock} from '../../clock.js';
const h=harness(2,3);
h.tab(201).discarded=true;h.tab(202).discarded=true;
h.tab(100).title='Example research tab';h.tab(200).title='Project notes';
function event(){const listeners=[];return {addListener(fn){listeners.push(fn);},emit(...args){for(const fn of listeners)fn(...args);}};}
for(const [namespace,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))for(const name of names)h.api[namespace][name]=event();
// Correct native-like receiver checks make detached namespace calls fail too.
for(const owner of [h.api.runtime,h.api.windows,h.api.tabs,h.api.storage.local,h.api.storage.session,h.api.alarms,h.api.downloads])
 for(const [key,method] of Object.entries(owner))if(typeof method==='function')owner[key]=function(...args){if(this!==owner)throw new TypeError(`Illegal invocation: ${key}`);return method.apply(owner,args);};
const originalSet=h.api.storage.local.set;
h.api.storage.local.set=async function(values){await originalSet.call(this,values);postMessage({kind:'persist',value:copy(values)});};
globalThis.chrome=h.api;
let parkingTab;
onmessage=async({data})=>{
 try{
  if(data.type==='bootstrap'){
   Object.assign(h.local,data.seed||{});
   if(data.page==='parked.html'){
    // Keep the simulated window unfocused so the HTTP preview stays parked.
    h.windows[0].focused=false;
    h.windows[0].tabs.forEach(t=>{t.active=false;t.discarded=true;});
    parkingTab=await h.api.tabs.create({windowId:1,active:true,url:'chrome-extension://test/parked.html#browser-test-token'});
    h.local.parkingRecords={'browser-test-token':{url:h.tab(100).url,title:'Research notes — Project Atlas',index:0,occurrence:0,updated:Date.now()}};
   }
   if(data.page==='popup.html'){
    h.tab(200).active=false;h.tab(200).discarded=true;
    await h.api.tabs.create({windowId:2,active:true,url:'chrome-extension://test/parked.html#popup-test-token'});
    h.local.parkingRecords={...h.local.parkingRecords,'popup-test-token':{url:h.tab(200).url,title:'Project notes',index:0,occurrence:0,updated:Date.now()}};
   }
   await import('../../background.js');postMessage({kind:'ready'});return;
  }
  if(data.type==='storage-get'){postMessage({kind:'reply',id:data.id,response:{ok:true,data:{settings:h.local.settings}}});return;}
  if(data.type==='repro'){
   const legacy={setTimeout,clearTimeout};const results=[];
   for(const method of ['setTimeout','clearTimeout']){
    try{if(method==='setTimeout')legacy.setTimeout(()=>{},1);else legacy.clearTimeout(123);results.push(`${method}: unexpectedly accepted`);}
    catch(error){results.push(`Legacy ${method}: ${error.name}: ${error.message}`);}
   }
   const id=systemClock.setTimeout(()=>{},10);systemClock.clearTimeout(id);
   await new Promise(resolve=>systemClock.setTimeout(resolve,10));
   results.push('Fixed wrappers: schedule, cancel and callback passed with native worker timers.');
   postMessage({kind:'reply',id:data.id,response:{ok:true,data:results.join('\n')}});return;
  }
  if(data.type==='message'&&data.message.type==='restore'&&parkingTab){h.windows[0].focused=true;h.api.windows.onFocusChanged.emit(1);}
  if(data.type==='message')h.api.runtime.onMessage.emit(data.message,{id:'test',url:`chrome-extension://test/${data.page}`,tab:parkingTab},response=>postMessage({kind:'reply',id:data.id,response}));
 }catch(error){postMessage({kind:'reply',id:data.id,response:{ok:false,error:error.stack}});}
};
