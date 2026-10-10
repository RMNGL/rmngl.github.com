/**
 * Service-index rows: mschf.com-style character-stepped marquee.
 * When a row name is wider than its column, translate it by whole characters
 * (steps()) and back again — the "typewriter" tick that gives the index its
 * deadpan motion. Rows that fit stay completely still.
 */
const MIN_DURATION_S = 4;
const SECONDS_PER_STEP = 0.35;

/** @returns {() => void} dispose */
export function initIndexTickers() {
  const rows = Array.from(document.querySelectorAll(".index-row[data-ticker]"));
  if (rows.length === 0) return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1ch probe — keeps the step count in character units, whatever font is active.
  const ruler = document.createElement("span");
  ruler.className = "index-ruler";
  ruler.setAttribute("aria-hidden", "true");
  document.body.appendChild(ruler);

  let raf = 0;
  let disposed = false;

  const measure = () => {
    raf = 0;

    rows.forEach((row) => {
      const name = row.querySelector(".index-name");
      const ticker = row.querySelector(".index-ticker");
      if (!name || !ticker) return;

      row.classList.remove("is-overflowing");
      row.style.removeProperty("--ticker-steps");
      row.style.removeProperty("--ticker-duration");

      if (reduced) return;

      const styles = getComputedStyle(ticker);
      ruler.style.fontFamily = styles.fontFamily;
      ruler.style.fontSize = styles.fontSize;
      ruler.style.fontWeight = styles.fontWeight;
      ruler.style.letterSpacing = "normal";
      const ch = ruler.getBoundingClientRect().width || 8;

      const overflow = ticker.offsetWidth - name.clientWidth;
      if (overflow < ch) return;

      const steps = Math.ceil(overflow / ch);
      row.style.setProperty("--ticker-steps", String(steps));
      row.style.setProperty(
        "--ticker-duration",
        `${Math.max(MIN_DURATION_S, steps * SECONDS_PER_STEP).toFixed(1)}s`,
      );
      row.classList.add("is-overflowing");
    });
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(measure);
  };

  measure();
  window.addEventListener("resize", schedule);
  void document.fonts.ready.then(() => {
    if (!disposed) schedule();
  });

  return () => {
    disposed = true;
    window.removeEventListener("resize", schedule);
    if (raf) cancelAnimationFrame(raf);
    ruler.remove();
  };
}

/**
 * The "Next up" plate on the first unannounced row: MSCHF's way of saying the
 * run has a beginning. The plate is in the markup, pinned to the pointer and
 * lifted clear of it; this only shows and hides it, so a row with no plate costs
 * nothing. The rows themselves hold no link, which is why the plate — not a hover
 * colour — is the one thing on them that answers to the pointer.
 * @returns {() => void} dispose
 */
export function initNextUpPlate() {
  const plate = document.querySelector(".index-next-up");
  const row = plate?.closest(".index-row");
  if (!plate || !row) return () => {};

  const place = (event) => {
    plate.style.left = `${event.clientX}px`;
    plate.style.top = `${event.clientY}px`;
  };

  const show = (event) => {
    place(event);
    plate.classList.add("is-visible");
  };

  const hide = () => {
    plate.classList.remove("is-visible");
  };

  row.addEventListener("pointerenter", show);
  row.addEventListener("pointermove", place);
  row.addEventListener("pointerleave", hide);

  return () => {
    row.removeEventListener("pointerenter", show);
    row.removeEventListener("pointermove", place);
    row.removeEventListener("pointerleave", hide);
  };
}
