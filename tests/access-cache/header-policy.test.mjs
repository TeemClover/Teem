import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PUBLIC_ASSET_CACHE_HEADERS, publicAssetPath } from '../../routing/public-assets.js';
import { PUBLIC_ASSET_INVENTORY } from '../../routing/public-asset-inventory.js';

const deployment=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8'));
const reviewedUi=[
  '/course/admin/reviews/reviews.css','/course/admin/reviews/reviews.js',
  '/course/review-consent/consent.css','/course/review-consent/consent.js',
];
const cacheNames=['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control'];
// These routes use exact paths or directory wildcards. Preserve declaration
// order when checking how a narrower override combines with directory policy.
function declaredHeaders(pathname){
  const result={};
  for(const rule of deployment.headers){
    const prefix=rule.source.endsWith('/:path*')?rule.source.slice(0,-7):null;
    if(rule.source===pathname||(prefix&&(pathname===prefix||pathname.startsWith(prefix+'/')))){
      for(const header of rule.headers)result[header.key]=header.value;
    }
  }
  return result;
}

test('review UI exceptions override only cache headers while retaining directory security headers',()=>{
  for(const pathname of reviewedUi){
    assert.equal(publicAssetPath(pathname),pathname);
    const headers=declaredHeaders(pathname);
    for(const name of cacheNames)assert.equal(headers[name],PUBLIC_ASSET_CACHE_HEADERS[name],`${pathname}: ${name}`);
    assert.match(headers['Content-Security-Policy'],/frame-ancestors 'none'/,pathname);
    assert.equal(headers['Referrer-Policy'],'no-referrer',pathname);
    assert.equal(headers['X-Robots-Tag'],'noindex, nofollow, noarchive',pathname);
  }
});

test('review pages and unreviewed siblings retain private no-store headers',()=>{
  for(const pathname of [
    '/course/admin/','/course/admin/index.html','/course/admin/reviews/',
    '/course/admin/reviews/index.html','/course/admin/reviews/private-export.json',
    '/course/admin/reviews/unreviewed.js','/course/review-consent/',
    '/course/review-consent/index.html','/course/review-consent/private-response.json',
  ]){
    assert.equal(publicAssetPath(pathname),null,pathname);
    assert.match(declaredHeaders(pathname)['Cache-Control'],/private.*no-store/,pathname);
  }
});

test('declared exact and directory cache rules do not contradict the published asset policy',()=>{
  for(const pathname of PUBLIC_ASSET_INVENTORY){
    const headers=declaredHeaders(pathname);
    for(const name of cacheNames)if(headers[name]!==undefined){
      assert.equal(headers[name],PUBLIC_ASSET_CACHE_HEADERS[name],`${pathname}: ${name}`);
    }
  }
});
