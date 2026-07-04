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
