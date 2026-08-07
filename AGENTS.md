# Repository Guidelines

## Project Overview

Neo Timeline is a Vite-built, multi-page frontend for rendering JSON5 timeline datasets as layered Snap.svg graphics. The application supports horizontal and vertical layouts, keyboard navigation, draggable timeline panning, a floating toolbar, viewport scaling, PNG export, and responsive reflow.

## Project Structure & Module Boundaries

- `index.html`: dataset directory and entry links.
- `timeline.html`: viewer shell, SVG layer containers, and toolbar markup. It accepts `name` and `title` query parameters.
- `timeline-page.js`: page entry point. It loads JSON5 with `import.meta.glob`, creates the timeline, connects toolbar callbacks, handles viewport reflow, and displays load errors.
- `timeline-toolbar.js`: toolbar DOM state and interactions, including dragging, zoom buttons/shortcuts, layout switching, save state, and status messages. Keep it timeline-implementation agnostic by using callbacks.
- `timeline-actions.js`: non-core actions that operate on the public timeline instance, currently view scaling and PNG export.
- `timeline.js`: core Snap.svg rendering, timeline state, selection/navigation, panning, connections, layer sizing, and reflow. `initializeTimeline()` returns the public instance API used by other modules.
- `timeline-utils.js`: DOM-free utility functions for config normalization, dates, coordinate orientation, ruler intervals, text shaping, and selection indices. Keep these functions pure and independently testable.
- `timeline.css`: viewer, SVG layer, popup, and floating-toolbar styles.
- `data/*.json5`: timeline datasets loaded on demand by filename.
- `scripts/validate-data.js`: CI data parser and structural validator.
- `tests/unit/`: Vitest tests for pure utilities.
- `tests/e2e/`: Playwright browser regression tests.
- `vite.config.js`: Vite multi-page build configuration for `index.html` and `timeline.html`.
- `playwright.config.js`: browser-test server and runtime configuration.

Preserve these dependency directions:

- `timeline-page.js` coordinates `timeline.js`, `timeline-toolbar.js`, and `timeline-actions.js`.
- `timeline-toolbar.js` communicates through callbacks; it should not import the renderer.
- `timeline-actions.js` consumes the timeline instance API; export and scaling logic do not belong in the core renderer.
- `timeline.js` may use `timeline-utils.js`; utilities must not depend on DOM, Snap.svg, or renderer state.

## Setup, Development, and Build Commands

Install the locked dependency set:

```bash
npm ci
```

Run the Vite development server:

```bash
npm run dev
```

Then open `http://localhost:5173/index.html`, or a viewer URL such as:

```text
http://localhost:5173/timeline.html?name=science&title=科学史
```

Other commands:

```bash
npm run build          # production build in dist/
npm run preview        # serve the production build locally
npm run validate:data  # parse and structurally validate all data/*.json5
npm test               # run Vitest unit tests
npm run test:e2e       # run Playwright browser tests
```

Do not use direct `file://` loading or `python3 -m http.server` as the normal workflow. Vite supplies module resolution, JSON5 asset loading, and the production build behavior used by CI.

## Coding Style & Conventions

- Use ES modules for browser code. `scripts/validate-data.js` remains CommonJS because it runs directly under Node.
- Use 2-space indentation in JavaScript, HTML, CSS, and JSON5.
- Use lowerCamelCase for functions and variables; use descriptive verbs for actions such as `applyViewScale`, `exportTimelinePng`, and `scheduleTimelineReflow`.
- Use lowercase, hyphenated CSS class names. Preserve existing DOM IDs when toolbar or layer code depends on them.
- Do not introduce implicit globals. Renderer-wide mutable values belong in the explicit `state` object.
- Keep layout-independent calculations in logical time/cross-axis coordinates, then convert with `orientPoint()` or `orientRect()` instead of duplicating horizontal and vertical branches.
- Add comments for non-obvious geometry, coordinate conversion, SVG layering, or browser workarounds. Avoid comments that merely restate the code.
- Preserve user data and unrelated working-tree changes. Do not commit generated `dist/`, `node_modules/`, `test-results/`, or `playwright-report/` directories.

## Timeline Data Requirements

- Every `data/*.json5` file must parse as JSON5 and contain a `roles` array; use `roles: []` when no roles exist.
- `periods` and `events` are optional, but when present they must use the expected array structures.
- Comparable `start`/`end` ranges must satisfy `end >= start`. Numeric strings, slash-separated dates, approximate dates prefixed with `~`, and the open-ended `"~"` value are supported where the renderer accepts them.
- Keypoint IDs must be unique within a dataset. Every `to` reference must resolve to an existing keypoint ID, and a keypoint with `to` must have its own ID.
- `groups` must be arrays. Every referenced group must have a matching color in `config.g.colors`.
- Configuration defaults are applied by `normalizeConfig()`. Prefer the smallest dataset-specific config and omit values that match defaults.
- `config.start` is optional. When omitted, the renderer infers it from periods, events, role ranges, and keypoints. An earliest period starts at its exact boundary; other content receives a small aligned leading margin, with extra room for a visible group. Keep an explicit value only when a dataset needs a deliberate crop or custom origin.
- New datasets must be added to `data/`, pass `npm run validate:data`, and be linked from `index.html`.
- Country markers are rendered as emoji from two-letter country codes; do not reintroduce external flag-image paths.

## Testing Guidelines

Run checks in proportion to the change:

- Data-only changes: `npm run validate:data` and a browser check of the affected dataset.
- Pure utility changes: `npm test` and add or update focused tests in `tests/unit/`.
- Renderer, toolbar, action, or page changes: `npm test`, `npm run test:e2e`, and `npm run build`.
- Before committing any substantial change: run `npm run validate:data` and `git diff --check`.

For visual or interaction changes, manually verify at least one horizontal and one vertical dataset. Also exercise the relevant regression path, such as keypoint navigation, connection toggling, viewport resize, zoom/layout switching, or PNG export. Confirm the browser console has no new application errors.

Playwright starts Vite at `http://127.0.0.1:43173` according to `playwright.config.js`. Keep browser tests deterministic and target user-visible behavior rather than private implementation details.

## CI and Deployment

`.github/workflows/static.yml` runs on pushes and pull requests targeting `main`. Its validation job installs dependencies, validates every JSON5 dataset, runs unit and browser tests, and builds with Vite. Only non-PR runs upload `dist/` and deploy it to GitHub Pages.

Changes must not bypass this sequence or deploy raw repository files.

## Commit & Pull Request Guidelines

- Use short, imperative commit messages; concise Chinese messages match the current history.
- Keep commits scoped to one coherent fix or refactor.
- PRs should summarize behavior changes, list affected datasets, and report the commands used for verification.
- Include screenshots or GIFs when layout, rendering, toolbar, export, or other visible behavior changes.
