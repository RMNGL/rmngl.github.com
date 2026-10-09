/**
 * Full-viewport ASCII backdrop — the RMNGL / Remingle wordmark drawn as a
 * character grid that fills the screen and animates cell by cell.
 *
 * The wordmark is rasterised into an off-canvas whose pixels are one grid cell
 * each, so the glyph grid (not the device pixels) drives the scale and position
 * of the letters. A *scene* decides how the mark is laid over the grid — one
 * hero wordmark, a stack of lines filling the height, or a full-bleed tiling —
 * and how the cells move. Tiles are sized from the mark's own aspect ratio, so
 * a tiled scene covers the viewport instead of leaving gaps between rows.
 *
 * Cells outside the mark carry a slow ambient field, so the whole viewport
 * stays alive instead of only the letterforms.
 *
 * The loop is capped at ~15fps, pauses while the tab is hidden, and paints a
 * single static frame under prefers-reduced-motion.
 */

const CHARSET = " .:-=+*#%@";
const AMBIENT_CHARSET = ".:-=";

/** A mark drawn on the grid: the word, plus the font that renders it. */
const WORDS = [
  { text: "RMNGL", font: (size) => `900 ${size}px "Archivo Black", sans-serif` },
  { text: "Remingle", font: (size) => `400 ${size}px "UnifrakturMaguntia", serif` },
];

/**
 * A scene: how many wordmark tiles to lay over the grid (1 = a single hero mark),
 * how the lit cells move ("wave" | "scan" | "drift" | "static"), and the
 * ambient-field gain — dialled down where the tiling is already dense.
 *
 * Scene 0 is what loads first, and the only one painted under
 * prefers-reduced-motion — so it is the full-bleed one.
 */
const SCENES = [
  { id: "stack", tiles: 4, motion: "scan", ambient: 0.8 },
  { id: "hero", tiles: 1, motion: "wave", ambient: 1 },
  { id: "tile", tiles: 14, motion: "drift", ambient: 0.5 },
  { id: "dense", tiles: 34, motion: "static", ambient: 0.35 },
];

const SCENE_HOLD_MS = 7000;
const GLITCH_MS = 900;
const FRAME_MS = 66;
const AMBIENT_THRESHOLD = 0.15;
/** Fraction of a tile the mark fills, leaving a seam so tiles stay separate. */
const TILE_FILL = 0.94;
/** Mask is rasterised at SS× the grid so glyph interiors land as solid cells. */
const SS = 4;
/** Reference size the word is measured at; every tile scale is relative to it. */
const REF = 200;

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void} dispose
 */
