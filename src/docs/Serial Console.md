- The **Serial Console** tab is open on startup.
    - Drag the label to move the tab to other tab sets or borders.
- To open **Serial Console** settings: Settings -> Serial Console
- To connect to the serial port, please follow "Step 2" in the **Navigation** Tab.
- To connect to the serial port directly: Menu -> Connect -> Serial Port

## Toolbar
The toolbar is located at the top of the Serial Console tab.

### Serial Title
The Serial Title indicates the status of CircuitPython:
- Compatible with CircuitPython version 8 and above.
- Versions 7 and below will not display a title.

### Buttons

Quick Access:
- **CTRL-C**: Send a "ctrl-c" signal to the microcontroller.
- **CTRL-D**: Send a "ctrl-d" signal to the microcontroller.

Options in the Three Dots `⋮` menu:
- **Clear**: Clear received serial data displayed in the console.
- **Download Log**: Download all received data, including previously cleared data.

## Received Data
The central section displays data received from the microcontroller via the serial port. Currently, interaction with this section is not possible. It will automatically scroll to display new lines of data if you are at the bottom.

## Send Data
The lower part of the Serial Console tab is for sending data or code to the microcontroller.

### Keyboard Shortcuts
*MacOS shortcuts in parentheses.*

- [Ctrl-Shift-C] ([Ctrl-C]): Sends a "ctrl-c" signal.
- [Ctrl-Shift-D] ([Ctrl-D]): Sends a "ctrl-d" signal.
- [Enter]: Inserts a newline in the editor.
- [Shift-Enter]: Sends the code.
- [Up] (when the cursor is at the first line in the editor): Recalls earlier command history.
- [Down] (when the cursor is at the last line in the editor): Recalls later command history.

Note:
- For additional help and options, refer to the **Serial Console** settings in the **Settings** tab.
- Keyboard shortcuts function only when the send data editor is active.

## How to Use

- For guidance on using the REPL (Read-Evaluate-Print Loop) in the Serial Console, refer to [[Quick Start|Quick Start#REPL]].
- If you need to send raw data to the microcontroller running serial communication code (e.g., using `input()`), it is recommended to switch the "Send mode" setting to "text" in the **Settings** tab.
