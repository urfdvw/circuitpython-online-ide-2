# Review follow-up — September 12, 2026

This follow-up addresses the review of commit `a1a76aa` (“batch 1”). The earlier
reports describe the initial changes; this document records their corrections.

| Finding | Implemented correction | Evidence |
| --- | --- | --- |
| Editor shortcuts disappear after pop-out/docking | Track the actual ACE instance through onLoad. Register and clean up commands per instance. Gutter listeners, breakpoint styles, newline settings, and syntax annotations follow that instance too. A replacement does not reload disk contents over unsaved text. | Hook replacement tests plus 14 real Chrome checks of initial save, pop-out save, retained text, docking, commands, gutter breakpoint insertion, and runtime errors. |
| Scheduled backup/diff errors repeatedly alert | Shared job handling distinguishes background work. Scheduled errors log and update a visible status; manual failures alert. Same-folder validation also follows this path. | Tests repeat a background failure, check zero alerts, verify visible error state, manual alerts, overlap rejection, and recovery. |
| One unreadable file prevents all comparison | Return readable differences with `complete: false` and an `unreadable` list. An unknown file or subtree is excluded from both sides' added/removed results. The Backup tab explicitly labels incomplete comparisons and lists failed paths. | Tests cover unreadable files, unreadable directories, whole-root enumeration failure, unaffected differences, and complete comparisons. |
| Debugger health blips force configuration page | Target loading is shared by automatic and manual refresh. Transient readiness loss and equivalent handles preserve the session. A genuinely different file source clears old session state and returns to configuration. Initial disconnected state retains the setup page. | Tests cover readiness loss/recovery, equivalent handles, a different board, and stale asynchronous listings. |
| Mounted-drive pacing removed without hardware evidence | Restore 200 ms pacing after mounted-drive create, write, and delete operations. Serial handles retain their existing REPL sequencing without these pauses. Remove obsolete unused deletion aliases. | Existing filesystem tests pass. Real-board timing remains unverified; this conservatively preserves previous pacing rather than claiming the delay is proven necessary. |
| Network-first PWA startup stalls on slow networks | Serve cached resources immediately and revalidate in the background, retained with event.waitUntil. Validate shell content type, title/root markers, and redirect status before installation or replacement. Keep cache ownership restrictions. | Tests verify stalled-network startup, background refresh, offline navigation, invalid HTML rejection, cache failures, and scope isolation. |
| Settings tabs overwrite other tabs' changes | Reread and validate current storage before updates, merge field updates against that state, and subscribe to storage events. Keep failed local updates pending and merge them with subsequent external changes. | Two independent hook instances test different sections, different fields in one section, storage events, quota failure, and recovery. |
| Folder breadcrumbs trigger a render every poll | Preserve the existing path array when its handle chain is unchanged. | Static review and lint. |
| Button blur writes false without a press | Record the variable/sender that actually asserted true. Release only an active press, including cancellation, focus loss, variable change, and unmount. Ignore repeated keyboard presses and non-primary pointer presses. | Tests cover focus-only navigation, keyboard repeats, duplicate release events, and changing the bound variable. |
| Proxy truncates healthy slow downloads after 60 seconds | Separate a 30-second header deadline from a 60-second streaming idle deadline. Every forwarded chunk refreshes the idle deadline; client disconnect still aborts the request. | Real stream tests verify progress lasting beyond a deadline, stalled-stream cancellation, header timeout, and timer disposal. |

The claimed Xterm observer-target change was not a defect: the old terminal
parent and the new container ref identify the same element. This follow-up does
not change that code. Likewise, it does not restore silently skipping unreadable
files. Releasing tree-sitter trees remains correct; `identifyCodeRows` is called
for instrumentation and breakpoint insertion, not on every keystroke.

## Validation

- Full automated suite: **356 passed, 0 failed** (up from 319).
- After the final debugger identity/setup adjustment: all **30 targeted review
  assertions** pass again.
- Real Chrome editor lifecycle: **14 checks passed**, no captured runtime errors.
  This uses the actual React/ACE/PopUp components and an in-memory file, not hardware.
- ESLint: zero errors and warnings. Whitespace check passes.
- Hosted and portable production builds pass. Hosted output is outside tracked
  `docs/`; portable output remains in ignored `dist/`.

## Remaining limitations

- No physical board/USB timing or phone-camera test was performed.
- Cached startup intentionally uses the installed shell for the current visit;
  a successful background refresh is used on a later load. HTML markers reject
  common error/login pages but are not an authentication or integrity guarantee.
- LocalStorage read-modify-write is not an atomic transaction across processes.
  The stale-tab regression is fixed, but truly simultaneous writes can still
  race. Whole-section replacements intentionally replace that section.
- Directory copies and backups remain non-atomic. Source changes do not cancel
  filesystem I/O already executing in a backup job.
- Proxy idle timeout includes periods where downstream backpressure prevents
  forwarding. An entirely stalled/very slow client may still be disconnected;
  continuously progressing downloads no longer have a fixed 60-second ceiling.
- The previously reported Plotly/MapLibre dependency advisories remain unresolved.
  Existing upstream web-tree-sitter build warnings also remain.

Changes are local and uncommitted. No deployment or site publication occurred.
