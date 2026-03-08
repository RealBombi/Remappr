import os
import sys
import queue
import threading
import time

# Headless pygame — only used for controller name, not input
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")

import pygame  # noqa: E402
from protocol import send_message, read_messages  # noqa: E402
from keyboard_sender import press_key, release_key  # noqa: E402
from controller import get_controller, rescan_controller, ControllerPoller  # noqa: E402

# Global state
current_mappings = []  # List of {"button": "...", "key": "..."}
is_detecting = False
is_mapping_active = False
held_keys = set()

def release_all_keys():
    global held_keys
    for key in list(held_keys):
        release_key(key)
    held_keys.clear()

def handle_controller_event(button, pressed):
    global is_detecting, is_mapping_active, current_mappings, held_keys

    if is_detecting:
        if pressed:
            send_message({"type": "button_detected", "button": button})
            is_detecting = False

    if is_mapping_active:
        mapped_keys = [m["key"] for m in current_mappings if m["button"] == button]

        for key in mapped_keys:
            if pressed:
                if key not in held_keys:
                    press_key(key)
                    held_keys.add(key)
                    send_message({"type": "button_pressed", "button": button, "key": key})
            else:
                if key in held_keys:
                    release_key(key)
                    held_keys.remove(key)
                    send_message({"type": "button_released", "button": button, "key": key})

def stdin_reader(cmd_queue):
    """Read JSON commands from stdin in a background thread."""
    for command in read_messages():
        cmd_queue.put(command)
    cmd_queue.put(None)  # signal EOF

def main():
    global current_mappings, is_detecting, is_mapping_active

    pygame.init()

    # Start reading stdin on a background thread
    cmd_queue = queue.Queue()
    stdin_thread = threading.Thread(target=stdin_reader, args=(cmd_queue,), daemon=True)
    stdin_thread.start()

    poller = None          # ControllerPoller when connected
    controller_name = None
    rescan_ticks = 0       # counter for periodic controller re-scan

    def on_disconnect():
        nonlocal poller, controller_name
        poller = None
        controller_name = None
        release_all_keys()
        send_message({"type": "controller_disconnected"})

    def try_connect():
        nonlocal poller, controller_name
        info = get_controller()
        if info:
            idx, name = info
            controller_name = name
            send_message({"type": "controller_connected", "name": name})
            poller = ControllerPoller(idx, handle_controller_event, on_disconnect)
            return True
        return False

    try:
        # Initial controller check
        if not try_connect():
            send_message({"type": "error", "message": "No controller found"})

        running = True
        while running:
            # ── Process pending stdin commands (non-blocking) ──
            try:
                while True:
                    cmd = cmd_queue.get_nowait()
                    if cmd is None:
                        running = False
                        break

                    cmd_type = cmd.get("type")

                    if cmd_type == "start":
                        is_mapping_active = True
                        if "mappings" in cmd:
                            current_mappings = cmd["mappings"]

                    elif cmd_type == "stop":
                        is_mapping_active = False
                        release_all_keys()

                    elif cmd_type == "detect":
                        is_detecting = True

                    elif cmd_type == "update_mappings":
                        if "mappings" in cmd:
                            current_mappings = cmd["mappings"]
                            is_mapping_active = True

                    elif cmd_type == "check_controller":
                        if poller and poller.connected:
                            send_message({"type": "controller_connected", "name": controller_name})
                        else:
                            if not try_connect():
                                send_message({"type": "error", "message": "No controller found"})

                    elif cmd_type == "exit":
                        running = False
                        break
            except queue.Empty:
                pass

            if not running:
                break

            # ── Poll controller ──
            if poller and poller.connected:
                poller.poll()
            else:
                # No controller — periodically re-scan (~1 second)
                rescan_ticks += 1
                if rescan_ticks >= 100:  # 100 × 10 ms = 1 s
                    rescan_ticks = 0
                    info = rescan_controller()
                    if info:
                        idx, name = info
                        controller_name = name
                        send_message({"type": "controller_connected", "name": name})
                        poller = ControllerPoller(idx, handle_controller_event, on_disconnect)

            time.sleep(0.01)

        release_all_keys()
    finally:
        pygame.quit()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        release_all_keys()
        pygame.quit()
        sys.exit(0)
