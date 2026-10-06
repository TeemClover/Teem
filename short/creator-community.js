const FOLLOW_KEY = 'tontor.followedCreators.v1';
let communitySequence = 0;

function readFollowing() {
  try {
    const value = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isTeam(profile) { return profile.kind === 'team'; }
function displayName(profile) { return isTeam(profile) ? profile.studio || profile.name : profile.name; }

function portrait(profile, className, eager = false) {
  const img = element('img', className);
  img.src = profile.portrait || profile.image || `./assets/creators/${encodeURIComponent(profile.id)}.webp`;
  img.alt = isTeam(profile) ? `โลโก้ทีมสมมติ ${displayName(profile)}` : `ภาพครีเอเตอร์สมมติ ${profile.name}`;
  img.classList.toggle('is-team', isTeam(profile));
  img.width = 512;
  img.height = 512;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}

function normalizeProfiles(profiles, stories) {
  const entries = Array.isArray(profiles) ? profiles : Object.entries(profiles || {}).map(([id, value]) => ({id, ...value}));
  const source = entries.length ? entries : stories.map(story => ({id: story.creatorId || story.id, name: story.creator, studio: story.studio, city: story.city, disciplines: story.genres, works: [story.id]}));
  return source.filter(profile => profile?.id).map(profile => ({
    ...profile,
    name: profile.name || profile.creator || profile.studio || 'ครีเอเตอร์',
    bio: profile.bio || 'เล่าเรื่องในมุมของตัวเอง ด้วยจินตนาการและเครื่องมือ AI',
    disciplines: Array.isArray(profile.disciplines) ? profile.disciplines : (Array.isArray(profile.genres) ? profile.genres : []),
  }));
}

/** Fictional creator profiles, real local interactions: view work and follow. */
export function createCreatorCommunity({root = document, profiles = [], stories = [], onOpenStory = () => {}} = {}) {
  const grid = root.matches?.('#creator-grid') ? root : root.querySelector('#creator-grid');
  if (!grid) return {render() {}, openProfile() {}, destroy() {}};
  const ownerDocument = grid.ownerDocument;
  const idPrefix = `creator-community-${++communitySequence}`;
  const dialog = element('dialog', 'community-dialog');
  dialog.setAttribute('aria-labelledby', `${idPrefix}-name`);
  const close = element('button', 'community-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'ปิดโปรไฟล์ครีเอเตอร์');
  const dialogBody = element('div', 'community-dialog-body');
  dialog.append(close, dialogBody);
  ownerDocument.body.append(dialog);
  grid.classList.add('community-grid');
  const following = readFollowing();
  let currentProfile = null;
  let trigger = null;

  function profileWorks(profile) {
    const references = profile.works || profile.storyIds || profile.workIds;
    const ids = Array.isArray(references) ? references.map(value => typeof value === 'string' ? value : value?.id).filter(Boolean) : [];
    return stories.filter(story => ids.length ? ids.includes(story.id) : (story.creatorId === profile.id || story.id === profile.id || story.creator === profile.name));
  }

  function setFollowButton(button, profile) {
    const followed = following.has(profile.id);
    button.textContent = followed ? 'ติดตามแล้ว ✓' : '+ ติดตาม';
    button.classList.toggle('is-following', followed);
    button.setAttribute('aria-pressed', String(followed));
    button.setAttribute('aria-label', `${followed ? 'เลิกติดตาม' : 'ติดตาม'}${isTeam(profile) ? 'ทีม' : ''} ${displayName(profile)}`);
  }

  function followButton(profile) {
    const button = element('button', 'community-follow');
    button.type = 'button';
    button.dataset.communityFollow = profile.id;
    setFollowButton(button, profile);
    button.addEventListener('click', () => {
      if (following.has(profile.id)) following.delete(profile.id);
      else following.add(profile.id);
      try { localStorage.setItem(FOLLOW_KEY, JSON.stringify([...following])); } catch {}
      grid.querySelectorAll('[data-community-follow]').forEach(node => {
        if (node.dataset.communityFollow === profile.id) setFollowButton(node, profile);
      });
      dialog.querySelectorAll('[data-community-follow]').forEach(node => {
        if (node.dataset.communityFollow === profile.id) setFollowButton(node, profile);
      });
      const status = dialog.querySelector('[data-follow-status]');
      if (status && currentProfile?.id === profile.id) status.textContent = following.has(profile.id) ? `ติดตาม ${displayName(profile)} แล้ว` : `เลิกติดตาม ${displayName(profile)} แล้ว`;
    });
    return button;
  }

  function tags(profile) {
    const list = element('span', 'community-disciplines');
    profile.disciplines.slice(0, 3).forEach(discipline => list.append(element('span', '', discipline)));
    return list;
  }

  function workButton(story) {
    const button = element('button', 'community-work');
    button.type = 'button';
    button.dataset.communityWork = story.id;
    const image = element('img', 'community-work-poster');
    image.src = story.cover || story.poster || story.image || `./assets/${encodeURIComponent(story.id)}.webp`;
    image.alt = '';
    image.loading = 'lazy';
    image.width = 80;
    image.height = 112;
    const copy = element('span', 'community-work-copy');
    const format = story.format === 'novel' ? 'นิยาย' : story.format === 'comic' ? 'การ์ตูน' : story.format === 'animation' ? 'แอนิเมชัน' : 'ละครสั้น';
    copy.append(element('small', 'community-work-format', format), element('strong', '', story.title));
    if (story.description) copy.append(element('span', 'community-work-description', story.description));
    const arrow = element('span', 'community-work-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(image, copy, arrow);
    button.setAttribute('aria-label', `${format === 'นิยาย' || format === 'การ์ตูน' ? 'อ่าน' : 'ดู'} ${story.title}`);
    button.addEventListener('click', () => {
      dialog.close();
      // Let the native dialog restore focus before another player/reader opens.
      requestAnimationFrame(() => onOpenStory(story.id, story));
    });
    return button;
  }

  function openProfile(id, source) {
    const profile = normalizeProfiles(profiles, stories).find(value => value.id === id);
    if (!profile) return;
    trigger = source || ownerDocument.activeElement;
    currentProfile = profile;
    dialog.dataset.communityKind = isTeam(profile) ? 'team' : 'solo';
    close.setAttribute('aria-label', isTeam(profile) ? 'ปิดโปรไฟล์ทีมสร้างสรรค์' : 'ปิดโปรไฟล์ครีเอเตอร์');
    dialogBody.replaceChildren();
    const hero = element('div', 'community-profile-hero');
    hero.append(portrait(profile, 'community-profile-portrait', true));
    const intro = element('div', 'community-profile-intro');
    intro.append(element('p', 'community-eyebrow', isTeam(profile) ? 'ทีมไทย สร้างเรื่องไทย' : 'คนไทย เล่าเรื่องไทย'));
    const name = element('h2', '', displayName(profile));
    name.id = `${idPrefix}-name`;
    intro.append(name);
    if (!isTeam(profile) && profile.studio && profile.studio !== profile.name) intro.append(element('p', 'community-studio', profile.studio));
    if (profile.city) intro.append(element('p', 'community-city', `↗ ${profile.city}`));
    intro.append(tags(profile), followButton(profile));
    hero.append(intro);
    const bio = element('p', 'community-profile-bio', profile.bio);
    const works = element('section', 'community-profile-works');
    works.setAttribute('aria-labelledby', `${idPrefix}-works`);
    const heading = element('h3', '', isTeam(profile) ? 'เรื่องเล่าจากทีมนี้' : 'เรื่องเล่าจากครีเอเตอร์คนนี้');
    heading.id = `${idPrefix}-works`;
    works.append(heading);
    const list = element('div', 'community-work-list');
    const items = profileWorks(profile);
    items.forEach(story => list.append(workButton(story)));
    if (!items.length) list.append(element('p', 'community-empty', 'เรื่องใหม่กำลังอยู่ระหว่างการสร้าง'));
    works.append(list);
    const note = element('p', 'community-demo-note', isTeam(profile) ? 'ชื่อทีมและโลโก้สมมติ สำหรับทดลองประสบการณ์ตอนต่อ' : 'โปรไฟล์และภาพครีเอเตอร์สมมติ สำหรับทดลองประสบการณ์ตอนต่อ');
    const status = element('p', 'sr-only');
    status.dataset.followStatus = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    dialogBody.append(hero, bio, works, note, status);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    close.focus({preventScroll: true});
  }

  function render() {
    grid.replaceChildren();
    normalizeProfiles(profiles, stories).filter(profile => profile.featured === true).slice(0, 4).forEach(profile => {
      const card = element('button', 'community-card community-card-open');
      card.type = 'button';
      card.dataset.communityCreator = profile.id;
      card.dataset.communityKind = isTeam(profile) ? 'team' : 'solo';
      card.setAttribute('aria-label', isTeam(profile) ? `เปิดโปรไฟล์ทีมสร้างสรรค์ ${displayName(profile)}` : `เปิดโปรไฟล์ครีเอเตอร์ ${profile.name}${profile.studio ? ` / ${profile.studio}` : ''}`);
      card.append(portrait(profile, 'community-card-portrait'));
      const copy = element('span', 'community-card-copy');
      copy.append(element('strong', 'community-card-name', displayName(profile)));
      const details = [!isTeam(profile) && profile.studio, profile.city, profile.disciplines[0]].filter(Boolean).join(' · ');
      const secondary = element('span', 'community-card-meta', details);
      secondary.title = details;
      copy.append(secondary);
      const arrow = element('span', 'community-card-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(copy, arrow);
      card.addEventListener('click', () => openProfile(profile.id, card));
      grid.append(card);
    });
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    currentProfile = null;
    if (trigger?.isConnected) trigger.focus({preventScroll: true});
  });
  render();
  return {render, openProfile, destroy() { dialog.remove(); grid.replaceChildren(); grid.classList.remove('community-grid'); }};
}
