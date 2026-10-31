import { CAMPAIGN, CONSENT_VERSION } from './bodymestory-domain.js';
import { randomUUID } from 'node:crypto';

// Schema is versioned in migrations/20261101_bodymestory_leads.sql. Public
// requests never run DDL. The owner applies and verifies that migration first.
export function createBodymestoryStore(sql) {
  return {
    async rateLimit(buckets, now) {
      const until = new Date(new Date(now).getTime() + 3600000);
      const rows = await sql.query(`INSERT INTO body_lead_rate_limits(bucket,hits,expires_at)
        VALUES ($1,1,$3),($2,1,$3)
        ON CONFLICT(bucket) DO UPDATE SET
          hits=CASE WHEN body_lead_rate_limits.expires_at<=$4 THEN 1 ELSE body_lead_rate_limits.hits+1 END,
          expires_at=CASE WHEN body_lead_rate_limits.expires_at<=$4 THEN $3 ELSE body_lead_rate_limits.expires_at END
        RETURNING bucket,hits`, [buckets.ip, buckets.email, until, now]);
      return rows.length === 2 && rows.every(row => Number(row.hits) <= (row.bucket === buckets.ip ? 10 : 5));
    },
    async register(input, now) {
      const rows = await sql.query(`WITH lead AS (
          INSERT INTO body_leads
            (id,campaign,email,name,privacy_acknowledged_at,privacy_version,
             marketing_consent_at,marketing_consent_version,ads_consent_at,ads_consent_version,
             first_source,last_source,first_episode,last_episode,first_utm,last_utm,created_at,updated_at)
          VALUES ($1::uuid,$3,$4,$5,$6,$7,
            CASE WHEN $8 THEN $6::timestamptz ELSE NULL END,CASE WHEN $8 THEN $7 ELSE NULL END,
            CASE WHEN $9 THEN $6::timestamptz ELSE NULL END,CASE WHEN $9 THEN $7 ELSE NULL END,
            $10,$10,$11,$11,$12::jsonb,$12::jsonb,$6,$6)
          ON CONFLICT(campaign,email) DO UPDATE SET
            name=CASE WHEN EXCLUDED.name<>'' THEN EXCLUDED.name ELSE body_leads.name END,
            privacy_acknowledged_at=EXCLUDED.privacy_acknowledged_at,privacy_version=EXCLUDED.privacy_version,
            marketing_consent_at=COALESCE(body_leads.marketing_consent_at,EXCLUDED.marketing_consent_at),
            marketing_consent_version=COALESCE(body_leads.marketing_consent_version,EXCLUDED.marketing_consent_version),
            ads_consent_at=COALESCE(body_leads.ads_consent_at,EXCLUDED.ads_consent_at),
            ads_consent_version=COALESCE(body_leads.ads_consent_version,EXCLUDED.ads_consent_version),
            last_source=EXCLUDED.last_source,last_episode=EXCLUDED.last_episode,last_utm=EXCLUDED.last_utm,updated_at=EXCLUDED.updated_at
          RETURNING id
        ), inserted_event AS (
          INSERT INTO body_lead_events
            (id,lead_id,campaign,event_type,payload_hash,source,episode,utm,privacy_version,marketing_consent,ads_consent,occurred_at)
          SELECT $2::uuid,lead.id,$3,'workbook_requested',$13,$10,$11,$12::jsonb,$7,$8,$9,$6 FROM lead
          RETURNING id
        ) SELECT id AS event_id FROM inserted_event`,
      [randomUUID(),input.eventId,input.campaign,input.email,input.name,now,CONSENT_VERSION,
        input.marketingConsent,input.adsConsent,input.source,input.episode,JSON.stringify(input.utm),input.payloadHash]);
      if (!rows[0]?.event_id) throw Object.assign(new Error('LEAD_WRITE_NOT_CONFIRMED'), { code: 'LEAD_WRITE_NOT_CONFIRMED' });
      return { eventId: rows[0].event_id };
    },
    async list(limit = 500) {
      return sql.query(`SELECT id,campaign,email,name,privacy_acknowledged_at,privacy_version,
        marketing_consent_at,marketing_consent_version,ads_consent_at,ads_consent_version,
        first_source,last_source,first_episode,last_episode,first_utm,last_utm,created_at,updated_at
        FROM body_leads WHERE campaign=$1 ORDER BY created_at DESC,id DESC LIMIT $2`, [CAMPAIGN,limit]);
    },
  };
}
