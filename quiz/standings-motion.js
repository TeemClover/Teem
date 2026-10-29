const format = value => Math.round(value).toLocaleString('th-TH');
const easeOut = value => 1 - (1 - value) ** 3;

export function countValue(from, to, progress) {
  return Math.round(from + (to - from) * easeOut(Math.min(1, Math.max(0, progress))));
}

export function planStandings(previous, current, limit = 5) {
  const before = new Map(previous.map(p => [p.id, p]));
  const after = new Map(current.map(p => [p.id, p]));
  const visible = current.slice(0, limit);
  // Include former leaders while they animate out of the visible top five.
  const ids = new Set([...visible.map(p => p.id), ...previous.slice(0, limit).filter(p => after.has(p.id)).map(p => p.id)]);
  return [...ids].map(id => {
    const player = after.get(id), old = before.get(id);
    return { player, from: old?.score ?? 0, to: player.score,
      gain: player.score - (old?.score ?? 0), oldRank: old?.rank ?? null,
      newRank: player.rank, climb: old ? old.rank - player.rank : 0,
      visible: visible.some(p => p.id === id), wasVisible: !!old && old.rank <= limit };
  });
}

export function animateNumber(element, from, to, { duration = 1600, delay = 0 } = {}) {
  if (!element) return () => {};
  const view = element.ownerDocument.defaultView;
  if (!view || view.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
    element.textContent = format(to); return () => {};
  }
  let frame, started, cancelled = false;
  element.textContent = format(from);
  function tick(time) {
    if (cancelled || !element.isConnected) return;
    started ??= time;
    const progress = Math.min(1, Math.max(0, (time - started - delay) / duration));
    element.textContent = format(countValue(from, to, progress));
    if (progress < 1) frame = view.requestAnimationFrame(tick);
  }
  frame = view.requestAnimationFrame(tick);
  return () => { cancelled = true; view.cancelAnimationFrame(frame); element.textContent = format(to); };
}

export function animateStandings(container, current, { previous = [], limit = 5, renderRow, onOvertake = () => {} } = {}) {
  const doc = container.ownerDocument, view = doc.defaultView;
  container.setAttribute('aria-live', 'off');
  const plan = planStandings(previous, current, limit);
  const visible = current.slice(0, limit);
  const nodes = new Map();
  const counters = [], animations = [];
  let moveTimer, finishTimer, stopped = false;
  function rowFor(player) {
    const template = doc.createElement('template');
    template.innerHTML = renderRow(player);
    return template.content.firstElementChild;
  }
  if (!visible.length || !view || view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.innerHTML = visible.map(renderRow).join('');
    return () => {};
  }
  container.classList.add('standings-animating');
  container.replaceChildren();
  for (const entry of plan) {
    const row = rowFor(entry.player);
    row.dataset.playerId = entry.player.id;
    row.querySelector('.rank-no').textContent = entry.oldRank ?? entry.newRank;
    container.append(row); nodes.set(entry.player.id, row);
  }
  const rowHeight = nodes.values().next().value.getBoundingClientRect().height || 80;
  const stride = rowHeight + 10;
  const height = visible.length * stride - 10;
  container.style.height = `${height}px`;
  for (const entry of plan) {
    const row = nodes.get(entry.player.id);
    const startY = entry.wasVisible ? (entry.oldRank - 1) * stride : height + 24;
    row.style.position = 'absolute';row.style.left = '0';row.style.right = '0';
    row.style.top = `${startY}px`;row.style.opacity = entry.wasVisible ? '1' : '0';
    row.dataset.startY = String(startY);
    row.setAttribute('aria-hidden', String(!entry.visible));
    const score = row.querySelector('[data-score-value]');
    counters.push(animateNumber(score, entry.from, entry.to));
    if (entry.gain > 0) {
      row.classList.add('score-increasing');
      const gain = row.querySelector('[data-score-gain]');
      gain.textContent = `+${format(entry.gain)}`;gain.hidden = false;
    }
  }
  function finish() {
    if (stopped) return;
    animations.forEach(a => a.cancel());
    container.replaceChildren(...visible.map(p => nodes.get(p.id)));
    for (const row of nodes.values()) {
      row.style.position = '';row.style.left = '';row.style.right = '';row.style.top = '';row.style.opacity = '';
      row.classList.remove('score-increasing');
    }
    container.classList.remove('standings-animating');container.style.height = '';
  }
  // Let the numbers accelerate first, then carry the cards to their new places.
  moveTimer = view.setTimeout(() => {
    if (stopped || !container.isConnected) return;
    let hasOvertake = false;
    for (const entry of plan) {
      const row = nodes.get(entry.player.id);
      const targetY = entry.visible ? (entry.newRank - 1) * stride : height + 24;
      const fromY = Number(row.dataset.startY) - targetY;
      row.style.top = `${targetY}px`;row.style.opacity = entry.visible ? '1' : '0';
      row.style.zIndex = entry.climb > 0 ? '3' : '1';
      row.querySelector('.rank-no').textContent = entry.newRank;
      if (entry.visible && entry.climb > 0) {
        row.classList.add('rank-climbing');hasOvertake = true;
        const trend = row.querySelector('[data-rank-trend]');
        trend.textContent = `↑ ${entry.climb}`;trend.hidden = false;
        trend.setAttribute('aria-label', `ขึ้น ${entry.climb} อันดับ`);
      } else if (entry.visible && entry.climb < 0) {
        const trend = row.querySelector('[data-rank-trend]');
        trend.textContent = `↓ ${-entry.climb}`;trend.hidden = false;trend.classList.add('rank-falling');
      }
      if (row.animate) animations.push(row.animate([
        { transform: `translateY(${fromY}px) scale(1)`, opacity: entry.wasVisible ? 1 : 0 },
        { transform: `translateY(${fromY * .18}px) scale(${entry.climb > 0 ? 1.025 : .985})`, opacity: entry.visible ? 1 : .25, offset: .65 },
        { transform: 'translateY(0) scale(1)', opacity: entry.visible ? 1 : 0 },
      ], { duration: 850, delay: Math.min(entry.newRank - 1, 4) * 40, easing: 'cubic-bezier(.22,.8,.25,1)', fill: 'both' }));
    }
    if (hasOvertake) onOvertake();
    finishTimer = view.setTimeout(finish, 1120);
  }, 600);
  return () => {
    stopped = true;view.clearTimeout(moveTimer);view.clearTimeout(finishTimer);
    counters.forEach(cancel => cancel());animations.forEach(a => a.cancel());
  };
}
