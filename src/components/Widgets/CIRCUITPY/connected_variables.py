"""Connected Variables helper for the CircuitPython Online IDE.

Connects on-board variables to IDE widgets over the SECOND USB CDC channel
(``usb_cdc.data``) — a dedicated serial port separate from the REPL/console.
Frames are plain text ``<CV>{json}</CV>``; on (re)connect the board emits a
``<CVSTART>`` session divider so the IDE always has a clean parsing start point.

Requires the data CDC to be enabled in boot.py:

    import usb_cdc
    usb_cdc.enable(console=True, data=True)

(The IDE's "Install Library" does this for you, then asks you to hard-reset.)

Usage (three equivalent ways to create a connected variable):

    from connected_variables import connected_variables as cv

    cv.define("a", 100)     # explicit, works on every board
    cv.b = 1.0              # dot auto-define (CIRCUITPY_FULL_BUILD only)
    cv["c"] = [255, 0, 0]   # item auto-define, works on every board

    while True:
        cv.heart_beat()     # periodically broadcast all variables
        cv.a += 1
        time.sleep(1)
"""

import json, time, usb_cdc

CV_JSON_START = "<CV>"
CV_JSON_END = "</CV>"
CV_SESSION_DIVIDER = "<CVSTART>"
CV_READ_START = "<CVR>"  # read-ack: a write was just dumped from the buffer into the variable
CV_READ_END = "</CVR>"
UPDATE_PERIOD = 0.5


# helper ---------------------------------------------------------------------

def update(d, u):
    """Deep update of a dict."""
    for k, v in u.items():
        if isinstance(v, dict):
            d[k] = update(d.get(k, {}), v)
        else:
            d[k] = v
    return d


class State:
    def __init__(self, val=0):
        self._val = val
        self._last = val

    @property
    def now(self):
        return self._val

    @now.setter
    def now(self, val):
        self._last = self._val
        self._val = val

    @property
    def diff(self):
        return self._val - self._last


# matcher --------------------------------------------------------------------

class TargetMatcher:
    def __init__(self, target=None):
        if target is None:
            self.clear_target()
        else:
            self.target = target
        self.segment = ""
        self.mood = State()

    def push(self, segment):
        result = []
        segment = self.segment + segment
        self.segment = ""
        for i in range(len(segment) - len(self.target), len(segment)):
            if i < 0:
                continue
            tail = segment[i:]
            if tail == self.target:
                break
            if tail == self.target[: len(tail)]:
                self.segment = tail
                segment = segment[: len(segment) - len(tail)]
                break
            else:
                self.segment = ""
        parts = segment.split(self.target)
        for i in range(len(parts)):
            if i != 0:
                self.mood.now = 1
                result.append([self.target, self.mood.now, self.mood.diff])
            if len(parts[i]) > 0:
                self.mood.now = 0
                result.append([parts[i], self.mood.now, self.mood.diff])
        return result

    def clear_target(self):
        self.target = "You shall not pass! (∩๏‿‿๏)⊃━☆ﾟ.*"


class BracketMatcher:
    def __init__(self, begin_str, end_str):
        self.begin_matcher = TargetMatcher(begin_str)
        self.end_matcher = TargetMatcher(end_str)
        self.mood = State()
        self.matcher = self.begin_matcher

    def push(self, segment):
        outlet = []
        parts = self.matcher.push(segment)
        while len(parts) > 0:
            current = parts.pop(0)
            if len(current[0]) == 0:
                continue
            if current[1] == 0:
                outlet.append([current[0], self.mood.now, self.mood.diff])
                self.mood.now = self.mood.now
            else:
                self.mood.now = 1 - self.mood.now
                if self.mood.now == 1:
                    self.matcher = self.end_matcher
                else:
                    self.matcher = self.begin_matcher
                rest = [p[0] for p in parts]
                text = "".join(rest)
                parts = self.matcher.push(text)
        return outlet


def none_fun(text, branch):
    return None


