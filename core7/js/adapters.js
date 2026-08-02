/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Adapters

   สถาปัตยกรรมแบบ Adapter (Brief §27): UI คุยกับ interface กลาง
   เปลี่ยน Backend ภายหลังได้โดยไม่รื้อ Component

   MatchClient interface (ใช้โดย match-ui.js):
     playerId
     send(action)      → Promise<{ok, error?}>
     getView()         → Promise<view>
     subscribe(cb)     → unsubscribe
     connectionState() → 'on' | 'off'

   ที่ให้มาในเวอร์ชันนี้ (ตรงไปตรงมา ไม่หลอกว่าเป็น Server จริง):
   - LocalBotClient   : Authority รันในหน้าเดียวกัน + บอท — ออฟไลน์สมบูรณ์
   - RoomChannel      : ห้องผ่าน BroadcastChannel — อุปกรณ์เดียวกัน (2 แท็บ)
                        เป็น Mock Server Adapter ที่พิสูจน์ Contract ของ Realtime
   - RemoteRooms      : Backend v0.3 Beta (D1 + server-authoritative polling)
   ═══════════════════════════════════════════════════════════════ */
import { MatchAuthority, PHASE } from './engine.js';
import { Core7Bot } from './bot.js';
import { saveMatchSnapshot, loadMatchSnapshot, getGuest, getTabPlayerId } from './store.js';

let actionSeq = 0;
const newActionId = () => `a-${Date.now().toString(36)}-${(++actionSeq).toString(36)}`;

/* ═══ 1) Bot — Local Authority ═══ */
export class LocalBotClient {
  constructor({ matchId, humanCards, level = 'easy', resume = false }) {
    this.playerId = getGuest().id;
    this.botId = 'bot-' + level;
    this.matchId = matchId;
    this.level = level;
    this.listeners = [];

    const snap = resume ? loadMatchSnapshot(matchId) : null;
    if (snap && snap.state) {
      this.authority = MatchAuthority.restore(snap.state);
      this.bot = new Core7Bot({ level, seed: snap.botSeed });
      this.botSeed = snap.botSeed;
    } else {
      this.botSeed = Math.floor(Math.random() * 1e9);
      this.bot = new Core7Bot({ level, seed: this.botSeed });
      this.authority = new MatchAuthority({
        matchId,
        mode: 'bot',
        players: {
          a: { id: this.playerId, name: getGuest().name, cards: humanCards },
          b: { id: this.botId, name: this._botName(level), cards: Core7Bot.buildHand() },
        },
      });
    }
    this.authority.subscribe(ev => {
      this._persist();
      for (const fn of this.listeners) fn(ev);
      /* ให้บอทขยับหลัง event — ด้วย delay เล็กน้อยให้เหมือนคนคิด */
      setTimeout(() => this._botTurn(), 350 + Math.random() * 650);
    });
    /* เริ่มเกม: บอทเลือกได้เลย */
    setTimeout(() => this._botTurn(), 400);
    this._persist();
  }

  _botName(level) {
    return { easy: 'บอท EASY', hard: 'บอท HARD' }[level] || 'บอท';
  }

  _persist() {
    saveMatchSnapshot(this.matchId, {
      state: this.authority.toJSON(),
      botSeed: this.botSeed,
      level: this.level,
      kind: 'bot',
    });
  }

  _botTurn() {
    const s = this.authority.state;
    if (s.phase === PHASE.ROUND_SELECT && !s.current.b.locked) {
      const view = this.authority.viewFor(this.botId);
      const iid = this.bot.chooseCard(view);
      if (iid) {
        this.authority.action(this.botId, { type: 'select_card', cardInstanceId: iid });
        this.authority.action(this.botId, { type: 'lock_choice' });
        this._persist();
      }
    } else if (s.phase === PHASE.DISCARD_REQUIRED && s.discardBy === 'b') {
      const view = this.authority.viewFor(this.botId);
      const iid = this.bot.chooseDiscard(view);
      if (iid) {
        this.authority.action(this.botId, { type: 'discard_card', cardInstanceId: iid });
        this._persist();
      }
    }
  }

  async send(action) {
    const res = this.authority.action(this.playerId, { ...action, action_id: newActionId() });
    this._persist();
    setTimeout(() => this._botTurn(), 300 + Math.random() * 500);
    return res;
  }
  async getView() { return this.authority.viewFor(this.playerId); }
  subscribe(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l => l !== fn); }; }
  connectionState() { return 'on'; }
}

