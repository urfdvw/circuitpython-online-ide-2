## Version 2.5.2
Released on July 26th, 2026

- **Syntax error highlight**
- **AI Agent Bridge safety**: turning the bridge on is now a deliberate decision rather than a settings checkbox
    - turning it ON requires confirming a native browser dialog, so an agent stops and asks you instead of flipping the switch itself (a guardrail against an agent acting on its own, not a barrier against hostile page script — see the AI Agent Bridge tab for what it does and does not cover)
    - the switch moved out of Settings into a browser-local flag, toggled from the AI Agent Bridge tab
    - new `isBridgeOn()` works even while the bridge is off, so an agent asks you to turn it on instead of failing; every other method refuses to run until then
- **`restoreLayout()`**: the agent puts your layout back after `showCamera()` / `showPlot()` instead of leaving a tab maximized
- Library installs are now version-locked to the board's `boot_out.txt` in code: the whole cache (zip, manifest, and release timestamp) is keyed to the board's version and verified before download and before anything is copied to the board, switching boards re-offers the right bundle, and blocked installs and uninstalls report why instead of reporting success
- An interrupted bundle download is no longer installed from — an incomplete cache, or one whose library manifest failed to download, is detected and re-offered for download
- Fixed a bundle download that could hang forever with the Library Management tab and the AI Agent Bridge both open
- Bug Fixes and Code Quality

## Version 2.5.1
Released on July 12th, 2026

- **AI Agent Bridge vision**: the AI agent can now see for itself
    - `showCamera()` / `showPlot()` bring the Camera or Plot tab to the front, maximized, so the agent can view them through page screenshots
    - `ensureCameraReady()` asks you to start a camera with a small floating card that never blocks the IDE
- Camera **Reset View** now centers the feed at the largest size that fits entirely in the tab, including rotated and low-resolution feeds
- Bug Fixes and Code Quality

## Version 2.5.0
Released on July 4th, 2026

- **AI Agent Bridge**: Exposes the IDE's tools to the AI agent
- Plot tool now supports animation
- Camera tool UI upgrade
- Optimized library download logic
- Editor "unsaved changes" indicator
- Backup directories are saved
- Optimized documentation
- Bug Fixes and Code Quality

## Version 2.4.0
Released on June 15th, 2026

- **Connected Variable Widgets**: Show or change CircuitPython variable values via data serial with Widgets while the code is running. Supported Widgets:
    - variable view/set
    - button
    - slider/meter
    - cursor position
    - color picker
- **Data Serial Terminal** for
    - CircuitPython's data serial
    - separate serial devices
- Optimized documentation
- Bug Fixes and Code Quality

## Version 2.3.1
Released on May 22nd, 2026

- Use your **Phone Camera** in the Camera tab to show your board!
- Add **Marker** to Camera tab
- Bug Fixes and Code Quality

## Version 2.3.0
Released on December 31st, 2025

- **Debugger tool**!!!
    - Stepping Through
    - Watch Expressions
    - Editor Gutter Breakpoints
    - Conditional Breakpoints
    - Time Traveling
- Serial Console
    - Raw log

## Version 2.2.3
Released on November 29th, 2025

- Library Management related enhancement
    - Skip examples in the bundle
    - Added descriptions to list and search
    
## Version 2.2.2
Released on October 30th, 2025

- Board Information related enhancement
    - Added an option to use device ID as title
    - Added CircuitPython upgrade information in the Navigation page.
    - Re-organized Navigation page

## Version 2.2.1
Released on October 30th, 2025

- Serial console related enhancement and bug fix
    - will reconnect when re-plug in microcontroller
    - terminal will remain if connection lost
    - always dark theme option
    - option to soft reboot or not
    - will block sending code snippet if
        - code incomplete
        - repl not ready

## Version 2.2.0
Released on September 16th, 2025

- Lib Management tool!!!
    - One click auto installation
    - Browse and search libs

## Version 2.1.0
Released on July 18th, 2025

- Serial Console rewritten with Xterm
- Progressive Web App
- Performance improvement and bug fixes

## Version 2.0.0 Beta.3
Released on July 12th, 2025

- major rewrite of all code
- help and settings shortcuts in tabs
- plot compatible with mu
- refreshed backup tool

## Version 2.0.0 Beta.2
Released on June 7th, 2024

- added channel control: `dev` and `beta`
- added Widget Tab in the tools in menu bar

## Version 2.0.0 Beta.1
Released on May 15th, 2024

- Bug fixes

## Version 2.0.0 Beta
Released on April 21st, 2024.

- Bug fixes
- Backup Folder feature
- Improved UX
- Documentations are complete

## Version 2.0 Alpha
Released on January 15th, 2024.

[![Version 2.0 alpha release note](https://img.youtube.com/vi/tL8DHhC1H10/0.jpg)](https://www.youtube.com/watch?v=tL8DHhC1H10)

- Retains all features from 1.0 Beta with the exception of:
    - Reflowing serial output text to hide `exec(```Some Code```)`. This functionality is planned for future releases.
    - Serial history related Editor keyboard shortcuts, which are not often used.
        - `Alt-Up` and `Alt-Down`
        - `Alt-Shift-Enter`
- Improvements in:
    - Reliability
    - User Interface interactions
    - Extensibility
    - Maintainability

Please note: Due to the high frequency of bug fixes in the Alpha stage, patch version numbers will not be assigned until the update to Beta.

## Version 1.0 Beta

- IDE: https://urfdvw.github.io/circuitpython-online-ide-1/
- GitHub Repo: https://github.com/urfdvw/circuitpython-online-ide-1

## Version 0.1

- IDE: https://urfdvw.github.io/circuitpython-online-ide-0/
- GitHub Repo: https://github.com/urfdvw/circuitpython-online-ide-0