class MatcherProcessor:
    def __init__(
        self,
        matcher,
        in_action=none_fun,
        enter_action=none_fun,
        exit_action=none_fun,
        out_action=none_fun,
    ):
        self.matcher = matcher
        self.in_action = in_action
        self.enter_action = enter_action
        self.exit_action = exit_action
        self.out_action = out_action
        self.through = False
        self.branch = []

    def push(self, parts):
        outlet = []
        for part_in in parts:
            for part_out in self.matcher.push(part_in):
                text = part_out[0]
                mood = part_out[1]
                diff = part_out[2]

                if diff == 1:
                    self.enter_action(text, "".join(self.branch))
                if mood == 1:
                    self.in_action(text, "".join(self.branch))
                    if self.through:
                        outlet.append(text)
                    else:
                        self.branch.append(text)
                if diff == -1:
                    self.exit_action(text, "".join(self.branch))
                    self.branch = []
                if mood == 0:
                    self.out_action(text, "".join(self.branch))
                    outlet.append(text)
        return outlet


# capability probe -----------------------------------------------------------

def _setattr_supported():
    """True when this build honours a user-defined ``__setattr__``.

    ``__setattr__`` is gated behind ``CIRCUITPY_FULL_BUILD``; on reduced
    builds dot auto-define (``cv.x = ...`` on a new name) cannot be
    intercepted, so we fall back to ``define()`` / ``cv["x"] = ...``.
    """
    hit = []

    class _Probe:
        def __setattr__(self, name, value):
            hit.append(1)

    try:
        _Probe().x = 1
    except Exception:
        pass
    return bool(hit)


DOT_AUTODEFINE_SUPPORTED = _setattr_supported()


# variable -------------------------------------------------------------------

