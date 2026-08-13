from pathlib import Path

p = Path("classroom/clip-ai.html")
t = p.read_text(encoding="utf-8")

assert '<meta name="mc-item" content="learn:clip-ai">' in t
assert '<figure class="classroom-lesson-header-image">' in t
assert '/classroom/img/header-lesson3.jpeg' in t

prompt_text = 'สร้างวิดีโอตามซอสนี้'
positions = []
start = 0
while True:
    pos = t.find(prompt_text, start)
    if pos == -1:
        break
    positions.append(pos)
    start = pos + len(prompt_text)

print('PROMPT_OCCURRENCES', len(positions))
for i, pos in enumerate(positions):
    print(f'--- OCCURRENCE {i} @ {pos} ---')
    print(t[max(0, pos-1600):min(len(t), pos+900)])
    print(f'--- END {i} ---')

raise SystemExit('inspection complete')
