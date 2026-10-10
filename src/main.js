import { initAsciiBackdrop } from "./ascii-backdrop.js";
import { initIndexTickers, initNextUpPlate } from "./site-index.js";

const backdrop = document.getElementById("ascii-backdrop");

const cleanups = [];

if (backdrop instanceof HTMLCanvasElement) {
  cleanups.push(initAsciiBackdrop(backdrop));
}

cleanups.push(initIndexTickers());
cleanups.push(initNextUpPlate());

window.addEventListener("pagehide", () => {
  cleanups.forEach((fn) => fn());
});

