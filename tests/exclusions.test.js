import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,compareRules,matchesRule,simplifyRule,validateSettings} from '../settings.js';
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

test('factory sites are already in Sort A–Z order, using the same comparison as the button',()=>{
  assert.deepEqual(DEFAULTS.exclusions,['meet.google.com','music.youtube.com','teams.microsoft.com','zoom.us']);
  assert.deepEqual(DEFAULTS.exclusions.toSorted(compareRules),DEFAULTS.exclusions);
  assert.deepEqual(validateSettings({}).exclusions,DEFAULTS.exclusions,'a new installation starts in that order');
});

test('Sort A–Z orders by website, ignoring http(s)://, then by the rest; the text itself never changes',()=>{
  const rules=['zoom.us','https://example.com/account/*','meet.google.com','https://apple.com/work/*','music.youtube.com',
    'http://example.com/Zed','https://example.com/alpha','*.example.org','localhost:3000','Example.net'];
  const sorted=rules.toSorted(compareRules);
  assert.deepEqual(sorted,['https://apple.com/work/*','https://example.com/account/*','https://example.com/alpha','http://example.com/Zed',
    'Example.net','*.example.org','localhost:3000','meet.google.com','music.youtube.com','zoom.us']);
  assert.deepEqual(sorted.toSorted(compareRules),sorted,'sorting again changes nothing');
  assert.deepEqual(rules.toSorted().toSorted(compareRules),sorted,'the result does not depend on the starting order');
  // Full addresses don't all gather under "h", and entries for one site stay together.
  assert(sorted.indexOf('https://apple.com/work/*')<sorted.indexOf('meet.google.com'));
  // Ties are broken by the exact text, so distinct rules stay distinct and ordered.
  assert.deepEqual(['https://a.example/x','http://a.example/x','https://a.example/X'].toSorted(compareRules),['http://a.example/x','https://a.example/X','https://a.example/x']);
  const url='https://example.com/work/project';
  for(const rule of sorted)assert.equal(matchesRule(url,rule),matchesRule(url,rules[rules.indexOf(rule)]));
});

test('a pasted home-page address becomes the website; anything more specific is kept as it is',()=>{
  const cases=[['https://meet.google.com/','meet.google.com'],['https://www.example.com/','www.example.com'],
    ['http://localhost:3000/','localhost:3000'],['https://meet.google.com','meet.google.com'],['HTTPS://WWW.Example.COM/','www.example.com'],
    ['https://example.com:443/','example.com'],['http://example.com:80/','example.com'],['https://example.com:8443/','example.com:8443'],
    ['  zoom.us  ','zoom.us']];
  for(const [pasted,expected] of cases)assert.equal(simplifyRule(pasted),expected,pasted);
  for(const kept of ['https://example.com/work/','https://example.com/work/*','https://example.com/account/settings',
    'https://example.com/?q=1','https://example.com/#top','https://example.com?','https://*.example.com/','https://user@example.com/',
    'https://bücher.example/','https://[::1]:3000/','ftp://example.com/','example.com/work'])
    assert.equal(simplifyRule(kept),kept,kept);
  // The simplified form covers the whole site; a kept full address still covers only its part.
  assert(matchesRule('https://meet.google.com/abc-defg-hij',simplifyRule('https://meet.google.com/')));
  assert(!matchesRule('https://example.com/personal',simplifyRule('https://example.com/work/*')));
  for(const [pasted] of cases)assert.doesNotThrow(()=>validateSettings({exclusions:[simplifyRule(pasted)]}));
});

test('problems with a site are explained in plain words, with what to enter instead',()=>{
  for(const bad of ['exa$mple.com','ftp://example.com','https://'])
    assert.throws(()=>validateSettings({exclusions:[bad]}),new RegExp(`“${bad.replace(/[$/.*]/g,'\\$&')}” isn’t a website\\. Enter one such as example\\.com, or a full address such as https://example\\.com/work/\\*\\.`));
  assert.throws(()=>validateSettings({exclusions:['example .com']}),/Put one site on each line, without spaces/);
  for(const good of ['http://example.com/work/*','https://example.com/work/*','*://example.com/*','*.example.com','localhost:3000'])
    assert.doesNotThrow(()=>validateSettings({exclusions:[good]}),good);
});
