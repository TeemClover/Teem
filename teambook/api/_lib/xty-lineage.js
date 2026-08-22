import { cardById, cardDescriptorTh } from '../../_shared/cards.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
let lineageSchemaPromise;

function cleanId(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function localIdentity(body) {
  const value = cleanId(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

export async function identityIdsForLineage(req, sql, currentUser) {
  const account = await currentUser(req, sql);
  const localId = localIdentity(req.body || {});
  return [...new Set([
    account?.id ? `account:${account.id}` : '',
    localId,
  ].filter(Boolean))];
}

export async function ensureLineageSchema(sql) {
  if (!lineageSchemaPromise) lineageSchemaPromise = (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS teambook_book_lineage (
      book_id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      series_root_book_id TEXT NOT NULL,
      tree_root_book_id TEXT NOT NULL,
      volume_number INTEGER NOT NULL DEFAULT 1,
      relation_kind TEXT NOT NULL DEFAULT 'root',
      previous_book_id TEXT,
      spawned_from_book_id TEXT,
      spawned_from_user_id TEXT,
      cover_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      memory_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      sealed_at TIMESTAMPTZ
    )`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_lineage_series
      ON teambook_book_lineage(series_id, volume_number)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_lineage_tree
      ON teambook_book_lineage(tree_root_book_id, created_at)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_lineage_spawn
      ON teambook_book_lineage(spawned_from_book_id) WHERE spawned_from_book_id IS NOT NULL`);
    await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_teambook_lineage_one_official_next
      ON teambook_book_lineage(previous_book_id) WHERE previous_book_id IS NOT NULL`);
    await sql.query(`INSERT INTO teambook_book_lineage (
        book_id,series_id,series_root_book_id,tree_root_book_id,volume_number,relation_kind,
        cover_snapshot_json,memory_snapshot_json,created_at,sealed_at
      )
      SELECT b.id,b.id,b.id,b.id,1,'root',
        jsonb_build_object(
          'schemaVersion',1,
          'coverType',COALESCE(b.cover_type,'card_back'),
          'coverValue',b.cover_value,
          'leadCardId',b.lead_card_id
        ),
        '{}'::jsonb,b.created_at,
        CASE WHEN b.state = ANY($1::text[]) THEN NULL ELSE COALESCE(b.ended_at,b.updated_at) END
      FROM teambook_books b
      WHERE NOT EXISTS (SELECT 1 FROM teambook_book_lineage l WHERE l.book_id=b.id)`, [ACTIVE_STATES]);
  })().catch(error => {
    lineageSchemaPromise = undefined;
    throw error;
  });
  return lineageSchemaPromise;
}

export function coverSnapshotFromBook(row) {
  const coverType = String(row?.cover_type || row?.coverType || 'card_back');
  const leadCardId = cleanId(row?.lead_card_id || row?.leadCardId, 100).toUpperCase() || null;
  const coverValue = row?.cover_value ?? row?.coverValue ?? null;
  const snapshot = {
    schemaVersion: 1,
    coverType,
    coverValue,
    leadCardId,
    capturedAt: new Date().toISOString(),
    card: null,
  };

  if (coverType === 'card' && leadCardId) {
    const card = cardById(leadCardId);
    if (card) {
      snapshot.card = {
        cardId: card.cardId,
        name: card.name || null,
        descriptorTh: cardDescriptorTh(card),
        species: card.species || null,
        color: card.color || null,
        rarity: card.rarity || null,
        series: card.series || null,
        artVariant: card.artVariant || null,
        image: card.imageFull || card.image || card.art || null,
        imageThumb: card.imageThumb || card.image || card.art || null,
      };
    }
  }
  return snapshot;
}

async function sourceLineage(sql, sourceBookId) {
  const rows = await sql.query(`SELECT l.*,b.state,b.owner_id,b.code,b.name
    FROM teambook_book_lineage l JOIN teambook_books b ON b.id=l.book_id
    WHERE l.book_id=$1 LIMIT 1`, [sourceBookId]);
  return rows[0] || null;
}

async function sourceBookIdFromBody(sql, body) {
  const id = cleanId(body?.lineage?.sourceBookId || body?.sourceBookId, 120);
  if (id) return id;
  const code = cleanId(body?.lineage?.sourceBookCode || body?.sourceBookCode, 10);
  if (!/^\d{5}$/.test(code)) return '';
  const rows = await sql.query('SELECT id FROM teambook_books WHERE code=$1 LIMIT 1', [code]);
  return rows[0]?.id || '';
}

function requestedMode(body) {
  const mode = cleanId(body?.lineage?.mode || body?.lineageMode, 30).toLowerCase();
  return ['continuation', 'spawn'].includes(mode) ? mode : 'root';
}

export async function prepareLineageForCreate(sql, body, identityIds) {
  await ensureLineageSchema(sql);
  const mode = requestedMode(body);
  if (mode === 'root') return { mode: 'root' };

  const sourceBookId = await sourceBookIdFromBody(sql, body);
  if (!sourceBookId) {
    const error = new Error('LINEAGE_SOURCE_REQUIRED');
    error.code = 'LINEAGE_SOURCE_REQUIRED';
    throw error;
  }
  const source = await sourceLineage(sql, sourceBookId);
  if (!source) {
    const error = new Error('LINEAGE_SOURCE_NOT_FOUND');
    error.code = 'LINEAGE_SOURCE_NOT_FOUND';
    throw error;
  }
  if (ACTIVE_STATES.includes(String(source.state || '').toUpperCase())) {
    const error = new Error('LINEAGE_SOURCE_NOT_FINISHED');
    error.code = 'LINEAGE_SOURCE_NOT_FINISHED';
    throw error;
  }
  if (!identityIds.length) {
    const error = new Error('LINEAGE_IDENTITY_REQUIRED');
    error.code = 'LINEAGE_IDENTITY_REQUIRED';
    throw error;
  }

  const members = await sql.query(`SELECT user_id,role FROM teambook_book_members
    WHERE book_id=$1 AND user_id = ANY($2::text[]) ORDER BY joined_at LIMIT 1`, [sourceBookId, identityIds]);
  const member = members[0];
  if (!member) {
    const error = new Error('LINEAGE_MEMBERSHIP_REQUIRED');
    error.code = 'LINEAGE_MEMBERSHIP_REQUIRED';
    throw error;
  }
  if (mode === 'continuation' && member.role !== 'lead') {
    const error = new Error('LINEAGE_LEAD_REQUIRED');
    error.code = 'LINEAGE_LEAD_REQUIRED';
    throw error;
  }
  if (mode === 'continuation') {
    const nextRows = await sql.query('SELECT book_id FROM teambook_book_lineage WHERE previous_book_id=$1 LIMIT 1', [sourceBookId]);
    if (nextRows[0]) {
      const error = new Error('LINEAGE_NEXT_ALREADY_EXISTS');
      error.code = 'LINEAGE_NEXT_ALREADY_EXISTS';
      throw error;
    }
  }

  return {
    mode,
    sourceBookId,
    source,
    spawnedFromUserId: mode === 'spawn' ? member.user_id : null,
  };
}

export async function recordCreatedBookLineage(sql, book, prepared) {
  await ensureLineageSchema(sql);
  const at = new Date(book.createdAt || book.created_at || Date.now());
  const coverSnapshot = coverSnapshotFromBook(book);

  if (!prepared || prepared.mode === 'root') {
    await sql.query(`INSERT INTO teambook_book_lineage (
        book_id,series_id,series_root_book_id,tree_root_book_id,volume_number,relation_kind,
        cover_snapshot_json,memory_snapshot_json,created_at
      ) VALUES ($1,$1,$1,$1,1,'root',$2::jsonb,'{}'::jsonb,$3)
      ON CONFLICT(book_id) DO UPDATE SET cover_snapshot_json=EXCLUDED.cover_snapshot_json`, [
      book.id, JSON.stringify(coverSnapshot), at,
    ]);
    return { relationKind: 'root', seriesId: book.id, volumeNumber: 1, treeRootBookId: book.id };
  }

  const source = prepared.source;
  if (prepared.mode === 'continuation') {
    const volumeNumber = Number(source.volume_number || 1) + 1;
    await sql.query(`INSERT INTO teambook_book_lineage (
        book_id,series_id,series_root_book_id,tree_root_book_id,volume_number,relation_kind,
        previous_book_id,cover_snapshot_json,memory_snapshot_json,created_at
      ) VALUES ($1,$2,$3,$4,$5,'continuation',$6,$7::jsonb,'{}'::jsonb,$8)`, [
      book.id, source.series_id, source.series_root_book_id, source.tree_root_book_id,
      volumeNumber, prepared.sourceBookId, JSON.stringify(coverSnapshot), at,
    ]);
    return {
      relationKind: 'continuation', seriesId: source.series_id, volumeNumber,
      previousBookId: prepared.sourceBookId, treeRootBookId: source.tree_root_book_id,
    };
  }

  await sql.query(`INSERT INTO teambook_book_lineage (
      book_id,series_id,series_root_book_id,tree_root_book_id,volume_number,relation_kind,
      spawned_from_book_id,spawned_from_user_id,cover_snapshot_json,memory_snapshot_json,created_at
    ) VALUES ($1,$1,$1,$2,1,'spawn',$3,$4,$5::jsonb,'{}'::jsonb,$6)`, [
    book.id, source.tree_root_book_id, prepared.sourceBookId, prepared.spawnedFromUserId,
    JSON.stringify(coverSnapshot), at,
  ]);
  return {
    relationKind: 'spawn', seriesId: book.id, volumeNumber: 1,
    spawnedFromBookId: prepared.sourceBookId, spawnedFromUserId: prepared.spawnedFromUserId,
    treeRootBookId: source.tree_root_book_id,
  };
}

async function currentBookMemory(sql, bookId) {
  const books = await sql.query(`SELECT id,code,name,state,preset,duration_days,created_at,started_at,scheduled_end_at,ended_at,updated_at,
    cover_type,cover_value,lead_card_id FROM teambook_books WHERE id=$1 LIMIT 1`, [bookId]);
  const book = books[0];
  if (!book) return null;
  const members = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at,left_at,removal_reason
    FROM teambook_book_members WHERE book_id=$1 ORDER BY joined_at,user_id`, [bookId]);
  return {
    schemaVersion: 1,
    book: {
      id: book.id,
      code: book.code,
      name: book.name,
      state: book.state,
      preset: book.preset || null,
      durationDays: Number(book.duration_days || 0) || null,
      createdAt: book.created_at || null,
      startedAt: book.started_at || null,
      scheduledEndAt: book.scheduled_end_at || null,
      endedAt: book.ended_at || null,
    },
    cover: coverSnapshotFromBook(book),
    members: members.map(member => ({
      userId: member.user_id,
      alias: member.alias,
      avatar: member.avatar || null,
      avatarColor: member.avatar_color || null,
      role: member.role,
      joinedAt: member.joined_at,
      leftAt: member.left_at || null,
      removalReason: member.removal_reason || null,
    })),
    sealedAt: new Date().toISOString(),
  };
}

export async function sealBookMemory(sql, bookId, sealedAt = new Date()) {
  await ensureLineageSchema(sql);
  const memory = await currentBookMemory(sql, bookId);
  if (!memory) return null;
  const cover = memory.cover;
  await sql.query(`UPDATE teambook_book_lineage
    SET cover_snapshot_json=$1::jsonb,memory_snapshot_json=$2::jsonb,sealed_at=$3
    WHERE book_id=$4`, [JSON.stringify(cover), JSON.stringify(memory), sealedAt, bookId]);
  return memory;
}

export async function lineageSnapshot(sql, bookId) {
  await ensureLineageSchema(sql);
  const rows = await sql.query(`SELECT book_id,series_id,series_root_book_id,tree_root_book_id,volume_number,relation_kind,
    previous_book_id,spawned_from_book_id,spawned_from_user_id,cover_snapshot_json,memory_snapshot_json,created_at,sealed_at
    FROM teambook_book_lineage WHERE book_id=$1 LIMIT 1`, [bookId]);
  return rows[0] || null;
}
