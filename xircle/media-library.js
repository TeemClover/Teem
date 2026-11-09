/** Official CloverX videos: local posters, URL-restored queues and explicit player loading. */
const section = document.querySelector('#official-media');
const mount = section?.querySelector('[data-media-library]');

if (mount) initialise().catch(() => {
  mount.replaceChildren();
  const note = document.createElement('p');
  note.className = 'media-unavailable';
  note.append('เปิดคลิปทั้งหมดได้ที่ ');
  const link = document.createElement('a');
  link.href = 'https://www.youtube.com/@CloverXOfficial';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'CloverX Official บน YouTube ↗';
  note.append(link);
  mount.append(note);
});

async function initialise() {
  const response = await fetch(new URL('./data/official-videos.json', import.meta.url));
  if (!response.ok) throw Error('Official video metadata unavailable');
  const library = await response.json();
  const videos = library.videos.filter(video => /^[\w-]{11}$/.test(video.id));
  const byId = new Map(videos.map(video => [video.id, video]));
  const categories = [{id: 'all', label: 'ทั้งหมด'}, ...library.categories];
  const categoryIds = new Set(categories.map(category => category.id));
  let category = 'all';
  let selected = videos[0];
  let returnFocus;

  mount.classList.add('media-library');
  mount.innerHTML = `
    <header class="media-head">
      <div><p class="media-eyebrow">CLOVER X / OFFICIAL PLAYBOOK</p><h2 id="media-title">ดูวิธีใช้.<br><em>ลองตามได้เลย.</em></h2></div>
      <a class="media-channel" href="https://www.youtube.com/@CloverXOfficial" target="_blank" rel="noopener noreferrer">CloverX Official <span aria-hidden="true">↗</span></a>
    </header>
    <div class="media-filters" role="group" aria-label="เลือกหมวดคลิป"></div>
    <p class="media-status" role="status" aria-live="polite" aria-atomic="true"></p>
    <ul class="media-grid" aria-label="คลิปจากช่อง CloverX"></ul>
    <dialog class="media-dialog" aria-labelledby="media-dialog-title" aria-describedby="media-dialog-source">
      <div class="media-dialog-top"><span>CLOVER X / PLAYBOOK</span><button type="button" class="media-close" data-media-close aria-label="ปิดวิดีโอ">ปิด <span aria-hidden="true">×</span></button></div>
      <div class="media-player" data-media-player></div>
      <div class="media-dialog-copy"><p class="media-eyebrow" data-media-label></p><h2 id="media-dialog-title" tabindex="-1"></h2><p id="media-dialog-source">คลิปจากช่อง CloverX Official</p><a class="media-external" data-media-external target="_blank" rel="noopener noreferrer">เปิดบน YouTube <span aria-hidden="true">↗</span></a></div>
      <div class="media-queue"><button type="button" data-media-prev aria-label="คลิปก่อนหน้า">← ก่อนหน้า</button><output data-media-position aria-live="polite" aria-atomic="true"></output><button type="button" data-media-next aria-label="คลิปถัดไป">ถัดไป →</button></div>
    </dialog>`;

  const filters = mount.querySelector('.media-filters');
  const grid = mount.querySelector('.media-grid');
  const status = mount.querySelector('.media-status');
  const dialog = mount.querySelector('.media-dialog');
  const player = mount.querySelector('[data-media-player]');
  const heading = mount.querySelector('#media-dialog-title');
  const previous = mount.querySelector('[data-media-prev]');
  const next = mount.querySelector('[data-media-next]');
  const queue = () => category === 'all' ? videos : videos.filter(video => video.category === category);
  const categoryLabel = id => categories.find(item => item.id === id)?.label || 'ทั้งหมด';

  function restore() {
    const params = new URLSearchParams(location.search);
    const categoryValues = params.getAll('category');
    const watchValues = params.getAll('watch');
    const validCategory = categoryValues.length === 0 || (categoryValues.length === 1 && categoryIds.has(categoryValues[0]));
    category = validCategory && categoryValues.length === 1 ? categoryValues[0] : 'all';
    const candidate = validCategory && watchValues.length === 1 ? byId.get(watchValues[0]) : undefined;
    const validWatch = candidate && (category === 'all' || candidate.category === category);
    selected = validWatch ? candidate : queue()[0];
    return Boolean(validWatch);
  }

  function save({open = false, replace = false} = {}) {
    const url = new URL(location.href);
    url.searchParams.set('category', category);
    url.searchParams.delete('watch');
    if (open) url.searchParams.set('watch', selected.id);
    if (url.href !== location.href) {
      try { history[replace ? 'replaceState' : 'pushState']({...history.state}, '', url); } catch { /* Content and controls remain usable. */ }
    }
  }

  function renderFilters() {
    filters.replaceChildren(...categories.map(item => {
      const button = document.createElement('button');
      const count = item.id === 'all' ? videos.length : videos.filter(video => video.category === item.id).length;
      button.type = 'button';
      button.dataset.mediaCategory = item.id;
      button.setAttribute('aria-pressed', String(category === item.id));
      button.setAttribute('aria-label', `${item.label} ${count} คลิป`);
      button.append(item.label + ' ');
      const number = document.createElement('span');
      number.setAttribute('aria-hidden', 'true');
      number.textContent = count;
      button.append(number);
      button.addEventListener('click', () => {
        category = item.id;
        if (!queue().some(video => video.id === selected.id)) selected = queue()[0];
        save({open: false});
        render();
        filters.querySelector(`[data-media-category="${item.id}"]`)?.focus({preventScroll: true});
      });
      return button;
    }));
  }

  function renderCards() {
    const visible = queue();
    status.textContent = `${categoryLabel(category)} · ${visible.length} คลิปจาก CloverX`;
    grid.replaceChildren(...visible.map((video, index) => {
      const item = document.createElement('li');
      item.className = 'media-card' + (selected.id === video.id ? ' is-selected' : '');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mediaOpen = video.id;
      button.setAttribute('aria-haspopup', 'dialog');
      const artwork = document.createElement('span');
      artwork.className = 'media-card-art';
      artwork.dataset.mediaKind = video.category;
      artwork.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span');
      number.className = 'media-card-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const play = document.createElement('span');
      play.className = 'media-play-symbol';
      play.textContent = '▶';
      const label = document.createElement('span');
      label.className = 'media-card-kind';
      label.textContent = categoryLabel(video.category);
      const poster = document.createElement('img');
      poster.src = `/xircle/assets/real-app/video-${video.id}.jpg`;
      poster.alt = '';
      poster.width = 480;
      poster.height = 270;
      poster.loading = 'lazy';
      poster.decoding = 'async';
      poster.addEventListener('error', () => {
        if (poster.dataset.fallback) return;
        poster.dataset.fallback = 'true';
        poster.src = '/xircle/assets/real-app/band-hero.webp';
      }, {once: true});
      artwork.append(poster, number, play, label);
      const title = document.createElement('span');
      title.className = 'media-card-title';
      title.textContent = video.title;
      const duration = document.createElement('span');
      duration.className = 'media-duration';
      duration.textContent = video.duration;
      button.append(artwork, title, duration);
      button.addEventListener('click', () => {
        returnFocus = button;
        selected = video;
        save({open: true});
        renderSelection();
        renderPlayer();
        dialog.showModal();
        heading.focus({preventScroll: true});
      });
      const external = document.createElement('a');
      external.className = 'media-card-external';
      external.href = video.url;
      external.target = '_blank';
      external.rel = 'noopener noreferrer';
      external.textContent = 'YouTube ↗';
      external.setAttribute('aria-label', `เปิด ${video.title} บน YouTube`);
      item.append(button, external);
      return item;
    }));
  }

  function renderSelection() {
    grid.querySelectorAll('.media-card').forEach(card => card.classList.toggle('is-selected', card.querySelector('[data-media-open]').dataset.mediaOpen === selected.id));
  }

  function renderPlayer() {
    // Removing the old iframe stops media before another topic, history state or dialog is shown.
    player.replaceChildren();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-load-player';
    button.dataset.mediaPlay = selected.id;
    button.textContent = '▶ เล่นวิดีโอนี้';
    button.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${selected.id}?rel=0&playsinline=1&autoplay=1`;
      iframe.title = selected.title;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(iframe);
    }, {once: true});
    player.append(button);
    heading.textContent = selected.title;
    mount.querySelector('[data-media-label]').textContent = `${categoryLabel(selected.category)} / ${selected.duration}`;
    mount.querySelector('[data-media-external]').href = selected.url;
    const visible = queue();
    const position = visible.findIndex(video => video.id === selected.id);
    previous.disabled = position <= 0;
    next.disabled = position >= visible.length - 1;
    mount.querySelector('[data-media-position]').textContent = `${position + 1} / ${visible.length}`;
  }

  function render() {
    renderFilters();
    renderCards();
    if (dialog.open) renderPlayer();
  }

  function step(direction) {
    const visible = queue();
    const index = visible.findIndex(video => video.id === selected.id) + direction;
    if (index < 0 || index >= visible.length) return;
    selected = visible[index];
    save({open: true});
    renderSelection();
    renderPlayer();
    heading.focus({preventScroll: true});
  }

  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  function focusLauncher() {
    if (dialog.open) return;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    else grid.querySelector(`[data-media-open="${selected.id}"]`)?.focus({preventScroll: true});
  }
  function closeInfo() {
    player.replaceChildren();
    dialog.close();
    focusLauncher();
  }
  function closeFromUser() {
    save({open: false, replace: true});
    closeInfo();
  }
  mount.querySelector('[data-media-close]').addEventListener('click', closeFromUser);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeFromUser();
  });
  dialog.addEventListener('close', () => {
    // A queued close from history must never overwrite the URL or a newly reopened player.
    if (dialog.open) return;
    player.replaceChildren();
    // A history/category update can replace a card while the dialog is open.
    focusLauncher();
  });
  function restoreFromURL() {
    const open = restore();
    render();
    if (open) {
      if (!dialog.open) {
        returnFocus = grid.querySelector(`[data-media-open="${selected.id}"]`);
        renderPlayer();
        dialog.showModal();
      }
      heading.focus({preventScroll: true});
    } else if (dialog.open) closeInfo();
  }
  addEventListener('popstate', restoreFromURL);
  addEventListener('pagehide', () => player.replaceChildren());
  addEventListener('pageshow', restoreFromURL);

  restoreFromURL();
  section.dataset.mediaReady = 'true';
}
