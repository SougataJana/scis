# SC&IS Silver Jubilee Symposium — website

PHP 8.4 site (no framework, no build step). 27–28 Nov 2026 · JNU, New Delhi.
Three.js (r0.187) and Lenis are vendored locally — nothing to install except PHP.

## Run locally
    php -S 127.0.0.1:8080 -t public
Open http://127.0.0.1:8080 .

Deploy: point the web root at `public/`. `src/` and `views/` stay outside the web root.

## Structure
    public/index.php             page assembly (event facts live at the top)
    src/Programme.php            sessions, talks, days  ← edit the programme here
    src/compat.php               array_find/array_any fallbacks (native in 8.4) + e() escaper
    views/*.php                  one file per section (hero, about, glance, programme, register …)
    public/assets/js/app.js      module: smooth scroll (Lenis), reveals, HUD, tabs, session sheet
    public/assets/js/gl/         WebGL (Three.js)
        stage.js                 page-wide background — scroll flies the camera cell → DNA → protein → network → field → burst
        bio.js                   scientific models: cell, DNA, protein (α/β cartoon + ligand), network, burst
        specimen.js              small models for the At-a-glance tabs (cell, skeleton clock, globe, scientists around a DNA helix, delegate badge)
        sessions.js              one bespoke model per session (see below)
        common.js                renderer, bloom, glow points, noise helpers
    public/assets/js/fx.js       click effects for a few buttons (data-fx = burst|ring|radar|helix|fold)

## Session models (click a session)
| Session | Model |
|---|---|
| 1 Omics | DNA double helix + single-cell UMAP cloud condensing into clusters |
| 2 Structural Biology & Drug Discovery | ribbon protein with a ligand docking, hydration shell |
| 3 Mathematical Biology & Statistical Modelling | Lorenz attractor (RK4), three trajectories + diverging ensemble |
| 4 AI in Computational Biology | sequence tokens with self-attention arcs → neural-network forward pass → predicted protein structure coloured by pLDDT confidence |
| 5 Plant Bioinformatics | an 84-tip phylogeny grows from its root inside an annotated genome ring — scrolling residue alignment, expression heat-map, gene density, sequencing reads landing and stacking as coverage, annotation beam |
| 6 Complex Systems | starling murmuration at dusk — 1,500 flapping birds following local alignment/cohesion/separation rules, with a falcon passing through; the flock splits, merges and flows (no graphs, no text) |
| 7 Molecular Biophysics | protein-folding energy funnel with Langevin-like trajectories |

## Scene per section
`data-scene="N"` on a section: 0 cell · 1 DNA · 2 protein · 3 network · 4 field · 5 burst.

## Notes
- Respects `prefers-reduced-motion` (no smooth-scroll, calmer 3D). If WebGL is unavailable the page falls back to a static gradient.
- Adaptive quality: pixel ratio and bloom drop automatically on slow GPUs.


## Scroll choreography
- Camera flies through the 3D scenes as you scroll; scroll **velocity** adds warp streaks, a field-of-view stretch, a bloom surge and a slight roll.
- Section titles are scroll-scrubbed word by word (they reveal and un-reveal with the scroll position).
- Cards drift into place with scroll-driven depth (Safari 26 / Chrome); they squash slightly under fast scrolling.

## Cursor
Atom cursor (desktop only): the orange nucleus is the true pointer, the electron cloud trails it. Over buttons/links the orbits widen and warm up; over session buttons and speaker cards it re-forms as a spinning ball-and-stick molecule; over body text it shrinks; a ring ripples out on click; fast scrolling stretches the orbits.

## Speakers backdrop
A "galaxy of voices": seven spiral arms (one per session colour) of speaker nodes joined by constellation links, cross-field bridges and travelling pulses (`makeField` in `gl/bio.js`).

## Publishing on GitHub Pages
GitHub Pages serves static files only, so the PHP is pre-rendered: `php build-static.php` writes the finished site to `dist/`. The included workflow (`.github/workflows/pages.yml`) does this automatically on every push to `main`. In the repo: Settings → Pages → Source: **GitHub Actions**. Keep running `php -S localhost:8000 -t public` for local editing. (Any PHP host, e.g. cPanel, can instead serve the `public/` folder directly.)

## Publishing on Vercel / Netlify / Cloudflare Pages
Vercel does not run PHP natively, so deploy the pre-rendered site: run `php build-static.php` locally, commit the generated `dist/` folder, import the repo in Vercel (framework: Other). `vercel.json` already points the output directory at `dist` with no build step. Re-run the build and push after each change. (Or run `vercel --prod` from inside `dist/`, or drag the folder onto netlify.com/drop.)

## Update (10 Nov)
- Hero now leads with **25 Years · School of Computational & Integrative Sciences**; "Silver Jubilee Symposium" is the small line above.
- New **Contact** section (nav link + mobile menu): Chief Patron and Patron photos (`public/assets/img/chief-patron.jpg`, `patron.jpg` — replace with higher-resolution files of the same name), Convenor and Co-convenor.
  Add e-mail / phone in the `$people` array in `public/index.php`; empty values are hidden. Footer credit is `$credit` in the same file.
- Cursor: precise dot + hexagon ring. Loader curtain while the 3D stage and fonts load. Gentler, continuous camera travel between scenes.
- Session 5 scene: a genome that grows into a tree (helix trunk, branching canopy of gene nodes, signals rising from the roots).

## Update 2 (10 Nov)
- Hero lock-up follows the poster: **25** with the JNU seal, "Years", then the School name. The three campaign marks (Atmanirbhar Bharat, Developed India Mission 2047, Viksit Bharat) sit top-right of the hero and in the footer (`public/assets/img/campaigns.jpg`, `jnu-logo.png`, both taken from the poster).
- Details → Who shows photos of the Chief Patron, Patron, Convenor and Co-convenor: `public/assets/img/chief-patron.jpg`, `patron.jpg`, `convenor.jpg`, `co-convenor.jpg`. Replace a file (same name) to change a photo.
- Contact section shows only the Convenor's e-mail (`$contact` in `public/index.php`).
- Sections now hand off on scroll: each one recedes (fade, slight scale and blur) as the next arrives (Safari 26 / Chrome; plain elsewhere).

## Update 3 (10 Nov)
- The JNU logo and the three government marks now sit in their own flat strip at the very top of the page (`#idbar`), above the floating links/Register pill — not inside it.
- Footer mark is now Atmanirbhar Bharat + Developed India Mission only (Viksit Bharat removed from the footer; all three remain at the top).
- Venue: Poster session and Gala dinner are at **SC&IS**; every other item (registration, all seven sessions, tea, lunch, valedictory) is at **SAA Auditorium, JNU** (`src/Programme.php`, `views/glance.php`).
- Checked at seven widths from 360px to 1920px: no horizontal overflow, no console errors, header never overlaps hero text.
