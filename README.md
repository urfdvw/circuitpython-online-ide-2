# CircuitPython Online IDE 2

***To use the IDE, please visit https://urfdvw.github.io/circuitpython-online-ide-2. No installation is needed.***

The **CircuitPython Online IDE** is a browser-based IDE (integrated development environment) compatible with Chrome or Chromium-based browsers on any computer, including **Chromebooks**. 
It is primarily designed for educational environments and DIY enthusiasts.
However, anyone working with CircuitPython will find this IDE beneficial.

This IDE includes essential tools and useful features for CircuitPython microcontroller projects, including:
- File browser and management
- Code editor with support for multiple tabs
- Serial Console for communication and the Read-Evaluate-Print Loop (REPL)
- Serial data plotter
- Project backup


## Quick Start

***For More help documents, please visit our [Wiki page](https://github.com/urfdvw/circuitpython-online-ide-2/wiki/).***

### Set up
- Connect your CircuitPython-supported microcontroller board to your computer via a USB cable.
- **Open the [CircuitPython Online IDE](https://urfdvw.github.io/circuitpython-online-ide-2/) in a supported browser (Chrome, Edge, etc.).**
    - In the middle of the IDE, you will see a tab called "Navigation". Follow the steps listed there.
- If you have never installed CircuitPython on this microcontroller, please click on "Step 0. Install CircuitPython" and follow the guide there to install or upgrade CircuitPython.
    - The microcontroller will appear as a USB drive in your computer's file system.
- Click on "Step 1. Open CircuitPy Drive". In the popup file explorer, navigate to the root directory of your microcontroller, then click on 'open folder'.
    - Click on the "allow" button to grant the IDE file editing permissions.
    - Note, you should open the microcontroller drive as a whole instead of sub-folders or any single file.
    - You should now see the files on the microcontroller in the left panel called "Folder View".
- Click on "Step 2. Connect to Serial Port", select your microcontroller, then click on "connect".
    - You will see some system information and running results in the right-side tab called "Serial Console".
- You have now finished the setup process, and you can safely close the "Navigation" tab.
    - You can reopen the Navigation tab by going to Menu bar -> Tools -> Navigation.

### Edit and run script
Once you finish the setup above, the default mode is 'Script mode', which runs the code saved in the microcontroller. To switch back to 'Script mode' from 'REPL' mode (where you see `>>>`, which will be discussed in the next section), click on the `CTRL-D` button in the "Serial Console" tab.

- In "Folder View" (the left panel), click on the file you want to edit.
    - "code.py" is the main Python file that serves as the entry point for all code. You will need to edit it most of the time.
    - An Editor tab will appear.
        - You can drag the tabs around to rearrange them.
- Once you are done with code editing, click on the "Save" button in the Editor tab at the top right corner.
    - This will trigger CircuitPython to soft reboot and run the changed code.
    - You will see running results in the "Serial Console" tab.
    - You can also use the "Serial Console" tab to send data to the microcontroller if your code includes `input()`.
- Once you are done with the project, make sure you have saved everything and close the Online IDE safely.
    - Your saved code will run on the microcontroller once it is connected to a power source like a phone charger or battery.

### REPL

REPL (Read-Evaluate-Print Loop) is a coding mode where you can interact with the microcontroller in real-time. In this mode, you send one or multiple lines of code instead of a whole script to the microcontroller. This piece of code is run immediately after the microcontroller receives it, and the result is displayed after it finishes. The microcontroller will be on halt until you send the next piece of code. While scripts are used as deliverables, REPL mode is often used for quick testing and debugging.

- Click on the `CTRL-C` button on the UI to start REPL mode.
    - You might need to click more than once. Stop when you see `>>>` in the terminal.
- Write one or multiple lines of code in the bottom section of the "Serial Console" tab.
    - When writing multiple lines, use `Shift-Enter` to create a new line.
- Click on the "Send" button in the bottom right corner of the "Serial Console" tab, or hit `Enter` on the keyboard after typing to send the code snippet to the microcontroller.
- When typing code, use the `Up` and `Down` arrow keys on the keyboard to recall command history.


## About

### CircuitPython Online IDE

Version: 2.0.0 Beta

[CircuitPython](https://circuitpython.org/) is a version of Python that runs on microcontrollers and single-board computers. Its development is sponsored by [Adafruit](https://www.adafruit.com/).

The **CircuitPython Online IDE** is a community open-source project published on GitHub Pages under the GPL 3 license. It is developed and maintained by [River Wang](https://github.com/urfdvw).

### Contact Me

For IDE feedback, please check [Feedback and Code Contribution](https://github.com/urfdvw/circuitpython-online-ide-2/wiki/Feedback-and-Code-Contribution). For other communications, please send an email to `urfdvw@gmail.com`. For the latest updates on the IDE and my DIY projects, please follow me on:

-   Twitter: [@River\_\_\_Wang](https://twitter.com/River___Wang)
-   YouTube: [@Riverwang](https://www.youtube.com/channel/UCeunCRTBkjHWynMl4I4le_A)
-   Mastodon: [@Riverwang@fosstodon.org](https://fosstodon.org/@Riverwang)
