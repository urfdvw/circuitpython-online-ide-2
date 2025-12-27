## Debugger

This debugger is an AST-Based Auto-Instrumentation Debugger. This tool uses structural code analysis to inject debugging logic directly into your script, enabling time-travel debugging and deep state inspection.

The debugger provides a suite of tools that go beyond standard line-by-line execution:

* **Step & Continue:** Standard execution control. Step moves forward exactly one logical instruction; Continue runs until the next breakpoint.
* **Rewind & Forward (Time-Travel):** Because this is an instrumented debugger, you can navigate through the history of execution. If you miss a bug, simply use Rewind to see the state of variables in the past.
* **Breakpoints:** Halt execution at specific lines to inspect the environment.
* **Watch Expressions:** Monitor specific variables or complex logic (e.g., x + y) in real-time as you navigate through code history.
* **Conditional Breakpoints:** Set a breakpoint that only triggers if a specific logic condition is met (e.g., i > 100), saving you from clicking Continue through long loops.

---

### Setting Breakpoints in the Editor

To manage breakpoints directly in the code Editor:

* **Action:** Click in the gutter (the vertical margin to the left of the line numbers).
* **Toggle:** Clicking an empty space in the gutter will place a breakpoint. Clicking an existing breakpoint will remove it.

Note
* **Solid Red Dot:** An active breakpoint is indicated by a solid red dot. This signifies that the debugger will pause execution immediately before this line is executed.
* You will also see a comment added to the code. That is how the IDE knows there is a breakpoint on the line.
* For multi-line code blocks, such as multi-line list comprehension, you should add breakpoint to its first line.

---

**Would you like me to add a section on how to clear all breakpoints at once, or perhaps a "Keyboard Shortcuts" list?**

---

### Configuration Page

Before starting a debug session, use the Config Page to define the scope of the instrumentation.

#### 1. Target Files

Select the specific files you want to track.
Note: Only instrumented files will support debug features. Heavy instrumentation can impact performance, so only select files relevant to your current bug.

#### 2. Watch Expressions

Define variables or Python expressions you want to track across the entire execution (global) or specifically to some files.
You will be able to see the values during the debugging session.

#### 3. Conditional Breakpoints

Manage your conditional breakpoints here. You can define logic strings and the debugger will stop when ANY of the strings are `True`.
The condition logic strings are automatically added to watch expressions.

---

### Debugger Page

The Debugger Page is your active command center. It is split into three main functional areas.

**Note that for ANY changes, including code changes, watch changes, breakpoint changes, you will need to save files and re-instrument code for a new debugging session.**

#### 1. Debugger Toolbar

Use these buttons to navigate the execution timeline:

| Button | Action |
| --- | --- |
| Step | Advance to the next logical operation. |
| Continue | Run until a breakpoint or the end of the script. |
| Rewind | Move one step backward in the execution history. |
| Forward | Move one step forward in the execution history. |
| Forward to Latest | Jump instantly to the most recent real-time state. |

Indicators

* **Time Since Last Pause:** Tracks how long the script has been sitting at the current instruction.
* **Free Memory:** Real-time monitoring of available RAM.

#### 2. Watch Expressions

A live list showing your Watch Expressions and their values at the exact moment indicated by the current step.

#### 3. File Viewer (Source Code)

The file viewer provides a visual representation of your debugging state:

* **Red Dot:** Indicates an active Breakpoint.
* **Blue Arrow:** Indicates the Current Step. As you Rewind or Forward, this arrow will move to show exactly which line produced the values currently shown in the Expressions View.

---

### Limitations

- Currently, only root level Python files (files directly under CIRCUITPY drive) are supported.
- The debugger will consume additional memory on your device. If you encounter memory issues, consider reducing the number of files being debugged or simplifying your watch expressions.
- The debugger doesn't support SAMD21(M0) chips due to the lack of json module in CircuitPython for these chips. This chip is also very memory constrained and not recommended in general.