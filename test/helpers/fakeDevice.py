# A stand-in CircuitPython device, so the injected Python is really executed
# rather than only string-compared.
#
# Reads {"code": ...} JSON lines on stdin, execs each block against ONE
# persistent namespace (so `f = open(...)` survives across execs, exactly like a
# raw REPL session does), and replies {"out": ..., "err": ...}.
#
# `os` and `open` are redirected into a sandbox directory, so a device path like
# '/code.py' means the sandbox root and a test can never touch the real disk.
import sys, os as _os, json, io, types, traceback

ROOT = _os.environ["FAKE_DEVICE_ROOT"]


def _m(p):
    p = str(p)
    if p.startswith("/"):
        p = p.lstrip("/")
        return _os.path.join(ROOT, p) if p else ROOT
    return _os.path.join(ROOT, p)


# CircuitPython's os is a subset; only expose what deviceOps.js is allowed to use.
fake_os = types.ModuleType("os")
fake_os.listdir = lambda p="/": _os.listdir(_m(p))
fake_os.stat = lambda p: _os.stat(_m(p))
fake_os.mkdir = lambda p: _os.mkdir(_m(p))
fake_os.remove = lambda p: _os.remove(_m(p))
fake_os.rmdir = lambda p: _os.rmdir(_m(p))
fake_os.rename = lambda a, b: _os.rename(_m(a), _m(b))
fake_os.sync = lambda: None
sys.modules["os"] = fake_os


def fake_open(p, mode="r", **kw):
    return io.open(_m(p), mode, **kw)


NS = {"__name__": "__main__", "open": fake_open, "os": fake_os}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    code = json.loads(line)["code"]
    buf = io.StringIO()
    real_stdout, sys.stdout = sys.stdout, buf
    err = ""
    try:
        exec(compile(code, "<device>", "exec"), NS)
    except BaseException:
        err = traceback.format_exc()
    finally:
        sys.stdout = real_stdout
    print(json.dumps({"out": buf.getvalue(), "err": err}), flush=True)
