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
from turbo import TurboEngine, read_config as read_turbo_config  # noqa: E402
from controller import get_controller, rescan_controller  # noqa: E402
from emulation import VirtualPad, driver_installed, installer_path, MODES as EMULATION_MODES  # noqa: E402

# Global state
current_mappings = []  # List of {"button": "...", "key": "..."}
virtual_pad = VirtualPad()       # controller emulation (see emulation.py)
emulation_mode = "off"           # what the user asked for; may be inactive
is_detecting = False
is_mapping_active = False
held_keys = set()

# Hold-to-repeat.  The engine reports when a repeat starts/stops so the UI can
# highlight the row exactly as it does for a plain held key.
turbo = TurboEngine(
    on_start=lambda m: send_message({"type": "button_pressed", "button": m["button"], "key": m["key"]}),
    on_stop=lambda m: send_message({"type": "button_released", "button": m["button"], "key": m["key"]}),
)

def release_all_keys():
    """Release everything we may be holding: plain keys and turbo repeats."""
    global held_keys
    turbo.stop_all()
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
        for mapping in [m for m in current_mappings if m["button"] == button]:
            key = mapping["key"]
            turbo_cfg = read_turbo_config(mapping)
            if turbo_cfg is not None:
                if pressed:
                    turbo.button_pressed(mapping, turbo_cfg)
                else:
                    turbo.button_released(mapping, turbo_cfg)
                continue

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

def send_emulation_status(error=None):
    """Tell the UI what emulation is doing and whether the driver exists."""
    msg = {
        "type": "emulation_status",
        "mode": emulation_mode,
        "active": virtual_pad.active,
        "driver_installed": driver_installed(),
        "installer": installer_path(),
    }
    if error:
        msg["error"] = error
    send_message(msg)

def start_emulation():
    """(Re)create the virtual pad for the requested mode; report failures."""
    if emulation_mode == "off":
        virtual_pad.stop()
        send_emulation_status()
        return
    try:
        virtual_pad.start(emulation_mode)
        send_emulation_status()
    except Exception as e:
        virtual_pad.stop()
        send_emulation_status(error=str(e))

def stdin_reader(cmd_queue):
    """Read JSON commands from stdin in a background thread."""
    for command in read_messages():
        cmd_queue.put(command)
    cmd_queue.put(None)  # signal EOF

def main():
    global current_mappings, is_detecting, is_mapping_active, emulation_mode

    pygame.init()

    # Start reading stdin on a background thread
    cmd_queue = queue.Queue()
    stdin_thread = threading.Thread(target=stdin_reader, args=(cmd_queue,), daemon=True)
    stdin_thread.start()

    poller = None          # XInputPoller / SdlPoller when connected
    controller_name = None
    controller_layout = "xbox"   # drives the button labels shown in the UI
    rescan_ticks = 0       # counter for periodic controller re-scan

    def on_disconnect():
        nonlocal poller, controller_name
        poller = None
        controller_name = None
        release_all_keys()
        # Unplug the virtual pad while nothing is driving it.  It also keeps
        # the rescan below from mistaking our own virtual Xbox pad for the
        # real controller.
        if virtual_pad.active:
            virtual_pad.stop()
            send_emulation_status()
        send_message({"type": "controller_disconnected"})

    def try_connect(rescan=False, announce_reconnect=False):
        nonlocal poller, controller_name, controller_layout
        device = rescan_controller() if rescan else get_controller()
        if not device:
            return False

        try:
            poller = device.open(handle_controller_event, on_disconnect)
        except Exception as e:
            send_message({"type": "error", "message": f"Could not open {device.name}: {e}"})
            return False

        controller_name = device.name
        controller_layout = device.layout
        send_message({
            "type": "controller_connected",
            "name": device.name,
            "layout": device.layout
        })
        if emulation_mode != "off" and not virtual_pad.active:
            start_emulation()
        if announce_reconnect:
            # Notify frontend so it can resync mappings
            send_message({
                "type": "controller_reconnected",
                "name": device.name,
                "layout": device.layout,
                "active_bindings": len(current_mappings)
            })
        return True

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
                        if "mappings" in cmd and len(cmd["mappings"]) > 0:
                            release_all_keys()
                            current_mappings = cmd["mappings"]
                        send_message({"type": "log", "message": f"Mapping active. {len(current_mappings)} binding(s) loaded."})

                    elif cmd_type == "stop":
                        is_mapping_active = False
                        release_all_keys()

                    elif cmd_type == "detect":
                        is_detecting = True

                    elif cmd_type == "update_mappings":
                        if "mappings" in cmd:
                            # Mappings changed under us: never let an old
                            # binding keep a key down or keep repeating.
                            release_all_keys()
                            current_mappings = cmd["mappings"]
                            is_mapping_active = True
                            send_message({"type": "log", "message": f"Mappings updated: {len(current_mappings)} binding(s)."})

                    elif cmd_type == "set_emulation":
                        mode = cmd.get("mode", "off")
                        if mode not in EMULATION_MODES:
                            send_message({"type": "error", "message": f"Unknown emulation mode: {mode!r}"})
                        else:
                            emulation_mode = mode
                            if mode == "off" or (poller and poller.connected):
                                start_emulation()
                            else:
                                # Plugged in once the real pad shows up.
                                send_emulation_status()

                    elif cmd_type == "check_emulation":
                        send_emulation_status()

                    elif cmd_type == "check_controller":
                        if poller and poller.connected:
                            send_message({
                                "type": "controller_connected",
                                "name": controller_name,
                                "layout": controller_layout
                            })
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
                if virtual_pad.active and poller.connected:
                    try:
                        virtual_pad.apply(poller.get_state())
                    except Exception as e:
                        virtual_pad.stop()
                        send_emulation_status(error=f"Emulation stopped: {e}")
            else:
                # No controller — periodically re-scan (~1 second)
                rescan_ticks += 1
                if rescan_ticks >= 100:  # 100 × 10 ms = 1 s
                    rescan_ticks = 0
                    try_connect(rescan=True, announce_reconnect=True)

            time.sleep(0.01)

        release_all_keys()
        virtual_pad.stop()
    finally:
        pygame.quit()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        release_all_keys()
        virtual_pad.stop()
        pygame.quit()
        sys.exit(0)
