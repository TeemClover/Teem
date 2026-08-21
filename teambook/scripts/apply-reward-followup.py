from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def patch(rel, old, new):
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise SystemExit(f'{rel}: expected one anchor, found {text.count(old)}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

patch(
    'teambook/reveal/index.html',
    "    const party = allParties().find(item => item.code === item.partyCode) || allParties().find(item => item.code === reward.partyCode);\n    const identity = partyIdentity(item.partyCode);",
    "    const party = allParties().find(partyItem => partyItem.code === item.partyCode);\n    const identity = partyIdentity(item.partyCode);",
)

patch(
    'teambook/p/index.html',
    """    const body = post.retracted
      ? '<span>ข้อความถูกถอนโดยเจ้าของ</span>'
      : (pendingFirstSeen
        ? `<a class=\"reward-log-pending\" href=\"/reveal/?r=${encodeURIComponent(post.rewardId)}\">`
          + `<img src=\"/assets/card-back.webp\" alt=\"การ์ดรอเปิด\" width=\"630\" height=\"880\">`
          + `<span><b>${esc(post.alias)} เจอการ์ด</b><small>แตะเพื่อเปิด · ยังไม่เข้า Collection จนกว่าจะเปิด</small></span></a>`
        : (isReward && rewardCard""",
    """    const body = post.retracted
      ? '<span>ข้อความถูกถอนโดยเจ้าของ</span>'
      : (pendingFirstSeen
        ? (post.userId === myId
          ? `<a class=\"reward-log-pending\" href=\"/reveal/?r=${encodeURIComponent(post.rewardId)}\">`
            + `<img src=\"/assets/card-back.webp\" alt=\"การ์ดรอเปิด\" width=\"630\" height=\"880\">`
            + `<span><b>${esc(post.alias)} เจอการ์ด</b><small>แตะเพื่อเปิด · ยังไม่เข้า Collection จนกว่าจะเปิด</small></span></a>`
          : `<div class=\"reward-log-pending is-waiting\">`
            + `<img src=\"/assets/card-back.webp\" alt=\"การ์ดรอ ${esc(post.alias)} เปิด\" width=\"630\" height=\"880\">`
            + `<span><b>${esc(post.alias)} เจอการ์ด</b><small>รอเจ้าของการ์ดเปิดเอง</small></span></div>`)
        : (isReward && rewardCard""",
)

print('reward follow-up applied')
