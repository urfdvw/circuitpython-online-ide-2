"""Connected Variables — example code.py (REFERENCE ONLY)

This is a reference example; the IDE's "Install Library" does NOT overwrite your
code.py. Copy what you need into your own code.py.

Prerequisite (done for you by "Install Library", then hard-reset the board):

    # boot.py
    import usb_cdc
    usb_cdc.enable(console=True, data=True)   # second CDC = the data channel

Connected Variables talk to the IDE widgets over that data channel
(usb_cdc.data), completely separate from the REPL. In the IDE, open
Tools -> Data Serial and connect to the board's second (data) port.
"""

import time
from connected_variables import connected_variables as cv

# --- create connected variables (any of these three styles) ---
cv.define("brightness", 50)       # explicit (works on every board)
cv["color"] = [255, 0, 0]         # item auto-define (works on every board)
# cv.speed = 1.0                  # dot auto-define (CIRCUITPY_FULL_BUILD boards only)

while True:
    # push state to the IDE (throttled internally to ~UPDATE_PERIOD) and pull any
    # widget changes; also (re)starts a clean session whenever the IDE connects.
    cv.heart_beat()

    # read the latest values written by widgets and use them
    level = cv["brightness"]
    r, g, b = cv["color"]
    # ... drive your LEDs / motors / etc. with level, r, g, b ...

    time.sleep(0.05)
