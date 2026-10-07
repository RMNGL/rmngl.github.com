export function initPlayRail(): () => void {
  const rail = document.getElementById("play-rail");
  const track = document.getElementById("play-track");
  if (!rail || !track) return () => {};

  let dragging = false;
  let startX = 0;
  let scrollLeft = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    startX = e.clientX;
    scrollLeft = rail.scrollLeft;
    rail.setPointerCapture(e.pointerId);
    rail.classList.add("is-dragging");
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    rail.scrollLeft = scrollLeft - dx;
  };

  const onUp = (e: PointerEvent) => {
    dragging = false;
    rail.classList.remove("is-dragging");
    rail.releasePointerCapture(e.pointerId);
  };

  rail.addEventListener("pointerdown", onDown);
  rail.addEventListener("pointermove", onMove);
  rail.addEventListener("pointerup", onUp);
  rail.addEventListener("pointercancel", onUp);

  return () => {
    rail.removeEventListener("pointerdown", onDown);
    rail.removeEventListener("pointermove", onMove);
    rail.removeEventListener("pointerup", onUp);
    rail.removeEventListener("pointercancel", onUp);
  };
}
