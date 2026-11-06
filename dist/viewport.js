(() => {
  const root = document.documentElement;
  const touch = matchMedia('(pointer: coarse)');

  function fit() {
    const width = root.clientWidth;
    const height = window.innerHeight;
    const compact = touch.matches || Math.min(width, height) <= 520 || width <= 760;
    const portrait = compact && height >= width;
    const wasPortraitLayout = root.classList.contains('portrait-game');
    root.classList.toggle('portrait-game', portrait);
    root.classList.toggle('compact-game', compact && !portrait);
    document.querySelector('#input-hint').textContent = touch.matches
      ? 'Drag to aim · lift to drop'
      : 'Move to aim · click to drop';

    const scale = Math.min((width - 24) / 1180, (height - 16) / 800, 1.5);
    root.style.setProperty('--ui-scale', String(Math.max(0.1, scale)));
    if (wasPortraitLayout !== portrait) {
      window.dispatchEvent(new Event('potato:viewport'));
    }
  }

  fit();
  window.addEventListener('resize', fit);
  touch.addEventListener('change', fit);
})();
