# Codon Quest

*A browser-based puzzle game for DNA Day (April 25) that teaches the standard genetic code and the consequences of point mutations.*

Codon Quest is a single-page, zero-dependency web game aimed at middle-school and early-high-school audiences. Players encode short English words into DNA using the real standard genetic code, watch a random single-base substitution strike the sequence, and then decode the survivor. The scoring rewards accurate translation; the lesson cards reward understanding *why* the protein changed — or didn't.

## Scientific scope

The game uses the full, unmodified standard genetic code: all 64 codons mapping to the 20 canonical amino acids plus the three stop codons (TAA, TAG, TGA). Words are spelled in amino-acid one-letter codes — the same notation used throughout molecular biology. Because most amino acids are encoded by multiple synonymous codons, the same word is encoded differently across rounds, and students encounter **codon degeneracy** organically.

Three categories of point mutation arise naturally from single-base substitutions and are named explicitly in the post-round explainer:

- **Silent mutations** — the substituted codon still codes for the same amino acid; the protein is unchanged.
- **Missense mutations** — the substituted codon codes for a different amino acid; one residue changes. The explainer cites sickle-cell anemia (E6V in β-globin) as a real-world example.
- **Nonsense mutations** — the substituted codon becomes a premature stop codon; translation halts and the protein is truncated. Duchenne muscular dystrophy is cited as an example.

Frameshifts (insertions and deletions) are intentionally omitted. They are conceptually heavier and warrant a separate lesson once students are fluent with the codon table.

## Gameplay

Each round proceeds through four phases:

1. **Encode.** The game presents a real DNA sequence for a target word. The player reads each codon, selects the corresponding amino-acid letter from a tile pool, and reconstructs the word.
2. **Mutate.** A random single-base substitution strikes one position. The before/after sequences are shown, with the mutated base highlighted.
3. **Decode.** The player reads the mutated DNA in groups of three, consults the collapsible codon reference, and types the new message. Up to three attempts are allowed; a stop codon is entered as `*`.
4. **Score.** The round closes with survival statistics, a mutation-class explainer tied to the specific event that occurred, and a codon-by-codon breakdown showing which positions survived and which did not.

**Scoring.** Ten points per surviving amino-acid position, plus an attempt bonus of 20 / 10 / 5 points for solving on the first / second / third attempt.

## Pedagogical design

An opening tutorial grounds the game in biology before any gameplay begins. It covers what DNA is, the four-base alphabet and complementary pairing (A–T, G–C), a worked encode-and-decode example using real codons, and a square-root-scaled chart comparing genome sizes across *E. coli*, yeast, *Arabidopsis*, human, wheat, and a few outliers. The square-root scaling is deliberate: a linear scale renders *E. coli* (4.6 Mb) invisible next to *Paris japonica* (~150 Gb). The intro is revisitable at any time via the header button.

A teacher-facing note at the bottom of the page summarises the biology and the deliberate scope limitations.

## Design

The interface uses a dark canvas with a subtle radial-gradient backdrop and a slow, low-opacity field of floating bases coloured by nucleotide (A green, T orange, G blue, C pink). Typography pairs *Fraunces* (display), *Inter* (body), and *IBM Plex Mono* (sequences and data). Correct answers trigger a confetti burst anchored to the submit button; incorrect answers shake the game area. All animation is CSS- or canvas-based; no third-party animation libraries are loaded.

A floating codon-reference panel (accessible via the bottom-right action button) exposes the full amino-acid-to-codon mapping, grouped by physicochemical class — hydrophobic, polar, charged, special, and stops.

## Running locally

The game has no build step and no runtime dependency beyond Google Fonts. Because modern browsers enforce CORS on `file://` URLs for some asset types, the recommended way to run locally is via any static file server:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a modern browser. Opening `index.html` directly by double-clicking will also work for this project but is not guaranteed for future additions (e.g. JSON fetches).

## Project structure

```
DNA_Codon_Puzzle/
├── index.html                   Markup and asset references only
├── styles.css                   Full stylesheet (design tokens + components)
├── app.js                       Game logic — codon table, phases, scoring
├── .nojekyll                    Tells GitHub Pages to skip Jekyll processing
├── .github/workflows/pages.yml  Auto-deploy workflow (optional)
├── README.md                    This file
└── LICENSE                      MIT License
```

The three source files are intended as independent layers: `index.html` carries only semantic markup and IDs, `styles.css` owns all presentation (design tokens are declared as CSS custom properties on `:root`), and `app.js` is a single IIFE that closes over the game state and the genetic code table. There are no inline styles or inline handlers, which keeps the CSP story simple if you decide to add one later.

## Deploying to GitHub Pages

The repository is structured so it can be served as-is from GitHub Pages with no build step. Two options:

**Option A — one-click, branch-based (simplest).** Push the repository to GitHub, then navigate to *Settings → Pages* and set *Source* to *Deploy from a branch*, *Branch* to `main`, and *Folder* to `/ (root)`. The site will publish at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

**Option B — GitHub Actions (included).** The provided `.github/workflows/pages.yml` deploys on every push to `main` using the official `actions/deploy-pages` action. To enable it, go to *Settings → Pages* and set *Source* to *GitHub Actions*. No further configuration is required.

The `.nojekyll` file is included so GitHub Pages skips its default Jekyll pipeline — this prevents any future file whose name begins with an underscore from being silently ignored.

All asset references in `index.html` are relative (`styles.css`, `app.js`), so the game works identically when served from a project-scoped path such as `https://username.github.io/DNA_Codon_Puzzle/`.

## Accessibility and compatibility

The layout adapts to narrow viewports with a two-column phase tracker and a stacked header. Interactive elements are keyboard-accessible; the answer input supports Enter to submit. The game has been designed to work without JavaScript frameworks or local storage, so it runs correctly from the filesystem, inside LMS iframes, and on classroom machines with restricted networks (once fonts are cached).

## License

Released under the MIT License. See `LICENSE` for the full text.
