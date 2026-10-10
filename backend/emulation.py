"""Present the real controller to Windows as a different kind of pad.

Some games (GTA V on Steam, for one) only understand Xbox pads.  With
emulation on, the backend keeps reading the real pad as usual and mirrors its
full state (buttons, triggers, sticks) onto a *virtual* controller created
through the ViGEmBus kernel driver, so Steam and games see an Xbox 360 pad
(or a DualShock 4) instead.

ViGEmBus is a separate signed driver that must be installed once.  The
``vgamepad`` package bundles both the user-mode client DLL and the driver's
MSI installer, and ``installer_path()`` points the UI at that MSI.
"""

import os
import sys

try:
    import winreg
except ImportError:  # not Windows
    winreg = None

try:
    import vgamepad as vg
    _VGAMEPAD_ERROR = None
except Exception as e:  # DLL missing from the bundle, non-Windows, ...
    vg = None
    _VGAMEPAD_ERROR = str(e)

MODES = ("off", "xbox360", "ds4")

NEUTRAL_STATE = {
    "buttons": {},
    "lt": 0, "rt": 0,
    "lx": 0, "ly": 0, "rx": 0, "ry": 0,
}


def driver_installed():
    """True when the ViGEmBus service is registered with Windows."""
    if winreg is None:
        return False
    try:
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\ViGEmBus"
        )
        winreg.CloseKey(key)
        return True
    except OSError:
        return False


def installer_path():
    """Absolute path of the bundled ViGEmBus MSI, or None if not shipped."""
    if vg is None:
        base = getattr(sys, "_MEIPASS", None)
        if base is None:
            return None
        root = os.path.join(base, "vgamepad")
    else:
        root = os.path.dirname(vg.__file__)
    arch = "x64" if sys.maxsize > 2**32 else "x86"
    path = os.path.join(root, "win", "vigem", "install", arch, f"ViGEmBusSetup_{arch}.msi")
    return path if os.path.isfile(path) else None


# ---------------------------------------------------------------------------
# Button tables: our canonical BTN_* names -> virtual pad buttons
# ---------------------------------------------------------------------------

def _xusb_buttons():
    B = vg.XUSB_BUTTON
    return {
        "BTN_DPAD_UP": B.XUSB_GAMEPAD_DPAD_UP,
        "BTN_DPAD_DOWN": B.XUSB_GAMEPAD_DPAD_DOWN,
        "BTN_DPAD_LEFT": B.XUSB_GAMEPAD_DPAD_LEFT,
        "BTN_DPAD_RIGHT": B.XUSB_GAMEPAD_DPAD_RIGHT,
        "BTN_START": B.XUSB_GAMEPAD_START,
        "BTN_BACK": B.XUSB_GAMEPAD_BACK,
        "BTN_L_THUMB": B.XUSB_GAMEPAD_LEFT_THUMB,
        "BTN_R_THUMB": B.XUSB_GAMEPAD_RIGHT_THUMB,
        "BTN_LB": B.XUSB_GAMEPAD_LEFT_SHOULDER,
        "BTN_RB": B.XUSB_GAMEPAD_RIGHT_SHOULDER,
        "BTN_GUIDE": B.XUSB_GAMEPAD_GUIDE,
        "BTN_A": B.XUSB_GAMEPAD_A,
        "BTN_B": B.XUSB_GAMEPAD_B,
        "BTN_X": B.XUSB_GAMEPAD_X,
        "BTN_Y": B.XUSB_GAMEPAD_Y,
    }


def _ds4_buttons():
    B = vg.DS4_BUTTONS
    return {
        "BTN_START": B.DS4_BUTTON_OPTIONS,
        "BTN_BACK": B.DS4_BUTTON_SHARE,
        "BTN_L_THUMB": B.DS4_BUTTON_THUMB_LEFT,
        "BTN_R_THUMB": B.DS4_BUTTON_THUMB_RIGHT,
        "BTN_LB": B.DS4_BUTTON_SHOULDER_LEFT,
        "BTN_RB": B.DS4_BUTTON_SHOULDER_RIGHT,
        "BTN_LT": B.DS4_BUTTON_TRIGGER_LEFT,
        "BTN_RT": B.DS4_BUTTON_TRIGGER_RIGHT,
        "BTN_A": B.DS4_BUTTON_CROSS,
        "BTN_B": B.DS4_BUTTON_CIRCLE,
        "BTN_X": B.DS4_BUTTON_SQUARE,
        "BTN_Y": B.DS4_BUTTON_TRIANGLE,
    }


def _ds4_special_buttons():
    S = vg.DS4_SPECIAL_BUTTONS
    return {
        "BTN_GUIDE": S.DS4_SPECIAL_BUTTON_PS,
        "BTN_TOUCHPAD": S.DS4_SPECIAL_BUTTON_TOUCHPAD,
    }


