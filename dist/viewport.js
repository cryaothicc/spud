(() => {
  const root = document.documentElement;
  const touch = matchMedia('(pointer: coarse)');
  const state = window.PotatoViewport = { needsRotation: false };

  function fit() {
    const width = root.clientWidth;
    const height = window.innerHeight;
    const compact = touch.matches || Math.min(width, height) <= 520 || width <= 760;
    const wasPortrait = state.needsRotation;
    state.needsRotation = compact && height >= width;
    root.classList.toggle('rotate-device', state.needsRotation);
    root.classList.toggle('compact-game', compact && !state.needsRotation);
    document.querySelector('.site-wrap').inert = state.needsRotation;
    document.querySelector('.mobile-notice').inert = !state.needsRotation;
    document.querySelector('#input-hint').textContent = touch.matches
      ? 'Drag to aim · lift to drop'
      : 'Move to aim · click to drop';

    const scale = Math.min((width - 24) / 1180, (height - 16) / 800, 1.5);
    root.style.setProperty('--ui-scale', String(Math.max(0.1, scale)));
    if (wasPortrait !== state.needsRotation) {
      window.dispatchEvent(new Event('potato:viewport'));
    }
  }

  fit();
  window.addEventListener('resize', fit);
  touch.addEventListener('change', fit);
})();