/* ═══ 2) Room — BroadcastChannel (อุปกรณ์เดียวกัน / 2 แท็บ) ═══
   Host tab = Authority ("Server") · Guest tab = Client ล้วน ๆ
   โปรโตคอลเดียวกับ Realtime Backend จริงตาม API.md — พิสูจน์ Contract
   ข้อจำกัดจริง: BroadcastChannel ข้ามอุปกรณ์ไม่ได้ — ระบุไว้ใน UI ชัดเจน */

const ROOM_NS = 'c7room:';

export class RoomChannel {
  constructor(code) {
    this.code = code.toUpperCase();
    this.ch = new BroadcastChannel(ROOM_NS + this.code);
    this.handlers = new Set();
    this.ch.onmessage = e => { for (const h of this.handlers) h(e.data); };
  }
  post(msg) { this.ch.postMessage(msg); }
  on(fn) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  close() { this.ch.close(); }
}

/* ── Host ── */
export class RoomHost {
  constructor({ code, hostName }) {
    this.code = code;
    this.ch = new RoomChannel(code);
    this.hostId = getTabPlayerId();
    this.players = {
      a: { id: this.hostId, name: hostName, ready: false, cards: null, connected: true },
      b: null,
    };
    this.authority = null;
    this.matchId = null;
    this.listeners = [];
    this.ch.on(msg => this._onMessage(msg));
    /* กู้ห้องเดิมหลัง Refresh */
    const snap = loadMatchSnapshot('room-' + code);
    if (snap && snap.kind === 'room-host') {
      this.players = snap.players;
      this.matchId = snap.matchId;
      if (snap.state) {
        this.authority = MatchAuthority.restore(snap.state);
        this._wireAuthority();
      }
    }
    this._persist();
  }

  _persist() {
    saveMatchSnapshot('room-' + this.code, {
      kind: 'room-host',
      players: this.players,
      matchId: this.matchId,
      state: this.authority ? this.authority.toJSON() : null,
    });
  }

  _notify() { for (const fn of this.listeners) fn(this.roomState()); }
  onChange(fn) { this.listeners.push(fn); }

  roomState() {
    return {
      code: this.code,
      host: { name: this.players.a.name, ready: this.players.a.ready },
      guest: this.players.b ? { name: this.players.b.name, ready: this.players.b.ready } : null,
      matchStarted: !!this.authority,
      matchId: this.matchId,
    };
  }

  _onMessage(msg) {
    switch (msg.t) {
      case 'hello': {            /* guest ขอเข้าห้อง */
        if (this.players.b && this.players.b.id !== msg.playerId) {
          this.ch.post({ t: 'room-full', to: msg.playerId });
          return;
        }
        this.players.b = this.players.b?.id === msg.playerId
          ? { ...this.players.b, name: msg.name, connected: true }
          : { id: msg.playerId, name: msg.name, ready: false, cards: null, connected: true };
        this._persist();
        this.ch.post({ t: 'room-state', state: this.roomState() });
        this._notify();
        break;
      }
      case 'set-hand': {
        const seat = msg.playerId === this.hostId ? 'a' : (this.players.b?.id === msg.playerId ? 'b' : null);
        if (!seat) return;
        this.players[seat].cards = msg.cards;
        this.players[seat].ready = true;
        this._persist();
        this.ch.post({ t: 'room-state', state: this.roomState() });
        this._notify();
        this._maybeStart();
        break;
      }
      case 'action': {           /* guest ส่ง action เข้า Authority */
        if (!this.authority) return;
        const res = this.authority.action(msg.playerId, msg.action);
        this._persist();
        this.ch.post({ t: 'action-result', reqId: msg.reqId, res });
        break;
      }
      case 'get-view': {
        if (!this.authority) return;
        this.ch.post({ t: 'view', reqId: msg.reqId, view: this.authority.viewFor(msg.playerId) });
        break;
      }
      case 'ping': this.ch.post({ t: 'pong', to: msg.playerId }); break;
    }
  }

  setHostHand(cards) {
    this.players.a.cards = cards;
    this.players.a.ready = true;
    this._persist();
    this._notify();
    this._maybeStart();
  }

  _maybeStart() {
    if (this.authority || !this.players.b) return;
    if (!this.players.a.cards || !this.players.b.cards) return;
    this.matchId = 'rm-' + Date.now().toString(36);
    this.authority = new MatchAuthority({
      matchId: this.matchId,
      mode: 'casual',
      players: {
        a: { id: this.players.a.id, name: this.players.a.name, cards: this.players.a.cards },
        b: { id: this.players.b.id, name: this.players.b.name, cards: this.players.b.cards },
      },
    });
    this._wireAuthority();
    this._persist();
    this.ch.post({ t: 'match-started', matchId: this.matchId, state: this.roomState() });
    this._notify();
  }