export function initAsciiBackdrop(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx || !offCtx) return () => {};

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let cell = 16;
  let cols = 0;
  let rows = 0;
  let mask = null;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let scrollY = 0;
  let time = 0;
  let sceneIndex = 0;
  let sceneAge = 0;
  let glitch = 0;
  let raf = 0;
  let lastFrameAt = 0;
  let disposed = false;

  const scene = () => SCENES[sceneIndex % SCENES.length] ?? SCENES[0];
  const word = () => WORDS[Math.floor(sceneIndex / SCENES.length) % WORDS.length] ?? WORDS[0];

  /**
   * Tile grid whose slots match the word's aspect ratio, so a tiled scene fills
   * the viewport instead of leaving vertical gaps between rows of marks.
   * Solving `(hiW/cols) / (hiH/rows) = wordAspect` gives `cols/rows`.
   */
  const tileGrid = (wordAspect, gridAspect, target) => {
    if (target <= 1) return { tileCols: 1, tileRows: 1 };
    const colsPerRow = Math.max(0.05, gridAspect / wordAspect);
    const tileRows = Math.max(1, Math.ceil(Math.sqrt(target / colsPerRow)));
    return { tileCols: Math.max(1, Math.ceil(target / tileRows)), tileRows };
  };

  const drawMask = () => {
    const mark = word();
    const hiW = cols * SS;
    const hiH = rows * SS;
    offCtx.fillStyle = "#000";
    offCtx.fillRect(0, 0, hiW, hiH);
    offCtx.fillStyle = "#fff";
    offCtx.textAlign = "left";
    offCtx.textBaseline = "alphabetic";

    // Measure at the reference size: per-glyph advances (the run is laid out by
    // hand so a heavy display face keeps a visible gap at grid resolution) plus
    // the string's ink box, which sets the tile aspect and the vertical centring.
    offCtx.font = mark.font(REF);
    const chars = [...mark.text];
    const gapRef = REF * 0.05;
    const widths = chars.map((ch) => offCtx.measureText(ch).width);
    const runRef = widths.reduce((a, b) => a + b, 0) + gapRef * Math.max(0, chars.length - 1);
    const ink = offCtx.measureText(mark.text);
    const ascent = ink.actualBoundingBoxAscent || 0;
    const descent = ink.actualBoundingBoxDescent || 0;
    const inkH = Math.max(1, ascent + descent);

    const { tileCols, tileRows } = tileGrid(runRef / inkH, hiW / hiH, scene().tiles);
    const slotW = hiW / tileCols;
    const slotH = hiH / tileRows;

    // The slot aspect matches the word's, so a single scale fills the tile.
    const scale = Math.min(slotW / runRef, slotH / inkH) * TILE_FILL;
    const size = REF * scale;
    const runW = runRef * scale;
    // Ink centre measured from the alphabetic baseline, so tiles centre exactly.
    const inkMid = ((ascent - descent) / 2) * scale;

    offCtx.font = mark.font(size);
    for (let ty = 0; ty < tileRows; ty++) {
      for (let tx = 0; tx < tileCols; tx++) {
        const baseline = (ty + 0.5) * slotH + inkMid;
        let x = (tx + 0.5) * slotW - runW / 2;
        for (let i = 0; i < chars.length; i++) {
          offCtx.fillText(chars[i] ?? "", x, baseline);
          x += (widths[i] ?? 0) * scale + gapRef * scale;
        }
      }
    }

    // Downsample the supersampled raster into one luminance value per cell.
    const hi = offCtx.getImageData(0, 0, hiW, hiH).data;
    const data = new Uint8ClampedArray(cols * rows * 4);
    const samples = SS * SS;
    for (let y = 0; y < rows; y++) {
      for (let x2 = 0; x2 < cols; x2++) {
        let sum = 0;
        for (let sy = 0; sy < SS; sy++) {
          const rowBase = (y * SS + sy) * hiW;
          for (let sx = 0; sx < SS; sx++) {
            sum += hi[(rowBase + x2 * SS + sx) * 4] ?? 0;
          }
        }
        const value = sum / samples;
        const at = (y * cols + x2) * 4;
        data[at] = value;
        data[at + 1] = value;
        data[at + 2] = value;
        data[at + 3] = 255;
      }
    }
    mask = data;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.max(10, Math.min(22, Math.round(width / 90)));
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / cell);
    off.width = cols * SS;
    off.height = rows * SS;
    drawMask();
  };

  /**
   * How the lit cells move, per scene. Returns a 0–1 bias added to each cell's
   * mask luminance, so the letterforms stay readable while the field animates.
   */
  const motionAt = (motion, x, y, mx, my, t) => {
    switch (motion) {
      case "wave": {
        const dx = x - mx;
        const dy = y - my;
        return Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.22 - t * 1.6) * 0.5 + 0.5;
      }
      case "scan": {
        // A bright band sweeping top to bottom.
        const band = ((t * 0.28) % 1) * (rows + 14) - 7;
        return Math.max(0, 1 - Math.abs(y - band) / 7);
      }
      case "drift":
        return Math.sin((x * 0.6 + y * 0.4) * 0.14 - t * 0.9) * 0.5 + 0.5;
      case "static": {
        // Sparse digital static: stable per cell for ~1/6s, then re-rolled.
        const tick = Math.floor(t * 6);
        const n = Math.sin(x * 12.9898 + y * 78.233 + tick * 37.719) * 43758.5453;
        return n - Math.floor(n) > 0.82 ? 1 : 0;
      }
      default:
        return 0;
    }
  };

  const paint = () => {
    if (!mask) return;

    ctx.clearRect(0, 0, width, height);
    ctx.font = `${Math.round(cell * 0.92)}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";

    const current = scene();
    const mx = pointerX * cols;
    const my = pointerY * rows;
    // Bounded, seamless parallax: the wordmark breathes as the page scrolls.
    const drift = Math.sin(scrollY * 0.0015) * cell * 1.5;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lum = (mask[(y * cols + x) * 4] ?? 0) / 255;

        if (lum < 0.08) {
          // Ambient field — keeps the empty grid faintly alive across the viewport.
          const field =
            Math.sin(x * 0.19 + time * 0.5) * 0.5 + Math.sin(y * 0.31 - time * 0.35) * 0.5;
          if (field < AMBIENT_THRESHOLD + (1 - current.ambient) * 0.5) continue;
          const ambientIndex = Math.min(
            AMBIENT_CHARSET.length - 1,
            Math.max(0, Math.round(((field + 1) / 2) * AMBIENT_CHARSET.length) - 1),
          );
          ctx.fillStyle = "rgba(70, 150, 200, 0.08)";
          ctx.fillText(AMBIENT_CHARSET[ambientIndex] ?? ".", x * cell, y * cell + drift);
          continue;
        }

        const motion = motionAt(current.motion, x, y, mx, my, time);
        const strength = Math.min(1, lum * 0.75 + motion * 0.32);

        const jitter = glitch > 0 ? Math.random() : 0;
        const index = Math.min(
          CHARSET.length - 1,
          Math.max(1, Math.floor(strength * (CHARSET.length - 1)) + 1),
        );
        const ch =
          jitter > 0.55
            ? (CHARSET[Math.floor(Math.random() * CHARSET.length)] ?? "#")
            : (CHARSET[index] ?? "#");

        const alpha = 0.1 + strength * 0.42 + jitter * 0.2;
        const accent = (x * 7 + y * 5) % 37 === 0;
        ctx.fillStyle = accent
          ? `rgba(255, 199, 0, ${alpha})`
          : `rgba(64, 190, 255, ${alpha * 0.9})`;
        ctx.fillText(ch, x * cell, y * cell + drift);
      }
    }
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - lastFrameAt < FRAME_MS) return;
    const dt = Math.min(200, now - lastFrameAt);
    lastFrameAt = now;

    time += dt / 1000;
    sceneAge += dt;
    if (sceneAge > SCENE_HOLD_MS) {
      sceneAge = 0;
      sceneIndex += 1;
      glitch = GLITCH_MS;
      drawMask();
    }
    if (glitch > 0) glitch = Math.max(0, glitch - dt);

    paint();
  };

  const start = () => {
    if (raf) return;
    lastFrameAt = performance.now();
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onResize = () => {
    resize();
    if (prefersReduced) paint();
  };

  const onPointerMove = (event) => {
    pointerX = event.clientX / width;
    pointerY = event.clientY / height;
  };

  const onScroll = () => {
    scrollY = window.scrollY;
  };

  const onVisibility = () => {
    if (document.hidden) stop();
    else if (!prefersReduced) start();
  };

  resize();
  if (prefersReduced) paint();
  else start();

  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  // Web fonts land after first paint and change the mask metrics.
  void document.fonts.ready.then(() => {
    if (disposed) return;
    drawMask();
    if (prefersReduced) paint();
  });

  return () => {
    disposed = true;
    stop();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
