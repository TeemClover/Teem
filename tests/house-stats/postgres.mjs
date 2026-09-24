// Optional integration check with a real PostgreSQL WASM runtime, never production.
// HOUSE_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/house-stats/postgres.mjs
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createHouseStatsStore,ensureHouseStatsSchema,validateSnapshot} from '../../api/_lib/house-stats.js';
const {PGlite}=await import(process.env.HOUSE_PGLITE_MODULE);
const db=new PGlite();const sql={query:async(text,params)=>(await db.query(text,params)).rows};
await ensureHouseStatsSchema(sql);const store=createHouseStatsStore(sql);
const req={headers:{'x-forwarded-for':'127.0.0.1'}};
const raw={visit:randomUUID(),visitor:randomUUID(),seq:1,activeSeconds:0,source:'test',medium:'social',campaign:'qa',device:'mobile',counts:{},exposures:{hd:1},signals:{model_ready:1},rooms:{},readyMs:2500};
await store.accept(req,validateSnapshot(raw));
await sql.query("UPDATE mc_house_visits SET started_at=now()-interval '2 minutes' WHERE id=$1",[raw.visit]);
const updated=validateSnapshot({...raw,seq:3,activeSeconds:80,counts:{hd:2,course:1,rooms:1},exposures:{hd:1,course:1,rooms:1},signals:{model_ready:1,hd_ready:1},rooms:{'f1-g01-living':1}});
await store.accept(req,updated);await store.accept(req,updated);await store.accept(req,validateSnapshot({...raw,seq:2}));
let report=await store.report(30);
assert.equal(report.summary.visits,1);assert.equal(report.summary.visitors,1);assert.equal(report.summary.engaged,1);assert.equal(report.summary.course_visitors,1);
assert.equal(report.summary.average_seconds,80);assert.equal(report.features.find(f=>f.key==='hd').uses,2);assert.equal(report.rooms[0].room,'f1-g01-living');
// A second page shares the browser id; aggregate uniques remain one.
await store.accept(req,validateSnapshot({...raw,visit:randomUUID()}));
report=await store.report(30);assert.equal(report.summary.visits,2);assert.equal(report.summary.visitors,1);
// An attempt to overwrite another browser's visit cannot alter it.
await store.accept(req,validateSnapshot({...raw,visitor:randomUUID(),seq:99}));
report=await store.report(30);assert.equal(report.summary.course_visitors,1);
// Bangkok midnight groups by local calendar date, not UTC date.
const midnightId=randomUUID();await store.accept(req,validateSnapshot({...raw,visit:midnightId}));
await sql.query("UPDATE mc_house_visits SET started_at=(date_trunc('day',now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok')-interval '1 second' WHERE id=$1",[midnightId]);
const today=await store.report(1);assert.equal(today.summary.visits,2);assert.equal((await store.report(7)).summary.visits,3);
for(const days of [1,7,30,90]){const data=await store.report(days);assert.ok(data.daily.length);assert.equal(data.devices[0].device,'mobile');assert.ok(data.sources.length);assert.ok(data.coverage.first_visit);}
// Empty reports remain empty, not invented zeros/placeholder rows counted as visitors.
await sql.query('DELETE FROM mc_house_visits');report=await store.report(30);assert.equal(report.summary.visits,0);assert.equal(report.summary.median_seconds,null);assert.deepEqual(report.features,[]);
await db.close();console.log('PostgreSQL integration passed: schema, insert, idempotence, out-of-order retry, visitor ownership, aggregates, timezone, range, empty data');
