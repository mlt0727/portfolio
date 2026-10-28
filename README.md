# Lingtong Meng — Portfolio

A personal portfolio built as a scroll-driven flight through a neural network.
Scrolling down is the **forward pass**: the camera flies from the input layer
(education) through two hidden layers (skills) and a training loss curve
(experience) to the output layer (projects), landing on a name card. The
readable page below is the **backward pass**: the same layers, output to input,
with gradient dots falling down a spine on the left.

Live site: https://lingtongmeng.com

## The idea

A résumé is a list. A neural network is a story about how an output came to
be. Putting the résumé into the shape of a network makes the order mean
something:

| Chapter | Network metaphor | Content |
|---|---|---|
| 01 Input layer | the data that went in | Education |
| 02 Hidden layers | the weights learned along the way | Skills, two layers of eight |
| 03 Training | the loss curve going down, epoch by epoch | Experience |
| 04 Output layer | what the network produces | Projects |
| Output | the result | Name card with contact links |
| Backward pass | gradients flowing back | Plain, readable profile in reverse order |

Every visitor lands on the projects first, whichever way they arrive: the
flight ends on them, "Skip intro" jumps to the name card right after them, and
the readable page opens with them.

## Design notes

- **One continuous camera.** The pinned section is 950vh tall. A single
  `requestAnimationFrame` loop reads `window.scrollY`, turns it into a progress
  value `p` in [0, 1], writes it to the CSS variable `--p`, and moves the camera
  along a keyframe table. Two neighbouring keyframes with the same `z` are a
  hold, which is how each layer gets its dwell time.
- **Content lives in HTML.** Every card and tag in the flight is an ordinary
  element with `data-layer="…"`. `main.js` lays them out as neurons (rings, or
  epochs along the loss curve), draws edges between consecutive layers, runs
  signal pulses along the edges, and projects each element onto its 3D anchor
  every frame. Adding a skill is adding one `<span class="tag" data-layer="2">`.
- **Distance decides visibility.** An overlay element shows while its anchor is
  10–85 units ahead of the camera and fades at both ends, so content streams
  past instead of popping in. Experience cards go further: they scale with
  distance so they appear small, grow, and leave the frame large.
- **Important nodes glow, the rest stay quiet.** Education, experience and
  project nodes get a bright halo; skill tags a subtle one; the background
  field none. Pulses are dim cyan so the eye goes to the nodes they feed.
- **No post-processing.** Bloom was tried and dropped: it lifted the whole
  background to grey. Glow comes from additive geometry instead.
- **Nothing flashes, nothing stalls.** The core cluster fades out before the
  camera passes through it, the veil becomes a landing card rather than a blank
  screen, and dead scroll after the last chapter is kept short.
- **Scales with the screen.** The root font size follows viewport width (15px
  at 1280, 26px at 4K) and every size in the stylesheet is in rem.

## Tech stack

- Plain HTML, CSS and JavaScript. No framework, no build step.
- [three.js](https://threejs.org/) 0.173 (WebGL), vendored in `vendor/` so the
  site has no CDN dependency.
- Points use a small custom shader (soft discs, additive blending, size by
  distance); links and the loss curve are `LineSegments` and `TubeGeometry`.
- The backward-pass spine is CSS animation only.
- Hosted on Vercel as static files.

## Features

- Scroll-driven 3D flight with per-layer holds and a speed-reactive field of
  view and streaks.
- Four chapters of résumé content tethered to 3D anchors, plus a loss curve
  with floor grid, epoch ticks, a travelling spark and a live loss readout.
- Signal pulses that carry "data" from each layer into the next.
- Landing card with email, GitHub, LinkedIn and résumé links.
- Readable backward-pass page with a spine: one node per section that lights
  up while the section is in view, and gradient dots falling to a terminal node.
- "Skip intro" for recruiters; a HUD showing chapter, depth, node count and loss.
- Responsive: phone layouts stack cards vertically; reduced-motion users get a
  static field with no pulses or streaks.
- Graceful fallback: if WebGL is unavailable the page still renders as text.

## Project structure

```
index.html      all content: hero, flight overlay (data-layer cards and tags),
                landing card, readable page
style.css       theme tokens, layout, overlay and spine styles (rem-based)
main.js         three.js scene, layer layout, camera keyframes, overlay
                projection, pulses, spine behaviour
vendor/         three.module.js and three.core.js (0.173)
resume.pdf      compiled from the LaTeX résumé
```

Key knobs in `main.js`:

- `LAYERS` — z position, ring radius, node size and colour per chapter, and
  which earlier layer feeds it (`link`).
- `KEYS` — camera keyframes `[p, z, y]`; equal `z` on two rows is a hold.
- `PHASES` — HUD chapter labels by progress.
- `CFG` — node counts, field extent, link distance.

## Running locally

The page uses ES modules, so it must be served over HTTP; opening
`index.html` directly from disk will show only the text.

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Any static server works (`npx serve`,
VS Code Live Server, and so on).

## Testing

There is no test suite; the site is checked by looking at it. A useful
checklist after a change:

1. Open the page in a desktop browser and scroll the whole flight slowly. Each
   chapter title should appear, hold, and hand over to the next without an empty
   stretch or overlapping cards.
2. Jump to a chapter from the console to inspect one spot:
   ```js
   const d = document.querySelector('[data-dive]');
   const goP = p => scrollTo({ top: d.offsetTop + p * (d.offsetHeight - innerHeight) });
   goP(0.185); // education   goP(0.315); // hidden 1   goP(0.425); // hidden 2
   goP(0.55);  // experience  goP(0.85);  // projects   goP(1);     // name card
   ```
3. Click "Skip intro": it should land on the name card, not past it.
4. Scroll the readable page to the bottom: the Contact node on the spine should
   light up.
5. Resize to a phone width (or use device emulation): cards stack in a column,
   titles stay below the nav, nothing overflows horizontally.
6. Check the console: no errors (a missing favicon 404 is expected until one is
   added).
7. Verify every link on the cards and in the readable page opens; links left as
   `href=""` render struck through on purpose until they are filled in.

## Customising

- Text, links and card order: edit `index.html`. Skills are `<span class="tag"
  data-layer="1|2">`; experience cards are `<article class="card"
  data-layer="t">` and read oldest to newest along the curve; projects are
  `data-layer="e"`.
- Chapter pacing: edit `KEYS` in `main.js`.
- Colours: the tokens at the top of `style.css` (`--cyan`, `--violet`,
  `--orange`, `--bg`).
- Résumé: replace `resume.pdf`.

## Deployment

Static files, no build. On Vercel: import the repository, leave Build Command
and Output Directory empty, deploy, then add the domain under Settings →
Domains. Every push to `main` redeploys.

## Credits

Inspired by the scroll-driven black-hole flight on
[samuelpt.com](https://www.samuelpt.com/), rebuilt from scratch around a
neural-network story. Built with three.js.
