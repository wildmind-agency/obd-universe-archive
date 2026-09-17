// Replace null with an approved local media path or HTTPS video URL.
// Only direct video files here; YouTube links need an intentional embed implementation.
export const media = {
  showreel: null,
  system: null,
  product: null,
  crazy: null,
  cinema: null,
  creator: null,
  universe: null,
};

// Set only after the real 30-minute booking flow has been checked.
export const bookingUrl = null;

export function safeUrl(value, base, localAllowed = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    const origin = new URL(base);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:') return url.href;
    if (localAllowed && url.protocol === 'http:' && url.origin === origin.origin) return url.href;
  } catch { /* Invalid configuration stays unavailable in the preview. */ }
  return null;
}

if (typeof document !== 'undefined') {
  const serviceNames = {
    system: 'סרטוני הסבר למערכות טכנולוגיות',
    product: 'שחזור מדויק של מוצרים',
    crazy: 'סרטונים סוריאליסטיים',
    cinema: 'סרטים בשפה קולנועית',
    creator: 'דמויות ומשפיענים דיגיטליים',
    universe: 'עולם שלם למותג',
  };
  document.querySelectorAll('article.work').forEach(card => {
    const label = document.createElement('p');
    label.className = 'audience';
    label.textContent = serviceNames[card.querySelector('[data-media]').dataset.media];
    card.querySelector('.work-top').after(label);
  });
  const dialog = document.querySelector('.booking-dialog');
  let opener = null;
  document.querySelectorAll('[data-book]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      dialog.showModal();
    });
  });
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());

  const booking = safeUrl(bookingUrl, document.baseURI);
  if (booking) {
    const link = dialog.querySelector('.booking-link');
    link.href = booking;
    link.hidden = false;
    dialog.querySelector('.booking-unavailable').hidden = true;
  }

  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-category]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = category !== 'all' && category !== card.dataset.category; });
    document.querySelector('.work-grid').classList.toggle('filtered', category !== 'all');
    document.querySelector('#filter-status').textContent = `${cards.filter(card => !card.hidden).length} אפשרויות מוצגות`;
  }));

  for (const slot of document.querySelectorAll('[data-media]')) {
    const source = safeUrl(media[slot.dataset.media], document.baseURI, true);
    if (!source) continue;
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', slot.dataset.media === 'showreel' ? 'השואוריל של אור בן דוד' : slot.closest('article').querySelector('h3').textContent);
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
    });
    video.addEventListener('error', () => {
      video.hidden = true;
      slot.classList.remove('has-media');
      const message = document.createElement('p');
      message.className = 'media-error';
      message.setAttribute('role', 'status');
      message.textContent = 'הסרטון לא נטען. אפשר לראות עבודות נוספות בתיק העבודות שבתחתית העמוד.';
      slot.append(message);
    }, { once: true });
    video.src = source;
    slot.append(video);
    slot.classList.add('has-media');
    slot.removeAttribute('aria-label');
  }
}
