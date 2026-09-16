const SOURCES = Object.freeze({
  'first-class': { label: 'First Class · รุ่นแรก', person: 'ผู้เรียน First Class' },
  'the-dent': { label: 'The Dent · คลาสสด', person: 'ผู้เรียน The Dent' },
});
const text = value => typeof value === 'string' ? value.trim() : '';
const validScore = value => Number.isInteger(value) && value >= 1 && value <= 10;
const formattedScore = value => String(Math.round(value * 100) / 100);

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
      // Workshop permission covers testimonial text only, not its private scores.
      score: firstClass && validScore(review.score) ? review.score : null,
    }];
  });
}

export function summarizeReviews(reviews) {
  const scored = reviews.filter(review => review.sourceId === 'first-class' && validScore(review.score));
  if (!scored.length) return null;
  const averageScore = scored.reduce((sum, review) => sum + review.score, 0) / scored.length;
  return { sourceId: 'first-class', count: scored.length, averageScore, starsOutOf5: averageScore / 2 };
}

export async function loadPublicReviews(fetcher = fetch, { timeoutMs = 8000 } = {}) {
  const endpoints = [
    ['first-class', '/api/first-class-review?public=1'],
    ['workshop', '/api/course-reviews?public=1'],
  ];
  const groups = await Promise.all(endpoints.map(async ([kind, url]) => {
    const controller = new AbortController();
    let timer;
    try {
      // Race the whole response, including a body that may stall after HTTP 200.
      const deadline = new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve([]); }, timeoutMs); });
      const request = (async () => {
        const response = await fetcher(url, {
          credentials: 'omit', cache: 'no-store', headers: { accept: 'application/json' }, signal: controller.signal,
        });
        return response.ok ? normalizeReviews(await response.json(), kind) : [];
      })();
      return await Promise.race([request, deadline]);
    } catch { return []; }
    finally { clearTimeout(timer); }
  }));
  // The score represents every eligible public First Class response, not the
  // smaller editorial selection of cards shown below it.
  const summary = summarizeReviews(groups[0]);
  // Interleave available sources without inventing reviews when a source is empty.
  const reviews = Array.from({ length: Math.max(...groups.map(group => group.length)) }, (_, i) => groups.flatMap(group => group[i] ? [group[i]] : [])).flat().slice(0, 6);
  return { reviews, summary };
}

function ratingElement(document, score) {
  const rating = document.createElement('span'); rating.className = 'student-review-rating';
  rating.setAttribute('role', 'img');
  rating.setAttribute('aria-label', `คะแนน ${formattedScore(score)} จาก 10 เทียบเป็น ${formattedScore(score / 2)} จาก 5 ดาว`);
  const stars = document.createElement('span'); stars.className = 'student-review-stars'; stars.setAttribute('aria-hidden', 'true');
  const base = document.createElement('span'); base.className = 'student-review-stars-base'; base.textContent = '★★★★★';
  const fill = document.createElement('span'); fill.className = 'student-review-stars-fill'; fill.textContent = '★★★★★'; fill.style.width = `${score * 10}%`;
  stars.append(base, fill);
  const value = document.createElement('span'); value.className = 'student-review-score'; value.textContent = `${formattedScore(score)}/10`; value.setAttribute('aria-hidden', 'true');
  rating.append(stars, value);
  return rating;
}

export function renderReviews(document, reviews, summary = null) {
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
    card.append(source);
    if (review.sourceId === 'first-class' && validScore(review.score)) card.append(ratingElement(document, review.score));
    card.append(quote, caption); list.append(card);
  }
  const summaryNode = document.getElementById('student-review-summary');
  if (summaryNode) {
    summaryNode.replaceChildren();
    const showSummary = summary?.sourceId === 'first-class' && Number.isInteger(summary.count) && summary.count > 0
      && Number.isFinite(summary.averageScore) && summary.averageScore >= 1 && summary.averageScore <= 10;
    summaryNode.hidden = !showSummary;
    if (showSummary) {
      const copy = document.createElement('p'); copy.className = 'student-review-summary-copy';
      copy.textContent = `คะแนนเฉลี่ยจากรีวิวที่อนุญาตให้เผยแพร่ ${summary.count} รีวิว · First Class รุ่นแรก (คลาสสดที่ผ่านมา) · ดาวแปลงจากคะแนนเต็ม 10`;
      summaryNode.append(ratingElement(document, summary.averageScore), copy);
    }
  }
  const origins = [...new Set(reviews.map(review => review.sourceId))];
  const originText = origins.map(id => id === 'first-class' ? 'First Class รุ่นแรก' : 'The Dent').join(' และ ');
  const context = document.getElementById('student-review-context');
  if (context) context.textContent = `ประสบการณ์จากผู้เรียนคลาสสด ${originText} ที่ครูทีมเคยสอน ก่อนพัฒนามาเป็นคอร์สออนไลน์นี้`;
  section.hidden = reviews.length === 0;
}

if (typeof document !== 'undefined') loadPublicReviews().then(({ reviews, summary }) => renderReviews(document, reviews, summary));
