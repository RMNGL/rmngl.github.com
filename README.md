# rmngl.github.com

Company site for **RMNGL** (Remingle). Plain HTML, one stylesheet, three ES modules — no build step, no
dependencies, no toolchain. GitHub Pages serves this repository as-is.

## Run it locally

There is nothing to install and nothing to build. Serve the folder over HTTP (the page loads ES modules,
which browsers refuse to fetch from `file://`):

```bash
python -m http.server 4173     # or any static server: npx serve .
```

Open <http://localhost:4173/>. Editing `index.html`, `src/style.css` or a `src/*.js` file and reloading
the tab is the whole development loop.

## Structure

| Piece | File | Notes |
| --- | --- | --- |
| Page markup | `index.html` | `#services` index (rows `#1`–`#10`), fixed header, canvas + overlay layers |
| ASCII backdrop | `src/ascii-backdrop.js` | Full-viewport character grid; cycling scenes (below) |
| Index marquee | `src/site-index.js` | Character-stepped ticker for over-wide row names |
| Styles | `src/style.css` | Layer stack, grid rows, responsive/reduced-motion branches |
| Header marks | `src/rmngl-wordmark.png`, `src/rmngl-symbol.png` | Alpha-only masks; the ink is `currentColor` (see *The header lockup*) |
| Tab icon | `src/favicon.png`, `src/apple-touch-icon.png` | The symbol mask, white on the field's black |
| Entry | `src/main.js` | Wires the two modules, disposes on `pagehide` |

`index.html` is the only entry point: it links `src/style.css` with a `<link>` and loads `src/main.js`
with `<script type="module">`, and the modules import each other by relative path
(`./ascii-backdrop.js`). Keep those `.js` extensions — a bare `./ascii-backdrop` resolves in a bundler
but 404s in a browser.

### The ASCII backdrop

`initAsciiBackdrop(canvas)` paints a `#ascii-backdrop` grid over the whole viewport. The wordmark
(RMNGL ↔ fraktur "Remingle") is rasterised into an off-canvas sized **in cell units** — one mask
pixel per grid cell — so the glyph grid, not device pixels, sets the letter scale. The mask is
supersampled 4× and each `SS×SS` block is averaged down to one luminance per cell. Glyphs are laid
out one at a time with a 5% gap: at grid resolution a heavy display face otherwise fuses into a
solid block.

A **scene** decides how the mark is laid over the grid and how the cells move. Scenes cycle every
`SCENE_HOLD_MS` (7s) and the word flips once per full pass, so a full loop is 8 scenes:

| Scene | Tiles | Motion | Viewport coverage |
| --- | --- | --- | --- |
| `stack` | 4 | `scan` — bright band sweeping down | 90% w × 98% h |
| `hero` | 1 | `wave` — ripple from the pointer | 92% w × 26% h |
| `tile` | 14 | `drift` — diagonal plane | 94% w × 100% h |
| `dense` | 34 | `static` — sparse re-rolled noise | 98% w × 100% h |

`tiles` is a target, not an exact count: `tileGrid()` solves `(hiW/cols) / (hiH/rows) = wordAspect`
for `cols/rows`, so each tile's aspect matches the mark's and a tiled scene covers the viewport
without leaving gaps between rows of marks. `stack` is scene 0 because that is the frame
`prefers-reduced-motion` paints, and the only one that always fills.

Cells outside the mark carry a slow ambient sine field, gated per scene by `ambient` so the field
never competes with a dense tiling. The loop is capped at ~15fps, pauses while the tab is hidden,
and paints a single static frame under `prefers-reduced-motion`. It re-rasterises on
`document.fonts.ready` and returns a dispose fn.

To check what a scene actually looks like, read the canvas back and dump the per-cell alpha as a
density map — eyeballing a screenshot misleads, because the scrim and the page content sit on top.

### The header lockup

