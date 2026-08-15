from pathlib import Path

path = Path('xty/public/p/index.html')
text = path.read_text(encoding='utf-8')
old = "  requestAnimationFrame(()=>{$('log').scrollTop=$('log').scrollHeight;});"
if old not in text:
    raise SystemExit('public log auto-scroll line not found')
text = text.replace(old, "  // Native scroll only: never move the reader automatically.", 1)
text = text.replace('เลื่อนขึ้นเพื่ออ่านเรื่องก่อนหน้า', 'เลื่อนอ่านบันทึกได้อย่างอิสระ', 1)
text = text.replace('overscroll-behavior:contain;-webkit-overflow-scrolling:touch;', 'overscroll-behavior-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;scroll-behavior:auto;overflow-anchor:none;', 1)
path.write_text(text, encoding='utf-8')
