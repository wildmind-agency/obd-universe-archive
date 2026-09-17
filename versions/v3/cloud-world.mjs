const cloudVideo = new URL('./assets/clouds/pastel-cloud-journey.mp4', import.meta.url).href;

const creations = [
  { id: 'ink-ninja', file: 'ink-ninja-v2.webp', chapter: '.hero', layer: 'L1', movement: 'peek' },
  { id: 'product-vessel', file: 'product-vessel.webp', chapter: '.scene-product', layer: 'L3', movement: 'turn' },
  { id: 'system-gyroscope', file: 'system-gyroscope.webp', chapter: '.scene-system', layer: 'L1', movement: 'assemble' },
  { id: 'distant-ufo', file: 'distant-ufo.webp', chapter: '.scene-system', layer: 'L1', movement: 'dart' },
  { id: 'basketball-breakthrough', file: 'basketball-breakthrough.webp', chapter: '.scene-crazy', layer: 'L3', movement: 'impact' },
  { id: 'cinema-sailcraft', file: 'cinema-sailcraft.webp', chapter: '.scene-cinema', layer: 'L1', movement: 'glide' },
  { id: 'cyber-llama', file: 'cyber-llama.webp', chapter: '.scene-creator', layer: 'L3', movement: 'land' },
  { id: 'universe-terrarium', file: 'universe-terrarium.webp', chapter: '.scene-universe', layer: 'L3', movement: 'grow' }
];

const cloudPockets = [
  { id: 'hero', chapter: '.hero', driftX: 20, driftY: -16, pointer: 8 },
  { id: 'product', chapter: '.scene-product', driftX: -24, driftY: 18, pointer: 10 },
  { id: 'system', chapter: '.scene-system', driftX: 26, driftY: -14, pointer: 8, flip: true },
  { id: 'cinema', chapter: '.scene-cinema', driftX: -28, driftY: 16, pointer: 10, flip: true }
];