The header carries the wordmark, the nav, and a mark of its own at the right edge. Both marks are raster
assets in `src/`, but neither is an `<img>`: each is a `<span>` filled with `currentColor` and clipped by
`mask-image`, so the file supplies the shape and the stylesheet supplies the ink. That is what keeps the
hover a one-declaration move to yellow, and it is why the assets are alpha-only — the paper is gone, only
the antialiased coverage of the ink survives. The `-webkit-` prefix stays on the mask declarations: a mask
that fails is an invisible wordmark, not a soft edge, so this is the one place the site pays for the older
syntax.

`.logo` is the home link, and its accessible name is exactly `RMNGL`. The mask is the link's only content,
so the mask wears that label itself (`role="img" aria-label="RMNGL"`) rather than the link wearing it.
Height drives each mark and `aspect-ratio` carries the asset's own ratio (`867 / 326`, `729 / 444`), so
neither can letterbox; the clamps resolve to ~64px and ~46px on desktop, and at 320px — the header's
tightest case — the two marks, the nav and the gaps come to ~235px of the 273px left once the scrollbar
has taken its 15px.

`.logo__word` is the drawn wordmark: lowercase, one weight, the `g`'s tail the only exit from the
baseline. It replaced a text lockup (two overlapping circles plus `RMNGL` set in Space Grotesk), so the
display face went with it — the Google Fonts URL in `index.html` no longer requests Space Grotesk, and
`--font-display` is gone from `:root`.

`.logo-symbol` is the reconnection loop: the same idea the old mark drew — two things sharing a region —
as one line that closes on itself. It is `aria-hidden` and holds no link, so the header still has a
single home link; the nav takes the slack with `margin-left: auto`, which is what keeps the mark pinned
to the right edge. It keeps a hover even though it holds no link and takes no focus: it is the wordmark's
other half, so it answers to the pointer the way the word does. Hover-only is the trade — a keyboard user
never sees it.

The tab icon is that same mark, white on the field's black so it reads in a light tab strip and a dark
one: `src/favicon.png` (32) and `src/apple-touch-icon.png` (180), both drawn from `rmngl-symbol.png` and
both linked from `index.html`.

Cutting a mask from a new drawing is the whole asset pipeline. Take alpha from `paper - luminance`, with
the paper level read off a border ring (so a vignette cannot skew it) and the ink level taken as the
0.2th percentile of luminance rather than the minimum — one stray dark speck would otherwise take the
reference, and the ink would come out at 83% of its colour instead of solid. Normalise so the deepest ink
is opaque, then trim to the ink's bounding box. A redraw is therefore a new file, one number in
`aspect-ratio`, and nothing else.

## Editing the service index

The holding-company index lives in `index.html` (`#services` → `.index-list`). Every row is an
`<li class="index-row" data-ticker>` containing a `#N` gutter (`.index-left`) and the name
(`.index-name` > `.index-ticker`). Rows whose name is wider than its column get a character-stepped
marquee (`src/site-index.js`) — the row keeps `#N` fixed and steps the name only.

The list is three kinds of row: a named row that links (`#1` leaves the site), the `index-row--tbd` row
for work that has not started, and the unnamed run that closes the list. The contact row is the one
without a number. A row links when it has somewhere to go: `#1` opens the blog in a new tab
(`target="_blank" rel="noopener"`, with a `visually-hidden` "opens in a new tab" so its name says so),
the contact row mails, and a row with no destination — `#2` and the run — holds none.

`#N` is a stack, not a string — `#<br />1`, the way mschf writes its gutter — and the pair runs at 40%
of the row size (`.index-left { font-size: 0.4em; line-height: 1.125 }`: 26px against 65px on their
desktop). Those two numbers are not free to edit: `0.4em × 1.125 = 0.45em` a line, so the two lines fill
the row's `0.9` line box exactly. The `#` lands in the upper half, the digit lands on the name's
baseline, and the row's height never moves. Rows align on `start` for that reason — `baseline` would lift
the pair a whole line and drop the digit through the row's bottom rule — and on a narrow screen, where a
long name wraps, `#N` stays on the first line.

