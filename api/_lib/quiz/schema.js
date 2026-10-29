// Additive, isolated quiz tables. No changes to TeamBook or membership data.
export const SCHEMA = [
`CREATE TABLE IF NOT EXISTS mc_quiz_rooms (
 code TEXT PRIMARY KEY CHECK(code ~ '^[0-9]{6}$'), host_hash TEXT NOT NULL,
 title TEXT NOT NULL, questions JSONB NOT NULL, phase TEXT NOT NULL DEFAULT 'lobby',
 question_index INT NOT NULL DEFAULT -1, version INT NOT NULL DEFAULT 0,
 starts_at BIGINT, ends_at BIGINT, expires_at BIGINT NOT NULL,
 player_count INT NOT NULL DEFAULT 0 CHECK(player_count BETWEEN 0 AND 100)
)`,
`CREATE TABLE IF NOT EXISTS mc_quiz_players (
 room_code TEXT NOT NULL REFERENCES mc_quiz_rooms(code), id TEXT NOT NULL,
 token_hash TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL, avatar TEXT NOT NULL,
 score INT NOT NULL DEFAULT 0, correct INT NOT NULL DEFAULT 0, elapsed BIGINT NOT NULL DEFAULT 0,
 joined_at BIGINT NOT NULL, PRIMARY KEY(room_code,id), UNIQUE(room_code,token_hash), UNIQUE(room_code,name_key)
)`,
`CREATE TABLE IF NOT EXISTS mc_quiz_answers (
 room_code TEXT NOT NULL, player_id TEXT NOT NULL, question_index INT NOT NULL,
 choice INT NOT NULL CHECK(choice BETWEEN 0 AND 3), correct BOOLEAN NOT NULL,
 points INT NOT NULL, elapsed INT NOT NULL, accepted_at BIGINT NOT NULL,
 PRIMARY KEY(room_code,player_id,question_index),
 FOREIGN KEY(room_code,player_id) REFERENCES mc_quiz_players(room_code,id)
)`,
`CREATE INDEX IF NOT EXISTS mc_quiz_answers_round ON mc_quiz_answers(room_code,question_index)`,
`CREATE TABLE IF NOT EXISTS mc_quiz_create_limits (bucket TEXT PRIMARY KEY, hits INT NOT NULL DEFAULT 1)`,
`CREATE OR REPLACE FUNCTION mc_quiz_command_v1(p_code TEXT,p_hash TEXT,p_action TEXT,p JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r mc_quiz_rooms%ROWTYPE; u mc_quiz_players%ROWTYPE; a mc_quiz_answers%ROWTYPE;
 t BIGINT; e INT; pts INT; yes BOOLEAN; idx INT;
BEGIN
 -- All answers can hold a SHARE lock concurrently. Host transitions and joins
 -- take an exclusive row lock, so an answer and a reveal have one DB order.
 IF p_action IN ('answer','me') THEN
  SELECT * INTO r FROM mc_quiz_rooms WHERE code=p_code FOR SHARE;
 ELSE
  SELECT * INTO r FROM mc_quiz_rooms WHERE code=p_code FOR UPDATE;
 END IF;
 t := floor(extract(epoch FROM clock_timestamp())*1000);
 IF NOT FOUND OR r.expires_at<=t THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
 SELECT * INTO u FROM mc_quiz_players WHERE room_code=p_code AND token_hash=p_hash;
 IF p_action='join' THEN
  IF u.id IS NOT NULL THEN RETURN jsonb_build_object('playerId',u.id); END IF;
  IF r.phase='finished' THEN RAISE EXCEPTION 'ROOM_FINISHED'; END IF;
  IF r.player_count>=100 THEN RAISE EXCEPTION 'ROOM_FULL'; END IF;
  IF EXISTS(SELECT 1 FROM mc_quiz_players WHERE room_code=p_code AND name_key=p->>'nameKey') THEN RAISE EXCEPTION 'NAME_TAKEN'; END IF;
  INSERT INTO mc_quiz_players(room_code,id,token_hash,name,name_key,avatar,joined_at)
   VALUES(p_code,p->>'playerId',p_hash,p->>'name',p->>'nameKey',p->>'avatar',t);
  UPDATE mc_quiz_rooms SET player_count=player_count+1 WHERE code=p_code;
  RETURN jsonb_build_object('playerId',p->>'playerId');
 END IF;
 IF p_action IN ('answer','me') THEN
  IF u.id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO a FROM mc_quiz_answers WHERE room_code=p_code AND player_id=u.id AND question_index=r.question_index;
  IF p_action='me' THEN
   RETURN jsonb_build_object('playerId',u.id,'answer',CASE WHEN a.player_id IS NULL THEN NULL
    WHEN r.phase='question' AND t<r.ends_at THEN jsonb_build_object('choice',a.choice)
    ELSE jsonb_build_object('choice',a.choice,'points',a.points,'correct',a.correct) END);
  END IF;
  IF (p->>'index')::INT<>r.question_index THEN RAISE EXCEPTION 'QUESTION_CHANGED'; END IF;
  IF a.player_id IS NOT NULL THEN RETURN jsonb_build_object('accepted',true,'choice',a.choice); END IF;
  IF r.phase<>'question' OR t<r.starts_at OR t>=r.ends_at THEN RAISE EXCEPTION 'ANSWER_CLOSED'; END IF;
  idx:=(p->>'choice')::INT;
  IF idx IS NULL OR idx<0 OR idx>3 THEN RAISE EXCEPTION 'BAD_CHOICE'; END IF;
  e:=(t-r.starts_at)::INT;
  yes:=idx=(r.questions->r.question_index->>'correctIndex')::INT;
  pts:=CASE WHEN yes THEN round(1000-500*e::NUMERIC/(r.ends_at-r.starts_at))::INT ELSE 0 END;
  INSERT INTO mc_quiz_answers(room_code,player_id,question_index,choice,correct,points,elapsed,accepted_at)
   VALUES(p_code,u.id,r.question_index,idx,yes,pts,e,t) ON CONFLICT DO NOTHING;
  IF FOUND THEN
   UPDATE mc_quiz_players SET score=score+pts,correct=correct+CASE WHEN yes THEN 1 ELSE 0 END,
    elapsed=elapsed+CASE WHEN yes THEN e ELSE 0 END WHERE room_code=p_code AND id=u.id;
  END IF;
  SELECT * INTO a FROM mc_quiz_answers WHERE room_code=p_code AND player_id=u.id AND question_index=r.question_index;
  RETURN jsonb_build_object('accepted',true,'choice',a.choice);
 END IF;
 IF p_hash<>r.host_hash THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF (p->>'version')::INT IS DISTINCT FROM r.version THEN RAISE EXCEPTION 'STATE_CHANGED'; END IF;
 IF p_action='finish' AND r.phase<>'finished' THEN
  UPDATE mc_quiz_rooms SET phase='finished',version=version+1 WHERE code=p_code;
 ELSIF p_action='reveal' AND r.phase='question' AND t>=r.starts_at THEN
  UPDATE mc_quiz_rooms SET phase='reveal',version=version+1 WHERE code=p_code;
 ELSIF p_action='leaderboard' AND (r.phase='reveal' OR (r.phase='question' AND t>=r.ends_at)) THEN
  UPDATE mc_quiz_rooms SET phase='leaderboard',version=version+1 WHERE code=p_code;
 ELSIF (p_action='start' AND r.phase='lobby') OR (p_action='next' AND r.phase='leaderboard') THEN
  IF r.player_count=0 THEN RAISE EXCEPTION 'NO_PLAYERS'; END IF;
  idx:=r.question_index+1;
  IF idx>=jsonb_array_length(r.questions) THEN
   UPDATE mc_quiz_rooms SET phase='finished',version=version+1 WHERE code=p_code;
  ELSE
   UPDATE mc_quiz_rooms SET phase='question',question_index=idx,starts_at=t+4000,
    ends_at=t+4000+(r.questions->idx->>'seconds')::INT*1000,version=version+1 WHERE code=p_code;
  END IF;
 ELSE RAISE EXCEPTION 'BAD_TRANSITION';
 END IF;
 RETURN jsonb_build_object('ok',true);
END $$`,
];
