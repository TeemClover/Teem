import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderFrontDoorRoot} from '../../tools/sync-frontdoor-root.mjs';

test('public root shares the exact Compass body and runtime with /frontdoor/',async()=>{
  const [root,source,home]=await Promise.all(['index.html','frontdoor/index.html','home/index.html'].map(p=>readFile(new URL('../../'+p,import.meta.url),'utf8')));
  assert.equal(root,renderFrontDoorRoot(source));
  assert.equal(root.slice(root.indexOf('<body')),source.slice(source.indexOf('<body')));
  assert.match(root,/<link rel="canonical" href="https:\/\/www\.myclover\.com\/">/);
  assert.match(root,/<meta name="robots" content="index,follow">/);
  assert.doesNotMatch(root,/assets\/track\.js|content="home-open"/);
  assert.match(home,/content="home-open"/);assert.match(home,/home-opening-full\.mp4/);
  assert.match(home,/href="\/hall\.html"/);assert.match(home,/href="\/frontdoor\/"/);
});
