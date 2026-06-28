# CLAUDE.md

Guidance for working in this repository.

## Architecture

- **`src/App.jsx` is an assembly layer only — no business logic belongs there.** It wires
  together hooks, context providers, and layout. Any non-trivial logic (state machines,
  event handlers, effects, computations) must live in a dedicated hook under `src/hooks/`
  (or an appropriate utility/component module), and be consumed from `App.jsx` via a single
  call. Example: the unsaved-changes guards live in
  [src/hooks/useUnsavedGuards.js](src/hooks/useUnsavedGuards.js), not inline in `App.jsx`.
