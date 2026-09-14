const videos = [...document.querySelectorAll('video')];
videos.forEach(video => video.addEventListener('play', () => {
  videos.forEach(other => { if (other !== video) other.pause(); });
}));

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.append(field);
    field.select();
    field.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Show manual fallback. */ }
    field.remove();
    return copied;
  }
}

document.querySelector('#copy-prompt').addEventListener('click', async event => {
  const button = event.currentTarget;
  const text = document.querySelector('#prompt-text');
  const copied = await copyText(text.textContent.trim());
  const status = document.querySelector('#copy-status');
  if (copied) {
    button.textContent = 'คัดลอกแล้ว ✓';
    status.textContent = 'นำไปวาง แล้วเลือก @ Element ของคุณอีกครั้ง';
  } else {
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'เลือกข้อความให้แล้ว กดคัดลอกข้อความบนอุปกรณ์ของคุณ';
  }
  button.focus({ preventScroll: true });
});

document.querySelector('#share-page').addEventListener('click', async event => {
  const button = event.currentTarget;
  const copied = await copyText('https://www.myclover.com/hf/');
  button.textContent = copied ? 'คัดลอกลิงก์แล้ว ✓' : 'www.myclover.com/hf/';
  document.querySelector('#share-status').textContent = copied ? 'คัดลอกลิงก์หน้านี้แล้ว' : 'คัดลอกลิงก์นี้ด้วยตนเอง: https://www.myclover.com/hf/';
});
