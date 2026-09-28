import {Parker} from '../engine.js';
export const copy = value => structuredClone(value);
export function harness(count = 2, tabsPerWindow = 3) {
  let now = 1_000_000, nextId = 10000;
  const timers = new Map(), alarms = new Map(), local = {}, session = {}, calls = [];
  const windows = Array.from({length: count}, (_,i) => ({id:i+1, type:'normal', incognito:false, focused:i===0,
    left:100*i, top:40, width:900, height:700, state:'normal',
    tabs:Array.from({length:tabsPerWindow},(_,j) => ({id:(i+1)*100+j, windowId:i+1, index:j, active:j===0,
      url:`https://example.com/${i}/${j}`, title:`Tab ${i}/${j}`, status:'complete', autoDiscardable:true,
      audible:false, pinned:false, discarded:false, groupId:j>0?10+i:-1}))}));
  const tab = id => windows.flatMap(w=>w.tabs).find(t=>t.id===id);
  const hooks = {};
  const store = data => ({get:async keys => Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,copy(data[k])])),
    set:async values => {Object.assign(data,copy(values));}});
  const api = {
    runtime:{id:'test',getURL:path=>`chrome-extension://test/${path}`},
    storage:{local:store(local),session:store(session)},
    windows:{getAll:async()=>copy(windows),get:async id=>{await hooks.getWindow?.(id); const w=windows.find(w=>w.id===id); if(!w)throw Error('No window with id: '+id); return copy(w);}},
    tabs:{get:async id=>{await hooks.getTab?.(id); if(!tab(id))throw Error('No tab with id: '+id); return copy(tab(id));},
      create:async props=>{calls.push(['create',copy(props)]); const w=windows.find(w=>w.id===props.windowId); const t={id:nextId++,windowId:w.id,index:w.tabs.length,...props,autoDiscardable:true,status:'complete'};w.tabs.push(t);await hooks.create?.(t);return copy(t);},
      update:async(id,props)=>{calls.push(['update',id,copy(props)]); const t=tab(id);if(!t)throw Error('No tab with id: '+id);
        if(props.active)for(const candidate of windows.find(w=>w.id===t.windowId).tabs)candidate.active=candidate.id===id;
        Object.assign(t,props);if(props.active)t.discarded=false;await hooks.update?.(t);return copy(t);},
      discard:async id=>{calls.push(['discard',id]);const t=tab(id);if(!t||t.active)throw Error('not eligible');await hooks.discard?.(t);t.discarded=true;return copy(t);}},
    downloads:{search:async()=>{await hooks.downloads?.();return hooks.downloading?[{id:1}]:[];}},
    alarms:{get:async name=>{const alarm=alarms.get(name);return alarm?{name,scheduledTime:alarm.when}:undefined;},create:async(name,props)=>{alarms.set(name,copy(props));},clear:async name=>alarms.delete(name)}
  };
  let p;
  const clock = {now:()=>now,setTimeout:(fn,ms)=>{const id=nextId++;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
  const restart = async (newSession=false)=>{timers.clear(); if(newSession)delete session.runtimeState; p=new Parker(api,clock,f=>f());await p.init();return p;};
  const advance=async ms=>{const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);await due[1].fn();}now=end;};
  const focus=async id=>{for(const w of windows)w.focused=w.id===id;const epoch=p.signalFocus(id);await p.focusChanged(id,now,epoch);};
  const parkAll=async()=>{await focus(-1);await advance(16*60000);await p.sweep();};
  return {api,windows,tab,hooks,calls,local,session,alarms,timers,clock,restart,advance,focus,parkAll,get p(){return p;},jump:ms=>{now+=ms;}};
}
