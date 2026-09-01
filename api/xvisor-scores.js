import { clean, database, sameOrigin, sendJson } from './_lib/core.js';

const SCORE_VERSION = '1.0b';
const RELEASE_RESET_BEFORE = '2026-09-01T10:58:00.000Z';
let schemaPromise;

async function ensureScoreSchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS xvisor_campaign_scores (
      id BIGSERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      score_version TEXT NOT NULL,
      display_name TEXT NOT NULL,
      run_mode TEXT NOT NULL DEFAULT 'FIRST_RUN',
      best_tgv BIGINT NOT NULL,
      total_income BIGINT NOT NULL,
      best_monthly_income BIGINT NOT NULL,
      organization_size INTEGER NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (run_id, score_version)
    )`);
    await sql.query('CREATE INDEX IF NOT EXISTS idx_xvisor_scores_version_tgv ON xvisor_campaign_scores(score_version, best_tgv DESC, completed_at ASC)');
    // Public 1.0b launch starts a clean scoreboard. The fixed cutoff makes this safe on every serverless cold start.
    await sql.query('DELETE FROM xvisor_campaign_scores WHERE score_version=$1 AND created_at < $2', [SCORE_VERSION, RELEASE_RESET_BEFORE]);
  })().catch((error) => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

function scoreNumber(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) return null;
  return Math.round(number);
}

function normalizeBody(body) {
  const displayName = clean(body?.displayName, 28);
  const runId = clean(body?.runId, 90);
  const scoreVersion = clean(body?.scoreVersion, 40);
  const runMode = body?.runMode === 'NEW_GAME_PLUS' ? 'NEW_GAME_PLUS' : 'FIRST_RUN';
  const bestTgv = scoreNumber(body?.bestTgv, 100_000_000_000);
  const totalIncome = scoreNumber(body?.totalIncome, 100_000_000_000);
  const bestMonthlyIncome = scoreNumber(body?.bestMonthlyIncome, 100_000_000_000);
  const organizationSize = scoreNumber(body?.organizationSize, 10_000_000);
  const completedAtNumber = Number(body?.completedAt);
  const completedAt = Number.isFinite(completedAtNumber) ? new Date(completedAtNumber) : null;
  if (!displayName || !runId || runId.length < 6 || scoreVersion !== SCORE_VERSION) return null;
  if ([bestTgv, totalIncome, bestMonthlyIncome, organizationSize].some((value) => value == null)) return null;
  if (!completedAt || Number.isNaN(completedAt.getTime())) return null;
  return { displayName, runId, scoreVersion, runMode, bestTgv, totalIncome, bestMonthlyIncome, organizationSize, completedAt };
}

function publicRow(row) {
  return {
    displayName: row.display_name,
    runMode: row.run_mode,
    bestTgv: Number(row.best_tgv || 0),
    totalIncome: Number(row.total_income || 0),
    bestMonthlyIncome: Number(row.best_monthly_income || 0),
    organizationSize: Number(row.organization_size || 0),
    completedAt: row.completed_at,
    scoreVersion: row.score_version,
  };
}

export default async function handler(req, res) {
  try {
    const sql = database();
    await ensureScoreSchema(sql);

    if (req.method === 'GET') {
      const rows = await sql.query(`SELECT display_name,run_mode,best_tgv,total_income,best_monthly_income,organization_size,completed_at,score_version
        FROM xvisor_campaign_scores
        WHERE score_version=$1
        ORDER BY best_tgv DESC, total_income DESC, completed_at ASC
        LIMIT 100`, [SCORE_VERSION]);
      return sendJson(res, { ok: true, scoreVersion: SCORE_VERSION, scores: rows.map(publicRow) });
    }

    if (req.method === 'POST') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const score = normalizeBody(req.body);
      if (!score) return sendJson(res, { ok: false, error: 'INVALID_SCORE' }, 400);
      const rows = await sql.query(`INSERT INTO xvisor_campaign_scores
        (run_id,score_version,display_name,run_mode,best_tgv,total_income,best_monthly_income,organization_size,completed_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
        ON CONFLICT (run_id,score_version) DO UPDATE SET
          display_name=EXCLUDED.display_name,
          updated_at=NOW()
        RETURNING display_name,run_mode,best_tgv,total_income,best_monthly_income,organization_size,completed_at,score_version`, [
        score.runId, score.scoreVersion, score.displayName, score.runMode,
        score.bestTgv, score.totalIncome, score.bestMonthlyIncome, score.organizationSize, score.completedAt,
      ]);
      return sendJson(res, { ok: true, score: publicRow(rows[0]) });
    }

    return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (error) {
    console.error('X-VISOR score API failed', error);
    const code = error.code === 'DATABASE_URL_NOT_CONFIGURED' ? error.code : 'XVISOR_SCORE_API_ERROR';
    return sendJson(res, { ok: false, error: code }, code === 'DATABASE_URL_NOT_CONFIGURED' ? 503 : 500);
  }
}