The gutter column is `max(2.5rem, 0.96em)` — 4ch of the 40% type, which is how mschf sizes its own
column (4 × 0.6 × 0.4em) — and it clears the contact row's `,,,` (3ch of the same type). It resolves
against the row font, so the whole index still resizes from the one `font-size` on `.index-hit`.

The frame around that list is two paddings and nothing else: `main`'s `padding-top: var(--header-h)`
clears the fixed header, and `.index-zone` adds `clamp(1rem, 3vw, 2.5rem)` on top of it — about half a
row at desktop. That second value *is* the gap between the header rule and `#1`, so it is the lever when
the index reads as floating too far down the viewport. Measured at 84px, a row's ink starts 5.3px below
the list's `border-top`, so the visible gap is that padding plus ~5px.

Rows are deliberately tight: `.index-hit` carries `padding: 0` and `line-height: 0.9`, so the line box
*is* the row. Two consequences worth knowing before you touch it:

- A line box that tight is shorter than the glyph ink, so `.index-name` must not clip vertically. It
  sets `overflow: hidden` (for the ticker) and an `@supports (overflow-x: clip)` block upgrades that to
  `overflow-x: clip; overflow-y: visible`, keeping the ticker clipped horizontally while letting ink
  breathe vertically.
- The row rule sits at the bottom of that box, and JetBrains Mono's `@` descends 15px at 84px — so the
  contact row is the only one that needs room, and it alone carries `index-row--descender`
  (`padding-bottom: 0.15em`). A class, not `:last-child`, because the `?` rows come after it. Adding a
  descender to any other row means giving that row the same class, or the tail will cross the rule.

The `index-row--tbd` row renders red over a diagonal hatch and holds no link; copy that markup for
"not yet" items. It sits at `#2`, and the contact row (`id="contact"`) comes after it — the header's
`contact` link targets that row, so the list has no separate contact section. That row is an ordinary
`.index-hit` apart from its `mailto:` href, its gutter and its colour: `.index-left--mark` swaps the
number for a yellow `,,,` — the site's comma mark, reused as the list's "and so on" — one line of the
same 40% type, so it sits in the row's upper half like the `#` does. `.index-name--mark` gives the
address the same yellow, because that row is the list's contact rather than one of its services. The mark
is `aria-hidden`, so the link's accessible name is still just the address.

The list closes with a run of unnamed rows, `#3` through `#10`: mschf's notation for a service that has not
opened — the number is real and the name is not. Each row is a run of `?` long enough to be cut by its
column, and because every glyph is identical the character ticker steps it invisibly — which is why they
read as still rather than animated. They hold no link, for the same reason `#2` holds none. The run is
`aria-hidden` and each row carries a `visually-hidden` "Unannounced", so a screen reader gets a label
instead of thirty-two question marks; trim or lengthen the run to taste, the column clips it. When a
service opens, the row stops being notation: the run becomes the name, `index-row--unnamed` comes off,
and the row takes a link if it has one — the shape `#1` already has.

A row that is not a link answers to nothing. Every hover rule here hangs off `a.index-hit`, so the `?` rows
and the tbd row keep their gray while the pointer crosses them and the pointer stays an arrow — which is
how mschf's own list works, where each `:hover` rule hangs off `a.link` and a `?` row is a plain div
inside a section that sets `cursor: default`.

A row that is a link answers twice: its name goes white, and a mark arrives after it. mschf's mark is a
glyph — `a.link:not(.latest):hover:after { content: "↗" }`, a flex item packed after the name span, so it
lands on the name's last letter rather than at the row's end — and ours is the corner mark in that same slot,
because the loop says the row comes back where the arrow said it leaves. Their `:not(.latest)` keeps the glyph
off their newest row; that exception is not carried over, since the one linked row here *is* the newest. The
mark arrives in the same white the name takes on hover — the row's other half, not a second signal — it is
`aria-hidden` and takes no focus of its own, and it lives inside `.index-name` rather than in a third grid
track: a track would narrow the name column and move the ticker's threshold for every row, where this only
borrows the whitespace after the name. Hover is not the only way in — the rule opens on `:focus-visible` too,
so a keyboard user gets the mark a mouse user gets. And it arrives turning: `index-mark-return` swings it in
from `-45deg` and settles it at `0` with a slight overshoot, and `prefers-reduced-motion` drops the swing,
leaving the mark itself in place.

