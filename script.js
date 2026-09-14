(() => {
  'use strict';
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 760px)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const portrait = document.querySelector('[data-tilt]');
  const portraitScene = portrait && portrait.closest('[data-parallax-scene]');
  const tilt = { x: 3, y: -8, targetX: 3, targetY: -8 };
  const control = document.querySelector('.motion-toggle');
  const progress = document.querySelector('.scroll-progress');
  const marquee = document.querySelector('[data-marquee]');
  const layers = [...document.querySelectorAll('[data-parallax]')].map(el => ({
    el, anchor: el.closest('[data-parallax-scene]') || el.parentElement,
    speed: Number(el.dataset.parallax) || 0
  }));
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  let userPaused = false;
  try { userPaused = localStorage.getItem('furue-motion-paused') === 'true'; } catch (_) {}
  let frame = 0;
  let observer;
  const paused = () => preference.matches || userPaused;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function render() {
    frame = 0;
    if (paused()) return;
    const height = window.innerHeight;
    const y = window.scrollY;
    const scrollable = root.scrollHeight - height;
    const factor = narrow.matches ? 0.5 : 1;
    let settling = false;
    // Read stable parent positions together before applying transforms.
    const positions = new Map();
    for (const layer of layers) {
      if (!positions.has(layer.anchor)) positions.set(layer.anchor, layer.anchor.getBoundingClientRect());
    }
    const offsets = layers.map(layer => {
      const box = positions.get(layer.anchor);
      if (box.bottom < -160 || box.top > height + 160) return null;
      const distance = height / 2 - (box.top + box.height / 2);
      return clamp(distance * layer.speed * factor, -60 * factor, 60 * factor);
    });
    if (progress) progress.style.transform = `scaleX(${scrollable > 0 ? clamp(y / scrollable, 0, 1) : 0})`;
    layers.forEach((layer, index) => {
      if (offsets[index] !== null) layer.el.style.setProperty('--motion-y', `${offsets[index].toFixed(1)}px`);
    });
    if (portrait && pointer.matches && !narrow.matches) {
      tilt.x += (tilt.targetX - tilt.x) * 0.12;
      tilt.y += (tilt.targetY - tilt.y) * 0.12;
      portrait.style.setProperty('--tilt-x', `${tilt.x.toFixed(2)}deg`);
      portrait.style.setProperty('--tilt-y', `${tilt.y.toFixed(2)}deg`);
      settling = Math.abs(tilt.targetX - tilt.x) + Math.abs(tilt.targetY - tilt.y) > 0.025;
    }
    if (marquee) marquee.style.setProperty('--motion-x', `${-(y * 0.13 * factor % 540).toFixed(1)}px`);
    if (settling) schedule();
  }
  function schedule() {
    if (!frame && !paused() && !document.hidden) frame = requestAnimationFrame(render);
  }
  function applyPreference() {
    const stopped = paused();
    root.classList.toggle('motion-paused', stopped);
    if (control) {
      control.hidden = false;
      control.disabled = preference.matches;
      control.textContent = preference.matches ? '動き：端末設定でオフ' : userPaused ? '動きを再開する' : '動きを止める';
      control.setAttribute('aria-pressed', String(stopped));
    }
    if (stopped) {
      cancelAnimationFrame(frame); frame = 0;
      layers.forEach(({ el }) => el.style.removeProperty('--motion-y'));
      if (portrait) {
        portrait.style.removeProperty('--tilt-x');
        portrait.style.removeProperty('--tilt-y');
      }
      if (marquee) marquee.style.removeProperty('--motion-x');
      if (progress) progress.style.transform = 'scaleX(0)';
      reveals.forEach(el => el.classList.add('is-visible'));
      if (observer) observer.disconnect();
    } else schedule();
  }
  // Content remains readable without JavaScript or IntersectionObserver.
  if (!paused() && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible');
      else { el.classList.add('will-reveal'); observer.observe(el); }
    });
  }
  if (control) control.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('furue-motion-paused', String(userPaused)); } catch (_) {}
    applyPreference();
  });
  // Track the stable scene, not its moving photograph, to avoid feedback or wobble.
  if (portraitScene) {
    portraitScene.addEventListener('pointermove', event => {
      if (paused() || narrow.matches || !pointer.matches) return;
      const box = portraitScene.getBoundingClientRect();
      const x = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1);
      const y = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1);
      tilt.targetX = 3 - y * 4;
      tilt.targetY = -8 + x * 6;
      schedule();
    }, { passive: true });
    portraitScene.addEventListener('pointerleave', () => {
      tilt.targetX = 3; tilt.targetY = -8; schedule();
    });
  }
  if (preference.addEventListener) preference.addEventListener('change', applyPreference);
  else preference.addListener(applyPreference);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('beforeprint', () => reveals.forEach(el => el.classList.add('is-visible')));
  applyPreference();
})();
