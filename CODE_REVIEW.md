# Code quality review — September 12, 2026

> Follow-up: [review corrections and current validation](CODE_REVIEW_FOLLOWUP.md). This report describes the initial review.

This review covered application code, serial filesystem and transport code, the
Python widget helper, service worker, proxy, configuration, build setup, and tests.
Generated bundles and third-party source were assessed through builds and dependency
auditing rather than edited directly. This is a risk-reduction pass, not a claim
that every possible defect has been eliminated.

## Changes made

| Area | Finding and resulting behavior |
| --- | --- |
| File saves | Failed writes could be treated as successful. Writable streams now release on failure, errors propagate to callers, and the editor marks a save complete only after a successful commit. |
| Serial replacement | Replacing a file previously deleted the original before installing the replacement. Writes now stage bytes, preserve the original under an unused recovery name, and attempt rollback if installation fails. Existing temporary/recovery files are preserved. |
| Copy, move, backup | Copy failures could be swallowed before deleting the source; hidden files could disappear during moves; overlapping backups could delete their own input. Errors now stop the operation, moves preserve hidden files, and overlapping source/destination folders are rejected before cleanup. |
| Paths and handles | Reads no longer create files, dotted directory names resolve correctly, edge whitespace is preserved, and serial child names reject traversal. Handles from different serial connections no longer compare equal solely by path. |
| Editor and asynchronous work | Delayed loads and file checks are canceled when obsolete, disk polling cannot replace intervening local edits, and saves are guarded against overlap. Tabs distinguish matching basenames in different folders. Folder health checks and backup work avoid overlapping execution. |
| Serial transport | Sending multiline Python preserves triple-quoted strings and blank lines. UTF-8 decoding survives split USB packets. A disconnect affects only its channel, and reconnect never selects another board solely because its USB model identifiers match. |
| Settings and caches | Malformed stored settings fall back to validated defaults; storage failures leave session settings usable. Consecutive updates preserve each other. Failed cache replacement no longer deletes a working text cache first. |
| Lifecycle and widgets | Terminal subscriptions, observers, timers, camera tracks, peers, and wake locks have cleanup. Widget input validation and pointer release handling are corrected. Malformed device JSON frames are ignored individually. |
| Debugger and libraries | Failed instrumentation aborts startup; parser trees and writable streams are released; generated Python string keys are quoted safely. Library installation propagates copy failures rather than treating them as missing packages. |
| Proxy and offline app | Proxy destinations and redirect hosts are restricted, requests have bounded timeouts, and stream failures are handled. Service-worker cache cleanup preserves unrelated applications, with network/offline behavior covered by tests. |
| Maintainability | Removed dead hooks, commented-out examples, obsolete implementation-history notes, and misleading save comments. Corrected hook dependencies, extracted small lifecycle/state hooks, and enforced zero lint warnings. |

## Remaining findings

1. **Critical dependency audit findings: Plotly / MapLibre.** Compatible lockfile
   updates reduced `npm audit` from ten findings to two linked critical findings.
   The remaining MapLibre advisory concerns attribution HTML sanitization; the
   fixed release is 6.4.1. The current Plotly dependency chain still resolves an
   affected version. Resolving this needs a compatible Plotly upgrade or a tested
   plotting-bundle change. The app's scatter-plot usage does not establish that
   the installed dependency is safe. See the
   [MapLibre advisory](https://github.com/advisories/GHSA-jrc7-96c5-q579).
2. **Filesystem operations are not power-loss transactions.** A disconnect or
   power loss during a serial replacement can leave `.ide-old` (or a numbered
   variant) containing the original bytes. Multi-file moves and clean backups
   can remain incomplete after interruption. The changes prevent known silent
   failure paths but do not provide a filesystem-wide journal or automatic crash
   recovery.
3. **Long-running sessions can grow memory and processing costs.** Serial logs,
   agent log buffers, and debugger history remain unbounded. Buffer limits need
   coordinated cursor and history semantics; arbitrary truncation would break
   existing consumers.
4. **Debugger transformation has language limitations.** Import rewriting still
   uses regular expressions. Complex Python syntax and imports embedded in
   strings need a broader AST-based transformation before debugger coverage can
   be considered complete.

## Validation

- `npm test`: **319 passed, 0 failed** (baseline: 242).
- `npm run lint`: **0 errors and 0 warnings** (baseline: 25 warnings).
- `git diff --check`: clean.
- Hosted and portable production builds succeed. Hosted validation output was
  written outside the tracked `docs/` deployment directory.
- The three project/test Python source files compile with Python 3.
- Regression coverage includes failed serial replacement and rollback, retained
  recovery bytes, hidden-file moves, overlapping backups, settings corruption,
  cross-connection isolation, malformed transfers, proxy redirects, and offline
  cache ownership.
- An initial Chrome startup check recovered from malformed settings without
  captured runtime errors. Later browser automation became unresponsive; editor
  interaction and visual checks remain incomplete. No physical CircuitPython
  board, USB disconnect cycle, or phone camera connection was tested.
- Production builds retain upstream `web-tree-sitter` warnings about browser
  module externalization and `eval`; these are not lint failures in project code.

Changes are local and uncommitted. No proxy deployment or site publication was
performed.
