## Common Q&A

> Q: Why does it show `OSError: [Errno 5] Input/output error` when I "save and run" my code on MacOS?
- A: This is neither a CircuitPython issue nor an IDE issue. This is a known issue for MacOS 14.0 ~ 14.3 (see [here](https://github.com/adafruit/circuitpython/issues/8449) for more reference). [This post](https://github.com/adafruit/circuitpython/issues/8449#issuecomment-1743922060) provides a workaround that can temporarily solve the issue. It is also suggested to upgrade MacOS to 14.4, which does not encounter this Errno 5, but has another less critical issue of [slow writing speed](https://github.com/adafruit/circuitpython/issues/8918), which is another known issue.

> Q: Why is there a huge delay, like 10 seconds, between when I click on 'save and run' and when the script actually runs on MacOS?
- A: This is neither a CircuitPython issue nor an IDE issue. This is a known issue for MacOS 14.4 (see [here](https://github.com/adafruit/circuitpython/issues/8918) for more reference). Currently, there is no solution to this issue yet.

> Q: Why can't I use the IDE with the link `circuitpy.online`?
- A: Please use the longer link https://urfdvw.github.io/circuitpython-online-ide-2 instead.
Some firewall systems might block this short link.
However, the short link is only used to redirect to the long link.
Even though the short link might not work in some situations, the long link will always work.
