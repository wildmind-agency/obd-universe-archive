import { initCloudWorld } from './cloud-world.mjs?v=pocket1';

// DRAFT CONTENT: swap sources/posters here; all six placements are provisional.
// No analytics, lead delivery, email or scheduling service is connected.
export const media = {
  product: { src: 'https://video.wixstatic.com/video/347b50_658d196a20e7455d83935eafd4cd29d1/360p/mp4/file.mp4', poster: 'https://static.wixstatic.com/media/347b50_658d196a20e7455d83935eafd4cd29d1f000.jpg' },
  system: { src: 'https://video.wixstatic.com/video/347b50_aff2fab61f2641398ab1430dc5597f60/360p/mp4/file.mp4' },
  crazy: { src: 'https://video.wixstatic.com/video/347b50_0e3d89550ccf4302a38479f12a818ebd/360p/mp4/file.mp4', poster: 'https://static.wixstatic.com/media/347b50_0e3d89550ccf4302a38479f12a818ebdf000.jpg' },
  cinema: { src: 'https://video.wixstatic.com/video/347b50_1a86bb19dd1d4fac98ba7c00af59767a/360p/mp4/file.mp4', poster: 'https://static.wixstatic.com/media/347b50_1a86bb19dd1d4fac98ba7c00af59767af000.jpg' },
  creator: { src: 'https://video.wixstatic.com/video/347b50_2190b711f5894699bc44de9dc3fcaa3f/360p/mp4/file.mp4' },
  universe: { src: 'https://video.wixstatic.com/video/347b50_0e3d89550ccf4302a38479f12a818ebd/360p/mp4/file.mp4', poster: 'https://static.wixstatic.com/media/347b50_0e3d89550ccf4302a38479f12a818ebdf000.jpg' }
};

export function safeUrl(value, base, localAllowed = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    const origin = new URL(base);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:') return url.href;
    if (localAllowed && url.protocol === 'http:' && url.origin === origin.origin) return url.href;
  } catch { /* Invalid media configuration remains unavailable. */ }
  return null;
}

export function validateLead(name, email) {
  const errors = {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) errors.name = 'כדאי למלא שם באורך של 2 תווים לפחות.';
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'נראה שכתובת המייל אינה מלאה. כדאי לבדוק אותה.';
  return errors;
}

export function validateQuestionnaire(values) {
  const errors = {};
  if (!values.business?.trim() || values.business.length > 160) errors.business = 'נשמח למשפט קצר על העסק או המוצר.';
  if (!['explain', 'sell', 'brand', 'launch', 'explore'].includes(values.goal)) errors.goal = 'כדאי לבחור מטרה, גם אם הכיוון עוד לא סופי.';
  if (!values.audience?.trim() || values.audience.length > 200) errors.audience = 'מי הקהל שצריך לראות את הסרט?';
  return errors;
}


export function shouldPlay({ visible, hidden, stopped, motion, requested, failed }) {
  return Boolean(visible && !hidden && !stopped && !failed && (motion || requested));
}

