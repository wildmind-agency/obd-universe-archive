const cloudVideo = new URL('./assets/clouds/clouds-time-lapse.webm', import.meta.url).href;

function createVideo(layer) {
  const video = document.createElement('video');
  video.className = `cw-video cw-${layer}`;
  video.src = cloudVideo;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-hidden', 'true');
  return video;
}

/**
 * Adds real cloud footage at three independent depths.
 * `getPaused` should return the existing experience pause state.
 */
export function initCloudWorld({ host, getPaused = () => false, pauseElement } = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('initCloudWorld requires a host HTMLElement.');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 720px)');
  const saveData = Boolean(navigator.connection?.saveData);
  const stage = document.createElement('div');
  const midground = document.createElement('div');
  const foreground = document.createElement('div');
  const videos = ['back', 'mid', 'edge'].map(createVideo);
  let scrollFrame = 0;
  let playbackFailed = false;

  host.classList.add('cw-world');
  host.replaceChildren(stage);
  stage.className = 'cw-stage';
  stage.append(videos[0]);
  midground.className = 'cw-midground';
  midground.append(videos[1]);
  foreground.className = 'cw-foreground';
  foreground.append(videos[2]);
  document.body.append(midground, foreground);

  const isFallback = () => reduced.matches || saveData || playbackFailed;
  const isPaused = () => document.hidden || isFallback() || Boolean(getPaused());
  function sync() {
    const paused = isPaused();
    host.classList.toggle('cw-fallback', isFallback());
    host.classList.toggle('cw-paused', paused);
    midground.hidden = foreground.hidden = isFallback() || mobile.matches;
    videos.forEach((video, index) => {
      if (paused || (mobile.matches && index > 0)) video.pause();
      else video.play().catch(error => {
        if (error.name === 'AbortError') return;
        playbackFailed = true;
        sync();
      });
    });
  }
  function updateDepth() {
    scrollFrame = 0;
    const limit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--cw-scroll', (scrollY / limit).toFixed(4));
  }
  function requestDepth() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateDepth);
  }

  const watchMotion = new MutationObserver(sync);
  watchMotion.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('scroll', requestDepth, { passive: true });
  addEventListener('resize', requestDepth, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  mobile.addEventListener('change', sync);
  pauseElement?.addEventListener('click', sync);
  updateDepth();
  sync();

  return function destroy() {
    cancelAnimationFrame(scrollFrame);
    watchMotion.disconnect();
    removeEventListener('scroll', requestDepth);
    removeEventListener('resize', requestDepth);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    mobile.removeEventListener('change', sync);
    pauseElement?.removeEventListener('click', sync);
    midground.remove();
    foreground.remove();
    host.replaceChildren();
    host.classList.remove('cw-world', 'cw-fallback', 'cw-paused');
  };
}

export const cloudWorldAsset = cloudVideo;
