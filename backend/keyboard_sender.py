"""Simulate key presses by physical key position.

Games such as Rocket League read the *physical* key (its hardware scancode),
not the character the OS layout would produce.  On a Norwegian keyboard the key
printed Ø sits where a US keyboard has ';', and the game names it "Semicolon"
no matter which layout Windows is using.  Sending characters therefore breaks
for every key that differs from the US layout.

The frontend records the browser's ``KeyboardEvent.code`` (``"Semicolon"``,
``"KeyA"``, ``"Digit1"`` ...), which already identifies the physical key
independently of layout.  Here that code is turned into a Windows scancode and
injected with ``SendInput`` using ``KEYEVENTF_SCANCODE``, so the game sees
exactly the key the user pressed while recording the mapping.

Profiles saved by older versions store lower-case character names
(``"a"``, ``"space"``, ``"ctrl"`` ...); those are translated to codes first.
"""

import ctypes
import sys
from ctypes import wintypes

from protocol import send_message

# ---------------------------------------------------------------------------
# DOM KeyboardEvent.code  ->  (scancode, extended)
# Scancodes are PC/AT "Set 1" codes, which is what SendInput expects.
# ---------------------------------------------------------------------------
SCANCODES = {
    "Escape": (0x01, False),
    "Digit1": (0x02, False), "Digit2": (0x03, False), "Digit3": (0x04, False),
    "Digit4": (0x05, False), "Digit5": (0x06, False), "Digit6": (0x07, False),
    "Digit7": (0x08, False), "Digit8": (0x09, False), "Digit9": (0x0A, False),
    "Digit0": (0x0B, False),
    "Minus": (0x0C, False), "Equal": (0x0D, False),
    "Backspace": (0x0E, False), "Tab": (0x0F, False),
    "KeyQ": (0x10, False), "KeyW": (0x11, False), "KeyE": (0x12, False),
    "KeyR": (0x13, False), "KeyT": (0x14, False), "KeyY": (0x15, False),
    "KeyU": (0x16, False), "KeyI": (0x17, False), "KeyO": (0x18, False),
    "KeyP": (0x19, False),
    "BracketLeft": (0x1A, False), "BracketRight": (0x1B, False),
    "Enter": (0x1C, False),
    "ControlLeft": (0x1D, False),
    "KeyA": (0x1E, False), "KeyS": (0x1F, False), "KeyD": (0x20, False),
    "KeyF": (0x21, False), "KeyG": (0x22, False), "KeyH": (0x23, False),
    "KeyJ": (0x24, False), "KeyK": (0x25, False), "KeyL": (0x26, False),
    "Semicolon": (0x27, False), "Quote": (0x28, False), "Backquote": (0x29, False),
    "ShiftLeft": (0x2A, False),
    "Backslash": (0x2B, False),
    "KeyZ": (0x2C, False), "KeyX": (0x2D, False), "KeyC": (0x2E, False),
    "KeyV": (0x2F, False), "KeyB": (0x30, False), "KeyN": (0x31, False),
    "KeyM": (0x32, False),
    "Comma": (0x33, False), "Period": (0x34, False), "Slash": (0x35, False),
    "ShiftRight": (0x36, False),
    "NumpadMultiply": (0x37, False),
    "AltLeft": (0x38, False),
    "Space": (0x39, False),
    "CapsLock": (0x3A, False),
    "F1": (0x3B, False), "F2": (0x3C, False), "F3": (0x3D, False),
    "F4": (0x3E, False), "F5": (0x3F, False), "F6": (0x40, False),
    "F7": (0x41, False), "F8": (0x42, False), "F9": (0x43, False),
    "F10": (0x44, False),
    "NumLock": (0x45, False), "ScrollLock": (0x46, False),
    "Numpad7": (0x47, False), "Numpad8": (0x48, False), "Numpad9": (0x49, False),
    "NumpadSubtract": (0x4A, False),
    "Numpad4": (0x4B, False), "Numpad5": (0x4C, False), "Numpad6": (0x4D, False),
    "NumpadAdd": (0x4E, False),
    "Numpad1": (0x4F, False), "Numpad2": (0x50, False), "Numpad3": (0x51, False),
    "Numpad0": (0x52, False), "NumpadDecimal": (0x53, False),
    # The extra key next to left Shift on ISO (European) keyboards.
    "IntlBackslash": (0x56, False),
    "F11": (0x57, False), "F12": (0x58, False),
    "IntlRo": (0x73, False), "IntlYen": (0x7D, False),
    # Extended (E0-prefixed) keys.
    "NumpadEnter": (0x1C, True),
    "ControlRight": (0x1D, True),
    "NumpadDivide": (0x35, True),
    "PrintScreen": (0x37, True),
    "AltRight": (0x38, True),
    "Home": (0x47, True), "ArrowUp": (0x48, True), "PageUp": (0x49, True),
    "ArrowLeft": (0x4B, True), "ArrowRight": (0x4D, True),
    "End": (0x4F, True), "ArrowDown": (0x50, True), "PageDown": (0x51, True),
    "Insert": (0x52, True), "Delete": (0x53, True),
    "MetaLeft": (0x5B, True), "MetaRight": (0x5C, True),
    "ContextMenu": (0x5D, True),
}

