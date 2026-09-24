import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeenStore} from '../app/onboarding.js';

const KEY='myclover.house.onboarding.v1';
function storage(entries=[]) {
  const data=new Map(entries);
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),data};
}
const denied=()=>{throw new Error('Storage access denied');};
const record=outcome=>({seen:true,outcome});

test('first-time visitors are unseen and an explicit mark survives store recreation',()=>{
  const local=storage(),session=storage();
  const initial=createSeenStore({local,session,memory:new Map()});
  assert.equal(initial.hasSeen(),false);
  assert.equal(initial.read(),null);
  initial.mark();
  assert.equal(initial.hasSeen(),true);
  assert.deepEqual(initial.read(),record('seen'));
  const later=createSeenStore({local,session,memory:new Map()});
  assert.equal(later.hasSeen(),true);
  assert.deepEqual(later.read(),record('seen'));
});

test('both skipping and completing onboarding prevent an unsolicited repeat',()=>{
  for(const outcome of ['skipped','completed']) {
    const local=storage(),session=storage();
    createSeenStore({local,session,memory:new Map()}).mark(outcome);
    const later=createSeenStore({local,session,memory:new Map()});
    assert.equal(later.hasSeen(),true,outcome);
    assert.deepEqual(later.read(),record(outcome));
  }
});

test('denied localStorage getter falls back to sessionStorage across recreation',()=>{
  const session=storage();
  const make=()=>createSeenStore({local:denied,session:()=>session,memory:new Map()});
  const initial=make();
  assert.equal(initial.hasSeen(),false);
  assert.doesNotThrow(()=>initial.mark('skipped'));
  assert.deepEqual(make().read(),record('skipped'));
  assert.equal(make().hasSeen(),true);
});

test('a local quota failure uses session storage without reopening the guide',()=>{
  const local={getItem:()=>null,setItem:denied},session=storage();
  const make=()=>createSeenStore({local:()=>local,session:()=>session,memory:new Map()});
  assert.doesNotThrow(()=>make().mark('completed'));
  assert.deepEqual(make().read(),record('completed'));
});

test('a backend that allows writes but denies reads does not swallow the fallback record',()=>{
  const local={getItem:denied,setItem:()=>{}},session=storage();
  const make=()=>createSeenStore({local,session,memory:new Map()});
  make().mark('completed');
  assert.equal(make().hasSeen(),true);
  assert.deepEqual(make().read(),record('completed'));
});

test('blocked storage operations retain dismissal in the shared page memory',()=>{
  const blocked={getItem:denied,setItem:denied},memory=new Map();
  const initial=createSeenStore({local:()=>blocked,session:()=>blocked,memory});
  assert.equal(initial.hasSeen(),false);
  assert.doesNotThrow(()=>initial.mark('skipped'));
  const later=createSeenStore({local:denied,session:denied,memory});
  assert.equal(later.hasSeen(),true);
  assert.deepEqual(later.read(),record('skipped'));
  assert.equal(createSeenStore({local:denied,session:denied,memory:new Map()}).hasSeen(),false,'memory fallback is scoped to its page lifetime');
});

test('malformed or non-seen local data cannot override a valid session record',()=>{
  for(const corrupt of ['{broken','null','[]','true','{}','{"seen":false,"outcome":"completed"}','{"seen":"true"}']) {
    const local=storage([[KEY,corrupt]]),session=storage([[KEY,JSON.stringify(record('completed'))]]);
    const store=createSeenStore({local,session,memory:new Map()});
    assert.doesNotThrow(()=>store.read(),corrupt);
    assert.equal(store.hasSeen(),true,corrupt);
    assert.deepEqual(store.read(),record('completed'),corrupt);
  }
});

test('reading an unseen store does not silently mark or persist onboarding',()=>{
  let writes=0;
  const passive={getItem:()=>null,setItem:()=>{writes++;}};
  const store=createSeenStore({local:()=>passive,session:()=>passive,memory:new Map()});
  for(let i=0;i<3;i++) {
    assert.equal(store.hasSeen(),false);
    assert.equal(store.read(),null);
  }
  assert.equal(writes,0);
});