The one thing on the run that does answer is the plate on its first row.

That plate is mschf's "NEXT UP": a black plate in the site's red, set at the gutter's 40% and pinned to
the pointer, lifted clear of it (`translateY(-150%)`) and never a target (`pointer-events: none`).
`src/site-index.js` positions it on `pointerenter` and `pointermove` and hides it on `pointerleave`;
`@media (hover: none)` drops it where there is no hover to answer, so a touch screen never sees it. The
claim is markup, not code: move the span to another row and the claim moves with it.

The run is read through a mosaic, which is mschf's own treatment of it: a checkerboard of the field colour
over the row, so the `?` come through as a texture of squares rather than glyphs. That is their
`.tile-overlay` — two 45° gradients, each painting opposite corners of a square tile, offset by half a tile
— hung on `.index-row--unnamed .index-hit::after`, covering the gutter as well as the name because theirs
does: of their rows, only the ten that carry a `?` run wear it. The tile is `0.0923em` of the row's type —
their `0.4166vw` against `4.5138vw` of type — which holds their ratio at every width rather than their
two-step vw sizes. It is a background on the row's box, so the row's height does not move.

`index-row--unnamed` also carries the wrapping branch's rules, and they only bite there: a run of identical
glyphs gains nothing from wrapping, and it would leave a line carrying a single `?`, so the row keeps
`nowrap` and the clip at every width. Two traps live under it. The clip has to come back with the
`nowrap`, or the run paints past the row on a narrow screen. And `.index-name` is `position: relative` so
the out-of-flow `visually-hidden` label resolves against it: resolved against the page instead, that label
lands at the far end of the over-wide ticker — past the viewport — and drags the document's `scrollWidth`
out with it (1797px on a 1440px viewport, before the anchor was added).

## Deploy

Pushing to `main` publishes the site. There is no build job, no workflow and no `dist` folder — GitHub
Pages serves the branch itself.

In GitHub **Settings → Pages**, set **Source** to **Deploy from a branch**, branch `main`, folder
`/ (root)`. That is the entire pipeline: the files in this repository *are* the site.

`.nojekyll` in the root is what makes that literal. Without it Pages runs the branch through Jekyll
first, and a static site has no reason to be processed by a blog generator — the marker says "serve
these files as they are".

GitHub writes the custom-domain file into whichever folder the source points at, so a folder set to
`/docs` makes GitHub commit a `docs/CNAME` this repository does not use. The root `CNAME` is the one
branch-based Pages reads here; if a `docs/CNAME` ever appears, delete it and check the folder.

### If a push changes nothing

Check **Settings → Pages → Source** first. If it still says **GitHub Actions**, nothing is deployed:
this repository has no workflow left to run, so the push is silent and the site keeps serving the last
artifact the old workflow built. Switching the source to **Deploy from a branch** publishes the
repository as it stands on the next build.

### Custom domain (`rmngl.com`)

`CNAME` in the repository root holds the domain, which is what branch-based Pages reads. Set the custom
domain in **Settings → Pages** as well, and keep **Enforce HTTPS** on.

### If the site renders unstyled or inert

Open DevTools → Network and confirm `src/style.css` returns 200 as CSS and `src/main.js` returns 200 as
JavaScript. A 404 on either means Pages is not serving the repository root — check the **Source** setting
above. Serving the folder over HTTP is the intended setup; opening `index.html` from `file://` is not,
because ES modules need a real origin.
