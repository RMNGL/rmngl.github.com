import { initAsciiBackdrop } from "./ascii-backdrop.js";
import { initIndexTickers } from "./site-index.js";

const backdrop = document.getElementById("ascii-backdrop");

const cleanups = [];

if (backdrop instanceof HTMLCanvasElement) {
  cleanups.push(initAsciiBackdrop(backdrop));
}

cleanups.push(initIndexTickers());

window.addEventListener("pagehide", () => {
  cleanups.forEach((fn) => fn());
});