def _ds4_dpad(up, down, left, right):
    D = vg.DS4_DPAD_DIRECTIONS
    if up and left:
        return D.DS4_BUTTON_DPAD_NORTHWEST
    if up and right:
        return D.DS4_BUTTON_DPAD_NORTHEAST
    if down and left:
        return D.DS4_BUTTON_DPAD_SOUTHWEST
    if down and right:
        return D.DS4_BUTTON_DPAD_SOUTHEAST
    if up:
        return D.DS4_BUTTON_DPAD_NORTH
    if down:
        return D.DS4_BUTTON_DPAD_SOUTH
    if left:
        return D.DS4_BUTTON_DPAD_WEST
    if right:
        return D.DS4_BUTTON_DPAD_EAST
    return D.DS4_BUTTON_DPAD_NONE


def _to_ds4_axis(value, invert=False):
    """XInput-style int16 (positive = up/right) -> DS4 0..255 (0 = up/left)."""
    v = -value if invert else value
    return max(0, min(255, 128 + int(round(v / 32767 * 127))))


# ---------------------------------------------------------------------------
# Virtual pad
# ---------------------------------------------------------------------------

class VirtualPad:
    """One virtual controller.  ``start``/``stop`` plug it in and out;
    ``apply`` pushes a full controller state onto it."""

    def __init__(self):
        self.mode = "off"
        self._pad = None
        self._last_sig = None

    @property
    def active(self):
        return self._pad is not None

    def available(self):
        """(ok, reason) — can a virtual pad be created right now?"""
        if vg is None:
            return False, f"Virtual controller support failed to load: {_VGAMEPAD_ERROR}"
        if not driver_installed():
            return False, "ViGEmBus driver is not installed"
        return True, ""

    def start(self, mode):
        """Plug in a virtual pad of ``mode``.  Raises on failure."""
        if mode not in MODES:
            raise ValueError(f"Unknown emulation mode {mode!r}")
        self.stop()
        if mode == "off":
            return
        ok, reason = self.available()
        if not ok:
            raise RuntimeError(reason)
        try:
            if mode == "xbox360":
                self._pad = vg.VX360Gamepad()
            else:
                self._pad = vg.VDS4Gamepad()
        except AssertionError as e:
            # vgamepad reports a missing/old driver as an assertion
            raise RuntimeError(f"Could not connect to ViGEmBus: {e}") from e
        self.mode = mode
        self._last_sig = None
        self.apply(NEUTRAL_STATE)

    def stop(self):
        """Unplug the virtual pad (inputs are neutralised first)."""
        pad, self._pad = self._pad, None
        self.mode = "off"
        self._last_sig = None
        if pad is None:
            return
        try:
            pad.reset()
            pad.update()
        except Exception:
            pass
        # vgamepad removes the target when the object is garbage collected;
        # drop our reference and force that to happen now.
        del pad
        import gc
        gc.collect()

    def neutral(self):
        """Centre every input, e.g. when the real pad disconnects."""
        if self._pad is not None:
            self.apply(NEUTRAL_STATE)

    def apply(self, state):
        """Mirror ``state`` (see controller pollers) onto the virtual pad."""
        pad = self._pad
        if pad is None:
            return
        buttons = state.get("buttons", {})
        sig = (
            tuple(sorted(k for k, v in buttons.items() if v)),
            state.get("lt", 0), state.get("rt", 0),
            state.get("lx", 0), state.get("ly", 0),
            state.get("rx", 0), state.get("ry", 0),
        )
        if sig == self._last_sig:
            return  # nothing changed; skip the USB report
        self._last_sig = sig

        pad.reset()
        if self.mode == "xbox360":
            table = _xusb_buttons()
            for name, down in buttons.items():
                btn = table.get(name)
                if btn is not None and down:
                    pad.press_button(btn)
            pad.left_trigger(int(state.get("lt", 0)))
            pad.right_trigger(int(state.get("rt", 0)))
            pad.left_joystick(int(state.get("lx", 0)), int(state.get("ly", 0)))
            pad.right_joystick(int(state.get("rx", 0)), int(state.get("ry", 0)))
        else:
            table = _ds4_buttons()
            special = _ds4_special_buttons()
            for name, down in buttons.items():
                if not down:
                    continue
                btn = table.get(name)
                if btn is not None:
                    pad.press_button(btn)
                sp = special.get(name)
                if sp is not None:
                    pad.press_special_button(sp)
            pad.directional_pad(_ds4_dpad(
                buttons.get("BTN_DPAD_UP", False), buttons.get("BTN_DPAD_DOWN", False),
                buttons.get("BTN_DPAD_LEFT", False), buttons.get("BTN_DPAD_RIGHT", False),
            ))
            pad.left_trigger(int(state.get("lt", 0)))
            pad.right_trigger(int(state.get("rt", 0)))
            pad.left_joystick(_to_ds4_axis(state.get("lx", 0)), _to_ds4_axis(state.get("ly", 0), invert=True))
            pad.right_joystick(_to_ds4_axis(state.get("rx", 0)), _to_ds4_axis(state.get("ry", 0), invert=True))
        pad.update()
