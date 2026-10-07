const CHARSET = " .:-=+*#%@";

type AsciiHeroOptions = {
  canvas: HTMLCanvasElement;
  text: string;
};

export function initAsciiHero({ canvas, text }: AsciiHeroOptions): () => void {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let cell = 10;
  let cols = 0;
  let rows = 0;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let time = 0;
  let raf = 0;

  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d");
  if (!offCtx) return () => {};

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.max(8, Math.floor(width / 90));
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / cell);
    off.width = cols;
    off.height = rows;
  };

  const drawTextMask = () => {
    offCtx.fillStyle = "#000";
    offCtx.fillRect(0, 0, cols, rows);
    offCtx.fillStyle = "#fff";
    const fontSize = Math.min(cols * cell * 0.55, rows * cell * 0.35);
    offCtx.font = `900 ${fontSize}px "Archivo Black", sans-serif`;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.fillText(text, cols / 2, rows / 2 + rows * 0.02);
  };

  const render = () => {
    time += prefersReduced ? 0 : 0.016;
    drawTextMask();
    const img = offCtx.getImageData(0, 0, cols, rows);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(0, 0, width, height);

    const mx = mouseX * cols;
    const my = mouseY * rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = img.data[i] / 255;
        if (lum < 0.08) continue;

        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 0.35 - time * 3) * 0.5 + 0.5;
        const flicker = prefersReduced ? 0 : Math.sin(time * 2 + x * 0.3 + y * 0.2) * 0.15;
        const strength = Math.min(1, lum * 0.9 + wave * 0.25 + flicker);
        const charIndex = Math.floor(strength * (CHARSET.length - 1));
        const ch = CHARSET[charIndex];

        const pink = 45 + Math.floor(strength * 120);
        const cyan = 180 + Math.floor(strength * 75);
        const usePink = (x + y + Math.floor(time * 4)) % 5 === 0;
        ctx.fillStyle = usePink
          ? `rgba(${pink}, 45, 111, ${0.12 + strength * 0.55})`
          : `rgba(60, ${cyan}, 255, ${0.1 + strength * 0.5})`;
        ctx.font = `${cell}px "JetBrains Mono", monospace`;
        ctx.fillText(ch, x * cell, y * cell + cell * 0.85);
      }
    }

    raf = requestAnimationFrame(render);
  };

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = (e.clientY - rect.top) / rect.height;
  };

  const onLeave = () => {
    mouseX = 0.5;
    mouseY = 0.5;
  };

  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  raf = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
  };
}

export function fillAsciiBand(el: HTMLElement, line: string, rows: number): void {
  const width = 72;
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let row = "";
    for (let c = 0; c < width; c++) {
      const t = (c + r) % line.length;
      row += line[t];
    }
    lines.push(row);
  }
  el.textContent = lines.join("\n");
}
