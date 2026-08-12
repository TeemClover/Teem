from pathlib import Path
import re

path = Path('classroom/first-web.html')
s = path.read_text(encoding='utf-8')

# 1) Rebuild the Lesson 6 hero to the same image-first structure used by the other kitchen lessons.
hero_re = re.compile(r'<header class="hero">.*?</header>', re.S)
hero = '''<header class="hero lesson6-hero">
  <div class="lesson6-hero-copy">
    <span class="lv">บทที่ 6 · Serve</span>
    <h1 class="disp">เปลี่ยนซอสเป็น<br>HTML ไฟล์มีชีวิต</h1>
    <p class="lead">นี่ไม่ใช่คลาสสำหรับคนอยากทำเว็บไซต์ แต่คือคลาสสำหรับคนที่อยาก <strong>เสิร์ฟความคิดให้คนอื่นเปิด ใช้ และเดินต่อได้จริง</strong></p>
    <div class="meta"><span>🥩 เมนคอร์ส</span><span>📄 ไฟล์เดียว</span><span>📱 เปิดได้บนโทรศัพท์</span><span>🌍 ส่งให้ 1 คนหรือทั้งโลก</span></div>
  </div>
  <div class="lesson-art-frame">
    <img class="lesson-art" src="../img/classroom-kitchen-20260811-2231/lv6-serve-steak.jpeg" alt="ภาพบทที่ 6 Serve เชฟเสิร์ฟจานจากซอส" loading="eager" decoding="async">
  </div>
</header>'''
s, n = hero_re.subn(hero, s, count=1)
if n != 1:
    raise RuntimeError(f'hero replacement count={n}')

# 2) Replace the Lesson 6-only visual layer with the same proportions and prompt controls as Lesson 2.
style_re = re.compile(r'<style id="lesson6-smart-resume-style">.*?</style>', re.S)
style = '''<style id="lesson6-smart-resume-style">
/* Lesson 6 consistency layer — follows the stable kitchen lesson pattern used by Lesson 2. */
html,body{min-height:100%}body{overflow-y:auto!important}
.lesson6-hero{padding:0 0 34px}.lesson6-hero::before{pointer-events:none}.lesson6-hero-copy{position:relative;z-index:1;padding:42px 42px 24px}.lesson6-hero h1{max-width:16ch;margin-top:14px}.lesson6-hero .lead{max-width:62ch}.lesson-art-frame{position:relative;z-index:1;width:calc(100% - 68px);margin:0 34px;aspect-ratio:16/10;overflow:hidden;border-radius:20px;border:1px solid rgb(255 255 255/.22);background:#071a10;box-shadow:0 24px 44px rgb(0 0 0/.24)}.lesson-art{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
.serve-tldr{display:grid;grid-template-columns:1.35fr .85fr;gap:14px;margin:20px 0 24px}.serve-tldr>div{padding:22px;border:1px solid rgb(var(--ink)/.1);border-radius:18px;background:#fff;box-shadow:0 8px 25px rgb(18 40 28/.05)}.serve-tldr h2{margin:6px 0 8px;font:800 clamp(22px,3vw,29px)/1.35 "Bai Jamjuree",system-ui,sans-serif}.serve-tldr p{margin:0;color:rgb(var(--muted));font-size:14.5px;line-height:1.75}.take-home{display:grid;gap:8px;margin-top:10px}.take-home span{display:block;padding:9px 11px;border-radius:12px;background:rgb(var(--green)/.07);font-weight:700}
.smart-resume-workflow{display:block!important;overflow:visible!important;max-height:none!important;contain:none!important}.smart-resume-workflow .section-head{margin-bottom:14px}.smart-resume-workflow .section-head h2{font:800 clamp(22px,4.2vw,29px)/1.35 "Bai Jamjuree",system-ui,sans-serif}.smart-resume-workflow .section-head p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important;line-height:1.7!important}.smart-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 16px}
.smart-steps{display:grid!important;gap:13px;margin-top:14px;overflow:visible!important;max-height:none!important}.smart-step{display:grid!important;grid-template-columns:38px minmax(0,1fr);gap:13px;align-items:start;padding:17px 18px;border:1px solid rgb(var(--ink)/.09);border-radius:16px;background:#fff;box-shadow:0 7px 22px rgb(18 40 28/.04);overflow:visible!important;max-height:none!important}.step-no{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgb(var(--green));color:#fff;font:800 13px "Bai Jamjuree",system-ui,sans-serif}.step-body{display:block!important;min-width:0;overflow:visible!important;max-height:none!important}.step-body h3{font:750 16px/1.4 "Bai Jamjuree",system-ui,sans-serif!important}.step-body>p{margin-top:4px;color:rgb(var(--muted));font-size:13.5px!important;line-height:1.65!important}
.source-warning{margin:12px 0;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgba(153,25,25,.08)}.source-warning strong{display:block;color:#a31717;font:700 14px/1.5 "Bai Jamjuree",system-ui,sans-serif!important}.source-warning span{display:block;margin-top:2px;font-size:13px!important;line-height:1.6!important}.source-warning code{background:rgba(163,23,23,.08);padding:1px 5px;border-radius:5px}
.prompt-card{position:relative;margin-top:13px;padding:48px 16px 16px;border:1px solid rgb(var(--gold)/.2);border-radius:13px;background:#071a10;color:#d7f5e2;font:12.8px/1.7 ui-monospace,Menlo,Consolas,monospace!important;white-space:normal;overflow:visible!important;overflow-wrap:anywhere;max-height:none!important;box-shadow:inset 0 1px 0 rgb(255 255 255/.055)}.prompt-card[data-prompt-collapse]{padding-bottom:54px}.prompt-copy{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit!important;color:inherit}.prompt-card[data-prompt-collapse]:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden;white-space:normal}.copy-smart{position:absolute;top:9px;right:9px;z-index:3;min-height:31px;border:1px solid rgb(255 255 255/.16);border-radius:8px;padding:5px 11px;background:rgb(var(--gold));color:#071a10;font:700 11.5px/1.4 "Bai Jamjuree",system-ui,sans-serif!important;cursor:pointer}.prompt-expand{position:absolute;left:14px;bottom:10px;z-index:3;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font:700 11px/1.4 "Bai Jamjuree",system-ui,sans-serif!important;cursor:pointer}.prompt-expand:hover{background:rgb(255 255 255/.13)}.smart-checklist{margin-top:12px}.smart-checklist li{padding:9px 0}.smart-checklist label{cursor:pointer}.smart-checklist input{accent-color:rgb(var(--green))}
@media(max-width:680px){.lesson6-hero{padding-bottom:22px}.lesson6-hero-copy{padding:30px 24px 20px}.lesson-art-frame{width:calc(100% - 32px);margin:0 16px;border-radius:16px}.serve-tldr{grid-template-columns:1fr}.smart-step{grid-template-columns:34px minmax(0,1fr);padding:16px 14px}.prompt-card{font-size:12.5px!important}}
@media(prefers-reduced-motion:reduce){.smart-resume-workflow *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>'''
s, n = style_re.subn(style, s, count=1)
if n != 1:
    raise RuntimeError(f'lesson6 style replacement count={n}')

