# Folder View

## Overview

The **Folder View** tab lets you browse and manage the files on your microcontroller's CircuitPy drive. It is located on the left border on startup.
- Click the label on the border to toggle the display of the **Folder View**.
- Drag the label to move the tab to other tab sets or borders.

## How to Use

Ensure you are connected to the CircuitPy drive before starting.
- To connect to the CircuitPy, please follow "Step 1" in the **Navigation** Tab.
- To connect to the CircuitPy drive directly: Menu -> Connect -> CircuitPy Drive
- To open **Folder View** settings: Settings -> Folder View

### Viewing
- Click on a file to open it in a new Editor tab.
- Click on a folder to explore its contents.
- Use the back arrow at the top of the list to return to the parent folder.
- Click on any folder in the path to navigate back to that specific level.

### Context Menu Actions
For both files and folders:
- Rename
- Duplicate
- Remove

### Toolbar Items
- New
    - File: Add a new file
    - Folder: Add a new folder
- `⟳` Refresh: Re-read the file list from the board. Only shown in USB serial mode, where the list does not refresh on its own.
- `≡`
    - Open CircuitPy Drive: Open another folder
    - Help: Open Folder View Help

### Drag and Drop
- Drag and drop files or folders onto another folder to move them.

## Where the files come from

**Folder View** can read your board two different ways. Choose in **Navigation**, or in Settings -> General -> "Board file access".

- **USB mass storage** (default): files are read through the CIRCUITPY drive mounted on your computer. This is the fastest option and the file list updates on its own. Use it whenever the drive shows up.
- **USB serial**: files are read and written over the REPL instead. Use this when the CIRCUITPY drive is not available. Three differences to expect:
    - Every file operation briefly interrupts the program running on the board. Each one prints a one-line `[IDE] ...` summary in the Serial Console, so a program that stops mid-run is explained rather than mysterious. After a save the board soft-reboots and runs your code again, the same as the drive workflow's auto-reload; after a plain read it stays at the REPL.
    - The file list does **not** update on its own. Press `⟳` after changing files from elsewhere.
    - Open editors do not watch the file on the board, so an outside change is not detected while the tab is open. In practice this rarely matters: the only thing that can change a file behind your back is code running on the board itself. The unsaved marker works normally either way. Close and reopen the tab to pick up an outside change.
    - Scheduled backup and scheduled backup-refresh are disabled, because both read every file on the board. The manual Backup buttons still work.
    - Saving may fail with a read-only error, because while the CIRCUITPY drive is mounted your computer owns write access. Use "Filesystem write access" in the **Navigation** tab: eject the CIRCUITPY drive on your computer, then press "Give write access to CircuitPython".
    - If that is not available on your firmware, the fallback that always works is to put `import storage` and `storage.remount("/", readonly=False)` in `boot.py` and hard-reset the board. Note this stops you editing files by dragging them onto the drive, until you remove those lines.
