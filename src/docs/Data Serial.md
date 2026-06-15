# Data Serial

## Overview

The Data Serial console is a second, independent serial connection that runs alongside the normal Serial Console. The Serial Console carries your program output and the REPL, while Data Serial carries a separate stream of data, so the two never get mixed together.

It can be backed by either of two sources:

- **`usb_cdc.data`** — CircuitPython can expose a *second* USB serial channel on the same board, in addition to the usual console. This is the channel the Connected Variable Widgets use to talk to your code.
- **A separate USB serial device** — any other serial port also works, such as a second microcontroller, a USB-to-UART adapter, or a sensor that streams data over its own USB connection.

The console shows everything received on the data channel, and you can type into it to send characters back over the same channel — just like the Serial Console, but on the data port. The Connected Variable Widgets tool also reads and writes this channel.

## How to Use

### 1. (For `usb_cdc.data`) Turn on the data channel
*If you are connecting a **separate** USB serial device instead, you can skip this step.*

The second USB channel is off by default. Enable it by adding this line to `boot.py` on the board:

```python
import usb_cdc
usb_cdc.enable(console=True, data=True)
```

Because `boot.py` only runs at power-up, you have to **hard-reset** the board after this change (unplug and replug it, or press its reset button) before the data port appears. A soft reboot with `Ctrl-D` will not do it.

The Connected Variable Widgets tool can make this change for you with its **Install Library** action — see the Widgets help page.

### 2. Open the console
Open it from Menu -> Tools -> Data Serial. A tab titled "Data Serial" (or "Not Connected" until a port is chosen) will appear.

### 3. Connect to the port
Connect in any of these ways:

- Menu -> Connect -> Data Serial Port
- The "Connect to Data Serial Port" button shown before a port is selected
- The `≡` menu in the Data Serial tab -> Connect to Data Serial Port

In the browser's port picker, choose the port you want:

- For `usb_cdc.data`, the board shows up as **two** serial ports once the data channel is enabled. The Serial Console talks to the console one; pick the **other** one here.
- For a separate device, just pick that device's port.

### Baud rate
The Data Serial Port connects at the baud rate set in **Serial Console settings -> Data Serial Port baud rate**. The default is `115200`, and you can pick any of the common baud rates from the dropdown. (The main Serial Console always stays at `115200`; this setting only affects the Data Serial Port.)

- For `usb_cdc.data`, the value does not really matter — USB CDC ignores the baud rate — so the default is fine.
- For a **separate USB serial device**, set this to match whatever baud rate the device uses (for example `9600`), otherwise the received data will look like garbage.

### Toolbar Options (`≡` menu)
- **Connect to Data Serial Port**: Connect to (or switch) the data serial device.
- **Clear**: Clear the data displayed in the console. The raw log keeps the full history.
- **Raw Log**: Open a tab showing the raw, unprocessed data.
- **Download Log**: Download everything received, including previously cleared data.

## Notes & Troubleshooting
- Enabling `usb_cdc.data` is a `boot.py` change, and `boot.py` only runs at power up, so you must fully power-cycle the board for the data port to appear. A soft reboot will not apply it.
- After the data channel is on, the board appears as two serial ports. Connect the Serial Console to the console one and Data Serial to the data one; they are separate connections.
- Click into the console and type to send characters to the data port. To send values to a *named connected variable* on the board, use the Connected Variable Widgets tool, which speaks the right protocol over this same channel.
- If no data appears, check that the right port is selected, the device is sending data, and (for `usb_cdc.data`) that the board was hard-reset after editing `boot.py`.
- If the received text is garbled, the baud rate is probably wrong. Set **Data Serial Port baud rate** in Serial Console settings to match your device, then reconnect.
