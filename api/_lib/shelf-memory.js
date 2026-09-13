// Explicit in-memory repository for isolated tests and local UI fixtures only.
// Production api/shelf.js never imports or selects this repository.
import { randomUUID } from 'node:crypto';

const stamp = value => value ? new Date(value).toISOString() : null;

export function createMemoryShelfRepository() {
  const users = new Map(), keys = new Map(), sessions = new Map(), hits = new Map(), events = [];
  const active = (key, now) => Boolean(key && !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > now));
  const publicKey = key => {
    if (!key) return null;
    const { keyHash, ...record } = key;
    return structuredClone(record);
  };
  const current = (tokenHash, now) => {
    const session = sessions.get(tokenHash);
    if (!session || new Date(session.expiresAt) <= now) return null;
    const key = keys.get(session.keyId);
    return active(key, now) ? { key: publicKey(key), expiresAt: session.expiresAt } : null;
  };
  const count = (list, kind) => list.filter(event => event.kind === kind).length;
  const latest = list => list.reduce((last, item) => item.createdAt > (last || '') ? item.createdAt : last, null);
  return {
    async userById(id) { return structuredClone(users.get(id) || null); },
    async rateLimited(bucket, now, limit, windowMs) {
      for (const [key, hit] of hits) if (hit.expires <= now.getTime()) hits.delete(key);
      const hit = hits.get(bucket) || { hits: 0, expires: (Math.floor(now.getTime() / windowMs) + 1) * windowMs };
      hit.hits++; hits.set(bucket, hit); return hit.hits > limit;
    },
    async activeKey(hash, now) { return publicKey([...keys.values()].find(key => key.keyHash === hash && active(key, now))); },
    async createSession(tokenHash, keyId, createdAt, expiresAt) {
      if (!active(keys.get(keyId), createdAt)) return false;
      sessions.set(tokenHash, { keyId, createdAt: stamp(createdAt), expiresAt: stamp(expiresAt) });
      return true;
    },
    async session(tokenHash, now) { return current(tokenHash, now); },
    async destroySession(tokenHash) { sessions.delete(tokenHash); },
    async createKey(record) {
      if (!users.has(record.userId)) users.set(record.userId, { id: record.userId, name: record.name, createdAt: stamp(record.createdAt) });
      const key = { ...record, createdAt: stamp(record.createdAt), expiresAt: stamp(record.expiresAt), revokedAt: null, lastUsedAt: null };
      keys.set(key.id, key); return publicKey(key);
    },
    async revokeKey(id, now) {
      const key = keys.get(id); if (!key) return null;
      key.revokedAt ||= stamp(now);
      for (const [hash, session] of sessions) if (session.keyId === id) sessions.delete(hash);
      return publicKey(key);
    },
    async recordServe(tokenHash, source, kind, now) {
      const session = current(tokenHash, now);
      if (!session || (session.key.sourceIds !== null && !session.key.sourceIds.includes(source.id))) return false;
      const key = keys.get(session.key.id);
      key.lastUsedAt = stamp(now);
      events.push({ id: randomUUID(), userId: key.userId, name: key.name, keyId: key.id, sourceId: source.id, sourceTitle: source.title, sourceVersion: source.version, kind, createdAt: stamp(now) });
      return true;
    },
    async adminSnapshot(now) {
      const list = [...keys.values()];
      const sourceStats = new Map(), userSourceStats = new Map();
      for (const event of events) {
        for (const [map, id, user] of [[sourceStats, event.sourceId, false], [userSourceStats, `${event.userId}:${event.sourceId}`, true]]) {
          const metric = map.get(id) || { ...(user ? { userId: event.userId, name: event.name } : {}), sourceId: event.sourceId, sourceTitle: event.sourceTitle, openCount: 0, copyCount: 0, downloadCount: 0, lastUsedAt: null };
          metric[`${event.kind}Count`]++; metric.lastUsedAt = event.createdAt; map.set(id, metric);
        }
      }
      return {
        users: [...users.values()].map(user => {
          const own = list.filter(key => key.userId === user.id), served = events.filter(event => event.userId === user.id);
          return { ...user, keyCount: own.length, activeKeyCount: own.filter(key => active(key, now)).length, lastSeenAt: latest(served), openCount: count(served, 'open'), copyCount: count(served, 'copy'), downloadCount: count(served, 'download') };
        }).reverse().slice(0, 1000),
        keys: list.map(publicKey).reverse().slice(0, 1000), events: structuredClone(events.slice(-200).reverse()),
        eventsLimit: 200, eventsTotal: events.length, eventsHasMore: events.length > 200,
        sourceStats: [...sourceStats.values()], userSourceStats: [...userSourceStats.values()],
        stats: { userCount: users.size, keyCount: list.length, activeKeyCount: list.filter(key => active(key, now)).length, openCount: count(events, 'open'), copyCount: count(events, 'copy'), downloadCount: count(events, 'download') },
      };
    },
  };
}