  _wireAuthority() {
    this.authority.subscribe(ev => {
      this._persist();
      this.ch.post({ t: 'event', ev });
    });
  }

  /* Rematch: ล้างมือ เปิดให้เลือกใหม่ (ไม่มี Deck Lock) */
  rematch() {
    this.authority = null;
    this.matchId = null;
    this.players.a.cards = null; this.players.a.ready = false;
    if (this.players.b) { this.players.b.cards = null; this.players.b.ready = false; }
    this._persist();
    this.ch.post({ t: 'rematch', state: this.roomState() });
    this._notify();
  }

  /* client interface ของ host เอง (in-process) */
  client() {
    const host = this;
    const listeners = [];
    this.authority?.subscribe(ev => { for (const fn of listeners) fn(ev); });
    return {
      playerId: host.hostId,
      async send(action) {
        const res = host.authority.action(host.hostId, { ...action, action_id: newActionId() });
        host._persist();
        host.ch.post({ t: 'event', ev: { event_type: 'sync' } });
        return res;
      },
      async getView() { return host.authority ? host.authority.viewFor(host.hostId) : null; },
      subscribe(fn) {
        listeners.push(fn);
        const un = host.authority?.subscribe(fn);
        return () => un && un();
      },
      connectionState() { return host.players.b?.connected ? 'on' : 'off'; },
    };
  }
}

/* ── Guest ── */
export class RoomGuest {
  constructor({ code, name }) {
    this.code = code;
    this.ch = new RoomChannel(code);
    this.playerId = getTabPlayerId();
    this.name = name;
    this.roomState = null;
    this.matchId = null;
    this.listeners = [];      // room state
    this.evListeners = [];    // match events
    this.pending = new Map(); // reqId → resolve
    this.reqSeq = 0;
    this.lastPong = Date.now();
    this.ch.on(msg => this._onMessage(msg));
    this.hello();
    this._pingTimer = setInterval(() => {
      this.ch.post({ t: 'ping', playerId: this.playerId });
    }, 4000);
  }

  hello() { this.ch.post({ t: 'hello', playerId: this.playerId, name: this.name }); }

  _onMessage(msg) {
    switch (msg.t) {
      case 'room-state':
        this.roomState = msg.state;
        this.matchId = msg.state.matchId;
        for (const fn of this.listeners) fn(msg.state);
        break;
      case 'match-started':
        this.matchId = msg.matchId;
        this.roomState = msg.state;
        for (const fn of this.listeners) fn(msg.state);
        break;
      case 'rematch':
        this.matchId = null;
        this.roomState = msg.state;
        for (const fn of this.listeners) fn(msg.state);
        break;
      case 'room-full':
        if (msg.to === this.playerId) {
          this.full = true;
          for (const fn of this.listeners) fn({ full: true });
        }
        break;
      case 'event':
        for (const fn of this.evListeners) fn(msg.ev);
        break;
      case 'action-result':
      case 'view': {
        const p = this.pending.get(msg.reqId);
        if (p) { this.pending.delete(msg.reqId); p(msg.res ?? msg.view); }
        break;
      }
      case 'pong':
        if (msg.to === this.playerId) this.lastPong = Date.now();
        break;
    }
  }

  onRoom(fn) { this.listeners.push(fn); }

  setHand(cards) { this.ch.post({ t: 'set-hand', playerId: this.playerId, cards }); }

  _request(msg, timeout = 4000) {
    return new Promise(resolve => {
      const reqId = 'r' + (++this.reqSeq) + '-' + this.playerId;
      this.pending.set(reqId, resolve);
      this.ch.post({ ...msg, reqId });
      setTimeout(() => {
        if (this.pending.has(reqId)) { this.pending.delete(reqId); resolve(null); }
      }, timeout);
    });
  }

  client() {
    const g = this;
    return {
      playerId: g.playerId,
      async send(action) {
        const res = await g._request({
          t: 'action', playerId: g.playerId,
          action: { ...action, action_id: newActionId() },
        });
        return res || { ok: false, error: 'HOST_UNREACHABLE' };
      },
      async getView() {
        return await g._request({ t: 'get-view', playerId: g.playerId });
      },
      subscribe(fn) { g.evListeners.push(fn); return () => { g.evListeners = g.evListeners.filter(l => l !== fn); }; },
      connectionState() { return (Date.now() - g.lastPong) < 10000 ? 'on' : 'off'; },
    };
  }

