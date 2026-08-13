from pathlib import Path

t = Path('classroom/clip-ai.html').read_text(encoding='utf-8')
assert '<meta name="mc-item" content="learn:clip-ai">' in t
start = t.find('<script type="module" data-self-contained="lesson3-video-fast-track.js">')
assert start != -1
end = t.find('</script>', start)
assert end != -1
print(t[start:end+9])
raise SystemExit('inspection complete')
