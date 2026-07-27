# CLAUDE.md

Guidance for working in this repository.

## Architecture

- **`src/App.jsx` is assembly only — it contains no real logic.** Its job is to wire
  together hooks, context providers, and layout; nothing more. Any non-trivial logic
  (state machines, event handlers, effects, data fetching/parsing, computations) must live
  in a dedicated hook under `src/hooks/` (or an appropriate utility/component module), and
  be consumed from `App.jsx` via a single call. If you find yourself writing a `useEffect`,
  an `async` function, or a non-trivial computation directly in `App.jsx`, extract it.
  Examples:
  - Unsaved-changes guards live in [src/hooks/useUnsavedGuards.js](src/hooks/useUnsavedGuards.js).
  - Board info (reading/parsing `boot_out.txt`) lives in
    [src/hooks/useBoardInfo.js](src/hooks/useBoardInfo.js), consumed as
    `const boardInfo = useBoardInfo(rootFolderDirectoryReady, rootDirHandle);`.
  Neither is inlined in `App.jsx`.

## Build targets

`npm run build` produces two targets from [vite.config.js](vite.config.js):

- `npm run build:docs` → `docs/`, the GitHub Pages site: the `viteSingleFile` html plus the
  `public/` assets copied next to it. This is the only target that builds outside `dist/`.
- `npm run build:portable` → `dist/circuitpython-online-ide-<version>.html` (version from
  [package.json](package.json)), the portable single file offered on the Release page and
  documented in [src/docs/Use without Internet.md](src/docs/Use without Internet.md). Any
  further target also builds into `dist/`.

The portable file has to work when it is downloaded on its own and opened over `file://`, so
the `portableSingleHtml()` plugin embeds everything the app would otherwise fetch from
`public/` (the tree-sitter wasm, the product page screenshots, the favicon) as data URIs, and
drops the PWA manifest link; [src/main.jsx](src/main.jsx) skips the service worker when
`import.meta.env.MODE === "portable"`. **New code that references a `public/` asset by path
needs a matching rule in `portableSingleHtml()`** — nothing else catches a reference that only
resolves on the hosted site.
