# Coding CircuitPython with AI Agent: The Easiest Setup

*A tutorial on a full AI agent workflow with **CircuitPython Online IDE***

![Hero image: the IDE with the Agent Bridge on and Claude's side panel open next to a board on the desk](media/hero.png)
<!-- IMAGE PLACEHOLDER: hero shot showing the browser with CircuitPython Online IDE and the Claude side panel, plus a physical board with LED lit on the desk -->

## Background: Current State of AI Agent workflow for CircuitPython

The trend of AI-assisted coding is already affecting how we code for microcontrollers. [It is easy to ask LLM (Large Language Model) chatbots questions about CircuitPython and copy the code snippets to the microcontroller.](https://medium.com/@gene.arnold/%EF%B8%8F-building-a-simon-says-game-with-chatgpt-and-a-raspberry-pi-pico-1806f3314e8b) And if there are any errors, we naturally paste the error message from the REPL back to the chatbot. [Some chat environments went one step further and can interpret CircuitPython code](https://adafruit-playground.com/u/dexter_starboard/pages/circuitpython-and-chatgpt-code-interpreter), but they are still blind to real hardware such as sensors and motors.

AI coding **agents**, on the other hand, have changed how software gets written. As CircuitPython lead developer Scott Shawcroft put it in his [#CircuitPython2026 post](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026), LLMs used by a client-side agent that "can run commands and relay back the result in a loop" are game changing. He then envisioned the upcoming trend for the CircuitPython workflow: "we need to create the 'agentic' feedback loop for best results. We let the LLM auto-load code and give it the serial output back. We should also give it context about recent CircuitPython changes and API references so it can correct its knowledge."

The **full agent workflow** Scott described isn't new. Experts have been giving agents real hardware access for a while ([ohararp-g's Reddit post](https://www.reddit.com/r/circuitpython/comments/1ollo56/comment/o1pzbz0/) is one example), typically through the Model Context Protocol (MCP). But that power comes with setup work: installing and configuring MCP servers for code, the REPL, libraries, and more. That's a fine trade for a professional dev environment. It's a steep ask for learners and hobbyists.

What people have been asking for is a way to get it at the effort level of the first route with the hardware access of the second. That's the gap closed by the AI Agent Bridge feature of CircuitPython Online IDE (https://circuitpy.dev).

## What is AI Agent Bridge?

To be clear, the IDE itself doesn't contain any AI element. It exposes itself as a set of tools for the AI agent to use. And the tools are exposed as a set of JavaScript function handles. These functions serve as a bridge between the IDE and the agent.

With that said, the agent also needs to live inside the browser. And the agent we're going to use is Claude in Chrome.

## Prerequisites

- **Google Chrome** with the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) installed.
- A **Claude subscription** that includes Claude in Chrome.
- A CircuitPython-compatible board.

Note that everything is running in the browser, so there's nothing to install or configure on your local computer.

## Example 1: Night Light on Breadboard

In this example, I'm going to show how to use the AI Agent Bridge feature from start to finish to build a simple nightlight project.

### Step 1: Set Up the IDE

Suppose you already have the Claude in Chrome extension installed. We first need to open circuitpy.dev in Chrome. This will open the CircuitPython Online IDE as the website.

Next, we will follow the instructions in the navigation tab, where the first step is to connect the CircuitPy drive, which is the mass storage of the microcontroller. The second step is to connect the serial console, and then you will see a greeting message. These are the setup steps every time you use the Online IDE.

To use the AI agent bridge, we need to open Tools -> AI Agent Bridge, and there is a button to turn it on. Click on that, and you are going to see an indicator on the bottom right corner saying the Agent Bridge is on.

The final step is to open the Claude Chrome extension so that you're going to see the chat interface on the right side.

![Screenshot: Agent Bridge tab with the toggle ON, folder opened, serial connected](media/setup-bridge-on.png)
<!-- IMAGE PLACEHOLDER: Agent Bridge tab, toggle in ON state, status showing folder + serial ready -->

### Step 2: Document the pin connections

Claude in Chrome is a generic agent, so it doesn't know what kind of hardware we are working with. So we need to tell the agent how we connect the circuit. Because the circuit doesn't change that much, we want to document that into a markdown file on the microcontroller.

In this project, we have a breadboard that has a microcontroller, a photoresistor, and an LED on the board.

Let's create a file called `CIRCUIT.md` in the board's root:

```markdown
# Wiring
- Photoresistor: voltage divider into A0 (10kΩ to GND)
- LED: D5 through 220Ω resistor to GND
```

![Screenshot: wiring.md open in the IDE editor](media/wiring-doc.png)
<!-- IMAGE PLACEHOLDER: editor showing wiring.md with the pin table, folder tree visible on the left -->

### Step 3: Copy and run the system prompt

Because the agent is a generic agent, we need to tell it what kind of project we are working on (CircuitPython). We need to tell it how to call the IDE's tools, to check its connection first, to experiment in the REPL before writing files, to install libraries from the board's CircuitPython bundle, and to read the plotting guide before drawing plots. All this information is the same every time you work with the AI Agent Bridge, so I already wrote a system prompt for you to copy.

Click **Copy System Prompt** in the Agent Bridge tab, and paste it into the Claude side panel in Chrome. You only do this once per conversation.

After it reads this system prompt, the agent will confirm your setup and ask what you'd like to build.

![Screenshot: Claude side panel after pasting the system prompt, agent confirming connection status](media/system-prompt.png)
<!-- IMAGE PLACEHOLDER: Claude side panel showing the pasted prompt and the agent's "connected, what shall we build?" reply -->

### Step 4: Build the night light

Time to build something real: **a night light**. When the room gets dark, the LED turns on.

I typed:

> "Use the photoresistor to control the LED: the darker the room, the brighter the LED. Check my wiring doc for the pins."

### Step 5: The agent plots your data, right in the IDE

Then I asked:

> "Plot the light level so I can see it."

The agent read the IDE's plotting guide through the bridge, then updated the code to print the sensor readings in the IDE's plot format. The IDE's built-in serial plotter picked it up immediately, showing a live, scrolling graph of the room's brightness, drawn by the agent and rendered by the IDE, with no external tool involved.

![Screenshot: the IDE plot tab showing the live light-level curve dipping when the sensor is covered](media/agent-plot.png)
<!-- IMAGE PLACEHOLDER: IDE plotter showing the light level trace with a visible dip where the sensor was covered -->

This is the point of packing the tools into the IDE: the agent isn't limited to writing files. It uses the same plotter, library manager, and serial channels you do.

### Conclusion

In this first example, we confirm that the agent has the ability to
- check the latest CircuitPython document
- do experiments in REPL
- write CircuitPython code
- use IDE tools and plotting tools.

## Example 2: M5Stack CardPuter Calculator

M5Stack CardPuter is a fun development board that has a keyboard and screen. So I didn't connect any external peripherals, just used the onboard keyboard and screen to make a calculator. The challenging part is I didn't tell the agent how those onboard peripherals are connected. The screen also needs a library to drive it.

I started from a blank project and used the following prompt to build with the agent:

Prompt:
```text
Make a calculator using the keyboard and screen on this board. The number keys are used for entering a number, and support plus, minus, multiply, and divide. Enter to submit.
```

Follow-up prompt:
```text
I want to support additional keys for the operations:
• A for add
• M for minus
• X for multiply
• D for divide
```

The result is a fully functional, regular math calculator. The agent successfully found a way to capture keyboard input and also installed libraries to drive the screen. You can check the attachment for more details of the result.

In this example, we confirm that the agent has the ability to
- Check external documentation for a specific board regarding the peripheral connections.
- Install the latest version of necessary libraries using the library management tool in the IDE.

## You can also try

In my personal projects, I also use agents to do the following kinds of tasks, which you can use as a reference.
- Explain existing large CircuitPython project code to me.
- Check the code of the existing project, find issues, and fix them.
- Fix code issues caused by upgrading CircuitPython to a newer major version, and also fix all the library dependencies.
- Make animations, not just plot, using the IDE plot tool according to sensor data change.


## Q&A

### Who is this for?

- **Beginners** can treat the AI as a patient teacher. Ask it to explain every line it writes, ask "why did that error happen," ask for a gentler version. It has your actual board and your actual output in front of it, so its explanations are grounded, not generic.
- **DIYers and makers** can finish the project without going deep into code. Describe the behavior you want; the agent handles pin setup, library installation, and debugging, and you verify the result on the bench.
- **Experts** get a fast lane for prototyping. Sketch an idea against real hardware in minutes. To be clear about the limits: for large-scale, multi-file software projects, a dedicated coding agent like Claude Code is still the right tool. The Bridge is for the hardware-in-the-loop part of your work, not a replacement for your main development environment.

### How is this different from copying code from a chatbot?


A chatbot **gives answers**; an agent **does work**. With a chatbot, *you* are the LLM's hands: you paste code, run it, read the traceback, paste it back, repeat, and every round trip loses context. With the Agent Bridge, the agent runs the loop itself: it tests assumptions in the REPL, reads the real sensor values, sees the real error with full context, and fixes it.

### Is this safe?

Two layers, by design:

1. **Chrome's permission model guards the doors.** In the very first step of the IDE setup, we open the microcontroller's specific folder and connect to its specific serial port. When providing them to the agent through the bridge, those are the only things on your computer the agent can see. It never reaches the rest of your computer.

2. **The IDE's backup tool is your undo button.** Before an agent session, use the IDE's built-in backup to snapshot your board's files. If an experiment goes sideways, restore and try again. 

![Screenshot: the backup tool in the IDE](media/backup-tool.png)
<!-- IMAGE PLACEHOLDER: IDE backup feature UI -->

### Why Claude in Chrome?

I evaluated Chrome extensions of AI agents based on the following criteria:
- first-party extension, for security reasons and also no dealing with auth tokens
- can run JavaScript commands on the website
- good at programming

At the moment of writing, Claude in Chrome is the only one that satisfies these criteria. If you find any third-party extensions or AI browsers that you trust, feel free to try them out: they will work in the same way.

CircuitPython Online IDE has no control over the subscriptions. It goes through the AI model providers.

## Try it out now

Open [circuitpy.dev](https://circuitpy.dev), plug in a board, flip on the Agent Bridge, and ask for something small, like a blink, a sensor readout, or a plot. The first time the agent quietly measures your actual sensor in the REPL before writing a single file, you'll understand why the loop has to include the hardware.

---

*References: [Scott's #CircuitPython2026](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026) · [Espressif: Debugging Embedded Graphics with Wokwi and AI](https://developer.espressif.com/blog/2025/10/debugging-embedded-graphics-with-wokwi-and-ai/) · [Nearform: Implementing MCP, Tips, Tricks and Pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/) · [Simplescraper: How to MCP](https://simplescraper.io/blog/how-to-mcp)*
