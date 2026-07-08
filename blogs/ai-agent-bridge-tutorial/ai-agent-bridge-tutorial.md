# Coding CircuitPython with AI Agent: The Easiest Setup

*A tutorial on full AI agent workflow with **CircuitPython Online IDE***

![Hero image: the IDE with the Agent Bridge on and Claude's side panel open next to a board on the desk](media/hero.png)
<!-- IMAGE PLACEHOLDER: hero shot showing the browser with CircuitPython Online IDE and the Claude side panel, plus a physical board with LED lit on the desk -->

## Background: Current State of AI Agent workflow for CircuitPython

The trend of AI-assisted coding is already affecting how we code for microcontrollers. [It is easy to ask LLM (Large Language Model) chatbots questions about CircuitPython and copy the code snippets to the microcontroller.](https://medium.com/@gene.arnold/%EF%B8%8F-building-a-simon-says-game-with-chatgpt-and-a-raspberry-pi-pico-1806f3314e8b) And if there are any errors, we naturally paste the error message from the REPL back to the chatbot. [Some chat environments went one step further and can interpret CircuitPython code](https://adafruit-playground.com/u/dexter_starboard/pages/circuitpython-and-chatgpt-code-interpreter), but they are still blind to real hardware such as sensors and motors.

AI coding **agents**, on the other hand, have changed how software gets written. As CircuitPython lead developer Scott Shawcroft put it in his [#CircuitPython2026 post](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026), LLMs used by a client-side agent that "can run commands and relay back the result in a loop" are game changing. He then envisioned the upcoming trend for the CircuitPython workflow: "we need to create the 'agentic' feedback loop for best results. We let the LLM auto-load code and give it the serial output back. We should also give it context about recent CircuitPython changes and API references so it can correct its knowledge."

The **full agent workflow** Scott described  isn't new. Experts have been giving agents real hardware access for a while ([ohararp-g's Reddit post](https://www.reddit.com/r/circuitpython/comments/1ollo56/comment/o1pzbz0/) is one example), typically through the Model Context Protocol (MCP). A serial/filesystem MCP server plus a coding agent gets you the real loop. But that power comes with setup work: installing and configuring MCP servers for code, the REPL, libraries, and more. That's a fine trade for a professional dev environment. It's a steep ask for learners and hobbyists.

What people have been asking for is a way to get it at the effort level of the first route with the hardware access of the second. That's the gap closed by the AI Agent Bridge feature of CircuitPython Online IDE (https://circuitpy.dev).

## Prerequisites

- **Google Chrome** with the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) installed.
- A **Claude subscription** that includes Claude in Chrome.
- A CircuitPython-compatible board.

Note that everything is running in the browser, so nothing to install and config on your local computer.

## Setup

### Step 1: Turn on the Agent Bridge

Open the **Agent Bridge** tab in the IDE and click the **Agent Bridge** button at the top to turn it **ON**. The bridge is off by default and only works while you keep it on. Turning it off instantly revokes the agent's access.

Then **open your board folder** and **connect the serial port** yourself. This part is deliberate: the browser requires a real user click for folder and serial access, so the agent *cannot* grab them on its own. You stay the gatekeeper.

![Screenshot: Agent Bridge tab with the toggle ON, folder opened, serial connected](media/setup-bridge-on.png)
<!-- IMAGE PLACEHOLDER: Agent Bridge tab, toggle in ON state, status showing folder + serial ready -->

### Step 2: Pin your connections in a `.md` doc on the board

Before inviting the agent in, write down your wiring in a small markdown file saved on the board, for example `wiring.md` in the board's root:

```markdown
# Wiring
- Photoresistor: voltage divider into A0 (10kΩ to GND)
- LED: D5 through 220Ω resistor to GND
```

This tiny habit pays off big: the agent reads the files on your board, so it discovers your pin assignments on its own instead of guessing or asking. Your wiring doc becomes shared ground truth between you, the agent, and any future session.

![Screenshot: wiring.md open in the IDE editor](media/wiring-doc.png)
<!-- IMAGE PLACEHOLDER: editor showing wiring.md with the pin table, folder tree visible on the left -->

### Step 3: Copy and run the system prompt

Click **Copy System Prompt** in the Agent Bridge tab, open the Claude side panel in Chrome, and paste it as your first message. You only do this once per conversation.

The prompt teaches the agent everything: how to call the IDE's tools, to check your connection first, to experiment in the REPL before writing files, to install libraries from the board's CircuitPython bundle, and to read the plotting guide before drawing plots. The agent will confirm your setup and ask what you'd like to build.

![Screenshot: Claude side panel after pasting the system prompt, agent confirming connection status](media/system-prompt.png)
<!-- IMAGE PLACEHOLDER: Claude side panel showing the pasted prompt and the agent's "connected, what shall we build?" reply -->

## Demo: a night light, built by conversation

Time to build something real: **a night light**. When the room gets dark, the LED fades on.

I typed:

> "Use the photoresistor to control the LED: the darker the room, the brighter the LED. Check my wiring doc for the pins."

Here's what the agent did, on its own:

1. **Read `wiring.md`** to learn the pins, so there was no back-and-forth about wiring.
2. **Probed the sensor in the REPL first**: it sent a few lines of code to read `A0` live, covered and uncovered the sensor (well, it asked me to wave my hand over it), and learned the actual light/dark range of *my* room with *my* resistor. This is exactly what a simulator can't give you.
3. **Wrote `code.py`** with a mapping calibrated to those measured values, using PWM to fade the LED.
4. **Soft-rebooted the board and watched the serial output** to confirm it ran cleanly.

I cupped my hand over the photoresistor and the LED glowed to life. Total time: about two minutes, and I never copied a single line of code by hand.

![Photo: hand covering the photoresistor, LED lit up](media/night-light-demo.png)
<!-- IMAGE PLACEHOLDER: photo of the breadboard with a hand shading the photoresistor and the LED clearly on -->

![Screenshot: the conversation in the Claude panel next to the generated code.py](media/night-light-chat.png)
<!-- IMAGE PLACEHOLDER: side-by-side of the agent conversation and the resulting code.py in the editor -->

### Bonus: the agent plots your data, right in the IDE

Then I asked:

> "Plot the light level so I can see it."

The agent read the IDE's plotting guide through the bridge, then updated the code to print the sensor readings in the IDE's plot format. The IDE's built-in serial plotter picked it up immediately, showing a live, scrolling graph of the room's brightness, drawn by the agent and rendered by the IDE, with no external tool involved.

![Screenshot: the IDE plot tab showing the live light-level curve dipping when the sensor is covered](media/agent-plot.png)
<!-- IMAGE PLACEHOLDER: IDE plotter showing the light level trace with a visible dip where the sensor was covered -->

This is the point of packing the tools into the IDE: the agent isn't limited to writing files. It uses the same plotter, library manager, and serial channels you do.

## Q&A

### Who is this for?

- **Beginners** can treat the AI as a patient teacher. Ask it to explain every line it writes, ask "why did that error happen," ask for a gentler version. It has your actual board and your actual output in front of it, so its explanations are grounded, not generic.
- **DIYers and makers** can finish the project without going deep into code. Describe the behavior you want; the agent handles pin setup, library installation, and debugging, and you verify the result on the bench.
- **Experts** get a fast lane for prototyping. Sketch an idea against real hardware in minutes. To be clear about the limits: for large-scale, multi-file software projects, a dedicated coding agent like Claude Code is still the right tool. The Bridge is for the hardware-in-the-loop part of your work, not a replacement for your main development environment.

### How is this different from copying code from a chatbot?

A chatbot **gives answers**; an agent **does work**. With a chatbot, *you* are the agent's hands: you paste code, run it, read the traceback, paste it back, repeat, and every round trip loses context. With the Agent Bridge, the agent runs the loop itself: it tests assumptions in the REPL, reads the real sensor values, sees the real error with full context, and fixes it, all while you watch every step happen live in the IDE.

### Is this safe?

Two layers, by design:

1. **Chrome's permission model guards the doors.** Folder access and serial access require a real user click, so the agent physically cannot open your folder or connect your board. The bridge itself is off by default, you turn it on per session, and one click turns it off. While it's on, the agent can only touch the folder you opened and the ports you connected. It never reaches the rest of your computer.
2. **The IDE's backup tool is your undo button.** Before an agent session, use the IDE's built-in backup to snapshot your board's files. If an experiment goes sideways, restore and try again. Agents are good, but version safety is better.

![Screenshot: the backup tool in the IDE](media/backup-tool.png)
<!-- IMAGE PLACEHOLDER: IDE backup feature UI -->

## Try it

Open [circuitpy.dev](https://circuitpy.dev), plug in a board, flip on the Agent Bridge, and ask for something small, like a blink, a sensor readout, or a plot. The first time the agent quietly measures your actual sensor in the REPL before writing a single file, you'll understand why the loop has to include the hardware.

---

*References: [Scott's #CircuitPython2026](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026) · [Espressif: Debugging Embedded Graphics with Wokwi and AI](https://developer.espressif.com/blog/2025/10/debugging-embedded-graphics-with-wokwi-and-ai/) · [Nearform: Implementing MCP, Tips, Tricks and Pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/) · [Simplescraper: How to MCP](https://simplescraper.io/blog/how-to-mcp)*
