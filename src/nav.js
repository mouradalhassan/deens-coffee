const headerH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;

export function initNav() {
  const header = document.getElementById('site-header');
  const burger = document.getElementById('nav-burger');
  const panel = document.getElementById('mobile-nav');
  const links = Array.from(document.querySelectorAll('.nav-link, .mobile-nav__link'));

  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.classList.toggle('nav-open', open);
    document.body.classList.toggle('nav-open', open);
  };

  burger.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth >= 900) setOpen(false); });

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = Math.round(el.getBoundingClientRect().top + window.scrollY - headerH());
    window.scrollTo({ top, behavior: 'smooth' });
  };

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      e.preventDefault();
      if (window.__ensureMenu) window.__ensureMenu();
      const wasOpen = panel.classList.contains('is-open');
      setOpen(false);
      if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
      else if (wasOpen) setTimeout(() => goTo(id), 60);
      else goTo(id);
    });
  });

  // highlight current section
  const secs = ['menu', 'story', 'gallery', 'order'].map((i) => document.getElementById(i)).filter(Boolean);
  const update = () => {
    header.classList.toggle('is-solid', window.scrollY > 40);
    const y = window.scrollY + headerH() + window.innerHeight * 0.35;
    let cur = '';
    let best = -1;
    secs.forEach((s) => { if (s.offsetTop <= y && s.offsetTop > best) { best = s.offsetTop; cur = s.id; } });
    links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + cur));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}
