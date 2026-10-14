/**
 * Search mode: only the query field until the user types; then matching releases.
 * Route: #search or #search?q=…
 */

import { applyContentFilters } from "./site-filters.js";

/** @returns {() => void} dispose */
export function initSearch() {
  const form = document.getElementById("search");
  const input = form?.querySelector('input[name="q"]');
  const panel = document.getElementById("search-panel");
  const filters = document.getElementById("filters");
  const list = document.getElementById("releases");
  const items = list ? [...list.querySelectorAll(".section--list-item")] : [];
  const tabContent = document.querySelector('[data-nav="content"]');
  const tabSearch = document.querySelector('[data-nav="search"]');
  const hintMsg = document.getElementById("search-hint");
  const emptyMsg = document.getElementById("search-empty");

  if (!form || !input || !panel || !list || items.length === 0) return () => {};

  const readQueryFromHash = () => {
    const hash = location.hash;
    if (!hash.startsWith("#search")) return null;
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return "";
    return new URLSearchParams(hash.slice(qIndex + 1)).get("q") ?? "";
  };

  const writeHash = (query) => {
    const encoded = encodeURIComponent(query).replace(/%20/g, "+");
    const next = query ? `#search?q=${encoded}` : "#search";
    if (location.hash !== next) {
      history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
    }
  };

  const setTab = (mode) => {
    tabContent?.classList.toggle("active", mode === "index");
    tabSearch?.classList.toggle("active", mode === "search");
  };

  const inSearchMode = () => document.body.getAttribute("page-type") === "index.search";

  /** Title + metadata values only — not shared row labels (avoids matching every row). */
  const itemHaystack = (item) => {
    const parts = [];
    const title = item.querySelector(".index-ticker")?.textContent?.trim();
    if (title) parts.push(title);

    item.querySelectorAll(".info-row").forEach((row) => {
      const value = row.querySelector(".content")?.textContent?.trim();
      if (value) parts.push(value);
    });

    return parts.join(" ").toLowerCase();
  };

  const setItemVisible = (item, visible) => {
    item.classList.toggle("is-filtered-out", !visible);
    item.hidden = !visible;
  };

  const applyFilter = (query) => {
    const needle = query.trim().toLowerCase();

    if (inSearchMode() && !needle) {
      document.body.removeAttribute("data-search-has-query");
      list.hidden = true;
      items.forEach((item) => setItemVisible(item, false));
      if (hintMsg) hintMsg.hidden = false;
      if (emptyMsg) emptyMsg.hidden = true;
      return;
    }

    let visible = 0;
    items.forEach((item) => {
      const match = itemHaystack(item).includes(needle);
      setItemVisible(item, match);
      if (match) visible += 1;
    });

    if (inSearchMode()) {
      const hasQuery = needle.length > 0;
      document.body.toggleAttribute("data-search-has-query", hasQuery);
      list.hidden = !hasQuery;
    }
    if (hintMsg) hintMsg.hidden = true;
    if (emptyMsg) {
      emptyMsg.hidden = !(needle.length > 0 && visible === 0);
    }
  };

  const scrollToSearch = () => {
    const offset =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--header-offset"),
      ) || 47;
    const top = panel.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const enterSearch = (query) => {
    document.body.setAttribute("page-type", "index.search");
    panel.hidden = false;
    if (filters) filters.hidden = true;
    setTab("search");
    input.value = query ?? "";
    applyFilter(input.value);
    requestAnimationFrame(() => {
      scrollToSearch();
      input.focus({ preventScroll: true });
    });
  };

  const exitSearch = () => {
    document.body.setAttribute("page-type", "home");
    document.body.removeAttribute("data-search-has-query");
    panel.hidden = true;
    if (filters) filters.hidden = false;
    setTab("index");
    input.value = "";
    if (hintMsg) hintMsg.hidden = true;
    if (emptyMsg) emptyMsg.hidden = true;
    list.hidden = false;
    items.forEach((item) => setItemVisible(item, true));
    applyContentFilters();
  };

  const syncRoute = () => {
    const hash = location.hash;
    if (hash === "#search" || hash.startsWith("#search?")) {
      enterSearch(readQueryFromHash() ?? "");
      return;
    }
    exitSearch();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    writeHash(input.value);
    applyFilter(input.value);
  });

  input.addEventListener("input", () => {
    writeHash(input.value);
    applyFilter(input.value);
  });

  window.addEventListener("hashchange", syncRoute);
  syncRoute();

  const initialQ = new URLSearchParams(location.search).get("q");
  if (initialQ != null && !location.hash.startsWith("#search")) {
    history.replaceState(null, "", `${location.pathname}#search?q=${encodeURIComponent(initialQ)}`);
    syncRoute();
  }

  return () => {
    window.removeEventListener("hashchange", syncRoute);
  };
}