// One decoder for L0. Wisps are independent, alpha-masked L2 surfaces.
export function initCloudWorld({ host, getPaused = () => false, pauseElement } = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('Cloud host required');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const constrained = Boolean(navigator.connection?.saveData);
  const video = document.createElement('video');
  video.className = 'v3-atmosphere';
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'metadata' });
  video.setAttribute('aria-hidden', 'true');
  const source = document.createElement('source');
  source.type = 'video/mp4';
  video.append(source);
  // Keep the two inexpensive CSS cloud planes from the pastel preview over
  // the single video. Their differing drift makes the atmosphere evolve.
  host.prepend(video);
  const chapters = [...document.querySelectorAll('.hero, .scene')];
  const objects = creations.map(spec => {
    const chapter = document.querySelector(spec.chapter);
    if (!chapter) throw new Error(`Missing V3 chapter for ${spec.id}`);
    const element = document.createElement('span');
    element.className = `v3-creation v3-creation--${spec.id}`;
    element.dataset.layer = spec.layer;
    element.dataset.assetId = spec.id;
    element.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = new URL(`./assets/objects/${spec.file}`, import.meta.url).href;
    img.alt = '';
    img.decoding = 'async';
    img.loading = spec.id === 'ink-ninja' ? 'eager' : 'lazy';
    element.append(img);
    let effect = null;
    if (spec.id === 'basketball-breakthrough') {
      effect = document.createElement('span');
      effect.className = 'v3-impact-stage';
      effect.dataset.layer = 'L3';
      const membrane = document.createElement('i');
      membrane.className = 'v3-impact-membrane';
      membrane.setAttribute('aria-hidden', 'true');
      effect.append(membrane);
      for (let index = 1; index <= 6; index++) {
        const shard = document.createElement('i');
        shard.className = `v3-shard v3-shard-${index}`;
        shard.setAttribute('aria-hidden', 'true');
        effect.append(shard);
      }
      const impactWord = document.createElement('span');
      impactWord.className = 'v3-impact-word';
      impactWord.lang = 'en';
      impactWord.textContent = 'SWOOSH!';
      effect.append(impactWord);
      chapter.append(effect);
    }
    chapter.append(element);
    return { ...spec, chapter, element, effect };
  });
  const wisps = cloudPockets.map(spec => {
    const chapter = document.querySelector(spec.chapter);
    const wisp = document.createElement('div');
    wisp.className = `v3-wisp v3-wisp--${spec.id}`;
    wisp.setAttribute('aria-hidden', 'true');
    wisp.dataset.layer = 'L2';
    chapter.append(wisp);
    return { ...spec, chapter, wisp };
  });
  chapters.forEach((chapter) => {
    chapter.classList.add('v3-chapter');
    chapter.querySelectorAll('.hero-copy,.hero-avatar,.scene-copy,.film-composition').forEach(el => el.dataset.layer = 'L1');
    chapter.querySelectorAll('.floater').forEach(el => el.dataset.layer = 'L3');
  });
  const parallax = [...document.querySelectorAll('.v3-chapter [data-depth]')];
  let raf = 0;
  let failed = false;
  let started = false;
  let pointerX = 0;
  let pointerY = 0;
  const fallback = () => reduced.matches || constrained || failed;
  const paused = () => fallback() || getPaused() || document.hidden;
  function sync() {
    document.body.classList.toggle('v3-static', fallback());
    if (paused()) video.pause();
    else {
      if (!started) { source.src = cloudVideo; video.load(); started = true; }
      video.play().catch((error) => {
        if (error.name !== 'AbortError') { failed = true; sync(); }
      });
    }
    request();
  }
  function render() {
    raf = 0;
    const moving = !paused();
    const middle = innerHeight * .5;
    const limit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--progress', (scrollY / limit).toFixed(4));
    if ((getPaused() || document.hidden) && !fallback()) return; // Preserve every layer's current pose.
    const sceneOffsets = new Map();
    const sceneProgress = new Map();
    chapters.forEach(chapter => {
      const rect = chapter.getBoundingClientRect();
      const travel = Math.max(-1, Math.min(1, (middle - (rect.top + rect.height * .5)) / (middle + rect.height * .5)));
      sceneOffsets.set(chapter, travel);
      sceneProgress.set(chapter, Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height))));
    });
    wisps.forEach(({ chapter, wisp, driftX, driftY, pointer, flip }) => {
      const travel = sceneOffsets.get(chapter);
      // Small chapter-local clouds move in depth without crossing key copy.
      wisp.style.transform = moving
        ? `translate3d(${(travel * driftX + pointerX * pointer).toFixed(1)}px, ${(travel * driftY + pointerY * pointer * .7).toFixed(1)}px, 0) scaleX(${flip ? -1 : 1})`
        : `translate3d(0,0,0) scaleX(${flip ? -1 : 1})`;
    });
    parallax.forEach(el => {
      const chapter = el.closest('.v3-chapter');
      const travel = sceneOffsets.get(chapter) || 0;
      const mobile = innerWidth <= 720;
      el.style.setProperty('--parallax', `${moving ? (travel * Number(el.dataset.depth) * (mobile ? 230 : 460)).toFixed(1) : 0}px`);
    });
    objects.forEach(({ chapter, element, movement, effect }) => {
      const p = fallback() ? .52 : sceneProgress.get(chapter);
      const mobile = innerWidth <= 720;
      const shift = mobile ? .5 : 1;
      let x = 0, y = 0, scale = 1, angle = 0, alpha = 1;
      if (movement === 'peek') {
        const rise = Math.max(0, Math.min(1, (p - .51) / .2));
        const retreat = Math.max(0, Math.min(1, (p - .79) / .13));
        y = (36 - 68 * rise + 68 * retreat) * shift;
        alpha = Math.min(1, rise * 2) * (1 - retreat);
        element.style.zIndex = p > .7 && p < .8 ? '3' : '1';
      } else if (movement === 'turn') {
        y = (1 - p) * 24 * shift; angle = 7 - p * 11;
      } else if (movement === 'assemble') {
        y = (1 - p) * 18 * shift; angle = -8 + p * 10;
      } else if (movement === 'dart') {
        x = (p * 170 - 70) * shift; y = (p * p * -70 + p * 15) * shift;
        angle = -7 + p * 13; alpha = p > .43 && p < .64 ? .25 : 1;
      } else if (movement === 'impact') {
        const hit = Math.max(0, Math.min(1, (p - .24) / .48));
        x = (-55 + 125 * hit * hit) * shift;
        y = (30 - 55 * hit) * shift;
        scale = .56 + 1.15 * hit * hit;
        angle = -19 + 35 * hit;
        effect.style.setProperty('--impact', Math.max(0, Math.min(1, (p - .43) / .2)).toFixed(3));
      } else if (movement === 'glide') {
        x = (p * 88 - 42) * shift; y = (p * -24 + 14) * shift;
        angle = -4 + p * 6; scale = 1 - Math.max(0, p - .75) * .36;
      } else if (movement === 'land') {
        y = Math.max(0, 1 - p / .44) * -22 * shift;
        angle = p < .4 ? 3 * (1 - p / .4) : 0;
      } else if (movement === 'grow') {
        scale = .88 + Math.min(1, p / .5) * .12;
        angle = 5 * (1 - Math.min(1, p / .55));
      }
      element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${angle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      element.style.opacity = alpha.toFixed(3);
    });
  }
  function request() { if (!raf) raf = requestAnimationFrame(render); }
  function onPause() { sync(); }
  function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    pointerX = event.clientX / innerWidth * 2 - 1;
    pointerY = event.clientY / innerHeight * 2 - 1;
    request();
  }
  function onPointerLeave() { pointerX = pointerY = 0; request(); }
  video.addEventListener('error', () => { failed = true; sync(); });
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  pauseElement?.addEventListener('click', onPause);
  sync();
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', request);
    removeEventListener('resize', request);
    removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    pauseElement?.removeEventListener('click', onPause);
    video.pause(); source.removeAttribute('src'); video.load(); video.remove();
    wisps.forEach(({ wisp }) => wisp.remove());
    objects.forEach(({ element, effect }) => { element.remove(); effect?.remove(); });
  };
}
