import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionPreference, createOpeningFilm } from './motion.js';

class Film extends EventTarget {
 dataset={};style={};src='';currentTime=0;readyState=0;paused=true;plays=0;frames=new Map();next=0;
 getAttribute(name){return this[name]||null;}
 play(){this.plays++;this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
 pause(){if(this.paused)return;this.paused=true;this.dispatchEvent(new Event('pause'));}
 requestVideoFrameCallback(fn){this.frames.set(++this.next,fn);return this.next;}
 cancelVideoFrameCallback(id){this.frames.delete(id);}
 loaded(){this.readyState=1;this.dispatchEvent(new Event('loadedmetadata'));}
 at(time){this.currentTime=time;this.dispatchEvent(new Event('timeupdate'));}
}
const on={ready:true,enabled:true,visible:true,opening:true};
const settled=()=>new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));

test('effects follow system preference until the visitor explicitly chooses',()=>{
 const pref=createMotionPreference({reduced:true});assert.equal(pref.enabled,false);
 pref.setSystemReduced(false);assert.equal(pref.enabled,true);
 pref.setEnabled(false);pref.setSystemReduced(false);assert.equal(pref.enabled,false);
 pref.setEnabled(true);pref.setSystemReduced(true);assert.equal(pref.enabled,true);
});
test('save-data starts in still mode but a deliberate effects choice is supported',()=>{
 const pref=createMotionPreference({saveData:true});assert.equal(pref.enabled,false);
 pref.setSystemReduced(false);assert.equal(pref.enabled,false);
 pref.setEnabled(true);assert.equal(pref.enabled,true);
});
test('film stays unloaded before discovery assets are ready or while hidden/reduced',()=>{
 const film=new Film(),opening=createOpeningFilm(film);
 for(const overrides of [{ready:false},{visible:false},{enabled:false}])opening.sync({...on,...overrides});
 assert.equal(film.src,'');assert.equal(film.plays,0);
 opening.sync(on);film.loaded();assert.equal(film.currentTime,10);assert.equal(film.plays,1);
 opening.destroy();
});
test('held Compass never replays after effects toggle, visibility or put-down',async()=>{
 const film=new Film(),opening=createOpeningFilm(film);opening.sync(on);film.loaded();await settled();
 film.at(12);assert.equal(opening.stage,'held');assert.equal(film.paused,true);
 for(const patch of [{enabled:false},{enabled:true},{visible:false},{visible:true},{opening:false},{opening:true}])opening.sync({...on,...patch});
 assert.equal(film.plays,1);assert.equal(film.currentTime,12);assert.equal(film.frames.size,0);
 opening.destroy();
});
test('effects paused before staged ending can resume from that exact unfinished time',async()=>{
 const film=new Film(),opening=createOpeningFilm(film);opening.sync(on);film.loaded();await settled();film.at(10.7);
 opening.sync({...on,enabled:false});assert.equal(film.paused,true);
 opening.sync(on);assert.equal(film.currentTime,10.7);assert.equal(film.plays,2);await settled();
 opening.sync({...on,visible:false});assert.equal(film.paused,true);
 opening.sync(on);assert.equal(film.currentTime,10.7);assert.equal(film.plays,3);
 opening.destroy();
});
test('early pickup works without loading film; late metadata cannot replay or reset the artifact',()=>{
 const film=new Film(),opening=createOpeningFilm(film);opening.hold();opening.sync(on);
 assert.equal(film.src,'');assert.equal(film.plays,0);
 film.loaded();assert.equal(film.currentTime,12);assert.equal(opening.stage,'held');
 opening.destroy();
});
test('frame callback stops staged film accurately without waiting for coarse timeupdate',async()=>{
 const film=new Film(),opening=createOpeningFilm(film);opening.sync(on);film.loaded();await settled();
 const [id,callback]=[...film.frames.entries()][0];film.frames.delete(id);film.currentTime=12.02;callback(100,{mediaTime:12.02});
 assert.equal(film.paused,true);assert.equal(opening.stage,'held');assert.equal(film.frames.size,0);
 opening.destroy();
});
test('a delayed play event cannot wake a hidden or disabled film',async()=>{
 const film=new Film();let wake;
 film.play=()=>{film.plays++;return new Promise(resolve=>{wake=()=>{film.paused=false;film.dispatchEvent(new Event('play'));resolve();};});};
 const opening=createOpeningFilm(film);opening.sync(on);opening.sync({...on,visible:false});wake();await settled();
 assert.equal(film.paused,true);assert.notEqual(opening.stage,'playing');
 opening.destroy();
});
test('failed film leaves a usable poster and does not retry download on effects toggles',()=>{
 const film=new Film(),opening=createOpeningFilm(film);opening.sync(on);film.dispatchEvent(new Event('error'));
 opening.sync({...on,enabled:false});opening.sync(on);assert.equal(film.plays,1);assert.equal(film.style.opacity,'0');
 assert.equal(opening.stage,'failed');opening.destroy();
});
test('rapid off/on retries an aborted pending play once and still stops at the hold frame',async()=>{
 const film=new Film();let abort;
 film.play=function(){
  this.plays++;
  if(this.plays===1)return new Promise((_resolve,reject)=>{abort=()=>reject(new Error('interrupted by pause'));});
  this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();
 };
 const opening=createOpeningFilm(film);opening.sync(on);opening.sync({...on,enabled:false});opening.sync(on);abort();await settled();await settled();
 assert.equal(film.plays,2);assert.equal(film.paused,false);film.at(12);opening.sync(on);
 assert.equal(film.plays,2);assert.equal(opening.stage,'held');opening.destroy();
});
