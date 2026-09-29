import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesRule,validateSettings} from '../settings.js';
import {harness} from './helpers.js';

test('plain meeting domain covers pages and subdomains; advanced URL limits the path',()=>{
  assert.deepEqual(validateSettings({exclusions:['meet.google.com']}).exclusions,['meet.google.com']);
  for(const url of ['https://meet.google.com/abc-defg-hij','https://meet.google.com/anything?x=1',
    'http://meet.google.com/','https://sub.meet.google.com/room'])assert(matchesRule(url,'meet.google.com'));
  assert(!matchesRule('https://meet.google.com.evil.example/','meet.google.com'));
  assert(matchesRule('https://example.com/work/project','https://example.com/work/*'));
  assert(!matchesRule('https://example.com/personal/project','https://example.com/work/*'));
});

for(const sleepingMode of ['chrome','immediate'])test(`${sleepingMode}: selected exclusion is per-window; background exclusion is per-tab`,async()=>{
  const h=harness(3,2);h.local.settings={sleepingMode,exclusions:['meet.google.com']};
  h.tab(100).url='https://meet.google.com/abc-defg-hij';h.tab(201).url='https://meet.google.com/another-room';
  await h.restart();await h.parkAll();
  assert(!h.p.states[1].parked);assert(h.p.states[2].parked);assert(h.p.states[3].parked);
  const discarded=h.calls.filter(c=>c[0]==='discard').map(c=>c[1]);
  assert.deepEqual(discarded,sleepingMode==='chrome'?[]:[200,300,301]);
  // The extension does not own Chrome Memory Saver: a native discard remains
  // authoritative even for an excluded background tab.
  h.tab(201).discarded=true;await h.p.sweep();assert(h.tab(201).discarded);
});
