"""Stick and trigger deadzones for controller emulation.

Worn sticks rarely sit exactly at centre, so a game reading them raw sees a
slow "drift".  With emulation on, every value we mirror onto the virtual pad
passes through here first, the same way Steam Input does it: nothing on the
real controller changes, only what the virtual pad reports.

Sticks use a *radial* (circular) deadzone: the stick's distance from centre is
compared with the deadzone, not each axis on its own, so diagonals don't feel
square.  Past the deadzone the distance is rescaled to start from zero, so the
output ramps up smoothly from the edge of the deadzone instead of jumping, and
full tilt still reaches full output.

Triggers get the same treatment on their 0..255 range.

Settings (sent by the UI, saved with the app settings)::

    {
        "left": 2000,   # left stick, 0..32767 (XInput units)
        "right": 2000,  # right stick, 0..32767
        "lt": 0,        # left trigger, 0..255
        "rt": 0         # right trigger, 0..255
    }
"""

import math

STICK_MAX = 32767
TRIGGER_MAX = 255

DEFAULTS = {"left": 2000, "right": 2000, "lt": 0, "rt": 0}
LIMITS = {"left": STICK_MAX, "right": STICK_MAX, "lt": TRIGGER_MAX, "rt": TRIGGER_MAX}


def read_config(raw):
    """Deadzone settings with defaults filled in and values clamped.

    The highest value is kept one short of the full range so the rescale
    below never divides by zero.
    """
    cfg = dict(DEFAULTS)
    if isinstance(raw, dict):
        for name, limit in LIMITS.items():
            try:
                cfg[name] = max(0, min(limit - 1, int(raw.get(name, cfg[name]))))
            except (TypeError, ValueError):
                pass
    return cfg


def _clamp16(v):
    return max(-32768, min(STICK_MAX, int(round(v))))


def stick(x, y, deadzone):
    """Apply a radial deadzone to one stick (XInput int16 axes)."""
    if deadzone <= 0:
        return x, y
    mag = math.hypot(x, y)
    if mag <= deadzone:
        return 0, 0
    # Rescale the distance from [deadzone, max] to [0, max], keep direction.
    # Square-gated sticks go past STICK_MAX on the diagonals; the per-axis
    # clamp keeps those in range.
    scale = (mag - deadzone) / (STICK_MAX - deadzone) * STICK_MAX / mag
    return _clamp16(x * scale), _clamp16(y * scale)


def trigger(value, deadzone):
    """Apply a deadzone to one trigger (0..255)."""
    if deadzone <= 0:
        return value
    if value <= deadzone:
        return 0
    out = (value - deadzone) / (TRIGGER_MAX - deadzone) * TRIGGER_MAX
    return max(0, min(TRIGGER_MAX, int(round(out))))


def apply(state, cfg):
    """A copy of a controller state (see the pollers) with deadzones applied."""
    out = dict(state)
    out["lx"], out["ly"] = stick(state.get("lx", 0), state.get("ly", 0), cfg["left"])
    out["rx"], out["ry"] = stick(state.get("rx", 0), state.get("ry", 0), cfg["right"])
    out["lt"] = trigger(state.get("lt", 0), cfg["lt"])
    out["rt"] = trigger(state.get("rt", 0), cfg["rt"])
    return out
