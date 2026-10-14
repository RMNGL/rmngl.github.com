/** Mobile header menu — shared by index and about. */
const header = document.getElementById("site-header");
const menuToggle = document.getElementById("menu-toggle");
const overlay = document.getElementById("menu-overlay");

if (header && menuToggle) {
  const close = () => {
    header.classList.remove("opened");
    menuToggle.setAttribute("aria-expanded", "false");
    if (overlay) overlay.hidden = true;
  };

  const onMenuClick = (event) => {
    event.preventDefault();
    const open = !header.classList.contains("opened");
    header.classList.toggle("opened", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (overlay) overlay.hidden = !open;
  };

  menuToggle.addEventListener("click", onMenuClick);
  overlay?.addEventListener("click", close);
}
