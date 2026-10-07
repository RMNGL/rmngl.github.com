import "./style.css";
import { fillAsciiBand, initAsciiHero } from "./ascii-hero";
import { initCustomCursor } from "./cursor";
import { initPlayRail } from "./play-rail";
import { initScrollEffects } from "./scroll-effects";

const canvas = document.getElementById("ascii-canvas");
const yearEl = document.getElementById("year");
const asciiBand = document.getElementById("ascii-band");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const cleanups: (() => void)[] = [];

if (canvas instanceof HTMLCanvasElement) {
  cleanups.push(initAsciiHero({ canvas, text: "RMNGL" }));
}

cleanups.push(initCustomCursor());
cleanups.push(initScrollEffects());
cleanups.push(initPlayRail());

if (asciiBand) {
  fillAsciiBand(asciiBand, "RMNGL·REMINGLE·", 8);
}

const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
);

revealEls.forEach((el) => observer.observe(el));

const corporate = document.querySelector(".corporate");
const corporateObserver = new IntersectionObserver(
  ([entry]) => {
    document.body.classList.toggle("is-corporate", entry?.isIntersecting ?? false);
  },
  { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
);

if (corporate) corporateObserver.observe(corporate);

window.addEventListener("pagehide", () => {
  cleanups.forEach((fn) => fn());
  observer.disconnect();
  corporateObserver.disconnect();
});
