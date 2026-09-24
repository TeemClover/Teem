import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState, normalizeState, parseState, reduce, serializeState} from '../app/state.js';

const house={rooms:[{id:'living',floor:'f1'},{id:'bedroom',floor:'f2'}]};

test('every fresh load starts in SD, even when an incoming URL requests HD',()=>{
 assert.equal(initialState.renderMode,'sd');
 for(const query of ['', '?renderMode=hd&quality=hd', '?mode=hd&view=f2&floor=f2&room=bedroom']){
  assert.equal(parseState(query,house).renderMode,'sd');
 }
 assert.equal(normalizeState({renderMode:'ultra'},house).renderMode,'sd');
});

test('SD and HD can be compared without changing the view, selection or layers',()=>{
 const start={...reduce(initialState,{type:'SELECT_ROOM',id:'living'},house),wallMode:'low',builtins:false,grid:false};
 const hd=reduce(start,{type:'RENDER_MODE',mode:'hd'},house);
 assert.deepEqual(hd,{...start,renderMode:'hd'});
 assert.deepEqual(reduce(hd,{type:'RENDER_MODE',mode:'sd'},house),start);
 assert.deepEqual(reduce(hd,{type:'RENDER_MODE',mode:'unknown'},house),hd);
});

test('graphics choice survives room, lens, floor, tour and home camera navigation',()=>{
 let state=reduce(initialState,{type:'RENDER_MODE',mode:'hd'},house);
 for(const event of [
  {type:'SELECT_ROOM',id:'living'}, {type:'LENS',lens:'plan'}, {type:'LENS',lens:'photo'},
  {type:'VIEW',view:'f2'}, {type:'SELECT_ROOM',id:'bedroom'}, {type:'VIEW',view:'exploded'},
  {type:'TOUR',index:2}, {type:'CLOSE_ROOM'}, {type:'RESET'},
 ]){
  state=reduce(state,event,house);
  assert.equal(state.renderMode,'hd',event.type);
 }
 assert.deepEqual(state,{...initialState,renderMode:'hd'});
});

test('shareable navigation never makes another visitor opt in to HD',()=>{
 const hd=reduce(reduce(initialState,{type:'SELECT_ROOM',id:'bedroom'},house),{type:'RENDER_MODE',mode:'hd'},house);
 const link=serializeState(hd,house);
 assert.doesNotMatch(link,/renderMode|quality|hd/);
 assert.deepEqual(parseState(link,house),{...hd,renderMode:'sd'});
});

test('graphics controls use the existing scene lifecycle and never persist the choice',async()=>{
 const main=await readFile(new URL('../app/main.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
 assert.match(html,/data-render-mode="sd"[^>]*aria-pressed="true"/);
 assert.match(html,/data-render-mode="hd"[^>]*aria-pressed="false"/);
 assert.match(main,/onRenderMode:updateRenderMode/);
 assert.match(main,/state=\{\.\.\.parseState\(location.search,house\),renderMode:state.renderMode,wallMode:state.wallMode\}/);
 assert.doesNotMatch(main,/localStorage|sessionStorage/);
 const graphicsClick=main.slice(main.indexOf('if(b.dataset.renderMode)'),main.indexOf('if(b.dataset.room)'));
 assert.match(graphicsClick,/dispatch\(\{type:'RENDER_MODE'/);
 assert.doesNotMatch(graphicsClick,/startScene|createHouseScene|dispose|reset\(/);
});
