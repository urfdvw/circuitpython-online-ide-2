- To open the **Plot** tab: Menu -> Tools -> Plot
- To open **Plot** settings: Settings -> Plot

## Introduction
The plot feature available in the CircuitPython Online IDE is highly beneficial when working with sensors or monitoring variable value changes.

You will need to write CircuitPython code to print data through the `print()` function.
This data will first appear in the **Serial Console**.
The Plot tab is responsible for converting this data into a plot.

## How to Use
- To use the plot feature in the CircuitPython Online IDE, click on Menu -> Tools -> Plot.
    - This will open the Plot tab.
- You need to start the plot by **printing** `startplot: xname y1name y2name ...`, separated by space.
    - In CircuitPython, this is done by `print("startplot:", "xname", "y1name", "y2name")`.
    - No space is allowed in the names; use `_` instead.
- Plot data should immediately follow the start line in the **serial output**. Each line should contain the data for one timestep, `xdata y1data y2data ...`, separated by space.
    - In Python, this is done by `print(xdata, y1data, y2data)`, where `xdata` and similar variables are `int` or `float`.

### Example of plot code

```python
"""
CircuitPython Online IDE Plot example
Select/unselect "Use first column as x-axis" to see the difference.
"""
import math
from time import sleep

# print start indicator -----------------------------------------------
print('startplot:', 't*cos(t)', 't*sin(t)', 't*sin(-t)')
# `startplot:` is the start indicator
# column names separated by `,` in `print()`, no space in names.
# ---------------------------------------------------------------------

N = 100 # number of points to plot
for x in range(N):
    sleep(0.05) # for slower animation, and stable serial communication
    t = 2 * math.pi / (N - 1) * x

    # print a row of data (a dot on the graph) ------------------------
    print(t * math.cos(t), t * math.sin(t), t * math.sin(-t))
    # print plot data
    # column separated by `,` in `print()`
    # -----------------------------------------------------------------
```

## Notes
- The plot can be real-time if you keep the plot tab open while the data is being generated.
