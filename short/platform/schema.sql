-- Dedicated Torntor database. Run once with the migration role; never with a browser key.
CREATE TABLE IF NOT EXISTS tt_users(id text PRIMARY KEY,role text NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','creator','admin')),free bigint NOT NULL DEFAULT 0 CHECK(free>=0),paid bigint NOT NULL DEFAULT 0 CHECK(paid>=0),blocked boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS tt_works(id text PRIMARY KEY,owner text NOT NULL REFERENCES tt_users(id),title text NOT NULL,summary text NOT NULL,team text NOT NULL,format text NOT NULL CHECK(format IN ('drama','comic','novel')),episode int NOT NULL CHECK(episode>0),price int NOT NULL CHECK(price IN (0,10)),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),note text NOT NULL DEFAULT '',revision int NOT NULL DEFAULT 1,created timestamptz NOT NULL DEFAULT now(),reviewed timestamptz,reviewer text REFERENCES tt_users(id),rights boolean NOT NULL CHECK(rights));
CREATE TABLE IF NOT EXISTS tt_assets(id text PRIMARY KEY,owner text NOT NULL REFERENCES tt_users(id),work text REFERENCES tt_works(id),key text UNIQUE NOT NULL,type text NOT NULL,size bigint NOT NULL,role text NOT NULL,created timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tt_orders(id text PRIMARY KEY,user_id text NOT NULL REFERENCES tt_users(id),pack text NOT NULL,coins int NOT NULL,amount int NOT NULL CHECK(amount>0),method text NOT NULL,charge_id text UNIQUE,status text NOT NULL DEFAULT 'pending',mode text NOT NULL CHECK(mode IN ('test','live')),fee int NOT NULL DEFAULT 0,refunded int NOT NULL DEFAULT 0,at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tt_unlocks(user_id text REFERENCES tt_users(id),story text,episode int,free int NOT NULL,paid int NOT NULL,at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,story,episode));
CREATE TABLE IF NOT EXISTS tt_daily(user_id text REFERENCES tt_users(id),day date,PRIMARY KEY(user_id,day));
CREATE TABLE IF NOT EXISTS tt_views(user_id text REFERENCES tt_users(id),story text,episode int,session text,format text,seconds int NOT NULL DEFAULT 0,complete boolean NOT NULL DEFAULT false,at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,story,episode,session));
CREATE TABLE IF NOT EXISTS tt_audit(id bigserial PRIMARY KEY,actor text,event text,work text,revision int,note text,at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS tt_views_story ON tt_views(story,episode,at);
CREATE INDEX IF NOT EXISTS tt_work_owner ON tt_works(owner,status);
CREATE TABLE IF NOT EXISTS tt_catalog_owners(story text PRIMARY KEY,owner text REFERENCES tt_users(id));
CREATE TABLE IF NOT EXISTS tt_limits(user_id text,bucket text,hits int NOT NULL,PRIMARY KEY(user_id,bucket));
CREATE TABLE IF NOT EXISTS tt_visitors(token_hash text PRIMARY KEY,user_id text REFERENCES tt_users(id),expires timestamptz NOT NULL);
CREATE OR REPLACE FUNCTION tt_limit(uid text,action text,maxhits int) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE b text:=action||':'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD-HH24-MI'); hits int;
BEGIN
 INSERT INTO tt_limits VALUES(uid,b,1) ON CONFLICT(user_id,bucket) DO UPDATE SET hits=tt_limits.hits+1 RETURNING tt_limits.hits INTO hits;
 RETURN hits<=maxhits;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS tt_pending_checkout ON tt_orders(user_id) WHERE status='pending';
CREATE OR REPLACE FUNCTION tt_submit(wid text,uid text,data jsonb,aids text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual int; aid text; counter int:=0;
BEGIN
 PERFORM id FROM tt_assets WHERE id=ANY(aids) FOR UPDATE;
 SELECT count(*) INTO actual FROM tt_assets WHERE id=ANY(aids) AND owner=uid AND work IS NULL;
 IF actual<>array_length(aids,1) THEN RAISE EXCEPTION 'INVALID_ASSETS'; END IF;
 INSERT INTO tt_works(id,owner,title,summary,team,format,episode,price,rights) VALUES(wid,uid,data->>'title',data->>'summary',data->>'team',data->>'format',(data->>'episode')::int,(data->>'price')::int,true);
 FOREACH aid IN ARRAY aids LOOP
  UPDATE tt_assets SET work=wid,created=now()+counter*interval '1 millisecond' WHERE id=aid; counter:=counter+1;
 END LOOP;
END $$;
-- Row lock serializes all changes to one wallet, including concurrent daily grants/unlocks.
CREATE OR REPLACE FUNCTION tt_claim(uid text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE localday date := (now() AT TIME ZONE 'Asia/Bangkok')::date; inserted int;
BEGIN
 PERFORM 1 FROM tt_users WHERE id=uid FOR UPDATE;
 INSERT INTO tt_daily VALUES(uid,localday) ON CONFLICT DO NOTHING; GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=1 THEN UPDATE tt_users SET free=free+20 WHERE id=uid; END IF;
 RETURN inserted=1;
END $$;
CREATE OR REPLACE FUNCTION tt_unlock(uid text,sid text,ep int,cost int) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE u tt_users; gift int;
BEGIN
 SELECT * INTO u FROM tt_users WHERE id=uid FOR UPDATE;
 IF u.blocked THEN RAISE EXCEPTION 'ACCOUNT_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM tt_unlocks WHERE user_id=uid AND story=sid AND episode=ep) THEN RETURN false; END IF;
 IF u.free+u.paid<cost THEN RAISE EXCEPTION 'INSUFFICIENT_COINS'; END IF;
 gift:=least(u.free,cost);
 UPDATE tt_users SET free=free-gift,paid=paid-(cost-gift) WHERE id=uid;
 INSERT INTO tt_unlocks(user_id,story,episode,free,paid) VALUES(uid,sid,ep,gift,cost-gift);
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION tt_refund(oid text,refundvalue int) RETURNS void LANGUAGE plpgsql AS $$
DECLARE o tt_orders;
BEGIN
 SELECT * INTO o FROM tt_orders WHERE id=oid FOR UPDATE;
 IF o.id IS NULL OR refundvalue<1 OR refundvalue>o.amount THEN RAISE EXCEPTION 'INVALID_REFUND'; END IF;
 UPDATE tt_orders SET refunded=greatest(refunded,refundvalue) WHERE id=oid;
 -- Stop further spending while staff reconcile already-spent coins and Creator liabilities.
 UPDATE tt_users SET blocked=true WHERE id=o.user_id;
END $$;
-- API connects with a dedicated owner/service role. No direct client grants or RPC access.
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['tt_users','tt_works','tt_assets','tt_orders','tt_unlocks','tt_daily','tt_views','tt_audit','tt_catalog_owners','tt_limits','tt_visitors'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',tbl);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION tt_settle(oid text,cid text,chargefee int) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE o tt_orders;
BEGIN
 SELECT * INTO o FROM tt_orders WHERE id=oid FOR UPDATE;
 IF o.id IS NULL OR o.charge_id IS DISTINCT FROM cid THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
 IF o.status='paid' THEN RETURN false; END IF;
 IF o.status<>'pending' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 UPDATE tt_users SET paid=paid+o.coins WHERE id=o.user_id;
 UPDATE tt_orders SET status='paid',fee=chargefee WHERE id=oid;
 RETURN true;
END $$;
-- Permissions are assigned by staff using a migration/admin console, never by a public API.
-- UPDATE tt_users SET role='creator' WHERE id='<verified Supabase user UUID>';
-- UPDATE tt_users SET role='admin' WHERE id='<verified founder UUID>';

REVOKE ALL ON FUNCTION tt_claim(text),tt_unlock(text,text,int,int),tt_settle(text,text,int),tt_refund(text,int),tt_submit(text,text,jsonb,text[]),tt_limit(text,text,int) FROM PUBLIC;
