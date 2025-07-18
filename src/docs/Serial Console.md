## Toolbar

### Serial Title

The Serial Title indicates the status of CircuitPython:

- Compatible with CircuitPython version 8 and above.
- Versions 7 and below will not display a title.

### Buttons

- **CTRL-C**: Send a "Ctrl-C" signal to the microcontroller (BRK, Break execution)
- **CTRL-D**: Send a "Ctrl-D" signal to the microcontroller (EOF, Restart Execution)

- Options in the Three Dots `≡` menu:
  - **Connect to Serial Port**: Connect to a new serial device.
  - **Clear**: Clear received serial data displayed in the console.
  - **Download Log**: Download all received data, including previously cleared data.
  - **Settings**: Open Serial Console Settings.
  - **Help**: Open Serial Console Help.

## How to Use

The Serial Console allows you to send and receive character input with your running program,
or interact with the Python REPL (Read-Evaluate-Print Loop) for testing and debugging.

Data received from the microcontroller will appear in the console. To send data to the microcontroller,
click to set focus in the Serial Console window and type.

### Using the Clipboard

Select text in the console and use the mouse right click menu to copy data into the clipboard.
Since CircuitPython reserves the Control key for special purposes,  Ctrl-C cannot be used to copy into the clipboard.
See Keyboard Shortcuts below for details.

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

The IDE has a mini-editor in the Serial Console to allow you to compose a multi-line code snippet and send it to be executed all at once in the REPL.

To use the snippet editor, you must first be in the python REPL.
Use Ctrl-C to stop the current execution and make sure you see the triple caret prompt before starting:

```python
>>>
```

To view the snippet editor, select the "Py" button in the bottom right corner of the Serial Console.
You will see a line editor open. By default, pressing Enter will allow you to add another line of code.
Pressing Shift-Enter (or the "SEND" button) will send the entire snippet to the microcontroller surrounded by a call to `exec()`.
