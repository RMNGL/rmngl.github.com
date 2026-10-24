/**
 * Content-type / file-extension filters (VAS-style toggle + OR match).
 */

const CONTENT_TYPE_LABEL = "Content type";
const CHECK_MARK = "\u2714";

/**
 * Unique, non-empty, trimmed filter values in first-seen order.
 * Each entry contributes its content type, then its extensions.
 * @param {{ contentType: string, extensions: string[] }[]} entries
 * @returns {string[]}
 */
export function orderedFilterValues(entries) {
  const seen = new Set();
  const values = [];
  for (const { contentType, extensions } of entries) {
    for (const raw of [contentType, ...extensions]) {
      const value = raw.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

/** @param {Element} item @returns {{ contentType: string, extensions: string[] }} */
function readFilterEntry(item) {
  const extensions = (item.dataset.fileExt ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { contentType: readContentType(item), extensions };
}

/** @param {string} value @returns {HTMLAnchorElement} */
function createFilterLink(value) {
  const link = document.createElement("a");
  link.href = "#releases";
  link.dataset.filter = value;

  const check = document.createElement("span");
  check.className = "check";
  check.append("[");
  const accent = document.createElement("span");
  accent.className = "accent";
  accent.textContent = CHECK_MARK;
  check.append(accent, "]\u00a0\u00a0");

  link.append(check, value);
  return link;
}

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
  const section = document.querySelector(".section--filters");
  items = list ? [...list.querySelectorAll(".section--list-item")] : [];

  if (!section || items.length === 0) return () => {};

  section.replaceChildren(
    ...orderedFilterValues(items.map(readFilterEntry)).map(createFilterLink),
  );
  filterLinks = [...section.querySelectorAll("a[data-filter]")];

  if (filterLinks.length === 0) return () => {};

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
