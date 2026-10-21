import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Hero pictures loaded AND decoded, so nothing pops in or janks mid-animation. */
function heroImagesReady(onProgress) {
  const imgs = Array.from(document.querySelectorAll('#hero-art img, .preloader__logo'));
  let done = 0;
  const tick = () => { done += 1; onProgress(Math.min(0.9, (done / imgs.length) * 0.9)); };
  return Promise.all(
    imgs.map((img) => {
      const loaded = img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
      return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : null)).then(tick);
    })
  );
}

/** Fonts ready (so the headline is split into lines using the real font), capped so it can never hang. */
const fontsReady = () => Promise.race([(document.fonts && document.fonts.ready) || Promise.resolve(), sleep(1500)]);

/**
 * @param ready        promise resolved once the menu / saved content is mounted
 * @param onIntroDone  called once the entrance animation has finished (heavy scroll setup goes here)
 */
export function initHero({ ready = Promise.resolve(), onIntroDone }) {
  const fill = $('#preloader-fill');
  const pct = $('#preloader-pct');
  const progress = { v: 0 };
  const setProgress = (p) =>
    gsap.to(progress, {
      v: p, duration: 0.3, overwrite: true, ease: 'power2.out',
      onUpdate: () => {
        fill.style.transform = `scaleX(${progress.v})`;
        pct.textContent = Math.round(progress.v * 100) + '%';
      },
    });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    setProgress(1);
    // two frames: let layout settle, then play on an idle main thread
    requestAnimationFrame(() => requestAnimationFrame(intro));
  };

  const everything = Promise.all([heroImagesReady(setProgress), fontsReady(), ready, sleep(300)]);
  Promise.race([everything, sleep(3500)]).then(start, start);

  function intro() {
    performance.mark('intro-start'); console.timeStamp && console.timeStamp('intro-start');
    const split = new SplitText('#hero-title', { type: 'lines', mask: 'lines', linesClass: 'hero__line' });
    const done = () => { onIntroDone && onIntroDone(); };

    if (reducedMotion()) {
      gsap.set('#preloader', { display: 'none' });
      split.revert();
      done();
      return;
    }

    // Only transform / opacity are animated: those run on the GPU and never block the main thread.
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { performance.mark('intro-end'); console.timeStamp && console.timeStamp('intro-end'); idle(); parallax(); done(); } });
    tl.to('#preloader', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' })
      .set('#preloader', { display: 'none' })
      .from('#site-header', { autoAlpha: 0, duration: 0.7, clearProps: 'opacity,visibility' }, 0.35)
      .from('.hero__arch', { autoAlpha: 0, y: 70, duration: 1.2 }, 0.35)
      .from('.hero__arch img', { scale: 1.25, duration: 1.6 }, 0.35)
      .from('.hero__ring', { scale: 0.7, autoAlpha: 0, duration: 1.2 }, 0.45)
      .from('.hero__eyebrow', { y: 18, autoAlpha: 0, duration: 0.7 }, 0.5)
      .from(split.lines, { yPercent: 110, duration: 1, stagger: 0.09 }, 0.5)
      .from('.hero__lead, .hero__ctas, .hero__perks', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.8)
      .from('.hero__card--a', { x: -50, y: 36, rotate: -14, autoAlpha: 0, duration: 1 }, 0.8)
      .from('.hero__card--b', { x: 50, y: 36, rotate: 14, autoAlpha: 0, duration: 1 }, 0.9)
      .from('.hero__badge', { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(1.7)' }, 1.0)
      .from('.hero__scroll', { autoAlpha: 0, duration: 0.7 }, 1.2);
  }

  // Gentle floating — paused whenever the hero is off-screen so it costs nothing while scrolling the menu
  function idle() {
    const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
    tl.to('.hero__card--a', { yPercent: -6, rotate: '-=2', duration: 3.2 }, 0)
      .to('.hero__card--b', { yPercent: 7, rotate: '+=2', duration: 3.8 }, 0)
      .to('.hero__bean--1, .hero__bean--3', { y: -26, rotate: -25, duration: 4.5 }, 0)
      .to('.hero__bean--2, .hero__bean--4', { y: 26, rotate: 25, duration: 5.5 }, 0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? tl.resume() : tl.pause()), { threshold: 0 }).observe($('#hero'));
    }
  }

  function parallax() {
    const art = $('#hero-art');
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const layers = gsap.utils.toArray('#hero-art [data-depth]').map((el) => ({
        depth: parseFloat(el.dataset.depth),
        x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
      }));
      $('#hero').addEventListener('pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        layers.forEach((l) => { l.x(nx * 22 * l.depth); l.y(ny * 16 * l.depth); });
      }, { passive: true });
    }
    gsap.to('#hero-copy', {
      yPercent: -18, autoAlpha: 0.15, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to(art, {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}
