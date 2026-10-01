import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {hmac} from '../../api/_lib/mediral-commerce/domain.js';
const configure=f=>{f.env.MEDIRAL_ADMIN_KEY='owner-pass';f.env.MEDIRAL_LINE_SECRET='test-only-server-line-secret-32chars';};
test('typed password authenticates while sessions use server secret and reject forgeries',async()=>{
 const f=await fixture();configure(f);
 assert.equal((await f.login()).code,200);
 assert.equal((await f.call('status')).code,200);
 const expires=String(f.now()+4*3600000);
 const forged=`__Host-mediral-admin=${expires}.${hmac('mediral-admin:'+expires,f.env.MEDIRAL_ADMIN_KEY).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}`;
 assert.equal((await f.call('status',{headers:{cookie:forged}})).code,401);
 f.env.MEDIRAL_ADMIN_KEY='changed-pass';
 assert.equal((await f.call('status')).code,401);
});
test('short password still requires server signing entropy and rejects blanks',async()=>{
 const f=await fixture();f.env.MEDIRAL_ADMIN_KEY='owner-pass';
 assert.equal((await f.login()).body.code,'ADMIN_NOT_CONFIGURED');
 configure(f);f.env.MEDIRAL_ADMIN_KEY='   ';
 assert.equal((await f.login()).body.code,'ADMIN_NOT_CONFIGURED');
});
test('wrong short-password attempts stay rate limited',async()=>{
 const f=await fixture();configure(f);
 for(let i=0;i<8;i++)assert.equal((await f.call('login',{method:'POST',body:{key:'wrong'}})).code,401);
 assert.equal((await f.login()).code,429);
 f.advance(16*60000);assert.equal((await f.login()).code,200);
});
