const SOURCES = Object.freeze({
  'first-class': { label: 'First Class · รุ่นแรก', person: 'ผู้เรียน First Class' },
  'the-dent': { label: 'The Dent · คลาสสด', person: 'ผู้เรียน The Dent' },
});
const text = value => typeof value === 'string' ? value.trim() : '';

// Inputs must come from the public projections, never an admin/export endpoint.
export function normalizeReviews(payload, endpoint) {
  if (!payload?.ok || !Array.isArray(payload.reviews)) return [];
  return payload.reviews.flatMap(review => {
    if (!review || typeof review !== 'object') return [];
    const firstClass = endpoint === 'first-class';
    const sourceId = firstClass ? 'first-class' : endpoint === 'workshop' ? review.source?.id : null;
    const source = SOURCES[sourceId];
    const consent = firstClass ? review.consentMode : review.consent;
    const quote = text(firstClass ? review.recommend : review.testimonial);
    if (!source || !['named', 'anonymous'].includes(consent) || !quote) return [];
    const named = consent === 'named';
    return [{
      quote, sourceId, sourceLabel: source.label,
      name: named ? text(review.displayName) || source.person : source.person,
      // Anonymous consent currently excludes identifying occupation/company data.
      // Do not derive a role from private fields, the quote, or the cohort.
      role: named ? text(firstClass ? review.roleCompany : review.role) : '',
      anonymous: !named,
    }];
  });
}

export async function loadPublicReviews(fetcher = fetch) {
  const endpoints = [
    ['first-class', '/api/first-class-review?public=1'],
    ['workshop', '/api/course-reviews?public=1'],
  ];
  const groups = await Promise.all(endpoints.map(async ([kind, url]) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher(url, {
        credentials: 'omit', cache: 'no-store', headers: { accept: 'application/json' }, signal: controller.signal,
      });
      return response.ok ? normalizeReviews(await response.json(), kind) : [];
    } catch { return []; }
    finally { clearTimeout(timer); }
  }));
  // Interleave available sources without inventing reviews when a source is empty.
  return Array.from({ length: Math.max(...groups.map(group => group.length)) }, (_, i) => groups.flatMap(group => group[i] ? [group[i]] : [])).flat().slice(0, 6);
}

export function renderReviews(document, reviews) {
  const section = document.getElementById('student-reviews');
  const list = document.getElementById('student-review-list');
  if (!section || !list) return;
  list.replaceChildren();
  for (const review of reviews) {
    const card = document.createElement('figure'); card.className = 'student-review';
    const source = document.createElement('p'); source.className = 'student-review-source'; source.textContent = review.sourceLabel;
    const quote = document.createElement('blockquote'); quote.textContent = review.quote;
    const caption = document.createElement('figcaption');
    const name = document.createElement('strong'); name.textContent = review.name; caption.append(name);
    if (review.role) { const role = document.createElement('span'); role.textContent = review.role; caption.append(role); }
    if (review.anonymous) { const note = document.createElement('span'); note.textContent = 'ไม่เปิดเผยชื่อ'; caption.append(note); }
    card.append(source, quote, caption); list.append(card);
  }
  const origins = [...new Set(reviews.map(review => review.sourceId))];
  const originText = origins.map(id => id === 'first-class' ? 'First Class รุ่นแรก' : 'The Dent').join(' และ ');
  const context = document.getElementById('student-review-context');
  if (context) context.textContent = `ประสบการณ์จากผู้เรียนคลาสสด ${originText} ที่ครูทีมเคยสอน ก่อนพัฒนามาเป็นคอร์สออนไลน์นี้`;
  section.hidden = reviews.length === 0;
}

if (typeof document !== 'undefined') loadPublicReviews().then(reviews => renderReviews(document, reviews));
