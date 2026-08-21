from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'{label}: expected source not found in {path}')
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected exactly one source match in {path}, got {text.count(old)}')
    path.write_text(text.replace(old, new, 1))


# 1) Pending first-seen rewards must survive profile normalization even before
# the card is owned. Ownership is intentionally granted only on reveal.
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

# 2) Future reveal links carry the party code so the reveal page can recover
# the server-reserved reward even if localStorage was normalized/refreshed.
party = ROOT / 'teambook/p/index.html'
replace_once(
    party,
    'href="/reveal/?r=${encodeURIComponent(post.rewardId)}"',
    'href="/reveal/?r=${encodeURIComponent(post.rewardId)}&c=${encodeURIComponent(code)}"',
    'add party code to pending reward link',
)

# 3) Reveal page: if the reward vanished from local cache, refresh its party
# from the canonical server and let rememberResponse/importServerCardReward
# rebuild the pending local claim before deciding it is missing.
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
old_boot = """if (!reward) {
  $('missing').hidden = false;
} else if (reward.complete || !reward.cardId) {
  $('complete').hidden = false;
  markCardRewardRevealed(reward.rewardId);
} else {
  showReward(reward);
}
"""
new_boot = """bootReveal();

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
"""
replace_once(reveal, old_boot, new_boot, 'server recovery on reveal')

# 4) Public Blob architecture. The store itself is public, while TeamBook's
# message/database state stays private. Keep the old member-gated proxy route
# working by reading the public object with fetch instead of the private Blob
# SDK get() API. PET vision can continue converting the small image to a data
# URL server-side, while the underlying Blob URL remains shareable.
image = ROOT / 'teambook/api/_lib/xty-image.js'
replace_once(
    image,
    "import { put, del, get } from '@vercel/blob';\n",
    "import { put, del } from '@vercel/blob';\n",
    'drop private blob get import',
)
replace_once(
    image,
    "    access: 'private',\n",
    "    access: 'public',\n",
    'write public blobs',
)
replace_once(
    image,
    "    cacheControlMaxAge: 31536000,\n",
    "    cacheControlMaxAge: 86400,\n",
    'shorten public image cache',
)
old_read = """export async function readStoredImage(url, options = {}) {
  if (!isStoredImageUrl(url)) return null;
  return get(url, {
    access: 'private',
    ifNoneMatch: options.ifNoneMatch || undefined,
  });
}

/* Groq cannot fetch a private Blob URL. Read the already-small image on the
   server and hand vision a data URL instead; no permanent public derivative
   is created. */
"""
new_read = """export async function readStoredImage(url, options = {}) {
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
   data URL so provider fetch quirks cannot make a party photo disappear. */
"""
replace_once(image, old_read, new_read, 'read public blobs through fetch')

# 5) Update the architecture test to assert the new storage boundary while
# retaining the authenticated TeamBook proxy route for backwards compatibility.
testfile = ROOT / 'teambook/tests/private-image.test.mjs'
replace_once(
    testfile,
    "test('deployment and runtime enforce private storage end to end', () => {\n",
    "test('deployment writes public blobs while TeamBook state routes stay gated', () => {\n",
    'rename blob architecture test',
)
replace_once(
    testfile,
    "  assert.match(image, /access: 'private'/);\n  assert.doesNotMatch(image, /access: 'public'/);\n",
    "  assert.match(image, /access: 'public'/);\n  assert.doesNotMatch(image, /access: 'private'/);\n  assert.match(image, /fetch\\(url/);\n",
    'assert public blob architecture',
)

# Guard the important outcomes so a future source drift cannot silently make
# this one-shot workflow report success without applying the intended patch.
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

print('TeamBook public Blob + reward recovery patch applied')
