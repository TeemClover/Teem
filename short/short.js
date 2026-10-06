import { stories } from './library.js';
import { creatorProfiles } from './content-library.js';
import { createHeroCarousel } from './hero-carousel.js';
import { createCreatorCommunity } from './creator-community.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storageKey = 'tontor:prototype:v1';
const storyIds = new Set(stories.map(s => s.id));
const playIcon = '<svg viewBox="0 0 20 20"><path d="m6 3 11 7-11 7Z"/></svg>';
const bookmarkIcon = '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
const lockIcon = '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
let state = readState();
const featuredIds = chooseFeaturedIds(['krasue', 'warrior', 'village', 'wanthong']);
let currentView = 'discover', genre = 'ทั้งหมด', format = 'drama', search = '', featured = stories.find(s=>s.id===featuredIds[0]);
let selectedStory = null, selectedEpisode = 1, pendingEpisode = null, resumeAt = 0;
let lastWrite = 0, toastTimer, readerRestoring = false, readingStarted = false;
const video = $('#story-video');
const isReading = story => ['comic','novel'].includes(story?.format);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let readerPreferences = {theme:'paper',size:18}, autoplayNext=false;
try { readerPreferences={...readerPreferences,...JSON.parse(localStorage.getItem('tontor:reader')||'{}')}; autoplayNext=localStorage.getItem('tontor:autoplay')==='true'; } catch {}
if(!['paper','night','sepia'].includes(readerPreferences.theme))readerPreferences.theme='paper';
readerPreferences.size=Math.max(15,Math.min(24,Number(readerPreferences.size)||18));
$('#autoplay-next').checked=autoplayNext;

