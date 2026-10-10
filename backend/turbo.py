"""Turbo / hold-to-repeat for mapped keys.

While a controller button is held, a turbo mapping re-sends its key as a
stream of separate press/release pairs at a fixed rate, so games register
many individual presses instead of one long hold.

Each mapping may carry a ``turbo`` block::

    {
        "enabled": true,
        "rate": 80,            # ms between presses
        "startDelay": 0,       # ms held before the first press
        "endDelay": 0,         # ms to keep repeating after release
        "toggle": false,       # press once to start, press again to stop
        "interruptable": true  # release cuts repeating off immediately
    }

One worker thread runs per active mapping.  Every exit path releases the key
if the worker is mid-press, so a stop for any reason (button released, turbo
disabled, mappings changed, controller unplugged) never leaves a key down.
"""

import sys
import threading
import time

from keyboard_sender import press_key, release_key

# Windows sleeps in ~15.6 ms steps by default, which turns an 80 ms turbo
# into a ~94 ms one.  Ask for 1 ms scheduler resolution while we run; games
# and audio apps do the same.
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.winmm.timeBeginPeriod(1)
    except Exception:
        pass

DEFAULTS = {
    "enabled": False,
    "rate": 80,
    "startDelay": 0,
    "endDelay": 0,
    "toggle": False,
    "interruptable": True,
}

MIN_RATE_MS = 10
# How long each simulated press stays down.  Half the period for fast rates,
# capped so slow rates still read as taps rather than holds.
MAX_DOWN_MS = 50


def read_config(mapping):
    """Return the mapping's turbo settings with defaults filled in, or ``None``
    when turbo is not enabled for it."""
    raw = mapping.get("turbo")
    if not isinstance(raw, dict) or not raw.get("enabled"):
        return None
    cfg = dict(DEFAULTS)
    cfg.update({k: raw[k] for k in DEFAULTS if k in raw})
    try:
        cfg["rate"] = max(MIN_RATE_MS, int(cfg["rate"]))
        cfg["startDelay"] = max(0, int(cfg["startDelay"]))
        cfg["endDelay"] = max(0, int(cfg["endDelay"]))
    except (TypeError, ValueError):
        cfg["rate"], cfg["startDelay"], cfg["endDelay"] = DEFAULTS["rate"], 0, 0
    cfg["toggle"] = bool(cfg["toggle"])
    cfg["interruptable"] = bool(cfg["interruptable"])
    return cfg


class _Worker(threading.Thread):
    def __init__(self, key, cfg, on_done):
        super().__init__(daemon=True)
        self.key = key
        self.cfg = cfg
        self._on_done = on_done
        self._stop_now = threading.Event()      # abort, even mid-press
        self._finish = threading.Event()        # stop after the current cycle
        self._end_timer = None
        self._lock = threading.Lock()

    # -- control ----------------------------------------------------------
    def request_stop(self, immediate):
        """Stop repeating.  Honours ``endDelay`` first unless ``immediate``."""
        with self._lock:
            if self._end_timer is not None:
                return  # already winding down
            delay = self.cfg["endDelay"] / 1000.0
            if immediate and delay == 0:
                self._stop_now.set()
                return
            # Non-interruptable or delayed stop: let the current cycle finish.
            if delay == 0:
                self._finish.set()
                return
            self._end_timer = threading.Timer(delay, self._finish.set)
            self._end_timer.daemon = True
            self._end_timer.start()

    def cancel_pending_stop(self):
        """The button was pressed again during ``endDelay``: keep going."""
        with self._lock:
            if self._end_timer is not None:
                self._end_timer.cancel()
                self._end_timer = None
            self._finish.clear()

    def kill(self):
        with self._lock:
            if self._end_timer is not None:
                self._end_timer.cancel()
        self._stop_now.set()

    @property
    def stopping(self):
        return self._stop_now.is_set() or self._finish.is_set() or self._end_timer is not None

    # -- loop -------------------------------------------------------------
    def run(self):
        period = self.cfg["rate"] / 1000.0
        down = min(period / 2.0, MAX_DOWN_MS / 1000.0)
        key_down = False
        try:
            if self.cfg["startDelay"]:
                if self._stop_now.wait(self.cfg["startDelay"] / 1000.0):
                    return
                if self._finish.is_set():
                    return
            # Schedule against absolute deadlines so timer jitter on one
            # cycle does not accumulate into a slower overall rate.
            next_press = time.perf_counter()
            while not self._stop_now.is_set() and not self._finish.is_set():
                press_key(self.key)
                key_down = True
                if self._stop_now.wait(down):
                    break
                release_key(self.key)
                key_down = False
                next_press += period
                remaining = next_press - time.perf_counter()
                if remaining <= 0:
                    next_press = time.perf_counter()  # fell behind; resync
                    continue
                if self._stop_now.wait(remaining):
                    break
        finally:
            if key_down:
                release_key(self.key)
            self._on_done(self)


class TurboEngine:
    """Owns the worker threads for every turbo mapping currently repeating."""

    def __init__(self, on_start=None, on_stop=None):
        self._workers = {}  # (button, key) -> _Worker
        self._lock = threading.Lock()
        self._on_start = on_start
        self._on_stop = on_stop

    @staticmethod
    def _id(mapping):
        return (mapping.get("button"), str(mapping.get("key")))

    def is_running(self, mapping):
        with self._lock:
            w = self._workers.get(self._id(mapping))
            return w is not None and w.is_alive() and not w.stopping

    def button_pressed(self, mapping, cfg):
        """Handle the controller button going down for a turbo mapping."""
        mid = self._id(mapping)
        with self._lock:
            w = self._workers.get(mid)
            alive = w is not None and w.is_alive()
            if cfg["toggle"] and alive and not w.stopping:
                w.request_stop(immediate=cfg["interruptable"])
                return
            if alive:
                if w.stopping and w._stop_now.is_set():
                    # Dying worker; replace it.
                    alive = False
                else:
                    w.cancel_pending_stop()
                    return
            if not alive:
                w = _Worker(mapping["key"], cfg, self._worker_done)
                self._workers[mid] = w
                w.start()
        if self._on_start:
            self._on_start(mapping)

    def button_released(self, mapping, cfg):
        """Handle the controller button going up for a turbo mapping."""
        if cfg["toggle"]:
            return  # only another press stops toggle mode
        with self._lock:
            w = self._workers.get(self._id(mapping))
            if w is None or not w.is_alive():
                return
            w.request_stop(immediate=cfg["interruptable"])

    def stop_all(self):
        """Abort every repeat immediately and release any held key."""
        with self._lock:
            workers = list(self._workers.values())
            self._workers.clear()
        for w in workers:
            w.kill()
        for w in workers:
            w.join(timeout=0.5)

    def _worker_done(self, worker):
        mapping = None
        with self._lock:
            for mid, w in list(self._workers.items()):
                if w is worker:
                    del self._workers[mid]
                    mapping = {"button": mid[0], "key": mid[1]}
                    break
        if mapping and self._on_stop:
            self._on_stop(mapping)