  close() { clearInterval(this._pingTimer); this.ch.close(); }
}

/* ═══ 3) Remote rooms — v0.3 Beta ═══ */
const roomTokenKey = code => `c7:remote-room:${code}`;

async function apiFetch(base, path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await response.json(); } catch { data = { ok: false, error: 'INVALID_SERVER_RESPONSE' }; }
  if (!response.ok) {
    const error = new Error(data.error || `HTTP_${response.status}`);
    error.code = data.error || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return data;
}

export class RemoteRooms {
  constructor({ base = globalThis.C7_CONFIG?.API_BASE
    || (/^(www\.)?myclover\.com$/.test(globalThis.location?.hostname || '')
      ? 'https://teem.pages.dev/api/core7' : '/api/core7') } = {}) {
    this.base = base.replace(/\/$/, '');
  }

  async health() {
    try { return (await apiFetch(this.base, '/health')).ok; } catch { return false; }
  }

  async list() { return (await apiFetch(this.base, '/rooms')).rooms || []; }

  async create({ displayName, visibility, mode }) {
    const data = await apiFetch(this.base, '/rooms', {
      method: 'POST', body: { displayName, visibility, mode },
    });
    this.saveToken(data.code, data.token);
    return data;
  }

  async join(code, displayName) {
    const data = await apiFetch(this.base, `/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST', body: { displayName },
    });
    this.saveToken(code, data.token);
    return data;
  }

  saveToken(code, token) {
    try { localStorage.setItem(roomTokenKey(code), token); } catch { /* private mode */ }
  }

  token(code) {
    try { return localStorage.getItem(roomTokenKey(code)); } catch { return null; }
  }

  session(code) {
    const token = this.token(code);
    if (!token) throw new Error('ROOM_SESSION_NOT_FOUND');
    return new RemoteRoomSession({ base: this.base, code, token });
  }
}

export class RemoteRoomSession {
  constructor({ base, code, token, pollMs = 900 }) {
    this.base = base;
    this.code = code;
    this.token = token;
    this.pollMs = pollMs;
    this.state = null;
    this.version = 0;
    this.online = true;
    this.listeners = new Set();
    this.matchListeners = new Set();
    this.closed = false;
    this.pollTimer = null;
  }

  async request(path, options = {}) {
    try {
      const data = await apiFetch(this.base, `/rooms/${encodeURIComponent(this.code)}${path}`, {
        ...options, token: this.token,
      });
      this.online = true;
      this._accept(data);
      return data;
    } catch (error) {
      this.online = false;
      this._notify({ type: 'connection', error: error.code });
      throw error;
    }
  }

  _accept(data) {
    if (!data?.room) return;
    const changed = data.version !== this.version || JSON.stringify(data.room) !== JSON.stringify(this.state?.room);
    this.state = data;
    this.version = data.version || this.version;
    if (changed) this._notify({ type: 'state', version: this.version });
  }

  _notify(event) {
    for (const fn of this.listeners) fn(this.state, event);
    for (const fn of this.matchListeners) fn(event);
  }

  async refresh() { return this.request('/state'); }
  async setHand(cards) { return this.request('/hand', { method: 'POST', body: { cards } }); }
  async readyNext() { return this.request('/next', { method: 'POST', body: {} }); }
  async leave() { return this.request('/leave', { method: 'POST', body: {} }); }

  subscribe(fn) {
    this.listeners.add(fn);
    if (!this.pollTimer) this._poll();
    return () => this.listeners.delete(fn);
  }

  _poll() {
    if (this.closed) return;
    this.refresh().catch(() => {});
    this.pollTimer = setTimeout(() => this._poll(), this.pollMs);
  }

  client() {
    const room = this;
    return {
      playerId: 'remote-local',
      async send(action) {
        try {
          const data = await room.request('/action', { method: 'POST', body: { action: { ...action, action_id: newActionId() } } });
          return data.ok ? { ok: true } : data;
        } catch (error) { return { ok: false, error: error.code || 'NETWORK_ERROR' }; }
      },
      async getView() {
        if (!room.state) await room.refresh();
        return room.state?.matchView || null;
      },
      subscribe(fn) {
        room.matchListeners.add(fn);
        if (!room.pollTimer) room._poll();
        return () => room.matchListeners.delete(fn);
      },
      connectionState() { return room.online ? 'on' : 'off'; },
    };
  }

  close() {
    this.closed = true;
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }
}
