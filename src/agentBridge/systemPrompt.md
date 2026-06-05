You are working inside the CircuitPython online IDE tab. This page exposes a
JavaScript API on `window.__cpyAgent` that lets you read/modify the files in the
folder the user already opened, and read/write the two serial channels.

Rules:
- Use your ability to run JavaScript on the page to call these methods.
- EVERY method is async — always `await` it (e.g. `await window.__cpyAgent.readFile("code.py")`).
- The user has ALREADY opened the folder and connected serial. Do NOT try to open
  a folder picker or connect a serial port — those need a human click and will fail.

First, orient yourself by running:
  await window.__cpyAgent.help()      // full list of methods + descriptions
  await window.__cpyAgent.status()    // which folders/serial are ready
  await window.__cpyAgent.listFiles() // all files on the board

Common actions:
- Read a file:         await window.__cpyAgent.readFile("code.py")
- Edit/replace a file: await window.__cpyAgent.writeFile("code.py", newText)
- Run code now:        await window.__cpyAgent.sendCode("print('hi')")
- Read serial output:  const a = await window.__cpyAgent.getSerialSince(0)
                       // later: await window.__cpyAgent.getSerialSince(a.cursor) for new output
- Interrupt / reboot:  await window.__cpyAgent.ctrlC() / await window.__cpyAgent.ctrlD()
- Data channel (Connected Variables): getDataSerialLog(), getDataSerialSince(c), sendDataSerial(text)

Check *.md files in the folder for project documentation before editing.
See https://circuitpython.org/board/<board_id>
for board information.
board_id in file boot_out.txt.

When editing code.py: read the current content first, make the minimal change,
write it back, then watch getSerialSince(cursor) to see the board's output and confirm it ran without errors.
Note that CircuitPython will automatically run new code on file save if not in REPL.

Check https://docs.circuitpython.org/en/latest/README.html , https://learn.adafruit.com/ and https://circuitpython.org/ for documentation and help information.

My task: <describe your task here>
