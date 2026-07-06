# Let an AI Agent Code With You, Hands on Your Board: The CircuitPython Online IDE Agent Bridge

*A tutorial on setting up a full AI agent workflow for CircuitPython — no MCP servers, no config files, no simulators.*

![Hero image: the IDE with the Agent Bridge on and Claude's side panel open next to a board on the desk](media/hero.png)
<!-- IMAGE PLACEHOLDER: hero shot — browser with CircuitPython Online IDE + Claude side panel, physical board with LED lit on the desk -->

## Background: AI agents are everywhere — except at your workbench

AI coding agents have changed how software gets written. Tools like Claude Code let an agent write code, run it, read the result, and iterate in a loop — and that loop is exactly what makes them so effective. As CircuitPython lead developer Scott Shawcroft put it in his [#CircuitPython2026 post](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026), LLMs used by a client-side agent that "can run commands and relay back the result in a loop" are game changing — with Claude Code as the original example — and the way we write CircuitPython is likely to change with them.

When your code runs on a microcontroller, closing that loop over real hardware is absolutely possible — people do it today — but each of the common setups asks something of you:

### The usual setups, and what they cost

**1. The low-effort route: chat, or simulate.**
The lowest-effort workflow is a chatbot: you describe your wiring, paste code back and forth, run it yourself, and copy the error message back into the chat. It works, but *you* are the loop — the agent never sees the board. One step up is running the agent against a simulator (e.g., Wokwi), and that's genuinely useful ([Espressif's Wokwi + AI debugging write-up](https://developer.espressif.com/blog/2025/10/debugging-embedded-graphics-with-wokwi-and-ai/) is a nice example) — but researchers benchmarking LLMs on embedded tasks have measured the gap you'd expect: emulation environments have limited peripheral fidelity, incomplete timing models, and poor support for real sensor–actuator interaction, so many hardware faults don't show up in software-only testing ([Skilled AI Agents for Embedded and IoT Systems Development](https://arxiv.org/html/2603.19583)). The [EmbedAgent benchmark](https://arxiv.org/pdf/2506.11003) makes the same point from the other direction: code that compiles and flashes cleanly can still misbehave on the device due to timing, peripheral configuration, or hardware-specific edge cases. A simulator is not your photoresistor, your LED, or your wiring.

**2. The full-power route: wire it up yourself with MCP.**
Experts have been giving agents real hardware access for a while, typically through the Model Context Protocol (MCP) — a serial/filesystem MCP server plus a coding agent gets you the real loop. But that power comes with setup work: installing a server, editing JSON config with commands and absolute paths, keeping client and SDK versions in sync, and debugging terse errors when something drifts ([Nearform's MCP tips, tricks and pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/), [Simplescraper's How to MCP guide](https://simplescraper.io/blog/how-to-mcp)). That's a fine trade for a professional dev environment. It's a steep ask for someone whose goal was "make an LED respond to light."

So the **full agent workflow** Scott described — write, run, observe, fix, repeat, against *real hardware* — isn't new. What's been missing is a way to get it at the effort level of the first route with the hardware access of the second. That's the gap this tutorial closes.

## My mission

The CircuitPython Online IDE has always had one mission: **lower the barrier to entry for coding on real hardware.** It runs entirely in the browser — no install, no toolchain. The AI Agent Bridge carries that mission forward: it makes the setup for a full AI agent workflow just as simple — install one browser extension, and the IDE handles the rest.

There's a second principle behind the IDE: **it packs the most valuable microcontroller tools in one place** — a real-time serial plotter, a debugger, library management, a data serial channel with connected-variable widgets. In 2026, a full AI agent workflow *is* one of those most valuable tools, so it should not be missing — and now it isn't.

![Screenshot: the IDE feature overview — plot, debugger, library manager](media/ide-features.png)
<!-- IMAGE PLACEHOLDER: collage or screenshot showing plotter, debugger, and library management panels -->

## Prerequisites

- **Google Chrome** with the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) installed.
- A **Claude subscription** that includes Claude in Chrome.
- A CircuitPython-compatible board (this demo uses a photoresistor and an LED — any board with an analog input and a digital output works).
- The [CircuitPython Online IDE](https://circuitpy.dev) open in Chrome.

That's the whole list. No Python environment, no MCP server, no config file.

## Setup

### Step 1: Turn on the Agent Bridge

Open the **Agent Bridge** tab in the IDE and click the **Agent Bridge** button at the top to turn it **ON**. The bridge is off by default and only works while you keep it on — turning it off instantly revokes the agent's access.

Then **open your board folder** and **connect the serial port** yourself. This part is deliberate: the browser requires a real user click for folder and serial access, so the agent *cannot* grab them on its own. You stay the gatekeeper.

![Screenshot: Agent Bridge tab with the toggle ON, folder opened, serial connected](media/setup-bridge-on.png)
<!-- IMAGE PLACEHOLDER: Agent Bridge tab, toggle in ON state, status showing folder + serial ready -->

### Step 2: Pin your connections in a `.md` doc on the board

Before inviting the agent in, write down your wiring in a small markdown file saved on the board — for example `wiring.md` in the board's root:

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

Time to build something real: **a night light** — when the room gets dark, the LED fades on.

I typed:

> "Use the photoresistor to control the LED: the darker the room, the brighter the LED. Check my wiring doc for the pins."

Here's what the agent did, on its own:

1. **Read `wiring.md`** to learn the pins — no back-and-forth about wiring.
2. **Probed the sensor in the REPL first**: it sent a few lines of code to read `A0` live, covered and uncovered the sensor (well — it asked me to wave my hand over it), and learned the actual light/dark range of *my* room with *my* resistor. This is exactly what a simulator can't give you.
3. **Wrote `code.py`** with a mapping calibrated to those measured values, using PWM to fade the LED.
4. **Soft-rebooted the board and watched the serial output** to confirm it ran cleanly.

I cupped my hand over the photoresistor and the LED glowed to life. Total time: about two minutes, and I never copied a single line of code by hand.

![Photo: hand covering the photoresistor, LED lit up](media/night-light-demo.png)
<!-- IMAGE PLACEHOLDER: photo of the breadboard — hand shading the photoresistor, LED clearly on -->

![Screenshot: the conversation in the Claude panel next to the generated code.py](media/night-light-chat.png)
<!-- IMAGE PLACEHOLDER: side-by-side of the agent conversation and the resulting code.py in the editor -->

### Bonus: the agent plots your data — in the IDE

Then I asked:

> "Plot the light level so I can see it."

The agent read the IDE's plotting guide through the bridge, then updated the code to print the sensor readings in the IDE's plot format. The IDE's built-in serial plotter picked it up immediately — a live, scrolling graph of the room's brightness, drawn by the agent, rendered by the IDE, no external tool involved.

![Screenshot: the IDE plot tab showing the live light-level curve dipping when the sensor is covered](media/agent-plot.png)
<!-- IMAGE PLACEHOLDER: IDE plotter showing the light level trace with a visible dip where the sensor was covered -->

This is the point of packing the tools into the IDE: the agent isn't limited to writing files. It uses the same plotter, library manager, and serial channels you do.

## Q&A

### Who is this for?

- **Beginners** — treat the AI as a patient teacher. Ask it to explain every line it writes, ask "why did that error happen," ask for a gentler version. It has your actual board and your actual output in front of it, so its explanations are grounded, not generic.
- **DIYers and makers** — finish the project without going deep into code. Describe the behavior you want; the agent handles pin setup, library installation, and debugging, and you verify the result on the bench.
- **Experts** — a fast lane for prototyping. Sketch an idea against real hardware in minutes. To be clear about the limits: for large-scale, multi-file software projects, a dedicated coding agent like Claude Code is still the right tool — the Bridge is for the hardware-in-the-loop part of your work, not a replacement for your main development environment.

### How is this different from copying code from a chatbot?

A chatbot **gives answers**; an agent **does work**. With a chatbot, *you* are the agent's hands: you paste code, run it, read the traceback, paste it back, repeat — and every round trip loses context. With the Agent Bridge, the agent runs the loop itself: it tests assumptions in the REPL, reads the real sensor values, sees the real error with full context, and fixes it — while you watch every step happen live in the IDE.

### Is this safe?

Two layers, by design:

1. **Chrome's permission model guards the doors.** Folder access and serial access require a real user click — the agent physically cannot open your folder or connect your board. The bridge itself is off by default, you turn it on per session, and one click turns it off. While it's on, the agent can only touch the folder you opened and the ports you connected — never the rest of your computer.
2. **The IDE's backup tool is your undo button.** Before an agent session, use the IDE's built-in backup to snapshot your board's files. If an experiment goes sideways, restore and try again. Agents are good, but version safety is better.

![Screenshot: the backup tool in the IDE](media/backup-tool.png)
<!-- IMAGE PLACEHOLDER: IDE backup feature UI -->

## Try it

Open [circuitpy.dev](https://circuitpy.dev), plug in a board, flip on the Agent Bridge, and ask for something small — a blink, a sensor readout, a plot. The first time the agent quietly measures your actual sensor in the REPL before writing a single file, you'll understand why the loop has to include the hardware.

---

*References: [Scott's #CircuitPython2026](https://blog.adafruit.com/2026/01/14/scotts-circuitpython2026) · [Skilled AI Agents for Embedded and IoT Systems Development (arXiv)](https://arxiv.org/html/2603.19583) · [EmbedAgent: Benchmarking LLMs in Embedded System Development (arXiv)](https://arxiv.org/pdf/2506.11003) · [Espressif: Debugging Embedded Graphics with Wokwi and AI](https://developer.espressif.com/blog/2025/10/debugging-embedded-graphics-with-wokwi-and-ai/) · [Nearform: Implementing MCP — Tips, Tricks and Pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/) · [Simplescraper: How to MCP](https://simplescraper.io/blog/how-to-mcp)*
