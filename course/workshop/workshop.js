(() => {
  const section = document.getElementById('reviews');
  const list = document.getElementById('review-list');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  async function loadReviews() {
    try {
      const response = await fetch('/api/course-reviews?public=1', {
        credentials: 'omit', cache: 'no-store', headers: { accept: 'application/json' }, signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data?.ok || !Array.isArray(data.reviews)) return;
      for (const review of data.reviews) {
        if (!review || !['anonymous', 'named'].includes(review.consent)
          || typeof review.testimonial !== 'string' || !review.testimonial.trim()) continue;
        const figure = document.createElement('figure'); figure.className = 'review';
        const quote = document.createElement('blockquote'); quote.textContent = review.testimonial.trim();
        const caption = document.createElement('figcaption');
        const name = document.createElement('b');
        name.textContent = review.consent === 'named' && typeof review.displayName === 'string' && review.displayName.trim()
          ? review.displayName.trim() : 'ผู้เรียน Workshop · ไม่ระบุชื่อ';
        caption.append(name);
        if (review.consent === 'named' && typeof review.role === 'string' && review.role.trim()) {
          const role = document.createElement('span'); role.textContent = review.role.trim(); caption.append(role);
        }
        figure.append(quote, caption); list.append(figure);
      }
      section.hidden = !list.children.length;
    } catch { section.hidden = true; list.replaceChildren(); }
    finally { clearTimeout(timer); }
  }
  loadReviews();
})();
