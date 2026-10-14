/**
 * Content-type / file-extension filters (VAS-style toggle + OR match).
 */

const CONTENT_TYPE_LABEL = "Content type";

/** @param {Element} item */
function readContentType(item) {
  for (const row of item.querySelectorAll(".info-row")) {
    const title = row.querySelector(".title")?.textContent?.trim();
    if (title === CONTENT_TYPE_LABEL) {
      return row.querySelector(".content")?.textContent?.trim() ?? "";
    }
  }
  return "";
}

/** @param {Element} item @param {boolean} visible */
function setItemVisible(item, visible) {
  item.classList.toggle("is-filtered-out", !visible);
  item.hidden = !visible;
}

let items = [];
let filterLinks = [];

function activeFilters() {
  return filterLinks
    .filter((link) => link.classList.contains("active"))
    .map((link) => link.dataset.filter ?? "")
    .filter(Boolean);
}

/** Re-apply filters (e.g. after leaving search mode). */
export function applyContentFilters() {
  if (document.body.getAttribute("page-type") === "index.search") return;

  const active = activeFilters();
  if (active.length === 0) {
    items.forEach((item) => setItemVisible(item, true));
    return;
  }

  items.forEach((item) => {
    const contentType = readContentType(item);
    const extRaw = item.dataset.fileExt ?? "";
    const extensions = extRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const match = active.some((filter) => {
      if (filter.startsWith(".")) {
        return extensions.includes(filter);
      }
      return contentType === filter;
    });

    setItemVisible(item, match);
  });
}

/** @returns {() => void} dispose */
export function initContentFilters() {
  const list = document.getElementById("releases");
  filterLinks = [...document.querySelectorAll(".section--filters a[data-filter]")];
  items = list ? [...list.querySelectorAll(".section--list-item")] : [];

  if (filterLinks.length === 0 || items.length === 0) return () => {};

  const onFilterClick = (event) => {
    event.preventDefault();
    const link = event.currentTarget;
    if (!(link instanceof HTMLAnchorElement)) return;

    link.classList.toggle("active");
    applyContentFilters();
  };

  filterLinks.forEach((link) => {
    link.addEventListener("click", onFilterClick);
  });

  applyContentFilters();

  return () => {
    filterLinks.forEach((link) => {
      link.removeEventListener("click", onFilterClick);
    });
  };
}
