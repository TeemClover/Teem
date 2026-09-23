import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {initialState, reduce} from '../app/state.js';

test('fixed fittings and movable furniture stay independent through room navigation',()=>{
  const house={rooms:[{id:'living',floor:'f1'},{id:'bed',floor:'f2'}]};
  const hidden=reduce(initialState,{type:'FURNITURE'},house);
  assert.equal(hidden.furniture,false);assert.equal(hidden.builtins,true);
  const selected=reduce(hidden,{type:'SELECT_ROOM',id:'bed'},house);
  assert.equal(selected.furniture,false);assert.equal(selected.builtins,true);
  const shell=reduce(selected,{type:'BUILTINS'},house);
  assert.equal(shell.furniture,false);assert.equal(shell.builtins,false);
  const contextual=reduce(shell,{type:'ISOLATE'},house);
  assert.equal(contextual.isolate,false);assert.equal(contextual.selectedRoomId,'bed');
  const reset=reduce(contextual,{type:'RESET'},house);
  assert.equal(reset.builtins,true);assert.equal(reset.furniture,true);assert.equal(reset.isolate,true);
});

test('public preview has no downloadable plans, guides or student kits',async()=>{
  const root=new URL('../',import.meta.url);
  const downloads=await readdir(new URL('downloads/',root)).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  assert.deepEqual(downloads,[]);
  for(const file of ['app/index.html','app/main.js','index.html','assets/home.js']){
    const content=await readFile(new URL(file,root),'utf8');
    assert.doesNotMatch(content,/(?:href|src)=["'][^"']*downloads\/|\bdownload(?:\s|>)/i,file);
    assert.doesNotMatch(content,/home-explorer-(?:starter|3d-source)\.zip|href=["'][^"']*LEARN\.md/i,file);
  }
});