# Names stored by profiles created before physical-key mapping existed.
LEGACY_NAMES = {
    "space": "Space", "enter": "Enter", "shift": "ShiftLeft",
    "ctrl": "ControlLeft", "alt": "AltLeft",
    "up": "ArrowUp", "down": "ArrowDown", "left": "ArrowLeft", "right": "ArrowRight",
    "tab": "Tab", "escape": "Escape",
}
for _ch in "abcdefghijklmnopqrstuvwxyz":
    LEGACY_NAMES[_ch] = f"Key{_ch.upper()}"
for _d in "0123456789":
    LEGACY_NAMES[_d] = f"Digit{_d}"
for _i in range(1, 13):
    LEGACY_NAMES[f"f{_i}"] = f"F{_i}"


def resolve_key(key_name):
    """Return ``(scancode, extended)`` for a stored key, or ``None``."""
    name = str(key_name)
    if name in SCANCODES:
        return SCANCODES[name]
    legacy = LEGACY_NAMES.get(name.lower())
    if legacy is not None:
        return SCANCODES[legacy]
    return None


# ---------------------------------------------------------------------------
# SendInput plumbing
# ---------------------------------------------------------------------------
INPUT_KEYBOARD = 1
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008

ULONG_PTR = ctypes.c_size_t


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULONG_PTR),
    ]


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULONG_PTR),
    ]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]


class _INPUT_UNION(ctypes.Union):
    _fields_ = [("ki", KEYBDINPUT), ("mi", MOUSEINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _anonymous_ = ("u",)
    _fields_ = [("type", wintypes.DWORD), ("u", _INPUT_UNION)]


_user32 = ctypes.windll.user32 if sys.platform == "win32" else None
if _user32 is not None:
    _user32.SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
    _user32.SendInput.restype = wintypes.UINT


def _send_scancode(scancode, extended, key_up):
    if _user32 is None:
        raise OSError("Key simulation is only supported on Windows")
    flags = KEYEVENTF_SCANCODE
    if extended:
        flags |= KEYEVENTF_EXTENDEDKEY
    if key_up:
        flags |= KEYEVENTF_KEYUP
    inp = INPUT(type=INPUT_KEYBOARD)
    inp.ki = KEYBDINPUT(wVk=0, wScan=scancode, dwFlags=flags, time=0, dwExtraInfo=0)
    sent = _user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    if sent != 1:
        raise ctypes.WinError(ctypes.get_last_error())


def press_key(key_name):
    resolved = resolve_key(key_name)
    if resolved is None:
        send_message({"type": "error", "message": f"Unknown key mapping: {key_name!r}"})
        return
    try:
        _send_scancode(*resolved, key_up=False)
    except Exception as e:
        send_message({"type": "error", "message": f"Failed to press {key_name!r}: {e}"})


def release_key(key_name):
    resolved = resolve_key(key_name)
    if resolved is None:
        return
    try:
        _send_scancode(*resolved, key_up=True)
    except Exception as e:
        send_message({"type": "error", "message": f"Failed to release {key_name!r}: {e}"})
