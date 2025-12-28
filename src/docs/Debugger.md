## Debugger

This debugger is an AST-Based Auto-Instrumentation Debugger. This tool uses structural code analysis to inject debugging logic directly into your script, enabling time-travel debugging and deep state inspection. It supports

* **Step & Continue:** Step moves forward exactly one logical instruction; Continue runs until the next breakpoint.
* **Rewind & Forward (Time-Travel):** You can navigate through the history of execution. 
* **Watch Expressions:** Monitor specific variables or expression.
* **Breakpoints:** Halt execution at specific lines.
* **Conditional Breakpoints:** Halt execution when given condition is met.

---

### Setting Breakpoints in the Editor

Clicking an empty space in the gutter(the vertical margin to the left of the line numbers) will place a breakpoint.
Clicking an existing breakpoint will remove it.

Note
* **Solid Red Dot:** An active breakpoint is indicated by a solid red dot. This signifies that the debugger will pause execution immediately before this line is executed.
* You will also see a comment added to the code. That is how the IDE knows there is a breakpoint on the line.
* For multi-line code blocks, such as multi-line list comprehension, you should add breakpoint to its **first** line.

---

### Configuration Page in the Debugger tool

1. Target Files: Select the specific files you want to track.
    - Only instrumented files will support debug features. Heavy instrumentation can impact performance.
2. Watch Expressions: Define variables or Python expressions you want to track across the entire execution (global) or specifically to some files.
    - You will be able to see the values during the debugging session.
3. Conditional Breakpoints: Define logic strings and the debugger will halt when ANY of the strings are `True`.
    - You can choose to add the condition logic strings to watch expressions.

---

### Debugger Page in the Debugger tool

**Note that for ANY changes, including code changes, watch changes, breakpoint changes, you will need to save files and re-instrument code for a new debugging session.**

Debug control
* **Step**: Advance to the next logical operation.
* **Continue and log**: Run until a breakpoint or the end of the script.
    * All history is logged, and you can rewind to any step in between.
    * Code efficiency will be significantly affected due to state logging.
* **Continue without logging**: Run until a breakpoint or the end of the script.
    * No history is logged, and you will not be able to rewind to steps in between.
    * Code efficiency will be close to native with minimum effects from conditional breakpoints.

Time-Travel
* **Rewind to beginning**: Move to the start of the execution history.
* **Rewind**: Move one step backward in the execution history.
* **Forward**: Move one step forward in the execution history.
* **Forward to Latest**: Jump instantly to the most recent real-time state.

Indicators
* **Time Since Last Pause:** Tracks how long the script has been sitting at the current instruction.
* **Free Memory:** Real-time monitoring of available RAM.

---

### Limitations

- Currently, only root level Python files (files directly under CIRCUITPY drive) are supported.
- The debugger will consume additional memory on your device. If you encounter memory issues, consider reducing the number of files being debugged or simplifying your watch expressions.
- The debugger doesn't support SAMD21(M0) chips due to the lack of json module in CircuitPython for these chips. This chip is also very memory constrained and not recommended in general.