function chooseFeaturedIds(ids) {
  const key = 'tontor:hero:last-open';
  let previous;
  try { previous = localStorage.getItem(key); } catch {}
  const choices = ids.filter(id => id !== previous);
  const first = choices[Math.floor(Math.random() * choices.length)] || ids[0];
  const start = ids.indexOf(first);
  try { localStorage.setItem(key, first); } catch {}
  // Pick once before rendering, so the image and copy stay stable during a visit.
  return [...ids.slice(start), ...ids.slice(0, start)];
}
function applyReaderPreferences(){
  const reader=$('#comic-reader'); reader.dataset.theme=readerPreferences.theme;reader.style.setProperty('--reading-size',`${readerPreferences.size}px`);
  $$('[data-reader-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.readerTheme===readerPreferences.theme)));
  $('#reader-size-value').textContent=readerPreferences.size;
  try{localStorage.setItem('tontor:reader',JSON.stringify(readerPreferences));}catch{}
}


function readState() {
  const clean = { balance: 120, saved: [], unlocked: [], progress: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    if (!raw || typeof raw !== 'object') return clean;
    if (Number.isSafeInteger(raw.balance) && raw.balance >= 0 && raw.balance <= 99990) clean.balance = raw.balance;
    if (Array.isArray(raw.saved)) clean.saved = [...new Set(raw.saved.filter(id => storyIds.has(id)))];
    if (Array.isArray(raw.unlocked)) clean.unlocked = [...new Set(raw.unlocked.filter(key => {
      if (typeof key !== 'string') return false;
      const [id, ep] = key.split(':');
      const story = stories.find(s => s.id === id);
      return story && Number.isInteger(Number(ep)) && Number(ep) > 3 && Number(ep) <= story.episodes;
    }))];
    for (const story of stories) {
      const p = raw.progress?.[story.id];
      if (!p || !Number.isInteger(p.episode) || p.episode < 1 || p.episode > story.episodes) continue;
      if (p.episode > 3 && !clean.unlocked.includes(`${story.id}:${p.episode}`)) continue;
      clean.progress[story.id] = { episode: p.episode, time: Number.isFinite(p.time) ? Math.max(0, p.time) : 0, duration: Number.isFinite(p.duration) ? Math.max(0, p.duration) : 0, updated: Number.isFinite(p.updated) ? p.updated : 0, complete: p.complete === true };
    }
  } catch { /* Browser storage may be unavailable; this demo also works in memory. */ }
  return clean;
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { /* Do not prevent playback when storage is full or disabled. */ }
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

function renderBalance() {
  $$('[data-balance]').forEach(el => { el.textContent = state.balance.toLocaleString('th-TH'); });
}

function card(story) {
  const saved = state.saved.includes(story.id);
  return `<article class="story-card" data-story-id="${story.id}">
    <button class="poster-button" data-open="${story.id}" aria-label="${isReading(story)?'อ่าน':'ดูรายละเอียด'} ${story.title}">
      <img src="${story.poster}" width="400" height="600" loading="lazy" alt="ภาพปก AI เรื่องตัวอย่าง ${story.title}" style="object-position:${story.position}">
      <span class="poster-shade"></span><span class="poster-badge ${story.id === 'rain' ? 'featured' : ''}">${story.badge}</span>
      <span class="poster-hover">${isReading(story)?'<span>อ่าน</span>':playIcon}</span><span class="poster-title">${story.posterTitle.replace('\n', '<br>')}</span>
      <span class="poster-foot"><span>${story.formatLabel} · TH</span><span>${story.episodes} ${story.format==='novel'?'บท':'ตอน'}</span></span>
    </button>
    <div class="card-info"><button class="card-title" data-open="${story.id}">${story.title}</button><p class="card-meta">${story.genres.join(' · ')} · ${story.status}</p><p class="card-creator"><img class="card-avatar" src="${story.avatarImage}" alt="" width="20" height="20" loading="lazy">${story.creator} / ${story.city}</p><button class="icon-button card-save" data-save="${story.id}" aria-label="${saved ? 'นำออกจาก' : 'เก็บใน'}รายการของฉัน: ${story.title}" aria-pressed="${saved}">${bookmarkIcon}</button></div>
  </article>`;
}

function renderCatalog() {
  const needle = search.trim().toLocaleLowerCase('th-TH');
  const priority=s=>Number(s.format==='drama')*10+Number(Boolean(s.pilots?.length))*5+Number(['krasue','wanthong','village'].includes(s.id));
  const filtered = [...stories].sort((a,b)=>priority(b)-priority(a)).filter(s => (currentView !== 'saved' || state.saved.includes(s.id)) && (format==='all'||s.format===format) && (genre === 'ทั้งหมด' || s.genres.includes(genre)) && (!needle || [s.title, s.creator, s.studio, s.city, s.formatLabel, ...s.genres].join(' ').toLocaleLowerCase('th-TH').includes(needle)));
  $('#catalog-grid').innerHTML = filtered.map(card).join('');
  $('#catalog-count').textContent = `${filtered.length} เรื่อง · คอลเลกชันตัวอย่างไทย`;
  $('#catalog-title').innerHTML = currentView === 'saved' ? 'รายการของฉัน<span class="orange-dot">.</span>' : needle ? 'เรื่องที่กำลังหา<span class="orange-dot">.</span>' : 'เรื่องต่อไปที่อยากให้ดู<span class="orange-dot">.</span>';
  $('#catalog-kicker').textContent = currentView === 'saved' ? 'STORIES WORTH KEEPING' : needle ? 'FIND YOUR STORY' : 'YOUR NEXT OBSESSION';
  $('#empty-state').hidden = filtered.length > 0;
  $('#empty-message').textContent = currentView === 'saved' && !state.saved.length ? 'กดสัญลักษณ์บุ๊กมาร์กบนเรื่องที่ชอบ แล้วกลับมาดูได้ตรงนี้' : 'ลองเลือกแนวอื่น หรือค้นด้วยคำใหม่';
  $$('.genre').forEach(b => { const active = b.dataset.genre === genre; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  $$('[data-format]').forEach(b=>{const active=b.dataset.format===format;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $$('.saved-count').forEach(el => { el.textContent = state.saved.length; el.hidden = !state.saved.length; });
}

function renderShelves() {
  const pilots=stories.filter(s=>s.pilots?.length);
  $('#pilot-grid').innerHTML=pilots.map(s=>`<button class="pilot-card" data-shelf-open="${s.id}"><span class="pilot-art"><img src="${s.heroImage||s.poster}" alt="ฉากตัวอย่าง ${escape(s.title)}" loading="lazy"><span class="pilot-play">${playIcon}</span><span class="pilot-duration">${s.pilots.length} คลิป · ${s.pilots[0].duration.toFixed(0)} วิ</span></span><span class="pilot-copy"><small>AI PILOT · ภาษาไทย</small><strong>${escape(s.title)}</strong><span>${escape(s.kicker)}</span></span></button>`).join('');
  $('#reading-grid').innerHTML=stories.filter(isReading).map(s=>`<button class="reading-card" data-shelf-open="${s.id}"><img src="${s.poster}" alt="ปก ${escape(s.title)}" loading="lazy"><span><small>${s.formatLabel} · ${s.episodes} ${s.format==='novel'?'บท':'ตอน'}</small><strong>${escape(s.title)}</strong><p>${escape(s.kicker)}</p><span class="reading-by">${escape(s.creator)} / ${escape(s.studio)}</span><b>เริ่มอ่านฟรี ↗</b></span></button>`).join('');
}
function renderContinue() {
  const entries = stories.filter(s => state.progress[s.id]).sort((a, b) => state.progress[b.id].updated - state.progress[a.id].updated).slice(0, 3);
  $('#continue-section').hidden = !entries.length || currentView === 'saved';
  $('#continue-grid').innerHTML = entries.map(s => {
    const p = state.progress[s.id];
    const percent = p.complete ? 100 : p.duration ? Math.min(100, p.time / p.duration * 100) : 0;
    return `<button class="continue-card" data-resume="${s.id}"><img src="${s.poster}" width="65" height="90" alt="ภาพปก ${s.title}" style="object-position:${s.position}"><span><h3>${s.title}</h3><p>${s.format==='novel'?'บท':'ตอน'}ที่ ${p.episode} · ${p.complete ? (isReading(s)?'อ่านจบแล้ว':'ดูจบแล้ว') : (isReading(s)?'อ่านต่อจากจุดเดิม':'ดูต่อจากจุดเดิม')}</p><span class="continue-track"><span style="width:${percent}%"></span></span></span></button>`;
  }).join('');
}

function setView(view, scroll = true) {
  currentView = view === 'saved' ? 'saved' : 'discover';
  if (currentView === 'saved') { genre = 'ทั้งหมด'; format='all'; search = ''; $('#search-input').value = ''; }
  $('#discovery-content').hidden = currentView === 'saved';
  $('#extra-content').hidden = currentView === 'saved';
  $$('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  renderCatalog(); renderContinue();
  if (scroll) (view === 'creators' ? $('#creators') : currentView === 'saved' ? $('#catalog') : $('main')).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setGenre(value) { genre = value; renderCatalog(); }

function toggleSave(id) {
  const saved = state.saved.includes(id);
  state.saved = saved ? state.saved.filter(value => value !== id) : [...state.saved, id];
  persist(); renderCatalog(); renderSaveButton();
  toast(saved ? 'นำเรื่องออกจากรายการแล้ว' : 'เก็บเรื่องไว้ในรายการของฉันแล้ว');
}

function setSearchOpen(open) {
  $('#search-panel').hidden = !open;
  $('.search-toggle').setAttribute('aria-expanded', String(open));
  if (open) { $('#search-input').focus(); }
  else { $('.search-toggle').focus(); }
}

function canWatch(story, episode) { return episode <= 3 || state.unlocked.includes(`${story.id}:${episode}`); }

function renderSaveButton() {
  if (!selectedStory) return;
  const saved = state.saved.includes(selectedStory.id);
  $('#save-story').setAttribute('aria-pressed', String(saved));
  $('#save-story').setAttribute('aria-label', saved ? 'นำออกจากรายการของฉัน' : 'เก็บในรายการของฉัน');
}

function renderEpisodes() {
  if (!selectedStory) return;
  const unit=selectedStory.format==='novel'?'บท':'ตอน';
  $('#episode-grid').innerHTML = Array.from({ length: selectedStory.episodes }, (_, i) => {
    const ep = i + 1, locked = !canWatch(selectedStory, ep);
    const name = selectedStory.episodeNames[i] || 'เรื่องราวยังดำเนินต่อ';
    return `<button class="episode-button ${locked ? 'locked' : ''} ${ep === selectedEpisode ? 'active' : ''}" data-episode="${ep}" aria-label="${unit}ที่ ${ep}: ${name}${locked ? ' · ปลดล็อก 10 เหรียญทดลอง' : ep <= 3 ? ' · ฟรี' : ' · ปลดล็อกแล้ว'}" aria-pressed="${ep === selectedEpisode}">${locked ? lockIcon : ''}<span>${ep}</span>${ep <= 3 ? '<span class="free-label">ฟรี</span>' : ''}</button>`;
  }).join('');
  $('#playing-episode').textContent = `${unit}ที่ ${selectedEpisode}`;
  $('#episode-title').textContent=selectedStory.episodeNames[selectedEpisode-1]||'ตอนตัวอย่าง';
  $('#previous-episode').disabled=selectedEpisode<=1; $('#next-episode').disabled=selectedEpisode>=selectedStory.episodes;
  $('.episodes-heading h3').textContent=selectedStory.format==='novel'?'เลือกบท':'เลือกตอน';
  $('.episodes-heading>span').textContent=selectedStory.episodes<=3?'ทุกตอนตัวอย่างอ่าน / ดูฟรี':'3 ตอนแรกฟรี · ถัดไป 10 เหรียญทดลอง';
  $('#play-episode').textContent = canWatch(selectedStory, selectedEpisode) ? `${isReading(selectedStory)?'อ่าน':'ดู'}${unit}ที่ ${selectedEpisode}${selectedEpisode <= 3 ? ' ฟรี' : ''}` : `ปลดล็อกตอนที่ ${selectedEpisode}`;
  const remaining=Array.from({length:selectedStory.episodes},(_,i)=>i+1).filter(ep=>!canWatch(selectedStory,ep)).length;
  $('#completion-price').innerHTML=remaining?`<span>3 ตอนแรกฟรี · ถัดไปตอนละ 10 เหรียญทดลอง</span><strong>ดูหรืออ่านครบอีก ${remaining*10} เหรียญ</strong>`:`<span>${isReading(selectedStory)?'อ่าน':'ดู'}ตัวอย่างได้ทุกตอน</span><strong>ฟรี ${selectedStory.episodes} ${selectedStory.format==='novel'?'บท':'ตอน'} · ไม่ต้องใช้เหรียญ</strong>`;
}

function storyURL() {
  const url = new URL(selectedStory ? `/short/story/${selectedStory.id}/` : '/short/',location.origin);
  if (selectedStory) url.searchParams.set('episode', selectedEpisode);
  return url;
}

function updateURL() { if (selectedStory) history.replaceState(null, '', storyURL()); }

function renderReader() {
  if(!isReading(selectedStory))return;
  readerRestoring=true;readingStarted=false;
  const novel=selectedStory.format==='novel', chapter=novel?selectedStory.chapters[selectedEpisode-1]:null;
  const pages=novel?[]:(selectedStory.comicChapters?.[selectedEpisode-1]||selectedStory.comicPages);
  const title=selectedStory.episodeNames[selectedEpisode-1]||'ตอนตัวอย่าง';
  const heading=`<header class="reader-heading"><span>${novel?'บท':'ตอน'}ที่ ${selectedEpisode} / ${selectedStory.episodes}</span><strong>${escape(title)}</strong><small>${novel?`${chapter.readingMinutes} นาทีโดยประมาณ · ${escape(selectedStory.creator)}`:`${pages.length} หน้าการ์ตูน · เลื่อนลงเพื่ออ่าน`}</small></header>`;
  $('#comic-reader').classList.toggle('novel-reader',novel);
  $('#comic-reader').setAttribute('aria-label',`อ่าน${novel?'นิยาย':'การ์ตูน'} ${selectedStory.title}`);
  $('#comic-reader').innerHTML=heading+(novel?`<article class="novel-body">${chapter.body.map(p=>`<p>${escape(p)}</p>`).join('')}</article>`:pages.map((page,i)=>`<article class="comic-page"><img src="./assets/${page.image}.webp" width="640" height="960" alt="หน้าการ์ตูน ${i+1}: ${escape(page.title)}"><div class="comic-caption"><span>๐${i+1}</span><h3>${escape(page.title)}</h3><p>${escape(page.caption)}</p></div></article>`).join(''))+`<div class="reader-end">${selectedEpisode===selectedStory.episodes?'จบเรื่องแล้ว ✦':'จบ'+(novel?'บท':'ตอน')+'นี้แล้ว ✦'}<small>${selectedEpisode===selectedStory.episodes?'ขอบคุณที่ให้เรื่องเล่าไทยอยู่ในวันของคุณ':'เรื่องราวยังรออยู่หน้าถัดไป'}</small>${selectedEpisode<selectedStory.episodes?`<button class="reader-next" data-read-next>อ่าน${novel?'บท':'ตอน'}ที่ ${selectedEpisode+1} →</button>`:'<button class="reader-next" data-reader-finish>กลับไปค้นพบเรื่องใหม่ →</button>'}</div>`;
  applyReaderPreferences();$('#comic-reader').scrollTop=0;
  const id=selectedStory.id,ep=selectedEpisode,position=resumeAt;
  Promise.all([...$('#comic-reader').querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))).then(()=>{
    if(selectedStory?.id===id&&selectedEpisode===ep){if(position>0&&$('#comic-reader').scrollTop===0)$('#comic-reader').scrollTop=position;readerRestoring=false;saveReading(readingStarted);}
  });resumeAt=0;
}

function loadEpisodeMedia() {
  if(!selectedStory||isReading(selectedStory))return;
  const pilot=selectedStory.pilots?.[selectedEpisode-1];
  video.poster=new URL(pilot?`./assets/clips/${selectedStory.id}-1.webp`:selectedStory.poster,document.baseURI).href;
  video.style.objectPosition=pilot?'center':selectedStory.position;
  video.innerHTML=pilot?.captions?`<track kind="captions" label="${escape(pilot.captionLabel)}" srclang="th" src="${pilot.captions}">`:'';
  video.src=new URL(pilot?.src||`./assets/${selectedStory.id}.webm`,document.baseURI).href;
  video.load();
  $('.video-topline .demo-badge').textContent=pilot?'AI PILOT':'CONCEPT';
  $('.player-note').textContent=pilot?`คลิปนำร่อง ${pilot.provider} · ${Math.round(pilot.duration)} วินาที · เสียงในคลิป`:'ภาพเคลื่อนไหวคอนเซปต์ · ยังไม่มีตอนละครเต็ม';
}

function saveReading(started=false) {
  if(!isReading(selectedStory)||readerRestoring)return;
  const reader=$('#comic-reader'),distance=reader.scrollHeight-reader.clientHeight;
  if(!reader.clientHeight)return;
  if(!started&&reader.scrollTop<=0&&!state.progress[selectedStory.id])return;
  state.progress[selectedStory.id]={episode:selectedEpisode,time:reader.scrollTop,duration:Math.max(1,distance),updated:Date.now(),complete:distance>0&&reader.scrollTop>=distance-10};
  persist();
}

function openStory(id, episode = 1, autoplay = false) {
  const story = stories.find(s => s.id === id);
  if (!story) return;
  if (selectedStory) saveProgress();
  video.pause();
  selectedStory = story;
  selectedEpisode = Number.isInteger(episode) && episode >= 1 && episode <= story.episodes ? episode : 1;
  const requestedEpisode = selectedEpisode;
  if (!canWatch(story, selectedEpisode)) selectedEpisode = 1;
  const progress = state.progress[id];
  resumeAt = progress && progress.episode === selectedEpisode && !progress.complete ? progress.time : 0;
  const isComic=isReading(story);
  $('.video-frame').hidden=isComic;$('#comic-reader').hidden=!isComic;$('#reader-toolbar').hidden=!isComic;$('#video-navigation').hidden=isComic;
  if(isComic){video.removeAttribute('src');video.replaceChildren();video.load();renderReader();$('.player-note').textContent=story.format==='novel'?'นิยายต้นฉบับ · ปรับตัวอักษรและสีหน้าอ่านได้':'ภาพการ์ตูน AI · บทสนทนาไทยต้นฉบับ';}
  else loadEpisodeMedia();
  $('#story-title').textContent = story.title;
  $('#story-meta').textContent = `${story.formatLabel} · ${story.episodes} ${story.format==='novel'?'บท':'ตอน'}${!isReading(story)&&!story.pilots?.length?'ในคอนเซปต์':''} · ${story.status} · ${story.age}`;
  $('#story-description').textContent = story.description;
  $('#story-creator').innerHTML = `<img class="creator-avatar" src="${story.avatarImage}" alt="${story.creatorKind==='team'?'โลโก้ทีม':'ภาพครีเอเตอร์'}สมมติ ${escape(story.creatorKind==='team'?story.studio:story.creator)}" width="34" height="34"><span>${escape(story.creator)} / ${escape(story.studio)}<small>${escape(story.city)} · ${story.creatorKind==='team'?'ทีม':'ครีเอเตอร์'}สมมติ</small></span>`;
  $('#story-provenance').innerHTML=`<details><summary>เบื้องหลังและคำเตือน <span>＋</span></summary><dl><dt>รูปแบบตัวอย่าง</dt><dd>${story.sampleLength} · ภาษาไทย</dd><dt>ใช้ AI ตรงไหน</dt><dd>${story.aiUsage}</dd><dt>สิ่งที่ควรรู้</dt><dd>${story.warnings}</dd><dt>ที่มาของเรื่อง</dt><dd>${story.genres.includes('วรรณคดีรีมิกซ์')?'ตีความวรรณคดีใหม่อย่างอิสระ ไม่ใช่ฉบับดั้งเดิม':'เรื่องสมมติสำหรับทดลองประสบการณ์'}</dd></dl></details>`;
  $('.episode-note').textContent=isComic?'เนื้อหาต้นฉบับสำหรับเดโม · เรื่องและครีเอเตอร์สมมติ':story.pilots?.length?'คลิป AI นำร่องตามบทที่เขียนใหม่ · เรื่องและครีเอเตอร์สมมติ':'จำนวนตอนเป็นคอนเซปต์ · ใช้คลิปภาพเคลื่อนไหวตัวอย่างเพื่อทดลองระบบเหรียญ';
  $('#player-status').textContent = '';
  renderSaveButton(); renderEpisodes();
  if (!$('#story-dialog').open) $('#story-dialog').showModal();
  updateURL();
  if (requestedEpisode !== selectedEpisode) requestEpisode(requestedEpisode);
  else if (autoplay) playVideo();
}

function playVideo() {
  if (!selectedStory || !canWatch(selectedStory, selectedEpisode)) return;
  if(isReading(selectedStory)){readingStarted=true;$('#comic-reader').focus({preventScroll:true});saveReading(true);$('#player-status').textContent='เลื่อนลงเพื่ออ่านต่อ ระบบจะจำตำแหน่งให้อัตโนมัติ';return;}
  if (video.ended) video.currentTime = 0;
  $('#player-status').textContent = '';
  video.play().catch(() => { $('#player-status').textContent = 'กดปุ่มเล่นบนวิดีโอเพื่อลองดูคลิป'; });
}

function selectEpisode(episode) {
  saveProgress(); video.pause();
  selectedEpisode = episode; resumeAt = 0;
  if(isReading(selectedStory)){renderReader();renderEpisodes();updateURL();playVideo();return;}
  loadEpisodeMedia();
  $('#player-status').textContent = '';
  renderEpisodes(); updateURL(); playVideo();
}

function requestEpisode(episode) {
  if (!selectedStory || episode < 1 || episode > selectedStory.episodes) return;
  if (canWatch(selectedStory, episode)) { selectEpisode(episode); return; }
  video.pause();
  pendingEpisode = { id: selectedStory.id, episode };
  $('#unlock-description').textContent = `${selectedStory.title} · ตอนที่ ${episode}`;
  $('#confirm-unlock').textContent = state.balance >= 10 ? 'ปลดล็อกด้วย 10 เหรียญทดลอง' : 'รับเหรียญทดลองเพิ่ม';
  $('#unlock-dialog').showModal();
}

function saveProgress() {
  if(isReading(selectedStory)){saveReading();return;}
  if (!selectedStory || !Number.isFinite(video.duration) || !canWatch(selectedStory, selectedEpisode)) return;
  if (video.currentTime <= 0 && !video.ended) return;
  state.progress[selectedStory.id] = { episode: selectedEpisode, time: video.currentTime, duration: video.duration, updated: Date.now(), complete: video.ended };
  persist();
}

function showWallet() { renderBalance(); if (!$('#wallet-dialog').open) $('#wallet-dialog').showModal(); }

$('#catalog-grid').addEventListener('click', e => {
  const open = e.target.closest('[data-open]'), save = e.target.closest('[data-save]');
  if (open) openStory(open.dataset.open);
  if (save) { const id = save.dataset.save; toggleSave(id); $(`[data-save="${id}"]`)?.focus({ preventScroll: true }); }
});
$('#continue-grid').addEventListener('click', e => { const b = e.target.closest('[data-resume]'); if (b) openStory(b.dataset.resume, state.progress[b.dataset.resume].episode, true); });
$$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$$('[data-format]').forEach(b=>b.addEventListener('click',()=>{format=b.dataset.format;genre='ทั้งหมด';renderCatalog();}));
$$('[data-world]').forEach(b=>b.addEventListener('click',()=>{setView('discover',false);format='all';search='';$('#search-input').value='';setGenre(b.dataset.world);$('#catalog').scrollIntoView({behavior:'smooth'});}));
$$('[data-wallet]').forEach(b => b.addEventListener('click', showWallet));
$('#explore-fantasy').addEventListener('click', () => { setView('discover', false); format='all';search = ''; $('#search-input').value = ''; setGenre('วรรณคดีรีมิกซ์'); $('#catalog').scrollIntoView({ behavior: 'smooth' }); });
$('.search-toggle').addEventListener('click', () => setSearchOpen($('#search-panel').hidden));
$('#mobile-search').addEventListener('click', () => setSearchOpen(true));
$('#search-close').addEventListener('click', () => setSearchOpen(false));
$('#search-input').addEventListener('input', e => {
  search = e.target.value; renderCatalog();
  if (search.trim()) $('#catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#search-input').addEventListener('keydown', e => { if (e.key === 'Escape') setSearchOpen(false); if (e.key === 'Enter') { setSearchOpen(false); $('#catalog').scrollIntoView({ behavior: 'smooth' }); } });
$('#reset-filters').addEventListener('click', () => { search = ''; genre = 'ทั้งหมด';format='all'; $('#search-input').value = ''; setView('discover', false); renderCatalog(); });
$('#save-story').addEventListener('click', () => { if (selectedStory) toggleSave(selectedStory.id); });
$('#share-story').addEventListener('click', async () => {
  const sharedURL=new URL(storyURL().pathname+storyURL().search,'https://www.myclover.com');
  try { await navigator.clipboard.writeText(sharedURL.href); toast('คัดลอกลิงก์เรื่องแล้ว'); }
  catch { toast('แชร์ได้จากลิงก์ในแถบที่อยู่ของเบราว์เซอร์'); }
});
$('#episode-grid').addEventListener('click', e => { const b = e.target.closest('[data-episode]'); if (b) requestEpisode(Number(b.dataset.episode)); });
$('#play-episode').addEventListener('click', () => { if (!selectedStory) return; if (canWatch(selectedStory, selectedEpisode)) playVideo(); else requestEpisode(selectedEpisode); });
$$('[data-close]').forEach(b => b.addEventListener('click', () => {if(b.dataset.close==='story-dialog')saveProgress();$(`#${b.dataset.close}`).close();}));
$$('dialog').forEach(dialog => dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {if(dialog.id==='story-dialog')saveProgress();dialog.close();}
}));
$('#story-dialog').addEventListener('cancel',saveProgress);
$('#story-dialog').addEventListener('close', () => {
  saveProgress(); video.pause(); renderContinue();
  history.replaceState(null, '', new URL('/short/',location.origin));
  selectedStory = null; pendingEpisode = null;
});
$('#unlock-dialog').addEventListener('close', () => { pendingEpisode = null; });
$('#confirm-unlock').addEventListener('click', () => {
  const pending = pendingEpisode;
  if (!pending || selectedStory?.id !== pending.id) return;
  if (state.balance < 10) { $('#unlock-dialog').close(); showWallet(); return; }
  const key = `${pending.id}:${pending.episode}`;
  if (!state.unlocked.includes(key)) { state.balance -= 10; state.unlocked.push(key); persist(); }
  pendingEpisode = null; renderBalance(); $('#unlock-dialog').close(); selectEpisode(pending.episode);
  toast(`ปลดล็อกตอนที่ ${pending.episode} แล้ว · ใช้ 10 เหรียญทดลอง`);
});
$$('[data-pack]').forEach(b => b.addEventListener('click', () => {
  const count = Number(b.dataset.pack);
  state.balance = Math.min(99990, state.balance + count); persist(); renderBalance();
  $('#wallet-dialog').close(); toast(`ได้รับ ${count} เหรียญทดลอง · ไม่มีการชำระเงิน`);
}));
video.addEventListener('loadedmetadata', () => { if (resumeAt && Number.isFinite(video.duration)) video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - .5)); resumeAt = 0; });
video.addEventListener('timeupdate', () => { if (Date.now() - lastWrite > 1000) { saveProgress(); lastWrite = Date.now(); } });
video.addEventListener('pause', saveProgress);
video.addEventListener('ended', () => {
  saveProgress(); renderContinue();
  if(autoplayNext&&selectedStory?.pilots?.length&&selectedEpisode<selectedStory.episodes){requestEpisode(selectedEpisode+1);return;}
  $('#player-status').textContent = selectedEpisode < selectedStory?.episodes ? `จบตอนแล้ว · กดตอนถัดไปเพื่อดูต่อ` : 'ดูจบแล้ว · เก็บเรื่องไว้หรือค้นพบเรื่องใหม่';
});
video.addEventListener('error', () => { if (selectedStory) $('#player-status').textContent = 'โหลดคลิปไม่สำเร็จ ลองเปิดเรื่องอีกครั้ง'; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveProgress(); video.pause(); } });
window.addEventListener('pagehide', saveProgress);
$('#comic-reader').addEventListener('scroll',()=>{if(Date.now()-lastWrite>500){saveReading();lastWrite=Date.now();}});
const trustCopy={creators:{title:'คนเล่าเรื่องก็มีเรื่องเล่า',body:'หน้าเรื่องบอกชื่อผู้สร้าง สตูดิโอ จังหวัด และวิธีใช้ AI ให้เปิดอ่านได้ ขณะนี้ทุกตัวตนเป็นครีเอเตอร์สมมติ ยังไม่มีการตรวจยืนยันบุคคลจริง',items:['ระบุเครดิตบท ภาพ เสียง และการตัดต่อก่อนรับเรื่องจริง','บอกการใช้ AI ตามที่ผู้สร้างแจ้ง พร้อมหลักฐานเมื่อจำเป็น','แสดงชื่อครีเอเตอร์จริงเมื่อเจ้าตัวยินยอมเผยแพร่']},pricing:{title:'อยากดูต่อ ก็รู้ราคาก่อน',body:'3 ตอนแรกฟรี หลังจากนั้นตอนละ 10 เหรียญทดลอง หน้าเรื่องแสดงเหรียญที่ต้องใช้เพื่อปลดล็อกตอนที่เหลือ และตอนที่ปลดล็อกแล้วดูหรืออ่านซ้ำได้',items:['กดยืนยันก่อนหักเหรียญทุกครั้ง','เติมเหรียญใน prototype ได้ฟรี ไม่มีหน้ารับชำระเงิน','ราคาเงินจริงและเงื่อนไขคืนเงินยังไม่ได้กำหนด']},content:{title:'รู้ก่อนเริ่ม เลือกดูได้สบายใจ',body:'หน้าเรื่องแสดงรูปแบบ สถานะ จำนวนตอนในคอนเซปต์ และคำเตือนเนื้อหา วรรณคดีรีมิกซ์ระบุว่าเป็นการตีความใหม่อย่างอิสระ',items:['อายุที่แสดงเป็นแนวทางสมมติ ไม่ใช่เรตที่ผ่านการรับรอง','ยังไม่มีเรื่องจริงที่ผ่านการตรวจสิทธิ์หรือบรรณาธิการ','ก่อนเปิดจริงต้องตรวจสิทธิ์และความพร้อมของตอนที่ขาย']}};
$$('[data-trust]').forEach(b=>b.addEventListener('click',()=>{const c=trustCopy[b.dataset.trust];$('#trust-title').textContent=c.title;$('#trust-body').innerHTML=`<p>${c.body}</p><ul>${c.items.map(item=>`<li>${item}</li>`).join('')}</ul>`;$('#trust-dialog').showModal();}));
const genreNames=['ทั้งหมด','ผีไทย','พญานาค','วรรณคดีรีมิกซ์','ตลกกวน','โรแมนซ์','ดราม่า','สยองขวัญ','วาย','แฟนตาซี','คอมเมดี้','ย้อนยุค'];
$('.genre-list').innerHTML=genreNames.map(name=>`<button class="genre ${name==='ทั้งหมด'?'active':''}" data-genre="${name}" aria-pressed="${name==='ทั้งหมด'}">${name}</button>`).join('');
$$('[data-genre]').forEach(b=>b.addEventListener('click',()=>setGenre(b.dataset.genre)));
const carousel=createHeroCarousel({root:$('.hero'),stories,ids:featuredIds,onOpen:(id,autoplay)=>openStory(id,1,autoplay),onChange:story=>{featured=story;}});
const community=createCreatorCommunity({root:document,profiles:creatorProfiles,stories,onOpenStory:id=>openStory(id)});
renderCatalog();renderShelves();renderContinue();renderBalance();applyReaderPreferences();
$$('[data-shelf-open]').forEach(b=>b.addEventListener('click',()=>openStory(b.dataset.shelfOpen,1,true)));
$('#previous-episode').addEventListener('click',()=>requestEpisode(selectedEpisode-1));
$('#next-episode').addEventListener('click',()=>requestEpisode(selectedEpisode+1));
$('#autoplay-next').addEventListener('change',e=>{autoplayNext=e.target.checked;try{localStorage.setItem('tontor:autoplay',String(autoplayNext));}catch{}});
$('#comic-reader').addEventListener('click',e=>{if(e.target.closest('[data-read-next]'))requestEpisode(selectedEpisode+1);if(e.target.closest('[data-reader-finish]'))$('#story-dialog').close();});
$('#reader-toolbar').addEventListener('click',e=>{
  const theme=e.target.closest('[data-reader-theme]'),size=e.target.closest('[data-reader-size]');
  if(!theme&&!size)return;
  const reader=$('#comic-reader'),distance=reader.scrollHeight-reader.clientHeight,ratio=distance>0?reader.scrollTop/distance:0;
  if(theme)readerPreferences.theme=theme.dataset.readerTheme;
  if(size)readerPreferences.size=Math.max(15,Math.min(24,readerPreferences.size+Number(size.dataset.readerSize)));
  applyReaderPreferences();reader.scrollTop=ratio*Math.max(0,reader.scrollHeight-reader.clientHeight);saveReading(true);
});

const params = new URLSearchParams(location.search);
const initialStory=params.get('story')||document.body.dataset.story;
if (storyIds.has(initialStory)) openStory(initialStory, Number(params.get('episode') || 1));
