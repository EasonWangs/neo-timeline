# Repository Guidelines

## Project Structure & Module Organization
- `index.html` provides entry links to timelines.
- `timeline.html` is the main viewer page and loads data based on query params.
- `timeline.js` contains rendering logic and interactions (Snap.svg-based SVG drawing).
- `timeline.css` styles the timeline layout and SVG elements.
- `data/` holds timeline datasets as `*.json5` (e.g., `data/science.json5`).

## Build, Test, and Development Commands
This is a static frontend with no build pipeline.
- Open `index.html` directly in a browser for a quick check.
- For local requests that require `fetch`/XHR, run a static server, for example:
  - `python3 -m http.server 8000` then visit `http://localhost:8000/index.html`.

## Coding Style & Naming Conventions
- JavaScript is plain ES5/ES6 without a linter; keep changes consistent with existing patterns.
- Indentation is 2 spaces in HTML/CSS/JS.
- Use lowerCamelCase for variables/functions in `timeline.js` (e.g., `drawRuler`, `createPopup`).
- Keep CSS class names lowercase with hyphens where needed (e.g., `connection-popup`).

## Testing Guidelines
- No automated tests are present.
- Manual verification steps:
  - Load `index.html`, click several links, and verify timelines render.
  - Check at least one dataset from `data/` with different layouts (horizontal/vertical).

## Commit & Pull Request Guidelines
- Recent commit history uses short, imperative messages (often Chinese). Keep messages concise and descriptive (e.g., “数据更新”, “fix ruler spacing”).
- PRs should include:
  - A short summary of changes.
  - Screenshots or GIFs for visual changes to timelines.
  - The dataset name(s) touched, if applicable (`data/*.json5`).

## Data & Configuration Notes
- `timeline.html` expects `name` and `title` query params, e.g. `timeline.html?name=science&title=科学史`.
- New datasets should follow existing `data/*.json5` structure and be linked from `index.html`.
