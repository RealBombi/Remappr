"""
R5 to J - GameSir G7 Pro HE Button Mapper
==========================================
Maps the R5 button on your GameSir G7 Pro HE controller
to the "J" key on your keyboard for Rocket League stall bind.

HOW TO USE:
1. Open Command Prompt and run:
      pip install inputs pynput
2. Plug in your controller
3. Run this script:
      python r5_to_j.py
4. Press R5 once so it can detect the button
5. Leave it running while you play Rocket League
6. Press Ctrl+C in the terminal to stop

IMPORTANT:
- Remove the J mapping from GameSir Nexus app first!
- Set R5 back to default/nothing in Nexus
- Run this script BEFORE launching Rocket League
"""

import time
import sys

# Check dependencies
try:
    import inputs
except ImportError:
    print("Missing 'inputs' library. Run:")
    print("  pip install inputs")
    sys.exit(1)

try:
    from pynput.keyboard import Controller
except ImportError:
    print("Missing 'pynput' library. Run:")
    print("  pip install pynput")
    sys.exit(1)

keyboard = Controller()

print("=" * 50)
print("  R5 to J  -  GameSir G7 Pro HE Button Mapper")
print("=" * 50)
print()

# Check for gamepads
gamepads = inputs.devices.gamepads
if not gamepads:
    print("No controller found! Plug it in and try again.")
    sys.exit(1)

gamepad = gamepads[0]
print(f"Found: {gamepad.name}")
print()

# ── Auto-detect R5 ─────────────────────────────────────
print("AUTO-DETECT MODE")
print("-" * 50)
print("Press R5 on your controller now so I can")
print("figure out which button it is...")
print()

R5_CODE = None

while R5_CODE is None:
    events = gamepad.read()
    for event in events:
        if event.ev_type == "Key" and event.state == 1:
            R5_CODE = event.code
            print(f"Got it! R5 = {R5_CODE}")
            print()

# ── Main loop ──────────────────────────────────────────
KEY_TO_SEND = "j"
print(f"Mapping: {R5_CODE} --> '{KEY_TO_SEND}' key")
print()
print("Running! Leave this window open while you play.")
print("Press Ctrl+C here to stop.")
print("=" * 50)

j_held = False

try:
    while True:
        events = gamepad.read()
        for event in events:
            if event.ev_type == "Key" and event.code == R5_CODE:
                if event.state == 1 and not j_held:
                    keyboard.press(KEY_TO_SEND)
                    j_held = True
                elif event.state == 0 and j_held:
                    keyboard.release(KEY_TO_SEND)
                    j_held = False

except KeyboardInterrupt:
    if j_held:
        keyboard.release(KEY_TO_SEND)
    print("\nStopped! You can close this window now.")
    sys.exit(0)
