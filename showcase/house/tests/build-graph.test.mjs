import test from 'node:test';
import assert from 'node:assert/strict';
import {collectOutputGraph} from '../tools/audit.mjs';

const fixture={outputs:{
 'assets/home.js':{imports:[{path:'assets/shared.js',kind:'import-statement'},{path:'assets/scene.js',kind:'dynamic-import'}]},
 'assets/scene.js':{imports:[{path:'assets/shared.js',kind:'import-statement'},{path:'assets/hd-rendering.js',kind:'dynamic-import'},{path:'assets/hd-materials.js',kind:'dynamic-import'}]},
 'assets/shared.js':{imports:[{path:'https://example.invalid/external.js',kind:'import-statement',external:true}]},
 'assets/hd-rendering.js':{imports:[{path:'assets/shared.js',kind:'import-statement'},{path:'./hd-effects.js',kind:'import-statement'}]},
 'assets/hd-materials.js':{imports:[{path:'./shared.js',kind:'import-statement'}]},
 'assets/hd-effects.js':{imports:[{path:'./hd-rendering.js',kind:'import-statement'}]},
}};

test('shell weight follows its static dependencies without charging for lazy scene or HD',()=>{
 assert.deepEqual(collectOutputGraph(fixture,['assets/home.js']),['assets/home.js','assets/shared.js']);
});

test('first SD model includes its engine but excludes opt-in HD implementations',()=>{
 assert.deepEqual(collectOutputGraph(fixture,['assets/home.js','assets/scene.js']),[
  'assets/home.js','assets/scene.js','assets/shared.js',
 ]);
});

test('HD graph follows shared and relative dependencies, deduplicates cycles and allows incremental costs',()=>{
 const sd=new Set(collectOutputGraph(fixture,['assets/home.js','assets/scene.js']));
 const hd=collectOutputGraph(fixture,['assets/hd-rendering.js','assets/hd-materials.js'],{includeDynamic:true});
 assert.deepEqual(hd.filter(file=>!sd.has(file)),['assets/hd-effects.js','assets/hd-materials.js','assets/hd-rendering.js']);
 assert.deepEqual(collectOutputGraph(fixture,['missing-output']),[]);
});
