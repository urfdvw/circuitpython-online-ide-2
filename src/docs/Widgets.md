# Connected Variable Widgets

## Overview

Connected Variable Widgets let you build a little control panel for your project. You drop sliders, buttons, color pickers, and readouts onto a canvas, point each one at a variable-like data structure in your CircuitPython program, and then watch and change those variables live while the code runs.

The widgets talk to the board over a second USB serial channel called `usb_cdc.data`. That is a separate port from the REPL and Serial Console, so your controls and your normal program output stay out of each other's way.

People usually reach for this to tune a value on the fly like brightness or speed, fire off an action with a button, keep an eye on a sensor reading, or pick a color for an LED.

## How to Use

We will refer to the IDE panels as widgets and the data class in python as connected variables.

### 1. Open the tool
Open it from Menu -> Tools -> Widgets. You will also want the CIRCUITPY drive open in Folder View, because the tool needs it to install the library and to save your layouts.

### 2. Install the library (once per board)
Open the `≡` menu and click Install Library. That copies `connected_variables.py` onto the board and adds `usb_cdc.enable(console=True, data=True)` to `boot.py` so the data channel turns on.

Since `boot.py` only runs when the board powers up, you have to hard-reset the board afterward (unplug and replug it, or press its reset button) before the data port shows up. A soft reboot will not do it.

### 3. Connect the data serial port
Once the board is back, open Menu -> Connect -> Data Serial Port, or click Connect Data Serial in the tool, and pick the board's second serial port. Nothing syncs until the data port is connected.

### 4. Expose variables in your code
In your CircuitPython code, import the helper, define a few connected variables, and call `heart_beat()` inside your loop so the board and IDE stay in sync.

```python
from connected_variables import connected_variables as cv
import time

cv.define("brightness", 0.5)    # define a connected variable with initial value
cv.define("br_input", 1.0)

while True:
    cv.heart_beat()             # syncs everything with the IDE with rate limit
    br_new = 0.1 * cv.br_input  # read value like any normal variable
    br_new += 0.9 * cv.brightness 
    cv.brightness = br_new      # assign value like any normal variable
    time.sleep(0.1)
```

You read a connected variable with `cv.name`, and you assign value to it in the same way.
Before each connected variable read, serial cache will be read to variable. 
After each connected variable assignment, its value will be sent to widget by serial.
`heart_beat()` is to regularly du a full sync of read and write.

### 5. Add and arrange widgets
Click Edit to open the form, add a widget, pick its Type, and set its Variable name to one of the names you defined in code, such as `brightness`. Click Back when you are done to return to the canvas, where you can drag the widgets around. Lock layout holds them in place.

When you like the arrangement, save it from `≡` -> Save Widgets, which stores it as `/ide/widgets.json` on the board, and bring it back later with Load Widgets. The IDE also loads your saved layout automatically the next time.

### The widgets you can add
- **Display** just shows a variable's value, and you cannot edit it.
- **Set** gives you a box to type a value and send it, and you pick whether it is an int, float, string, bool, or json.
- **Slider** lets you drag a number within a range, and it both sends changes and follows the variable.
- **SliderReadOnly** is the same idea but only shows where the value currently sits.
- **Cursor** is a 2D pad that sends an X and Y within the bounds you set. Value in the format `[x, y, buttondown]`
- **ColorPicker** lets you pick a color and sends it as `[r, g, b]`.
- **Button** sends `True` while you hold it down and `False` when you let go.

## Notes & Troubleshooting
- After you turn on the data channel, the board shows up as two serial ports. The Serial Console talks to the console one and the widgets talk to the data one, so connect whichever you need.
- Turning on the data channel is a `boot.py` change, and `boot.py` only runs at power up, so you really do need to fully power-cycle the board. A soft reboot with Ctrl-D will not apply it.
- The name in your code and the name in the widget have to match exactly. If they do not, the board just ignores the update.
- A widget sends a value in whatever type the variable already has, so a value going to an int variable gets turned into an int. Give each variable a sensible starting value of the right type in your code.
- The short `cv.x = ...` way of making a brand new variable only works on full CircuitPython builds. On smaller boards, use `cv.define("x", ...)` instead.
- If nothing is updating, walk back through the setup. Check that CIRCUITPY is open, the library is installed, the board was hard-reset, data serial is connected, and `heart_beat()` is running in your loop.