# 3) Remove the accidental page scroll lock from the newer boss-transition layer.
# The transition can still show its full-screen signal, but it must never freeze the lesson page.
s = s.replace('body.lesson6-signal-open{overflow:hidden}', 'body.lesson6-signal-open{overflow-y:auto!important}')
s = s.replace("document.body.classList.add('lesson6-signal-open');", "document.body.classList.remove('lesson6-signal-open');")
# Extra guard at module startup in case a stale class survives browser history restoration.
needle = "document.body.classList.add('lesson6-boss-transition');"
if needle in s and "lesson6-scroll-guard" not in s:
    s = s.replace(needle, needle + "\n  document.body.classList.remove('lesson6-signal-open'); // lesson6-scroll-guard", 1)

# 4) Safety assertions: three steps must be real siblings and all later content must remain after them.
step1 = s.find('<span class="step-no">1</span>')
step2 = s.find('<span class="step-no">2</span>', step1 + 1)
step3 = s.find('<span class="step-no">3</span>', step2 + 1)
hard = s.find('id="hardMode"', step3 + 1)
boss = s.find('id="bossDoor"', hard + 1)
if not (0 <= step1 < step2 < step3 < hard < boss):
    raise RuntimeError(f'lesson flow markers invalid: {step1}, {step2}, {step3}, {hard}, {boss}')
for required in [
    '../img/classroom-kitchen-20260811-2231/lv6-serve-steak.jpeg',
    'id="smartPrompt1"', 'id="smartPrompt2"', 'class="prompt-expand"',
    'id="hardMode"', 'id="glitchTrigger"', 'id="bossDoor"', '/classroom/dungeon/'
]:
    if required not in s:
        raise RuntimeError(f'missing required marker: {required}')
if "document.body.classList.add('lesson6-signal-open')" in s:
    raise RuntimeError('scroll-lock class can still be added')
if 'body.lesson6-signal-open{overflow:hidden}' in s:
    raise RuntimeError('scroll-lock CSS still present')
if s.count('<script') != s.count('</script>'):
    raise RuntimeError('script tag count mismatch')

path.write_text(s, encoding='utf-8')
print('Lesson 6 rebuilt to stable lesson pattern; scroll lock removed.')
