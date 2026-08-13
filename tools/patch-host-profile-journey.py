from pathlib import Path

backend = Path('core7/backend/analytics-v11.js')
s = backend.read_text(encoding='utf-8')

replacements = [
    (
        "        MIN(CASE WHEN ref='home-video' THEN occurred_at END) video_at,\n        MIN(CASE WHEN ref='hall-open' THEN occurred_at END) hall_at\n      FROM c7_analytics_events\n      WHERE event_type='ACT' AND ref IN ('home-open','home-video','hall-open')",
        "        MIN(CASE WHEN ref='home-video' THEN occurred_at END) video_at,\n        MIN(CASE WHEN ref='home-host-profile' THEN occurred_at END) host_at,\n        MIN(CASE WHEN ref='hall-open' THEN occurred_at END) hall_at\n      FROM c7_analytics_events\n      WHERE event_type='ACT' AND ref IN ('home-open','home-video','home-host-profile','hall-open')",
    ),
    (
        "      COUNT(CASE WHEN opened_at IS NOT NULL AND video_at IS NOT NULL THEN 1 END) watched_video,\n      COUNT(CASE WHEN opened_at IS NOT NULL AND hall_at IS NOT NULL",
        "      COUNT(CASE WHEN opened_at IS NOT NULL AND video_at IS NOT NULL THEN 1 END) watched_video,\n      COUNT(CASE WHEN opened_at IS NOT NULL AND host_at IS NOT NULL THEN 1 END) host_profile,\n      COUNT(CASE WHEN opened_at IS NOT NULL AND hall_at IS NOT NULL",
    ),
    (
        "  home.video_rate = rate(home.watched_video, home.visitors);\n  home.direct_rate = rate(home.entered_direct, home.visitors);",
        "  home.video_rate = rate(home.watched_video, home.visitors);\n  home.host_profile_rate = rate(home.host_profile, home.visitors);\n  home.direct_rate = rate(home.entered_direct, home.visitors);",
    ),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f'backend marker missing: {old[:70]}')
    s = s.replace(old, new, 1)
backend.write_text(s, encoding='utf-8')

page = Path('stat/journey/index.html')
s = page.read_text(encoding='utf-8')
replacements = [
    ('.metrics.five{grid-template-columns:repeat(5,1fr)}', '.metrics.five{grid-template-columns:repeat(5,1fr)}\n.metrics.six{grid-template-columns:repeat(6,1fr)}'),
    ('@media(max-width:1100px){.metrics.five{grid-template-columns:repeat(3,1fr)}}', '@media(max-width:1100px){.metrics.five,.metrics.six{grid-template-columns:repeat(3,1fr)}}'),
    ('@media(max-width:900px){.metrics.four,.metrics.five{grid-template-columns:repeat(2,1fr)}}', '@media(max-width:900px){.metrics.four,.metrics.five,.metrics.six{grid-template-columns:repeat(2,1fr)}}'),
    ('.metrics,.metrics.four,.metrics.five{grid-template-columns:1fr}', '.metrics,.metrics.four,.metrics.five,.metrics.six{grid-template-columns:1fr}'),
    ('<section class="metrics five" id="homeMetrics"></section>', '<section class="metrics six" id="homeMetrics"></section>'),
    (
        "  metric('กดดูวิดีโอ',fmt(h.watched_video),`${pct(h.video_rate)} ของคนเข้าหน้าแรก`),\n  metric('เข้าบ้านทันที',fmt(h.entered_direct),`${pct(h.direct_rate)} · ไม่ได้ดูวิดีโอก่อน`),",
        "  metric('กดดูวิดีโอ',fmt(h.watched_video),`${pct(h.video_rate)} ของคนเข้าหน้าแรก`),\n  metric('พบเจ้าบ้าน',fmt(h.host_profile),`${pct(h.host_profile_rate)} ของคนเข้าหน้าแรก`),\n  metric('เข้าบ้านทันที',fmt(h.entered_direct),`${pct(h.direct_rate)} · ไม่ได้ดูวิดีโอก่อน`),",
    ),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f'journey marker missing: {old[:70]}')
    s = s.replace(old, new, 1)
page.write_text(s, encoding='utf-8')

assert "ref='home-host-profile'" in backend.read_text(encoding='utf-8')
assert "metric('พบเจ้าบ้าน'" in page.read_text(encoding='utf-8')
print('host profile Journey metric patched')
