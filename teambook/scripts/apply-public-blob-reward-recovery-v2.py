from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match in {path}, got {count}')
    path.write_text(text.replace(old, new, 1))


# 1) Keep a first-seen reward in local pending state before it belongs to Collection.
store = ROOT / 'teambook/_shared/store.js'
replace_once(
    store,
    "    if (!rewardId || seen.has(rewardId) || (cardId && !ownedCardIds.has(cardId))) continue;\n",
    "    const pendingUnownedFirstSeen = cardId\n"
    "      && !ownedCardIds.has(cardId)\n"
    "      && /^first-seen:/.test(String(entry.questId || ''))\n"
    "      && !entry.revealedAt\n"
    "      && entry.source === 'server';\n"
    "    if (!rewardId || seen.has(rewardId)\n"
    "      || (cardId && !ownedCardIds.has(cardId) && !pendingUnownedFirstSeen)) continue;\n",
    'preserve pending first-seen reward',
)

# 2) Carry the party code in the reveal link so refresh recovery has a canonical target.
party = ROOT / 'teambook/p/index.html'
replace_once(
    party,
    'href="/reveal/?r=${encodeURIComponent(post.rewardId)}"',
    'href="/reveal/?r=${encodeURIComponent(post.rewardId)}&c=${encodeURIComponent(code)}"',
    'add party code to pending reward link',
)

# 3) If local pending state was normalized away, rebuild it from the server before
# declaring that there is no card waiting.
reveal = ROOT / 'teambook/reveal/index.html'
replace_once(
    reveal,
    "  updateProfile, allParties, isActiveParty, partyIdentity,\n",
    "  updateProfile, allParties, isActiveParty, partyIdentity, refreshParty,\n",
    'import refreshParty on reveal',
)
replace_once(
    reveal,
    "const rewardId = params.get('r') || '';\nconst reward = pendingCardReward(rewardId);\n$('shell').hidden = true;\n",
    "const rewardId = params.get('r') || '';\nlet reward = pendingCardReward(rewardId);\n$('shell').hidden = false;\n",
    'make reveal reward recoverable',
)
replace_once(
    reveal,
    """if (!reward) {
  $('missing').hidden = false;
} else if (reward.complete || !reward.cardId) {
  $('complete').hidden = false;
  markCardRewardRevealed(reward.rewardId);
} else {
  showReward(reward);
}
""",
    """bootReveal();

async function bootReveal() {
  if (!reward && rewardId) {
    const hinted = String(params.get('c') || '').toUpperCase();
    const cachedParty = allParties().find(partyItem =>
      (partyItem.log || []).some(post => post.rewardId === rewardId)
    );
    const partyCode = /^\\d{5}$/.test(hinted) ? hinted : (cachedParty?.code || '');
    if (partyCode) {
      await refreshParty(partyCode);
      reward = pendingCardReward(rewardId);
    }
  }

  $('shell').hidden = true;
  if (!reward) {
    $('missing').hidden = false;
  } else if (reward.complete || !reward.cardId) {
    $('complete').hidden = false;
    markCardRewardRevealed(reward.rewardId);
  } else {
    showReward(reward);
  }
}
""",
    'recover pending reward before missing screen',
)

# 4) Public Blob store. Only the binary object is public/shareable; TeamBook
# messages, membership and metadata remain in the private database/API.
image = ROOT / 'teambook/api/_lib/xty-image.js'
replace_once(
    image,
    "import { put, del, get } from '@vercel/blob';\n",
    "import { put, del } from '@vercel/blob';\n",
    'drop private Blob get import',
)
replace_once(
    image,
    """  const result = await put(`teambook/${partyCode}/${Date.now()}.${extension}`, decoded.buffer, {
    access: 'private',
""",
    """  const result = await put(`teambook/${partyCode}/${Date.now()}.${extension}`, decoded.buffer, {
    access: 'public',
""",
    'write to public Blob store',
)
replace_once(
    image,
    "    cacheControlMaxAge: 31536000,\n",
    "    cacheControlMaxAge: 86400,\n",
    'shorten public image cache',
)
replace_once(
    image,
    """export async function readStoredImage(url, options = {}) {
  if (!isStoredImageUrl(url)) return null;
  return get(url, {
    access: 'private',
    ifNoneMatch: options.ifNoneMatch || undefined,
  });
}

/* Groq cannot fetch a private Blob URL. Read the already-small image on the
   server and hand vision a data URL instead; no permanent public derivative
   is created. */
""",
    """export async function readStoredImage(url, options = {}) {
  if (!isStoredImageUrl(url)) return null;
  const headers = {};
  if (options.ifNoneMatch) headers['If-None-Match'] = options.ifNoneMatch;
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (response.status !== 200 && response.status !== 304) return null;
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentLength = Number(response.headers.get('content-length') || 0);
  const etag = response.headers.get('etag') || '';
  return {
    statusCode: response.status,
    stream: response.body,
    blob: {
      contentType,
      size: Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : 0,
      etag,
    },
  };
}

/* The Blob object is public/shareable, but vision still receives a compact
   data URL so provider-fetch quirks cannot make a party photo disappear. */
""",
    'read public Blob through standard fetch',
)

# 5) Update architecture test to reflect the new binary-public/data-private boundary.
testfile = ROOT / 'teambook/tests/private-image.test.mjs'
replace_once(
    testfile,
    "test('deployment and runtime enforce private storage end to end', () => {\n",
    "test('deployment writes public blobs while TeamBook state routes stay gated', () => {\n",
    'rename Blob architecture test',
)
replace_once(
    testfile,
    "  assert.match(image, /access: 'private'/);\n  assert.doesNotMatch(image, /access: 'public'/);\n",
    "  assert.match(image, /access: 'public'/);\n  assert.doesNotMatch(image, /access: 'private'/);\n  assert.match(image, /fetch\\(url/);\n",
    'assert public Blob architecture',
)

checks = {
    store: ['pendingUnownedFirstSeen', "entry.source === 'server'"],
    party: ['&c=${encodeURIComponent(code)}'],
    reveal: ['async function bootReveal()', 'await refreshParty(partyCode)'],
    image: ["access: 'public'", "fetch(url, { headers, redirect: 'follow' })"],
}
for path, needles in checks.items():
    text = path.read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'final guard failed: {needle} missing from {path}')

print('TeamBook public Blob + pending reward recovery v2 applied')
