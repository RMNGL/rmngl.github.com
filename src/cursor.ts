export function initCustomCursor(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (reduced || coarse) return () => {};

  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  if (!dot || !ring) return () => {};

  document.body.classList.add("custom-cursor");

  let x = 0;
  let y = 0;
  let ringX = 0;
  let ringY = 0;
  let raf = 0;

  const onMove = (e: PointerEvent) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  };

  const tick = () => {
    ringX += (x - ringX) * 0.18;
    ringY += (y - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    raf = requestAnimationFrame(tick);
  };

  const hoverables = "a, button, .btn, .work-card, .play-chip, .chaos-tags li";
  document.querySelectorAll(hoverables).forEach((el) => {
    el.addEventListener("pointerenter", () => ring.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => ring.classList.remove("is-hover"));
  });

  window.addEventListener("pointermove", onMove);
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    document.body.classList.remove("custom-cursor");
  };
}
