import { SEEDS, loadSeed, getRewardOutcome } from './seed-path.js';

// A small index, never a scan of localStorage. Original journeys remain untouched.
export const KEEPSAKE_KEY = 'mc:frontdoor:keepsakes:v1';
export function readKeepsakes(storage) {
  try {
    const raw = storage?.getItem(KEEPSAKE_KEY);
    if (!raw || raw.length > 4096) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    const colors = new Set();
    return items.slice(0, 12).flatMap(item => {
      if (!item || !Number.isSafeInteger(item.savedAt) || item.savedAt < 1) return [];
      const record = loadSeed({journey: {checkpoint: item}}, storage);
      if (!record || colors.has(record.color)) return [];
      colors.add(record.color);
      return [{...item, record}];
    });
  } catch { return []; }
}

export function rememberKeepsake(storage, snapshot) {
  const cp = snapshot?.journey?.checkpoint;
  const record = loadSeed(snapshot, storage);
  if (!record || !cp) return {ok: false};
  const items = [{journeyId: cp.journeyId, checkpointRef: cp.checkpointRef, savedAt: cp.savedAt},
    ...readKeepsakes(storage).filter(item => item.record.color !== record.color)
      .map(({journeyId, checkpointRef, savedAt}) => ({journeyId, checkpointRef, savedAt}))].slice(0, 4);
  const raw = JSON.stringify(items);
  try { storage.setItem(KEEPSAKE_KEY, raw); return {ok: storage.getItem(KEEPSAKE_KEY) === raw}; }
  catch { return {ok: false}; }
}

export function mountKeepsakes({storage, onContinue, onExplore}) {
  const doc = document;
  const toggle = doc.createElement('button');
  toggle.id = 'keepsake-toggle'; toggle.type = 'button'; toggle.hidden = true;
  toggle.textContent = 'รอยที่เก็บไว้'; toggle.setAttribute('aria-haspopup', 'dialog');
  const dialog = doc.createElement('dialog'); dialog.id = 'keepsakes';
  dialog.setAttribute('aria-labelledby', 'keepsake-title');
  const heading = doc.createElement('h2'); heading.id = 'keepsake-title'; heading.textContent = 'บ้านนี้ จำรอยของคุณได้';
  const close = doc.createElement('button'); close.type = 'button'; close.className = 'keepsake-close'; close.textContent = 'กลับไปที่เข็มทิศ ×';
  const intro = doc.createElement('p'); intro.textContent = 'สิ่งที่เก็บไว้บนเครื่องนี้ · เปิดต่อได้ตามจังหวะของคุณ';
  const map = doc.createElement('div'); map.className = 'keepsake-map';
  const center = doc.createElement('img'); center.src = '/icons/icon-192.png'; center.alt = 'myClover'; center.width = center.height = 64;
  map.append(center);
  const list = doc.createElement('div'); list.className = 'keepsake-list';
  const next = doc.createElement('button'); next.type = 'button'; next.className = 'keepsake-explore'; next.textContent = 'วันนี้ ลองเดินอีกทาง';
  const note = doc.createElement('p'); note.className = 'keepsake-note'; note.textContent = 'เริ่มต่อเป็นรอยใหม่ได้ ชิ้นที่เก็บไว้เดิมยังอยู่';
  dialog.append(close, heading, intro, map, list, next, note);
  doc.querySelector('.quiet-tools').prepend(toggle); doc.body.append(dialog);
  close.onclick = () => dialog.close();
  toggle.onclick = () => {refresh(); dialog.showModal();};
  next.onclick = () => {dialog.close(); onExplore();};
  dialog.addEventListener('click', event => {if (event.target === dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  function refresh() {
    const entries = readKeepsakes(storage);
    toggle.hidden = entries.length === 0;
    list.replaceChildren(); map.querySelectorAll('span').forEach(el => el.remove());
    for (const [color, seed] of Object.entries(SEEDS)) {
      const saved = entries.find(item => item.record.color === color);
      const dot = doc.createElement('span'); dot.dataset.color = color; dot.dataset.found = String(!!saved); dot.style.setProperty('--ink', seed.color);
      dot.textContent = saved ? '·' : ''; dot.setAttribute('aria-hidden', 'true'); map.append(dot);
      if (!saved) continue;
      const button = doc.createElement('button'); button.type = 'button'; button.dataset.keepsake = color; button.style.setProperty('--ink', seed.color);
      const outcome = getRewardOutcome(color, saved.record.reward);
      const name = doc.createElement('strong'); name.textContent = outcome.complete ? outcome.title : seed.title;
      const line = doc.createElement('span'); line.textContent = 'เปิดต่อจากรอยนี้ ↗';
      button.append(name, line); button.onclick = () => {dialog.close(); onContinue(saved.record);}; list.append(button);
    }
    return entries;
  }
  refresh();
  return {refresh};
}
