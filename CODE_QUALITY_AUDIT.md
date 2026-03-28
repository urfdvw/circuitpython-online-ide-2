# Code Quality Audit

## Critical

### ~~1. `npm` listed as a runtime dependency~~ ✅ Fixed
~~**File:** [package.json](package.json) line 28~~
~~`"npm": "^11.6.0"` is listed under `dependencies`. npm is a package manager, not an app dependency. Remove it.~~

### ~~2. 15 known npm vulnerabilities (8 high-severity)~~ ✅ Fixed
~~Includes XSS in `react-router-dom`, DoS in `diff`, prototype pollution in `lodash-es`, path traversal in `rollup`, and more.~~
`npm audit fix` resolved all 15 vulnerabilities — 0 vulnerabilities remain. `react-router-dom` also removed entirely (unused dependency).

### ~~3. `babel-jest` missing from devDependencies~~ ✅ Removed
Testing infrastructure removed entirely — `jest`, `babel-jest`, `jest-environment-jsdom`, `@babel/core`, `@babel/preset-env`, `jest.config.js`, and `__tests__/` all deleted.

### 4. Event listeners registered on every render (not in `useEffect`)
- **[src/components/IdeEditor.jsx](src/components/IdeEditor.jsx) lines 313–372** — Ace editor commands and gutter click handlers added on every render. A guard flag (`breakpointHandlerAttached`) partially mitigates this but is fragile.
- **[src/components/SerialConsole.jsx](src/components/SerialConsole.jsx) lines 100–158** — Same pattern.

### 5. Serial callback registered with no cleanup (memory leak)
**File:** [src/components/XtermConsole.jsx](src/components/XtermConsole.jsx) lines 59–61
`serial.registerReaderCallback("terminal", ...)` is never unregistered. Callbacks accumulate on remount.

---

## Medium

### 6. `console.log` debug statements throughout the codebase
32+ files contain leftover debug logs. Prominent examples:
- [src/components/IdeEditor.jsx](src/components/IdeEditor.jsx) — 10+ instances
- [src/components/Debugger.jsx](src/components/Debugger.jsx) — multiple
- [src/hooks/useSerial/](src/hooks/useSerial/) — throughout

Should be removed or gated behind a dev flag.

### 7. `alert()` and `confirm()` used for user feedback
Blocking browser dialogs are used in:
- [src/components/Debugger.jsx](src/components/Debugger.jsx) — lines 134, 136, 148, 155, 156, 186, 189
- [src/components/LibManagement.jsx](src/components/LibManagement.jsx) — lines 154, 218, 226, 227
- [src/utilComponents/react-local-file-system/components/ContentEntry.jsx](src/utilComponents/react-local-file-system/components/ContentEntry.jsx) line 67

Should be replaced with MUI `Dialog` components.

### 8. Silent / empty catch blocks (8 instances)
Errors swallowed with no logging or re-throw:
- [src/utilComponents/react-user-config/useLocalStorage.js](src/utilComponents/react-user-config/useLocalStorage.js) line 11
- [src/utilHooks/useZipStorage.js](src/utilHooks/useZipStorage.js) line 56
- [src/hooks/useSerial/serial.js](src/hooks/useSerial/serial.js) lines 29, 83
- [src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js](src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js) lines 96, 103, 116

### 9. Hardcoded Google Cloud Run endpoint exposed in client code
- [src/utilHooks/useZipStorage.js](src/utilHooks/useZipStorage.js) line 7
- [src/utilHooks/useTextStorage.js](src/utilHooks/useTextStorage.js) line 5

Should use an env variable: `import.meta.env.VITE_PROXY_ENDPOINT`

### 10. No React Error Boundary
Any unhandled render error crashes the entire app. No Error Boundary component exists anywhere in the codebase.

### ~~11. `testEnvironment: "node"` in jest config~~ ✅ Removed
jest.config.js deleted along with all test infrastructure.

### 12. `useSerial` functions recreated on every render
**File:** [src/hooks/useSerial/useSerial.js](src/hooks/useSerial/useSerial.js) lines 28–67
`connectToSerialPort`, `sendDataToSerialPort`, etc. are not wrapped in `useCallback`, causing unnecessary downstream re-renders.

### 13. Cloud function CORS allows all origins
**File:** [proxy cloud function/index.js](proxy%20cloud%20function/index.js)
`Access-Control-Allow-Origin: "*"` — should be restricted to the production domain.

### 14. Oversized components with mixed responsibilities
| File | Lines | Issue |
|---|---|---|
| [src/components/LibManagement.jsx](src/components/LibManagement.jsx) | 623 | Manages bundles, MCU analysis, lib install, and all UI |
| [src/components/Debugger.jsx](src/components/Debugger.jsx) | 557 | Page routing, state, and complex UI |
| [src/components/IdeEditor.jsx](src/components/IdeEditor.jsx) | 444 | Editing, breakpoints, key bindings, file management |

---

## Low / Minor

### 15. Duplicate Ace editor key binding code
Nearly identical command registration in [IdeEditor.jsx](src/components/IdeEditor.jsx) and [SerialConsole.jsx](src/components/SerialConsole.jsx). Should be extracted into a shared custom hook.

### 16. `var` instead of `const`/`let`
Found in:
- [src/components/IdeEditor.jsx](src/components/IdeEditor.jsx) line 152
- [src/utilComponents/react-user-config/useConfig.js](src/utilComponents/react-user-config/useConfig.js) lines 10, 35
- [src/layout/Factory.jsx](src/layout/Factory.jsx) — multiple
- [src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js](src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js) line 142

### 17. `==` instead of `===`
- [src/hooks/useSerial/useSerialCommands.js](src/hooks/useSerial/useSerialCommands.js) line 10
- [src/components/SerialConsole.jsx](src/components/SerialConsole.jsx) lines 48, 74

### 18. `.DS_Store` committed to repo
Should be gitignored and removed: `git rm --cached .DS_Store`

### 19. Missing `rel="noreferrer"` on `target="_blank"` links
- [src/components/Navigation.jsx](src/components/Navigation.jsx) lines 104, 148
- [src/components/ProductPage.jsx](src/components/ProductPage.jsx) lines 274, 285, 298, 316, 339, 348, 357

### 20. `localStorage.getItem` without try-catch
**File:** [src/components/XtermConsole.jsx](src/components/XtermConsole.jsx) line 87
Throws in private browsing mode or when storage is full.

### 21. Build output directory named `docs/`
**File:** [vite.config.js](vite.config.js)
Builds to `./docs` instead of the conventional `./dist`. Misleading — "docs" implies documentation.

### ~~22. Near-zero test coverage~~ ✅ Removed
Testing infrastructure removed intentionally. No tests exist.

---

## Quick Priority Reference

| Priority | Issues |
|---|---|
| ~~Fix now~~ ✅ Done | ~~`npm` as dependency, `npm audit fix`, missing `babel-jest`, `testEnvironment: "node"`~~ |
| Fix soon | Event listeners in render, unregistered serial callback, `alert()`/`confirm()`, silent catches |
| Improve | Debug console.logs, hardcoded endpoint, large components, missing Error Boundary |
| Cleanup | `var`, `==`, `.DS_Store`, missing `rel`, duplicate key bindings |
