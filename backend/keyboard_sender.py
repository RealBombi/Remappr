from pynput.keyboard import Controller, Key
from protocol import send_message

keyboard = Controller()

# Map string key names to pynput keys
KEY_MAP = {
    # Letters
    "a": "a", "b": "b", "c": "c", "d": "d", "e": "e", "f": "f",
    "g": "g", "h": "h", "i": "i", "j": "j", "k": "k", "l": "l",
    "m": "m", "n": "n", "o": "o", "p": "p", "q": "q", "r": "r",
    "s": "s", "t": "t", "u": "u", "v": "v", "w": "w", "x": "x",
    "y": "y", "z": "z",
    # Numbers
    "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
    "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
    # Special Keys
    "space": Key.space,
    "enter": Key.enter,
    "shift": Key.shift,
    "ctrl": Key.ctrl_l,
    "alt": Key.alt_l,
    "up": Key.up, "down": Key.down,
    "left": Key.left, "right": Key.right,
    "tab": Key.tab, "escape": Key.esc,
}

for i in range(1, 13):
    KEY_MAP[f"f{i}"] = getattr(Key, f"f{i}")

def press_key(key_name):
    key = KEY_MAP.get(str(key_name).lower())
    if key is None:
        send_message({"type": "error", "message": f"Unknown key mapping: {key_name!r}"})
        return
    try:
        keyboard.press(key)
    except Exception as e:
        send_message({"type": "error", "message": f"Failed to press {key_name!r}: {e}"})

def release_key(key_name):
    key = KEY_MAP.get(str(key_name).lower())
    if key is None:
        return
    try:
        keyboard.release(key)
    except Exception as e:
        send_message({"type": "error", "message": f"Failed to release {key_name!r}: {e}"})