if (typeof document !== 'undefined') {
  // Preview only: no network submission, persistence, email or booking side effect.
  const panels = { lead: document.querySelector('#lead-panel'), questions: document.querySelector('#questions-panel'), complete: document.querySelector('#complete-panel') };
  const leadForm = document.querySelector('#lead-form');
  const questionnaire = document.querySelector('#questionnaire-form');
  function showStep(step) {
    Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== step; });
    document.querySelectorAll('[data-step-label]').forEach(label => {
      label.classList.toggle('current', label.dataset.stepLabel === step);
      if (label.dataset.stepLabel === step) label.setAttribute('aria-current', 'step');
      else label.removeAttribute('aria-current');
    });
    const focus = step === 'lead' ? leadForm.elements.name : document.querySelector(step === 'questions' ? '#questions-title' : '#complete-title');
    focus.focus({ preventScroll: true });
    document.querySelector('.form-card').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function reportErrors(form, errors, names) {
    names.forEach(name => {
      const field = form.elements[name];
      field.setAttribute('aria-invalid', String(Boolean(errors[name])));
      document.getElementById(field.getAttribute('aria-describedby')).textContent = errors[name] || '';
    });
    const first = Object.keys(errors)[0];
    document.querySelector('#form-status').textContent = first ? 'יש פרטים שצריך להשלים בטופס.' : '';
    if (first) form.elements[first].focus();
    return !first;
  }
  leadForm.addEventListener('submit', event => {
    event.preventDefault();
    const errors = validateLead(leadForm.elements.name.value, leadForm.elements.email.value);
    if (reportErrors(leadForm, errors, ['name', 'email'])) showStep('questions');
  });
  questionnaire.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(questionnaire));
    if (reportErrors(questionnaire, validateQuestionnaire(values), ['business', 'goal', 'audience'])) showStep('complete');
  });
  document.querySelector('[data-back]').addEventListener('click', () => showStep('lead'));
  document.querySelector('[data-edit]').addEventListener('click', () => showStep('questions'));


  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const motionButton = document.querySelector('#motion-toggle');
  let motion = !reduced.matches && !saveData;
  const videoStates = new Map();
  const depthElements = [...document.querySelectorAll('[data-depth]')];
  const root = document.documentElement;
  let frame = 0;

  function updateDepth() {
    frame = 0;
    const pageHeight = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--progress', pageHeight > 0 ? Math.min(1, scrollY / pageHeight) : 0);
    for (const element of depthElements) {
      const rect = element.getBoundingClientRect();
      // Keep parallax small and bounded; read layout once per scroll frame.
      const offset = motion ? Math.max(-85, Math.min(85, (innerHeight / 2 - (rect.top + rect.height / 2)) * Number(element.dataset.depth))) : 0;
      element.style.setProperty('--parallax', offset.toFixed(1) + 'px');
    }
  }
  function requestDepth() { if (!frame) frame = requestAnimationFrame(updateDepth); }
  addEventListener('scroll', requestDepth, { passive: true });
  addEventListener('resize', requestDepth, { passive: true });

  function updateControls(state) {
    const playing = !state.video.paused && !state.video.ended;
    state.play.textContent = playing ? 'השהיה' : 'הפעלה';
    state.play.setAttribute('aria-label', playing ? 'השהיית הסרטון' : 'הפעלת הסרטון');
    state.play.setAttribute('aria-pressed', String(playing));
    state.sound.textContent = state.video.muted ? 'קול כבוי' : 'קול פועל';
    state.sound.setAttribute('aria-label', state.video.muted ? 'הפעלת קול' : 'השתקת קול');
    state.sound.setAttribute('aria-pressed', String(!state.video.muted));
  }
  function loadVideo(state) {
    if (state.video.hasAttribute('src') || state.failed) return;
    const source = safeUrl(media[state.video.dataset.media]?.src, document.baseURI, true);
    if (!source) { showMediaError(state); return; }
    state.video.src = source;
  }
  function showMediaError(state) {
    state.failed = true;
    state.video.pause();
    state.shell.querySelector('.media-error').hidden = false;
    state.shell.querySelector('.film-controls').hidden = true;
  }
  function syncVideo(state) {
    if (shouldPlay({ ...state, hidden: document.hidden, motion })) {
      loadVideo(state);
      if (state.failed || state.pending || !state.video.paused) return;
      state.pending = true;
      state.video.play().catch(error => {
        // Browser autoplay denial has a direct user-play fallback, not false success.
        if (error.name !== 'AbortError') {
          state.stopped = true;
          if (error.name !== 'NotAllowedError') showMediaError(state);
        }
      }).finally(() => {
        state.pending = false;
        if (!shouldPlay({ ...state, hidden: document.hidden, motion })) state.video.pause();
        updateControls(state);
      });
    } else state.video.pause();
    updateControls(state);
  }
  function syncMotion() {
    document.body.classList.toggle('motion-paused', !motion);
    motionButton.setAttribute('aria-pressed', String(!motion));
    motionButton.textContent = motion ? 'Ⅱ עצירת התנועה' : '▷ הפעלת התנועה';
    videoStates.forEach(state => { state.requested = false; syncVideo(state); });
    requestDepth();
  }
  motionButton.addEventListener('click', () => { motion = !motion; syncMotion(); });
  reduced.addEventListener('change', () => { motion = !reduced.matches && !saveData; syncMotion(); });
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
    videoStates.forEach(syncVideo);
  });

  for (const video of document.querySelectorAll('video[data-media]')) {
    const shell = video.closest('.film-shell');
    const state = { video, shell, play: shell.querySelector('[data-play]'), sound: shell.querySelector('[data-sound]'), visible: false, stopped: false, requested: false, failed: false, pending: false };
    video.muted = true;
    videoStates.set(video, state);
    const poster = safeUrl(media[video.dataset.media]?.poster, document.baseURI, true);
    if (poster) video.poster = poster;
    video.addEventListener('error', () => showMediaError(state));
    ['play', 'pause', 'volumechange', 'ended'].forEach(event => video.addEventListener(event, () => updateControls(state)));
    state.play.addEventListener('click', () => {
      if (!video.paused) { state.stopped = true; state.requested = false; video.pause(); }
      else { state.stopped = false; state.requested = true; syncVideo(state); }
      updateControls(state);
    });
    state.sound.addEventListener('click', () => {
      const unmute = video.muted;
      videoStates.forEach(other => { other.video.muted = true; updateControls(other); });
      video.muted = !unmute;
      updateControls(state);
    });
  }
  if ('IntersectionObserver' in window) {
    const playbackObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = videoStates.get(entry.target);
        state.visible = entry.isIntersecting && entry.intersectionRatio >= .25;
        if (!state.visible) { state.video.muted = true; state.requested = false; }
        syncVideo(state);
      });
    }, { threshold: [0, .25, .6] });
    const loadObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const state = videoStates.get(entry.target);
        if (!saveData) loadVideo(state);
        loadObserver.unobserve(entry.target);
      });
    }, { rootMargin: '250px' });
    videoStates.forEach(state => { playbackObserver.observe(state.video); loadObserver.observe(state.video); });
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    root.classList.add('js');
  } else {
    // Native controls cover browsers without intersection observation.
    videoStates.forEach(state => {
      state.visible = true;
      state.stopped = true;
      state.video.controls = true;
      loadVideo(state);
    });
  }
  syncMotion();
  initCloudWorld({
    host: document.querySelector('#cloud-world'),
    getPaused: () => document.body.classList.contains('motion-paused'),
    pauseElement: motionButton
  });
}
