import { initIndexTickers } from "./site-index.js";
import { initSearch } from "./site-search.js";
import { initContentFilters } from "./site-filters.js";
import "./site-nav.js";

const cleanups = [];

cleanups.push(initIndexTickers());
cleanups.push(initSearch());
cleanups.push(initContentFilters());

window.addEventListener("pagehide", () => {
  cleanups.forEach((fn) => fn());
});
