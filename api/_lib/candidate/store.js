import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {DEFAULT_JOBS,problem,score,bangkokDay} from './model.js';
export const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS mc_candidate_jobs(id TEXT PRIMARY KEY,data JSONB NOT NULL,version INT NOT NULL DEFAULT 1)`,
 `CREATE TABLE IF NOT EXISTS mc_candidates(id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES mc_candidate_jobs(id),source_id TEXT NOT NULL,source_url TEXT NOT NULL DEFAULT '',profile JSONB NOT NULL,rubric JSONB NOT NULL,original_text TEXT NOT NULL DEFAULT '',pdf_base64 TEXT,filename TEXT,status TEXT NOT NULL DEFAULT 'new',notes TEXT NOT NULL DEFAULT '',version INT NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(job_id,source_id))`,
 `CREATE INDEX IF NOT EXISTS mc_candidates_updated ON mc_candidates(updated_at DESC)`,
 `CREATE TABLE IF NOT EXISTS mc_candidate_runs(id TEXT PRIMARY KEY,day TEXT NOT NULL,state TEXT NOT NULL,data JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS mc_candidate_access(token_hash TEXT PRIMARY KEY,label TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`
];
export function createStore(sql){
 let ready;
 async function ensure(){if(!ready)ready=(async()=>{await sql.transaction(tx=>SCHEMA.map(q=>tx.query(q)));await sql.transaction(tx=>DEFAULT_JOBS.map(j=>tx.query('INSERT INTO mc_candidate_jobs(id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[j.id,JSON.stringify(j)])));})().catch(e=>{ready=null;throw e;});return ready;}
 return {
  ensure,
  async access(token){if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))return false;const hash=createHash('sha256').update(token).digest('hex');return Boolean((await sql.query('SELECT token_hash FROM mc_candidate_access WHERE token_hash=$1 AND expires_at>now()',[hash]))[0]);},
  async issueAccess(){const token=randomBytes(32).toString('base64url');await sql.query("INSERT INTO mc_candidate_access(token_hash,label,expires_at) VALUES($1,'HR login',now()+interval '7 days')",[createHash('sha256').update(token).digest('hex')]);return token;},
  async revokeAccess(token){if(token)await sql.query("DELETE FROM mc_candidate_access WHERE token_hash=$1 AND label='HR login'",[createHash('sha256').update(token).digest('hex')]);},
  async portrait(id){const r=(await sql.query("SELECT profile->'presentation' AS presentation FROM mc_candidates WHERE id=$1",[id]))[0];return r?.presentation||null;},
  async savePresentation(id,version,presentation){const r=(await sql.query("UPDATE mc_candidates SET profile=jsonb_set(profile,'{presentation}',COALESCE(profile->'presentation','{}'::jsonb)||$3::jsonb),version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING version",[id,version,JSON.stringify(presentation)]))[0];if(!r)throw problem('VERSION_CONFLICT',409);return r;},
  async jobs(){return (await sql.query('SELECT data,version FROM mc_candidate_jobs ORDER BY id')).map(r=>({...r.data,version:r.version}));},
  async job(id){const r=(await sql.query('SELECT data,version FROM mc_candidate_jobs WHERE id=$1',[id]))[0];return r?{...r.data,version:r.version}:null;},
  async saveJob(job,version){const r=(await sql.query('UPDATE mc_candidate_jobs SET data=$2::jsonb,version=version+1 WHERE id=$1 AND version=$3 RETURNING version',[job.id,JSON.stringify(job),version]))[0];if(!r)throw problem('VERSION_CONFLICT',409);return r;},
  async list(page=0,jobId='',search='',status=''){
   const limit=100;
   const rawRequest=sql.query(`SELECT id,job_id,profile->>'name' AS name,profile->>'currentRole' AS current_role,profile->>'analysisState' AS analysis_state,jsonb_build_object('analysisState',profile->'analysisState','assessments',profile->'assessments','quickSummary',profile->'quickSummary','summary',profile->'summary','salaryExpectation',profile->'salaryExpectation','presentation',jsonb_build_object('nickname',profile->'presentation'->'nickname','appliedAt',profile->'presentation'->'appliedAt','hasPortrait',COALESCE(profile->'presentation'->>'portraitBase64','')<>'')) AS profile,rubric,status,created_at,updated_at,version,CASE WHEN pdf_base64 IS NULL THEN false ELSE true END AS has_pdf FROM mc_candidates WHERE ($1='' OR job_id=$1) AND ($4='' OR strpos(lower(COALESCE(profile->>'name','')||' '||COALESCE(profile->>'currentRole','')),lower($4))>0) AND ($5='' OR status=$5) ORDER BY CASE WHEN profile->>'analysisState'='ready' THEN 0 ELSE 1 END,created_at DESC,id LIMIT $2 OFFSET $3`,[jobId,limit,page*limit,search,status]);
   const countsRequest=sql.query(`SELECT job_id,status,COUNT(*)::int AS count,COUNT(*) FILTER(WHERE profile->>'analysisState'='ready')::int AS ready,COUNT(*) FILTER(WHERE jsonb_path_exists(profile,'$.assessments[*] ? (@.rating != null)'))::int AS scored,COUNT(*) FILTER(WHERE pdf_base64 IS NOT NULL)::int AS with_pdf,COUNT(*) FILTER(WHERE (created_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date)::int AS today FROM mc_candidates GROUP BY job_id,status`);
   const rankedRequest=sql.query(`SELECT id,job_id,profile->>'name' AS name,profile->>'currentRole' AS current_role,profile->>'analysisState' AS analysis_state,status,created_at,jsonb_build_object('analysisState',profile->'analysisState','assessments',profile->'assessments','quickSummary',profile->'quickSummary','summary',profile->'summary','salaryExpectation',profile->'salaryExpectation','presentation',jsonb_build_object('nickname',profile->'presentation'->'nickname','appliedAt',profile->'presentation'->'appliedAt','hasPortrait',COALESCE(profile->'presentation'->>'portraitBase64','')<>'')) AS profile,rubric FROM mc_candidates WHERE ($1='' OR job_id=$1) AND ($2='' OR strpos(lower(COALESCE(profile->>'name','')||' '||COALESCE(profile->>'currentRole','')),lower($2))>0) AND ($3='' OR status=$3)`,[jobId,search,status]);
   const [raw,counts,ranked]=await Promise.all([rawRequest,countsRequest,rankedRequest]);
   const rows=raw.map(({profile,rubric,...r})=>({...r,...cardPresentation(profile),score:cardScore(profile,rubric)}));
   const highlights=rankDirectory(ranked);
   return {rows,counts,highlights,hasMore:rows.length===limit,page};
  },
  async detail(id){const r=(await sql.query('SELECT id,job_id,source_id,source_url,profile,rubric,original_text,filename,status,notes,version,created_at,updated_at,pdf_base64 IS NOT NULL AS has_pdf FROM mc_candidates WHERE id=$1',[id]))[0];if(!r)return null;const presentation=r.profile.presentation||{};return {...r,profile:{...r.profile,presentation:{nickname:presentation.nickname||'',nicknameSource:presentation.nicknameSource||'',hasPortrait:Boolean(presentation.portraitBase64),portraitSource:presentation.portraitSource||'',appliedAt:presentation.appliedAt||null,appliedAtSource:presentation.appliedAtSource||''}},score:score(r.profile,r.rubric)};},
  async pdf(id){return (await sql.query("SELECT pdf_base64,filename,profile->>'name' AS name FROM mc_candidates WHERE id=$1",[id]))[0];},
  async save(input){
   const id=randomUUID();const sourceId=input.sourceId||createHash('sha256').update(input.job.id+'|'+input.profile.name+'|'+input.originalText).digest('hex');
   const r=(await sql.query(`INSERT INTO mc_candidates(id,job_id,source_id,source_url,profile,rubric,original_text,pdf_base64,filename) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9) ON CONFLICT(job_id,source_id) DO UPDATE SET source_url=EXCLUDED.source_url,profile=EXCLUDED.profile || CASE WHEN mc_candidates.profile ? 'presentation' AND NOT (EXCLUDED.profile ? 'presentation') THEN jsonb_build_object('presentation',mc_candidates.profile->'presentation') ELSE '{}'::jsonb END,rubric=EXCLUDED.rubric,original_text=EXCLUDED.original_text,pdf_base64=COALESCE(EXCLUDED.pdf_base64,mc_candidates.pdf_base64),filename=COALESCE(EXCLUDED.filename,mc_candidates.filename),updated_at=now(),version=mc_candidates.version+1 WHERE EXCLUDED.profile->>'analysisState' IS DISTINCT FROM 'pending' OR mc_candidates.profile->>'analysisState' IS DISTINCT FROM 'ready' RETURNING id`,[id,input.job.id,sourceId,input.sourceUrl,JSON.stringify(input.profile),JSON.stringify(input.job.rubric),input.originalText,input.pdfBase64||null,input.filename||null]))[0];return r;
  },
  async review(id,version,status,notes){const r=(await sql.query('UPDATE mc_candidates SET status=$3,notes=$4,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING version',[id,version,status,notes]))[0];if(!r)throw problem('VERSION_CONFLICT',409);return r;},
  async run(data){const id=data.id||randomUUID();return sql.query('INSERT INTO mc_candidate_runs(id,day,state,data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO NOTHING',[id,bangkokDay(),data.state,JSON.stringify(data)]);},
  async runs(){return sql.query('SELECT id,day,state,data,created_at FROM mc_candidate_runs ORDER BY created_at DESC LIMIT 30');}
 };
}
// Return only card metadata. Every application remains browsable, including
// incomplete evidence and unread resumes; neither gets filtered out by score.
export function rankDirectory(records){
 return records.map(({profile,rubric,...row})=>({...row,...cardPresentation(profile),analysis_state:profile.analysisState||'pending',score:cardScore(profile,rubric)})).sort((a,b)=>
  a.job_id.localeCompare(b.job_id)||Number(b.analysis_state==='ready')-Number(a.analysis_state==='ready')||b.score.points-a.score.points||b.score.coverage-a.score.coverage||a.id.localeCompare(b.id));
}


export function cardScore(profile,rubric){const {sections,...summary}=score(profile,rubric);return summary;}


export function cardPresentation(profile){return {applied_at:profile.presentation?.appliedAt||null,nickname:profile.presentation?.nickname||'',has_portrait:Boolean(profile.presentation?.hasPortrait),quick_summary:profile.quickSummary||null,summary:profile.summary||'',salary_expectation:profile.salaryExpectation||''};}
