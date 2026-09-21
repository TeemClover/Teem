// Private, authenticated file requests only; this is not proof of saving to disk.
const ready = new WeakMap();
export async function ensureDownloadSchema(sql) {
  if(!ready.has(sql))ready.set(sql,sql.query(`CREATE TABLE IF NOT EXISTS mc_learn_downloads (
    user_id TEXT NOT NULL,course_id TEXT NOT NULL,file_id TEXT NOT NULL,filename TEXT NOT NULL,
    first_requested_at TIMESTAMPTZ NOT NULL,last_requested_at TIMESTAMPTZ NOT NULL,requests INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(user_id,course_id,file_id))`).catch(e=>{ready.delete(sql);throw e;}));
  await ready.get(sql);
}
export async function recordDownload(sql,{userId,courseId,fileId,filename,now=new Date()}) {
  if(!userId)return;
  await ensureDownloadSchema(sql);
  await sql.query(`INSERT INTO mc_learn_downloads(user_id,course_id,file_id,filename,first_requested_at,last_requested_at)
    VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(user_id,course_id,file_id) DO UPDATE SET
    filename=EXCLUDED.filename,last_requested_at=EXCLUDED.last_requested_at,requests=mc_learn_downloads.requests+1`,
    [userId,courseId,fileId,filename,now]);
}
export async function safeRecordDownload(sql,event) {
  try {await recordDownload(sql,event);}catch {console.error('LEARN_DOWNLOAD_TRACKING_FAILED');}
}
