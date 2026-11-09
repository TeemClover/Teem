/* Search state lives in the URL so an article's Back action returns to the same list. */
const library = window.XIRCLE_LIBRARY || {parts:[],topics:[]};
const simple = window.XIRCLE_SIMPLE || {parts:{},topics:{}};
const rooms = document.getElementById('rooms');
const search = document.getElementById('search');
const filters = document.getElementById('filters');
const status = document.getElementById('knowledge-results');
const reset = document.getElementById('knowledge-reset');
let filter = 'all';
const visible = topic => simple.topics[topic.id] || {title:topic.title,summary:topic.one};
for (const count of document.querySelectorAll('[data-topic-count]')) count.textContent = library.topics.length;
for (const count of document.querySelectorAll('[data-part-count]')) count.textContent = library.topics.filter(topic => topic.part === count.dataset.partCount).length;
function element(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text || '';
  if (className) node.className = className;
  return node;
}
function readQuery() {
  const query = new URLSearchParams(location.search);
  search.value = (query.get('q') || '').slice(0,120);
  const part = query.get('part');
  filter = library.parts.some(item => item.id === part) ? part : 'all';
}
function remember() {
  const url = new URL(location.href), query = search.value.trim();
  if (query) url.searchParams.set('q',query); else url.searchParams.delete('q');
  if (filter !== 'all') url.searchParams.set('part',filter); else url.searchParams.delete('part');
  try { history.replaceState(null,'',url.pathname+url.search+url.hash); } catch { /* Search still works. */ }
}
function render() {
  const query = search.value.trim().toLocaleLowerCase('th');
  let shown = 0;
  rooms.replaceChildren();
  for (const button of filters.querySelectorAll('button')) {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
  }
  for (const part of library.parts) {
    if (filter !== 'all' && filter !== part.id) continue;
    const topics = library.topics.filter(topic => {
      const text = visible(topic);
      return topic.part === part.id && (!query || [text.title,text.summary,...(text.points||[])].join(' ').toLocaleLowerCase('th').includes(query));
    });
    if (!topics.length) continue;
    shown += topics.length;
    const copy = simple.parts[part.id] || {label:part.th||part.label,intro:part.intro};
    const room = element('article','','room'); room.dataset.part = part.id; room.id = 'knowledge-'+part.id;
    const head = element('div','','room-head'), intro = element('div');
    intro.append(element('b',part.label),element('h2',copy.label),element('p',copy.intro));
    head.append(intro,element('div',`${topics.length} เรื่อง`,'route'));
    const list = element('div','','topics');
    for (const topic of topics) {
      const text = visible(topic), link = element('a','','topic');
      link.href = '/xircle/learn/topic/?t='+encodeURIComponent(topic.id);
      link.append(element('span','แมวสรุปให้ก่อน'),element('strong',text.title),element('em',text.summary)); list.append(link);
    }
    room.append(head,list); rooms.append(room);
  }
  document.getElementById('empty').hidden = Boolean(shown);
  status.textContent = `พบ ${shown} เรื่อง${filter==='all'?'':` · ${simple.parts[filter]?.label || filter}`}`;
  reset.hidden = !query && filter === 'all';
}
filters.addEventListener('click',event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  filter = button.dataset.filter; remember(); render();
});
search.addEventListener('input',() => { remember(); render(); });
reset.addEventListener('click',() => { search.value=''; filter='all'; remember(); render(); search.focus(); });
addEventListener('popstate',() => { readQuery(); render(); });
readQuery(); render();
