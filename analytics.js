(() => {
  'use strict';
  if (!window.gtag || !('IntersectionObserver' in window)) return;

  // This is one page. Record which major sections enter view, once per visit.
  const sectionIds = ['about', 'merit', 'fee', 'support', 'towns', 'kids', 'join'];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      window.gtag('event', `view_${entry.target.id}`);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -30% 0px' });

  for (const id of sectionIds) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
})();
