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

The header carries the wordmark, the nav, and a corner mark of its own. The wordmark is the bare word —
`RMNGL`, no plate — because the word *is* the link, so its accessible name is exactly `RMNGL`; the mark
beside it is `aria-hidden`, so it adds nothing to that name. `.logo` is a flex row (`gap: 0.5rem`), which
is what makes the pair read as one lockup.

`.logo__mark` is the name's meaning drawn: two circles overlapping, with the overlap inked in, because
"remingle" is two things sharing a region. It is one `<svg>` in a 24 box, and the lens is the *exact*
intersection of the two circles — `r="5.6"` at `8.6`/`15.4`, so the crossings land on `12 7.55` and
`12 16.45`, which are the path's endpoints and its arc radius. Those numbers are the whole trick: a lens
drawn by eye leaves a sliver between itself and the circles, and the mark is only as good as that seam.
The lens is `currentColor` at `fill-opacity: 0.45`, so the mark stays monochrome like the badge and still
moves to yellow with the word on hover, with no second declaration.

The box is deliberately larger than the type: the rings are 11.2 of its 24, which puts them at the cap
height of the 18px word beside them, so the mark reads as one weight with the letters instead of as a
badge parked next to them. It costs 32px of header, which is why the mark is `1.5rem` and not larger — at
320px, with a scrollbar taking its 15px, the nav's left edge lands on the wordmark's right edge, so there
is nothing left to give.

The face is the header's other styling decision: `.logo` drops the inherited mono for `--font-display`,
Space Grotesk at `700`. A wordmark has to read as a logo rather than a label, and Space Grotesk is derived
from Space Mono, so it keeps the site's skeleton (squarish caps, the same terminal cuts) while being a
proportional display face — the mono family stays everywhere else. Weight and tracking carry the rest:
`-0.01em`, tight enough that five caps set as one shape. The family rides on the Google Fonts `<link>` in
`index.html`, so a new weight means a new entry in that URL.

The third element is `.logo-badge`: the comma itself, drawn bare on the header, three times, stepping
downhill (`viewBox="0 0 35 29"` — one `<path>` in `<defs>`, three `<use>`). The run is the whole point.
Three upright commas read as three exclamation points — MSCHF's `!!!` is a registered mark of
theirs, so they are stepped, and on the diagonal the eye takes them as punctuation. There is
deliberately no plate behind them and no red, for the same reason. It is `aria-hidden` and holds no
link, so the header still has a single home link (the wordmark); the nav takes the slack with
`margin-left: auto`, which is what keeps the mark pinned to the right edge.
The mark is `clamp(1.75rem, 6vw, 2.75rem)` wide — the value that keeps a 320px header from overflowing —
and the SVG's own 35:29 box sets its height, so there is no square to letterbox. `fill: currentColor`
lets the hover move the whole mark to yellow with one declaration. That hover stays, even though the
badge holds no link and takes no focus: it is the wordmark's punctuation, so it answers to the pointer
the way the word does. Hover-only is the trade — a keyboard user never sees it.

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
inside a section that sets `cursor: default`. The one thing on the run that does answer is the plate on
its first row.

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
