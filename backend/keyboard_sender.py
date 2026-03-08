from pynput.keyboard import Controller, Key

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
    try:
        key = KEY_MAP.get(key_name.lower(), key_name)
        keyboard.press(key)
    except Exception as e:
        pass

def release_key(key_name):
    try:
        key = KEY_MAP.get(key_name.lower(), key_name)
        keyboard.release(key)
    except Exception as e:
        pass
