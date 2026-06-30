# Plot

## Overview

The Plot tab turns numbers your CircuitPython code `print()`s over the **serial console** (the
REPL channel) into a live chart. You control everything from code by printing special marker
lines. There are two modes:

- **Plot** — a real-time time-series (one or more curves), started with `startplot:`.
- **Animation** — frame-by-frame drawing of lines and dots, started with `startanimation:`.

You can also configure the chart from code with `plotsettings:`. The Plot tab opens
automatically the first time it sees a `startplot:` or `startanimation:` command.

## How to Use

### Rules (read these first)

- Markers are **case-sensitive** and **lowercase**, and each is the first thing on its line:
  `startplot:`, `plotsettings:`, `startanimation:`, `startframe:`, `line:`, `dot:`, `drawframe:`.
- In `print("startplot:", "a", "b")`, `print` joins the arguments with spaces, so the board emits
  `startplot: a b`. That is the expected on-wire format.
- **Label names contain no spaces** — use `_` (e.g. `t_cos`, not `t cos`).
- **Data is numbers only.** A data line is either space-separated numbers (`1.0 2.0 -3`) or a
  parenthesized tuple (`(1.0, 2.0, -3)`). Non-numeric lines are ignored.
- A **new session starts on `soft reboot`** (Ctrl-D / reset). Only the latest session is shown, so
  re-running your code starts a clean chart.
- **Settings**: the most recent `plotsettings:` wins and is merged over the tab's defaults
  (your code overrides the manual Settings tab while it's present).
- **Animation**: a frame is only drawn when you print `drawframe:`. `dot:` takes a single `x y`.
  `line:` takes alternating `x y x y …` and connects **all** of those points into one polyline —
  it is **not** limited to two points: 2 points draw a single segment, and 3 or more points draw a
  multi-segment curve. Set axis limits (below) so the view doesn't rescale between frames.

### Plot mode — `startplot:`
```
startplot: xname y1name y2name ...
```
Print it once. Every following data line is one timestep: `xdata y1data y2data ...` (or a tuple).
- With **"Use first column as x-axis"** on (or `{"x_axis": true}`), the first column is the x-axis
  and the rest are y-curves.
- Otherwise every column is a parallel y-curve plotted against its sample index.

### Configure from code — `plotsettings:`
```
plotsettings: {"key": value, ...}
```
A single-line JSON object. Accepted keys (type, default):

| Key | Type | Default | Meaning |
|---|---|---|---|
| `show_legend` | boolean | `true` | Show the legend. |
| `x_axis` | boolean | `false` | Use the first column as the x-axis (else index). |
| `truncate` | boolean | `false` | Keep only the most recent points. |
| `history_len` | number | `100` | Max points kept when `truncate` is on. |
| `enable_axis_limits` | boolean | `false` | Fix the axis ranges (recommended for animation). |
| `x_min` / `x_max` | number | `-5` / `5` | X-axis range when limits are enabled. |
| `y_min` / `y_max` | number | `-5` / `5` | Y-axis range when limits are enabled. |

### Animation — `startanimation:`
```
startanimation:                       # optional: startanimation: {"enable_axis_limits": true, ...}
```
Then repeat, once per frame:
```
startframe:                  # begin a frame; the element lines below belong to it
line: x0 y0 x1 y1 x2 y2 ...  # ONE polyline connecting all the given points (2 points = a
                             # single segment; add more x y pairs for a multi-point curve).
                             # Print several "line:" lines for several separate lines per frame.
dot: x y                     # a single point (zero or more dots per frame)
drawframe:                   # render this frame now (the canvas replaces the previous frame)
```
Pace the animation from your code with `time.sleep(...)` between frames — the IDE simply shows the
latest fully-drawn frame.

A single `line:` can describe a whole shape. For example, a closed triangle is one line through
four points (the last repeats the first to close it):
```
line: 0 0 1 0 0.5 1 0 0
```

### Examples

Basic plot:
```python
"""Plot example — select/unselect "Use first column as x-axis" to compare."""
import math
from time import sleep

print('startplot:', 't_cos', 't_sin', 't_nsin')   # one column-label line, no spaces in names
N = 100
for x in range(N):
    sleep(0.05)
    t = 2 * math.pi / (N - 1) * x
    print(t * math.cos(t), t * math.sin(t), t * math.sin(-t))   # one row of data per line
```

Configure from code:
```python
# legend off, fixed y range, keep only the last 200 points
print("plotsettings:", '{"show_legend": false, "truncate": true, "history_len": 200, "enable_axis_limits": true, "y_min": -1.5, "y_max": 1.5}')
print("startplot:", "signal")
import math, time
i = 0
while True:
    time.sleep(0.02)
    print(math.sin(i / 10)); i += 1
```

Animation (lines + dots, frame by frame):
```python
import math, time

# fix the view so frames don't jump around
print("startanimation:", '{"enable_axis_limits": true, "x_min": -1.2, "x_max": 1.2, "y_min": -1.2, "y_max": 1.2}')

angle = 0
while True:
    print("startframe:")
    # a clock hand from the centre to the rim
    print("line:", 0, 0, math.cos(angle), math.sin(angle))
    # a dot at the tip
    print("dot:", math.cos(angle), math.sin(angle))
    print("drawframe:")
    time.sleep(0.05)
    angle += 0.1
```

Mu-editor-compatible tuples:
```python
import time, random
print("startplot:")
while True:
    time.sleep(0.05)
    print((random.randint(0, 100), random.randint(-100, 0), random.randint(-50, 50)))
```

## Notes & Troubleshooting
- Keep the Plot tab open while data streams for a live chart (it also opens itself on the first
  plot command).
- If nothing shows: confirm the marker is exactly `startplot:`/`startanimation:` (lowercase) and
  that data lines are numbers only.
- For animation, remember `drawframe:` — without it a frame is never rendered.
- Plot is compatible with the [Mu editor serial plotter](https://codewith.mu/en/tutorials/1.2/plotter).
