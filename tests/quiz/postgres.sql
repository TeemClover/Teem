-- Run only on an isolated Neon branch. A failing assertion rolls back this fixture.
DO $$
DECLARE c TEXT := '991029'; i INT; q INT; ver INT := 0; t BIGINT; result JSONB; before_score INT;
BEGIN
 INSERT INTO mc_quiz_rooms(code,host_hash,title,questions,expires_at)
 VALUES(c,'test-host','Quiz PostgreSQL integration fixture',
  (SELECT jsonb_agg(jsonb_build_object('id',n,'text','Question '||n,'options',jsonb_build_array('Correct','B','C','D'),'correctIndex',0,'seconds',20)) FROM generate_series(1,12)n),
  floor(extract(epoch FROM clock_timestamp())*1000)+3600000);
 FOR i IN 1..100 LOOP
  result:=mc_quiz_command_v1(c,'test-player-'||i,'join',jsonb_build_object('playerId','p'||i,'name','Player '||i,'nameKey','player '||i,'avatar','ORANGE_CAT_RED_RARE_001'));
 END LOOP;
 IF (SELECT player_count FROM mc_quiz_rooms WHERE code=c)<>100 THEN RAISE EXCEPTION 'CAPACITY_ASSERT'; END IF;
 result:=mc_quiz_command_v1(c,'test-player-1','join','{}');
 BEGIN
  PERFORM mc_quiz_command_v1(c,'extra','join',jsonb_build_object('playerId','extra','name','Extra','nameKey','extra','avatar','ORANGE_CAT_RED_RARE_001'));
  RAISE EXCEPTION 'EXPECTED_ROOM_FULL';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'ROOM_FULL' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM mc_quiz_command_v1(c,'test-player-1','start','{"version":0}');
  RAISE EXCEPTION 'EXPECTED_UNAUTHORIZED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'UNAUTHORIZED' THEN RAISE; END IF;
 END;
 PERFORM mc_quiz_command_v1(c,'test-host','start','{"version":0}');ver:=1;
 BEGIN
  PERFORM mc_quiz_command_v1(c,'test-player-1','answer','{"index":0,"choice":0}');
  RAISE EXCEPTION 'EXPECTED_COUNTDOWN_CLOSED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'ANSWER_CLOSED' THEN RAISE; END IF;
 END;
 FOR q IN 0..11 LOOP
  t:=floor(extract(epoch FROM clock_timestamp())*1000);
  UPDATE mc_quiz_rooms SET starts_at=t-1000,ends_at=t+19000 WHERE code=c;
  FOR i IN 1..100 LOOP
   result:=mc_quiz_command_v1(c,'test-player-'||i,'answer',jsonb_build_object('index',q,'choice',CASE WHEN i%5=0 THEN 1 ELSE 0 END));
   IF result ? 'points' OR result ? 'correct' THEN RAISE EXCEPTION 'ANSWER_LEAK'; END IF;
  END LOOP;
  SELECT score INTO before_score FROM mc_quiz_players WHERE room_code=c AND id='p1';
  result:=mc_quiz_command_v1(c,'test-player-1','answer',jsonb_build_object('index',q,'choice',3));
  IF (result->>'choice')::INT<>0 OR (SELECT score FROM mc_quiz_players WHERE room_code=c AND id='p1')<>before_score THEN RAISE EXCEPTION 'DUPLICATE_ASSERT'; END IF;
  PERFORM mc_quiz_command_v1(c,'test-host','reveal',jsonb_build_object('version',ver));ver:=ver+1;
  PERFORM mc_quiz_command_v1(c,'test-host','leaderboard',jsonb_build_object('version',ver));ver:=ver+1;
  PERFORM mc_quiz_command_v1(c,'test-host','next',jsonb_build_object('version',ver));ver:=ver+1;
 END LOOP;
 IF (SELECT phase FROM mc_quiz_rooms WHERE code=c)<>'finished' THEN RAISE EXCEPTION 'FINISH_ASSERT'; END IF;
 IF (SELECT count(*) FROM mc_quiz_answers WHERE room_code=c)<>1200 THEN RAISE EXCEPTION 'ANSWER_COUNT_ASSERT'; END IF;
 IF (SELECT count(*) FROM mc_quiz_players WHERE room_code=c AND correct=12)<>80 THEN RAISE EXCEPTION 'CORRECT_COUNT_ASSERT'; END IF;
 IF (SELECT count(*) FROM mc_quiz_players WHERE room_code=c AND score=0)<>20 THEN RAISE EXCEPTION 'INCORRECT_SCORE_ASSERT'; END IF;
 IF EXISTS(SELECT 1 FROM mc_quiz_players WHERE room_code=c AND correct=12 AND (score<11000 OR score>12000)) THEN RAISE EXCEPTION 'SPEED_SCORE_ASSERT'; END IF;
 RAISE NOTICE 'PASS: PostgreSQL, 100 players, 12 rounds, 1200 answers, capacity, ownership, countdown and immutable retry.';
END $$;