class ConnectedVariables:
    # internal attribute names that must NOT be treated as connected variables
    _RESERVED = ("vars", "cv_processor", "last_time_stamp")

    def __init__(self):
        if getattr(self, "_inited", False):
            return

        self.vars = {}
        self.cv_processor = MatcherProcessor(
            BracketMatcher(CV_JSON_START, CV_JSON_END),
            exit_action=self.exit_action,
        )
        self.last_time_stamp = time.monotonic()
        self._was_connected = False

        if usb_cdc.data is None:
            print(
                "connected_variables: usb_cdc.data is not enabled. Add to boot.py:\n"
                "    import usb_cdc\n"
                "    usb_cdc.enable(console=True, data=True)\n"
                "then hard-reset the board. (Or use the IDE's 'Install Library'.)"
            )
        else:
            usb_cdc.data.timeout = 0  # non-blocking reads

        if not DOT_AUTODEFINE_SUPPORTED:
            print(
                "connected_variables: this build lacks __setattr__, so "
                "'cv.x = ...' auto-define is unavailable. "
                "Use cv.define('x', ...) or cv['x'] = ... instead."
            )

        self._inited = True

        # best-effort session start (no-op if the IDE data port isn't open yet;
        # heart_beat() will start the session when it later connects)
        self._check_connection()

    # --- data channel I/O ---------------------------------------------------

    def _send(self, text):
        """Write to the data channel, only when the IDE data port is open."""
        data = usb_cdc.data
        if data is not None and data.connected:
            data.write(text.encode("utf-8"))

    def serial_read(self):
        """Read available bytes from the data channel (non-blocking)."""
        data = usb_cdc.data
        if data is None:
            return
        n = data.in_waiting
        if n:
            chunk = data.read(n)
            if chunk:
                self.cv_processor.push([chunk.decode("utf-8")])

    def _check_connection(self):
        """Emit a fresh session divider when the IDE (re)connects the data port."""
        connected = usb_cdc.data is not None and usb_cdc.data.connected
        if connected and not self._was_connected:
            usb_cdc.data.reset_input_buffer()
            self._send(CV_SESSION_DIVIDER)
            self.update()  # push current state to the freshly-connected IDE
        self._was_connected = connected

    # --- bidirectional sync -------------------------------------------------

    def update(self):
        self.serial_read()
        self._send(CV_JSON_START + json.dumps(self.vars) + CV_JSON_END)

    def heart_beat(self):
        self._check_connection()
        # ingest every loop (not only on the throttled broadcast) so read-acks stay prompt
        self.serial_read()
        if time.monotonic() - self.last_time_stamp > UPDATE_PERIOD:
            self.update()
            self.last_time_stamp = time.monotonic()

    def exit_action(self, text, branch):
        try:
            # parse
            serial_updates_dict = json.loads(branch.strip())
            # check
            assert all(
                [key in self.vars for key in serial_updates_dict]
            ), "get unknown variable names from serial"
            # cast type
            for key, value in serial_updates_dict.items():
                serial_updates_dict[key] = type(self.vars[key])(value)
            # echo the update back, then apply it
            self._send(CV_JSON_START + json.dumps(serial_updates_dict) + CV_JSON_END)
            self.vars.update(serial_updates_dict)
            # read-ack: these vars were just ingested (drives the widget indicator + backpressure)
            self._send(CV_READ_START + json.dumps(list(serial_updates_dict)) + CV_READ_END)
        except Exception as e:
            print(e)

    # --- variable creation / access -----------------------------------------

    def define(self, var_name, initdata):
        """Define a connected variable and install a dot-access property.

        Works on every build (property descriptors are universally
        supported), so this is the portable way to create a variable.
        """
        assert type(var_name) == type(""), "var_name should be string"

        def getter(self):
            return self.read(var_name)

        def setter(self, var_value):
            self.write(var_name, var_value)

        prop = property(getter, setter)
        setattr(self.__class__, var_name, prop)
        self.vars[var_name] = initdata
        self.update()

    def read(self, var_names):
        """Read a defined variable, or a list of defined variables."""
        if type(var_names) != type([]):
            var_names = [var_names]
        assert all(
            [type(name) == type("") for name in var_names]
        ), "all names should be strings"
        self.serial_read()
        output = [self.vars[name] for name in var_names]
        if len(output) == 1:
            return output[0]
        return output

    def write(self, var_names, var_values):
        if type(var_names) != type([]):
            var_names = [var_names]
            var_values = [var_values]
        assert all(
            [type(name) == type("") for name in var_names]
        ), "all names should be strings in python"
        assert all(
            [
                type(self.vars[name]) == type(value)
                for name, value in zip(var_names, var_values)
            ]
        ), "variable type does not match in python"
        updates_dict = {name: value for name, value in zip(var_names, var_values)}
        self.vars.update(updates_dict)
        self._send(CV_JSON_START + json.dumps(updates_dict) + CV_JSON_END)

    # --- auto-define via attribute access (full builds only) ----------------

    def __setattr__(self, name, value):
        if name.startswith("_") or name in self._RESERVED:
            object.__setattr__(self, name, value)
            return
        if name in self.vars:
            self.write(name, value)
        else:
            # first assignment to a new name -> auto-define
            self.define(name, value)

    def __getattr__(self, name):
        # only called when normal attribute lookup fails
        if name.startswith("_"):
            raise AttributeError(name)
        _vars = self.__dict__.get("vars", {})
        if name in _vars:
            return self.read(name)
        raise AttributeError(name)

    # --- auto-define via item access (every build) --------------------------

    def __setitem__(self, name, value):
        if name in self.vars:
            self.write(name, value)
        else:
            self.define(name, value)

    def __getitem__(self, name):
        return self.read(name)

    # --- singleton ----------------------------------------------------------

    _instance = None
    _lock = None

    def __new__(cls, *args, **kwargs):
        if cls._lock is None:
            try:
                import _thread

                cls._lock = _thread.allocate_lock()
            except:
                cls._lock = False

        if cls._instance is None:
            if cls._lock:
                with cls._lock:
                    if cls._instance is None:
                        cls._instance = super(ConnectedVariables, cls).__new__(cls)
            else:
                cls._instance = super(ConnectedVariables, cls).__new__(cls)
        return cls._instance


connected_variables = ConnectedVariables()
