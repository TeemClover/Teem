/* TeamBook activity clarity layer.
   Activities already live in canonical book/member state. This module only
   makes them visible at the moments a person needs to understand what counts
   as one daily signature — inside the notebook and before joining a public one. */

const PATH = location.pathname;
const IS_BOOK = /^\/p(?:\/|$)/.test(PATH);
const IS_PUBLIC_DETAIL = /^\/public\/p(?:\/|$)/.test(PATH);
const code = String(new URLSearchParams(location.search).get('c') || '').toUpperCase();

function addStyles() {
  if (document.getElementById('tb-activity-ux-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-activity-ux-style';
  style.textContent = `
    .tb-activity-rules-button{width:100%;margin-top:12px;min-height:46px;border:1px solid rgba(75,95,65,.24);border-radius:16px;background:#f2f6ed;color:#314532;font:inherit;font-weight:800;cursor:pointer;padding:10px 14px;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .tb-activity-rules-button small{display:block;margin-top:2px;color:#6b7665;font-size:11px;font-weight:600}.tb-activity-rules-button .arrow{font-size:20px;line-height:1;color:#66755e}
    .tb-activity-overlay{position:fixed;inset:0;z-index:185;background:rgba(34,28,18,.58);backdrop-filter:blur(4px);display:grid;align-items:end;justify-items:center;padding:18px}
    .tb-activity-sheet{width:min(100%,620px);max-height:min(84dvh,760px);overflow:auto;border-radius:26px 26px 20px 20px;background:#fffaf0;border:1px solid rgba(119,91,37,.22);box-shadow:0 26px 90px rgba(27,20,8,.28);padding:22px 18px 18px;color:#292219}
    .tb-activity-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:6px}.tb-activity-sheet-head h2{font-size:24px;line-height:1.2;margin:0}.tb-activity-sheet-head p{margin:6px 0 0;color:#736650;font-size:13px;line-height:1.55}.tb-activity-close{appearance:none;border:0;background:#eee6d8;width:38px;height:38px;border-radius:50%;font-size:22px;cursor:pointer;flex:none}
    .tb-activity-member-list{display:grid;gap:10px;margin-top:16px}.tb-activity-member{display:grid;grid-template-columns:54px 78px minmax(0,1fr);gap:11px;align-items:center;border:1px solid rgba(92,75,49,.14);background:#fffdf7;border-radius:18px;padding:10px}.tb-activity-member-avatar{width:54px;height:54px;border-radius:14px;background:#f4eddf;object-fit:contain}.tb-activity-member-art{width:78px;height:64px;border-radius:13px;object-fit:cover;background:#eee8dc}.tb-activity-member-copy{min-width:0}.tb-activity-member-copy .who{display:block;font-size:13px;font-weight:850;margin-bottom:3px}.tb-activity-member-copy .activity{display:block;font-size:15px;font-weight:850}.tb-activity-member-copy .desc{display:block;font-size:11px;color:#7a6c56;margin-top:2px;line-height:1.4}.tb-activity-member-copy .rule{display:block;margin-top:7px;padding:7px 9px;border-radius:10px;background:#f1f5eb;color:#314532;font-size:12px;line-height:1.45}.tb-activity-member-copy .rule b{font-weight:900}
    .tb-public-activity-visual{margin-top:16px;border-radius:19px;border:1px solid rgba(92,75,49,.14);background:#fffaf0;overflow:hidden}.tb-public-activity-main{display:grid;grid-template-columns:140px minmax(0,1fr);gap:14px;align-items:center;padding:12px}.tb-public-activity-main>img{width:140px;height:100px;border-radius:14px;object-fit:cover;background:#eee8dc}.tb-public-activity-main h2{font-size:18px;margin:0 0 4px}.tb-public-activity-main p{font-size:12px;line-height:1.5;color:#74664f;margin:0}
    .tb-public-activity-mosaic{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;width:140px;height:100px;border-radius:14px;overflow:hidden;background:#eee8dc}.tb-public-activity-mosaic img{width:100%;height:100%;min-height:0;object-fit:cover}.tb-public-activity-mosaic.one{grid-template-columns:1fr}
    .tb-public-member-rules{display:grid;gap:10px;margin-top:14px}.tb-public-member-rule{display:grid;grid-template-columns:58px minmax(0,1fr);gap:11px;align-items:center;padding:10px;border:1px solid rgba(92,75,49,.13);border-radius:16px;background:#fffdf8}.tb-public-member-rule img{width:58px;height:58px;object-fit:cover;border-radius:13px;background:#eee8dc}.tb-public-member-rule b{display:block;font-size:13px}.tb-public-member-rule .doing{display:block;margin-top:2px;font-size:14px;font-weight:850}.tb-public-member-rule .counts{display:block;margin-top:5px;font-size:11px;line-height:1.45;color:#53604e}.tb-public-member-rule .counts strong{color:#304631}
    .tb-log-activity-line{display:flex;align-items:center;gap:7px;margin:5px 0 6px;padding:6px 8px;border-radius:11px;background:#f5f1e8;color:#514936;font-size:11px;line-height:1.35}.tb-log-activity-line img{width:30px;height:30px;border-radius:8px;object-fit:cover;flex:none}.tb-log-activity-line b{display:block;font-size:11px}.tb-log-activity-line small{display:block;color:#786d5a;margin-top:1px}
    @media(min-width:700px){.tb-activity-overlay{align-items:center}.tb-activity-sheet{border-radius:26px}}
    @media(max-width:520px){.tb-activity-member{grid-template-columns:44px 66px minmax(0,1fr);gap:8px}.tb-activity-member-avatar{width:44px;height:44px}.tb-activity-member-art{width:66px;height:56px}.tb-public-activity-main{grid-template-columns:108px minmax(0,1fr);gap:11px}.tb-public-activity-main>img,.tb-public-activity-mosaic{width:108px;height:84px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function activityInfo(party, member, activityById) {
  const individual = party?.activityMode === 'individual';
  const id = individual
    ? (member?.activityId || 'custom')
    : (party?.sharedActivityId || party?.activityId || 'custom');
  const base = activityById(id);
  const label = individual
    ? (member?.activityLabel || base.labelTh || 'กิจกรรมของตัวเอง')
    : (party?.sharedActivityLabel || party?.activity || base.labelTh || 'กิจกรรมของสมุด');
  const description = individual
    ? (member?.activityDescription || base.hintTh || '')
    : (party?.sharedActivityDescription || base.hintTh || '');
  const rule = member?.successRule || party?.commitRule || 'ทำสิ่งที่ตกลงไว้ของวันนี้';
  return { id, art: base.art, label, description, rule };
}

function closeOverlay(overlay) {
  overlay?.remove();
  document.documentElement.style.removeProperty('overflow');
}

async function installBookActivityButton() {
  if (!IS_BOOK || !/^\d{5}$/.test(code)) return;
  const [{ getParty }, { activityById }, { avatarById }, { resolveMemberAvatar }] = await Promise.all([
    import('./store.js'), import('./activities.js'), import('./avatars.js'), import('./card-picker.js'),
  ]);
  addStyles();

  const mount = () => {
    if (document.getElementById('tbActivityRulesButton')) return true;
    const ruleBox = document.getElementById('ruleBox');
    if (!ruleBox) return false;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'tbActivityRulesButton';
    button.className = 'tb-activity-rules-button';
    button.innerHTML = '<span>ดูว่าแต่ละคนนับ 1 ลงชื่อยังไง<small>กิจกรรมและเงื่อนไขของทุกคนในสมุดนี้</small></span><span class="arrow">›</span>';
    ruleBox.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      const party = getParty(code);
      if (!party) return;
      const overlay = document.createElement('div');
      overlay.className = 'tb-activity-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      const rows = (party.members || []).map(member => {
        const info = activityInfo(party, member, activityById);
        const resolved = resolveMemberAvatar(member.avatar);
        const avatarArt = resolved?.speciesArt || avatarById(member.avatar).art;
        return `<article class="tb-activity-member">
          <img class="tb-activity-member-avatar" src="${esc(avatarArt)}" alt="">
          <img class="tb-activity-member-art" src="${esc(info.art)}" alt="ภาพกิจกรรม ${esc(info.label)}">
          <div class="tb-activity-member-copy"><span class="who">${esc(member.alias || 'สมาชิก')}</span><span class="activity">${esc(info.label)}</span>${info.description ? `<span class="desc">${esc(info.description)}</span>` : ''}<span class="rule"><b>1 ลงชื่อ =</b> ${esc(info.rule)}</span></div>
        </article>`;
      }).join('');
      const intro = party.activityMode === 'individual'
        ? 'สมุดนี้แต่ละคนเลือกเรื่องของตัวเอง เงื่อนไขด้านล่างคือสิ่งที่แต่ละคนบอกว่าจะทำให้สำเร็จในวันนั้น'
        : 'ทุกคนทำกิจกรรมเดียวกันได้ แต่แต่ละคนยังบอกได้ว่าอะไรคือ “ทำสำเร็จ” ของตัวเองในวันนั้น';
      overlay.innerHTML = `<section class="tb-activity-sheet"><div class="tb-activity-sheet-head"><div><h2>วันนี้แต่ละคนกำลังทำอะไร</h2><p>${esc(intro)}</p></div><button class="tb-activity-close" type="button" aria-label="ปิด">×</button></div><div class="tb-activity-member-list">${rows || '<p>ยังไม่มีสมาชิกในสมุด</p>'}</div></section>`;
      overlay.querySelector('.tb-activity-close').addEventListener('click', () => closeOverlay(overlay));
      overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(overlay); });
      document.body.appendChild(overlay);
      document.documentElement.style.overflow = 'hidden';
      overlay.querySelector('.tb-activity-close').focus();
    });
    return true;
  };

  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }
}

export async function renderPublicActivityDetails(publicParty) {
  if (!IS_PUBLIC_DETAIL || !publicParty) return;
  const [{ activityById }, { avatarById }, { resolveMemberAvatar }] = await Promise.all([
    import('./activities.js'), import('./avatars.js'), import('./card-picker.js'),
  ]);
  addStyles();
  const view = document.getElementById('view');
  if (!view || view.hidden) return;

  const firstCard = view.querySelector('.card');
  const hero = firstCard?.querySelector('.preview-hero');
  if (hero && !document.getElementById('tbPublicActivityVisual')) {
    const section = document.createElement('section');
    section.id = 'tbPublicActivityVisual';
    section.className = 'tb-public-activity-visual';
    const individual = publicParty.activityMode === 'individual';
    if (individual) {
      const unique = [];
      for (const member of publicParty.members || []) {
        const info = activityInfo(publicParty, member, activityById);
        if (!unique.some(item => item.id === info.id && item.label === info.label)) unique.push(info);
      }
      const picks = unique.slice(0, 4);
      const mosaic = `<div class="tb-public-activity-mosaic ${picks.length <= 1 ? 'one' : ''}">${(picks.length ? picks : [activityInfo(publicParty, null, activityById)]).map(info => `<img src="${esc(info.art)}" alt="${esc(info.label)}">`).join('')}</div>`;
      section.innerHTML = `<div class="tb-public-activity-main">${mosaic}<div><p class="kicker" style="margin:0 0 4px">คนละเรื่อง · สมุดเดียวกัน</p><h2>แต่ละคนเลือกสิ่งที่ตัวเองอยากทำ</h2><p>ไม่ต้องทำเหมือนกัน แค่กลับมาลงชื่อและเห็นกันในสมุดเล่มเดียวกัน</p></div></div>`;
    } else {
      const info = activityInfo(publicParty, publicParty.members?.[0], activityById);
      section.innerHTML = `<div class="tb-public-activity-main"><img src="${esc(info.art)}" alt="ภาพกิจกรรม ${esc(info.label)}"><div><p class="kicker" style="margin:0 0 4px">กิจกรรมของสมุด</p><h2>${esc(info.label)}</h2><p>${esc(info.description || 'ทุกคนกลับมาลงชื่อในกิจกรรมนี้ด้วยกัน')}</p></div></div>`;
    }
    hero.insertAdjacentElement('afterend', section);
  }

  const ruleBox = firstCard?.querySelector('.rule-box');
  if (ruleBox && publicParty.activityMode === 'individual') {
    const title = ruleBox.querySelector('b');
    const text = ruleBox.querySelector('p');
    if (title) title.textContent = 'แต่ละคนมีเงื่อนไขของตัวเอง';
    if (text) text.textContent = 'ดูด้านล่างว่าแต่ละคนตั้งอะไรไว้ และอะไรถึงจะนับเป็น 1 ลงชื่อของเขา';
  }

  const membersHost = document.getElementById('members');
  if (membersHost && !document.getElementById('tbPublicMemberRules')) {
    const list = document.createElement('div');
    list.id = 'tbPublicMemberRules';
    list.className = 'tb-public-member-rules';
    list.innerHTML = (publicParty.members || []).map(member => {
      const info = activityInfo(publicParty, member, activityById);
      const resolved = resolveMemberAvatar(member.avatar);
      const avatarArt = resolved?.speciesArt || avatarById(member.avatar).art;
      return `<article class="tb-public-member-rule"><img src="${esc(info.art)}" alt="ภาพกิจกรรม ${esc(info.label)}"><div><b>${esc(member.alias || 'สมาชิก')}</b><span class="doing">${esc(info.label)}</span><span class="counts"><strong>1 ลงชื่อ =</strong> ${esc(info.rule)}</span></div></article>`;
    }).join('');
    membersHost.insertAdjacentElement('afterend', list);
  }

  const commitNodes = [...document.querySelectorAll('#log .public-entry.commit')];
  const commits = (publicParty.log || []).filter(post => post.kind === 'commit');
  commitNodes.forEach((node, index) => {
    if (node.querySelector('.tb-log-activity-line')) return;
    const post = commits[index];
    if (!post) return;
    const member = (publicParty.members || []).find(item => item.userId === post.userId) || null;
    const fallback = activityInfo(publicParty, member, activityById);
    const info = {
      art: activityById(post.activityId || fallback.id).art,
      label: post.activityLabel || fallback.label,
      rule: post.successRuleSnapshot || fallback.rule,
    };
    const line = document.createElement('div');
    line.className = 'tb-log-activity-line';
    line.innerHTML = `<img src="${esc(info.art)}" alt=""><span><b>${esc(info.label)}</b>${info.rule ? `<small>1 ลงชื่อ = ${esc(info.rule)}</small>` : ''}</span>`;
    node.querySelector('.body')?.insertBefore(line, node.querySelector('.text'));
  });
}

if (IS_BOOK) installBookActivityButton().catch(error => console.warn('TeamBook activity rules unavailable', error));
