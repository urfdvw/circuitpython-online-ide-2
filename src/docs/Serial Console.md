## Toolbar

### Serial Title

The Serial Title indicates the status of CircuitPython:

- Compatible with CircuitPython version 8 and above.
- Versions 7 and below will not display a title.

### Buttons

- **CTRL-C**: Send a "Ctrl-C" signal to the microcontroller (BRK, Break execution)
- **CTRL-D**: Send a "Ctrl-D" signal to the microcontroller (EOF, Restart Execution)

- Options in the Three Dots `≡` menu:
  - **Clear**: Clear received serial data displayed in the console.
  - **Download Log**: Download all received data, including previously cleared data.
  - **Help**: Open Serial Console Help
  - **Settings**: Open Serial Console Settings

## How to Use

The Serial Console allows you to send and receive character input with your
running program, or interact with the Python REPL (Read-Evaluate-Print Loop)
for testing and debugging.  All data from the serial port is automatically
sent to the console window. To send data to the microcontroller,
just click to set focus in the Serial Console window and type.  Your input will be sent
interactively a single character at a time.

### Using the Clipboard

On some systems, Ctrl-C is used to copy into the clipboard. Since CircuitPython and Micropython
reserve the Control key for special purposes, use the mouse right click menu to copy data
into the clipboard, or see Keyboard Shortcuts below.

### Keyboard Shortcuts

*MacOS shortcuts in parentheses.*

- [Ctrl-Shift-C] ([Ctrl-C]): Sends a "Ctrl-C" (BRK, Break execution) signal.
- [Ctrl-Shift-D] ([Ctrl-D]): Sends a "Ctrl-D" (EOF, Restart Execution) signal.
- [Up] (when the cursor is at the first line in the editor): Recalls earlier command history.
- [Down] (when the cursor is at the last line in the editor): Recalls later command history.

Note:
For additional help and options, refer to the **Serial Console** settings in the **Settings** tab.

### REPL

For guidance on using the REPL, refer to Quick Start -> REPL.

### Code Snippets

The IDE has a mini-editor in the Serial Console to allow you to compose
a multi-line code snippet and send it to be executed all at once in the REPL.

To use the snippet editor, you must first be in the python REPL. Use Ctrl-C
to stop the current execution and make sure you see the triple caret prompt before
starting.

```
KeyboardInterrupt:

Code done running.

Press any key to enter the REPL. Use CTRL-D to reload.

Adafruit CircuitPython 9.2.8 on 2025-05-28; Metro MIMXRT1011 with IMXRT1011DAE5A
>>>
```

To view the snippet editor, select the "Py" button in the bottom right corner of the
Serial Console. You will see a line editor open. By default, pressing Enter will
allow you to add another line of code and hitting Shift-Enter (or pressing the "SEND" button)
will send the entire snippet to the microcontroller surrounded by a call to `exec()`.
