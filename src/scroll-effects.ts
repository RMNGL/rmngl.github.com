function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

export function initScrollEffects(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroPin = document.querySelector(".hero-pin");
  const heroType = document.getElementById("hero-type");
  const scrollTransforms = document.querySelectorAll<HTMLElement>("[data-scroll-transform]");
  const scrollSlow = document.querySelectorAll<HTMLElement>("[data-scroll-slow]");

  if (reduced) return () => {};

  let raf = 0;

  const update = () => {
    raf = 0;

    if (heroPin && heroType) {
      const rect = heroPin.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? clamp(0, 1, -rect.top / scrollable) : 0;

      const scale = 1 - progress * 0.22;
      const y = progress * -80;
      const rotate = progress * -3;
      heroType.style.transform = `translate3d(0, ${y}px, 0) scale(${scale}) rotate(${rotate}deg)`;
      heroType.style.opacity = String(1 - progress * 0.35);

      scrollTransforms.forEach((el, i) => {
        const drift = (i === 0 ? -1 : 1) * progress * 12;
        el.style.transform = `translate3d(${drift}vw, ${progress * -30}px, 0)`;
      });
    }

    scrollSlow.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = clamp(-40, 40, center * 0.08);
      el.style.transform = `translate3d(${shift}px, 0, 0)`;
    });
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}
