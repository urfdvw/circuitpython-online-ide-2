## Code Editor
The CircuitPython Online IDE uses [Ace](https://ace.c9.io/) as its code editor, providing a wide range of coding features.

### Keyboard Shortcuts
For basic Code Editor shortcuts, please check the [Ace Editor Default Keyboard Shortcuts](https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts).

Below are CircuitPython-related shortcuts. *MacOS shortcuts in parentheses.*

System Related:
- [Ctrl-S] ([Cmd-S]): Save the file.
- [Ctrl-Shift-C] ([Ctrl-C]): Send a "ctrl-c" signal to the microcontroller.
- [Ctrl-Shift-D] ([Ctrl-D]): Send a "ctrl-d" signal to the microcontroller.

REPL Mode Specific:
- [Ctrl-Enter] ([Cmd-Enter]): Run the current cell.
    - Cells are defined as multiple lines of code starting with `#%%`.
    - If there are no cell markers, the whole file is treated as a single cell.
- [Shift-Enter]: Run the current line or selected lines of code.
- [Alt-Enter] ([Option-Enter]): Run and remove the current line or selected lines of code.

## Toolbar

### Title
- Path: The full path of the file. This is useful when multiple files have the same name in the working directory.
- **(unsaved changes)** indicator: Appears when the file content differs from the text in the Code Editor. Usually happens during editing or due to file changes outside the IDE.
    - The star icon, ⚝, in the tab title serves the same purpose.
- **(deleted)** indicator: Appears when the opened file is no longer accessible, possibly due to deletion, relocation, or renaming. This can also occur if the working directory is missing, such as when the microcontroller is accidentally unplugged from the USB port.

### Buttons
- **SAVE**: Save the file, which will trigger auto run in CircuitPython by default.
- `≡`
    - **Pop Up**: Detach this tab into a standalone window, useful for multi-monitor setups.
    - **Help**: Open Editor Help
    - **Settings**: Open Editor Settings