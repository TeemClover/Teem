import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(path, oldText, newText) {
  const source = readFileSync(path, 'utf8');
  if (source.includes(newText)) return false;
  if (!source.includes(oldText)) {
    throw new Error(`TeamBook profile repair target missing: ${path}`);
  }
  writeFileSync(path, source.replace(oldText, newText));
  return true;
}

const changes = [];
const patch = (path, oldText, newText) => {
  if (replaceOnce(path, oldText, newText)) changes.push(path);
};

// An explicit null means the player chose a free Starter animal. Never
// silently equip the first owned card again.
patch(
  '_shared/store.js',
  `  const equippedWanted = canonicalCardId(value.equippedCardId || '');\n  const equippedCardId = ownedCardIds.has(equippedWanted)\n    ? equippedWanted\n    : (ownedCards[0]?.cardId || null);`,
  `  const equippedWanted = canonicalCardId(value.equippedCardId || '');\n  const equippedCardId = ownedCardIds.has(equippedWanted) ? equippedWanted : null;`,
);

// Cloud sync must respect the newest explicit Starter choice (null) instead
// of resurrecting the previously equipped cloud card.
patch(
  '_shared/account.js',
  `    equippedCardId: mergedOwnedCards.some(item => item.cardId === newest.equippedCardId)\n      ? newest.equippedCardId\n      : (mergedOwnedCards.some(item => item.cardId === older.equippedCardId) ? older.equippedCardId : null),`,
  `    equippedCardId: newest.equippedCardId\n      && mergedOwnedCards.some(item => item.cardId === newest.equippedCardId)\n        ? newest.equippedCardId\n        : null,`,
);

patch(
  '_shared/card-ui.js',
  `AVATAR_IN_USE: 'ใช้อยู่เป็นสัตว์'`,
  `AVATAR_IN_USE: 'การ์ดประจำตัว'`,
);

patch(
  'collection/index.html',
  `สัตว์เริ่มต้นเลือกใช้ฟรีและไม่นับเป็นการ์ด · Common ใช้เป็นสัตว์หรือเพื่อนร่วมทาง · Rare, Epic และ Legendary ใช้เป็นปกสมุดได้`,
  `สัตว์เริ่มต้นเลือกใช้ฟรีและไม่นับเป็นการ์ด · Common ใช้เป็นการ์ดประจำตัวหรือเพื่อนร่วมทาง · Rare, Epic และ Legendary ใช้เป็นปกสมุดได้`,
);
patch(
  'collection/index.html',
  `<button class="btn gold" id="useAvatar">ใช้เป็น สัตว์</button>`,
  `<button class="btn gold" id="useAvatar">ใช้เป็นการ์ดประจำตัว</button>`,
);
patch(
  'reveal/index.html',
  `<button class="btn ghost" id="useAvatar">ใช้เป็น สัตว์</button>`,
  `<button class="btn ghost" id="useAvatar">ใช้เป็นการ์ดประจำตัว</button>`,
);
patch(
  'reveal/index.html',
  `$('useAvatar').textContent = 'ใช้เป็น สัตว์ แล้ว ✓';`,
  `$('useAvatar').textContent = 'ใช้เป็นการ์ดประจำตัวแล้ว ✓';`,
);

// Keep OAuth server code intact, but intentionally expose only email/password
// in the account UI for now.
patch(
  'assets/account.js',
  `    const [session, available] = await Promise.all([api(\`${'${API}'}/session\`), api(\`${'${API}'}/providers\`)]);\n    user = session.user || null; providers = available.providers || providers;`,
  `    const session = await api(\`${'${API}'}/session\`);\n    user = session.user || null; providers = { email: true, google: false, line: false };`,
);
patch(
  'profile/index.html',
  `สมัครหรือ Login ด้วยอีเมล + รหัสผ่าน, LINE หรือ Google · Progress ในเครื่องกับ Cloud จะถูกรวมกัน`,
  `สมัครหรือ Login ด้วยอีเมล + รหัสผ่าน · Progress ในเครื่องกับ Cloud จะถูกรวมกัน`,
);

console.log(changes.length
  ? `TeamBook profile build repair applied to ${[...new Set(changes)].join(', ')}`
  : 'TeamBook profile build repair already applied.');
